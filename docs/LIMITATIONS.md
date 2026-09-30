# Known limitations & the honest model

This document exists because "buy on my site, download without ever leaving" is a **real architectural question**
with Payhip — and the correct answer is to not fake it. Here's exactly what is and isn't possible, and what the
site does instead.

## 1. Checkout happens on Payhip (opened from this site)

Payhip offers secure hosted checkout pages — there is no API to embed Payhip's payment form *into your own DOM*.
The Buy button confirms the product + price in an on-site dialog, then opens Payhip's direct checkout link
(`https://payhip.com/buy?link=KEY`) in a new tab. The customer finishes payment on Payhip's secure page and lands
back with an emailed download link. This is the standard, officially documented Payhip integration.

## 2. The site cannot know whether a payment succeeded (and doesn't pretend to)

Payhip's checkout is on their origin; a client-side page cannot read the transaction result. Therefore:
- Purchase-success, download and "receipt" states are shown **as guidance** ("check your inbox for the Payhip
  receipt"), never as verified fact.
- Real verification channels are server-side only:
  - **License Verify API** (proxy implemented → `/api/payhip-license-verify`) — verifies a license key on demand.
  - **Webhooks** (receiver implemented → `/api/payhip-webhook`) — Payhip tells *you* about sales.
  Both are optional, and the widget only appears once real product keys exist.

## 3. Paid files are never hosted or proxied by the store

The "download without leaving the store" idea would require one of:

| Approach | Why it's rejected |
| --- | --- |
| Put files in `public/` | Files become publicly downloadable by anyone — defeats selling. ❌ |
| Frontend fetches Payhip's download URL | Payhip's per-purchase download links are expiring and usage-limited (5 downloads / 30 days); exposing or forwarding them client-side is fragile, often broken by expiry, and puts the merchant in the position of publicly leaking paid content. ❌ |
| Server downloads then re-serves the file | Payhip has no API for creators to hand the paid file to another server for re-hosting; and re-hosting would disable Payhip's license enforcement, refunds and delivery controls. ❌ |

So delivery is genuinely **Payhip-owned**: receipt email with a secure download page link.
The storefront's job is discovery, presentation and purchase initiation — not file custody. This is also why the
header's "Access my purchases" link points to the on-site delivery guide (Payhip has no public buyer library page —
buyers keep the download link from their receipt email, and we re-send it on request).

## 4. Client-side "security" that isn't security

Nothing in this site hides or claims to hide files behind client-side code. A static site has no secrets and no
private storage; any client-side "paywall" would be trivially bypassed. The security boundary is Payhip's, and
the site treats it as such.

## 5. Forms need Netlify (not local dev)

Service-request and contact forms use **Netlify Forms** — they only accept submissions on the deployed site.
In local `astro dev`/`astro preview`, submitting shows the honest "could not reach the submission service" error.

## 6. Scale notes

- 1,100+ subcategory pages build in seconds; the architecture is static, so thousands of products are fine.
- Client search indexes the whole catalog in a small JSON file; for very large catalogs (10k+ products) consider
  switching `/search` to a serverless/edge search — the page's plumbing already separates the index URL.
- Pagination is not implemented; subcategory grids render all products for that collection (1–5 in practice).
  `SHOP.perPage` exists if you later want it.

## 7. What's not implemented (by design, not by accident)

- **Wishlists / carts**: digital single-item checkout makes them UX noise.
- **Reviews & ratings**: no customer data exists to show ratings honestly.
- **Newsletter**: requires a consent/backend story you should add deliberately, not bolt on.
- **Membership/DRM**: Payhip license keys + the verify proxy are the supported path if you need this later.
