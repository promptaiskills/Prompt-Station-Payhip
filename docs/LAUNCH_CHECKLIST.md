# Launch checklist — everything left to do

Work through this top-to-bottom and you're live. Items marked **[config]** are one file:
`src/config/site.mjs`. Everything else is identified by path.

## 1. Business configuration — `src/config/site.mjs`

- [ ] `SITE.url` → your production domain (drives canonicals, sitemap, OG). **Do not skip this.**
- [ ] `SITE.contact.email` / `supportEmail` → real inbox(es).
- [ ] `SITE.social.*` → real links, or leave `''` (icons are hidden automatically).
- [ ] Review `SITE.tagline`, `SITE.description`, `SITE.trustNote`.

## 2. Payhip configuration

- [ ] `PAYHIP.sellerHandle` → your real Payhip username.
- [ ] `PAYHIP.storeUrl` → your real Payhip store page.
- [ ] `products.csv` → put your real product link in each row's `payhip_url`
      (full `https://payhip.com/b/KEY` link, `b/KEY`, or the bare KEY all work;
      bulk helper: `node scripts/apply-payhip-links.mjs mapping.txt`).
- [ ] (Optional) `payhip_product_id` per row + license keys enabled in Payhip → activates the verify widget.
- [ ] (Optional) Set `PAYHIP_WEBHOOK_SECRET` env var + the webhook URL in Payhip (see `docs/PAYHIP_SETUP.md`).

## 3. Catalog & taxonomy

- [ ] Replace the sample `products.csv` rows with your real products (keep column names).
- [ ] Run `npm run build` and fix any `[CATALOG]` warnings printed (unmatched category/subcategory values).
- [ ] Review `docs/CATEGORY_STRUCTURE.md`; adjust category/subcategory wording or any hand-edited descriptions
      in `src/data/taxonomy.json`, then rebuild.
- [ ] Add real product images under `public/images/products/` and point the CSV `image` column at them
      (or keep the generated placeholders — replace the sample covers, not the mechanism).
- [ ] Remove or repoint the demo `PS-9000` draft row if you don't want it in the file at all.

## 4. Service & legal copy

- [ ] `SERVICE.*` in `src/config/site.mjs` → confirm turnaround/process copy matches how you actually run requests.
- [ ] `src/pages/legal/privacy.astro` & `terms.astro` → replace `[DATE]`, `[YOUR …]` placeholders, confirm the
      license/refund clauses match your real policies; have them reviewed if you're in a regulated market.
- [ ] `public/robots.txt` → set the real sitemap URL (it ships with a placeholder).

## 5. Deploy (Netlify)

- [ ] Push to Git / deploy `dist` (see `docs/NETLIFY_SETUP.md`).
- [ ] Confirm build log ends with `1222 page(s) built` (or whatever the real count is) and **no** `[CATALOG]` warnings.
- [ ] Set env vars (`PAYHIP_API_KEY`, `PAYHIP_WEBHOOK_SECRET` — only if using license checks / webhooks).
- [ ] Custom domain + SSL; `SITE.url` matches.

## 6. Content & asset quality

- [ ] `public/og-default.png` → replace with your real brand OG image (1200×630) if you want custom branding.
- [ ] `public/favicon.svg` → replace with your real brand mark (or keep).
- [ ] Proofread the sample copy in the seeded products — the sample rows are demonstration content.

## 7. Live verification (after deploy)

- [ ] `/` renders; header, footer, search, catalog dropdown work on mobile **and** desktop.
- [ ] A subcategory with products shows the product grid; empty collections show the request pathway.
- [ ] `/search/?q=<something>` shows results; `/search/?q=<gibberish>` shows the conversational empty state, and
      the request form carries the query over.
- [ ] Buy flow: click **Buy now** → dialog → Payhip checkout tab opens → complete a test purchase → receipt email arrives.
      (Use one of your own Payhip products; you can refund the test order afterwards.)
- [ ] Submit `/request/` and `/contact/` forms → confirm submissions land in Netlify Forms.
- [ ] `/sitemap-index.xml`, `/robots.txt`, a random 404, and `/api/payhip-license-verify` (POST test) behave.
- [ ] Lighthouse/Core Web Vitals pass for a product page and the homepage (this stack is static-first, so they
      should be green; the biggest lever is real compressed product artwork).

## 8. Ongoing operations

- [ ] New product = new CSV row (plus image + Payhip link) → rebuild → done.
- [ ] New category = new numbered TXT file → rebuild → the whole section appears.
- [ ] Keep `taxonomy-source/` in the repo so builds stay reproducible.