# Payhip setup & integration guide

This store sells digital products through **Payhip**. Payhip hosts the files, processes payment (cards via
Stripe, plus PayPal), and delivers the purchase. The storefront integrates with the mechanisms Payhip officially
supports — and it does NOT invent any that it doesn't.

## 1. The three integration points

| Mechanism | Used for | Official? |
| --- | --- | --- |
| **Product page links** (`https://payhip.com/b/KEY`) | Buy buttons & "View on Payhip" links | ✅ Yes |
| **Direct checkout links** (`https://payhip.com/buy?link=KEY`) | Buy buttons go straight to payment | ✅ Yes — Payhip's documented direct checkout links |
| **License Verify API** (`payhip.com/api/v1/license/verify` or `/api/v2/license/verify`) | Optional "verify your purchase" widget (serverless proxy) | ✅ Yes |
| **Webhooks** | Optional sale notifications to a Netlify function | ✅ Yes (Payhip → Settings → Webhooks) |

Payhip has no mechanism to render product listings inside your own site or to re-host paid files — so the store
uses its own catalog (the CSV) as the source of listings, and Payhip only for payment + delivery.

## 2. Values you control

In **`src/config/site.mjs` → `PAYHIP`**:

```js
sellerHandle: 'promptstationhq',                 // ← the handle in your Payhip URL
storeUrl:     'https://payhip.com/promptstationhq', // ← your store link
purchasesHelpUrl: '/how-it-works/#delivery',     // where "Access my purchases" points (on-site guide)
```

In **`products.csv`**, every sellable row needs a `payhip_url` — either the full product link
(`https://payhip.com/b/KEY`), `b/KEY`, or just the bare product KEY. Rows without a link show a
"Coming soon" state instead of a Buy button.

## 3. Connecting real products

1. Create your product in Payhip (Products → Add product; upload the actual files there).
2. Copy the product link — Payhip → Products → **Share / Embed** (e.g. `https://payhip.com/b/ZjHXI`).
3. Paste it into the row's `payhip_url` column.
   - **Bulk helper:** put `slug , payhip-link` lines into a text file and run
     `node scripts/apply-payhip-links.mjs path/to/mapping.txt` — it normalises and writes the links for you.
4. (Optional) For the **license verification widget**: enable *License keys* on the Payhip product and put the
   **product key** (the code from the product URL, e.g. `ZjHXI`) into `payhip_product_id`. Then configure the
   verifier — see §5.

## 4. The buy button & checkout

- Every Buy button is an `<a class="payhip-button">` whose `href` is the product's **direct checkout link**
  (`https://payhip.com/buy?link=KEY`).
- `src/scripts/buy.ts` intercepts the click and shows an accessible pre-checkout dialog (product, price,
  "how delivery works"). **Continue to secure checkout** opens Payhip's checkout in a new tab.
- **No JavaScript:** the same link simply navigates straight to Payhip's checkout — still 100% functional.
- **Popup blocked:** the dialog tells the buyer and offers the product-page link instead.
- The payment page is Payhip's own hosted checkout. This site cannot re-style or re-host it, and cannot know
  whether payment succeeded (that's Payhip's job). The dialog never claims "payment complete."

## 5. License verification (optional)

The "verify your purchase" widget on `/how-it-works/` calls `/api/payhip-license-verify`, a rate-limited
serverless proxy to Payhip's official License Verify API. Two auth modes (tried in order):

1. **Per-product secret (Payhip v2, recommended):** found on each product's edit page when license keys are
   enabled. Create `netlify/payhip-secrets.json` (gitignored):

   ```json
   { "ZjHXI": "PRODUCT_SECRET_KEY_HERE", "ean3D": "ANOTHER_SECRET" }
   ```

2. **Account API key (Payhip v1):** Payhip → Settings → Developer tab. Set `PAYHIP_API_KEY` in
   Netlify → Site settings → Environment variables.

The widget only renders when at least one CSV row has a `payhip_product_id`.

## 6. Webhooks (optional)

Payhip → Settings → Webhooks → add:

```
https://YOUR-SITE.netlify.app/api/payhip-webhook?token=YOUR_PAYHIP_WEBHOOK_SECRET
```

Set `PAYHIP_WEBHOOK_SECRET` in Netlify's environment variables first. Events are logged (with buyer email
masked) to Netlify's function logs — a foundation for CRM/thank-you automation later.

## 7. What the site never does (honest limits)

- Never re-hosts or proxies paid files — delivery is 100% Payhip-owned (email receipt + download page link;
  5 downloads per file, valid 30 days).
- Never claims to know a purchase succeeded client-side.
- Never exposes Payhip API keys or product secrets to the browser.

See `docs/LIMITATIONS.md` for the full honest picture.
