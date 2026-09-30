# Gumroad → Payhip migration summary

Store: **https://payhip.com/promptstationhq** · migrated 2026-09-30

## What changed (Gumroad-related only — nothing else touched)

| Area | Before (Gumroad) | After (Payhip) |
| --- | --- | --- |
| Config | `GUMROAD` block in `src/config/site.mjs` | `PAYHIP` block (store URL, normalizer, direct-checkout helper) |
| CSV columns | `gumroad_url`, `gumroad_product_id`, `gumroad_permalink` | `payhip_url`, `payhip_product_id`, `payhip_permalink` |
| Buy button | `GumroadButton.astro` + Gumroad overlay script | `PayhipButton.astro` — same confirmation dialog, then Payhip's secure checkout opens in a new tab (Payhip direct checkout link `/buy?link=KEY`) |
| Buy script | `buy.ts` injected gumroad.js overlay | `buy.ts` — dialog with ready / checkout-opened / popup-blocked states; no third-party script loaded |
| License check | `/api/gumroad-license-verify` (Gumroad API) | `/api/payhip-license-verify` (Payhip license API — per-product secret file or `PAYHIP_API_KEY`) |
| Sale events | `/api/gumroad-ping` (Gumroad Ping) | `/api/payhip-webhook` (Payhip webhooks, logged to Netlify function logs) |
| Copy | Gumroad mentions in home, product pages, how-it-works, about, terms, privacy, header, footer | Rewritten for Payhip (payments via Stripe/PayPal, email receipt + download page link, 5 downloads / 30 days, re-send on request) |
| Docs | GUMROAD_SETUP.md etc. | PAYHIP_SETUP.md + all checklists/column docs updated |

Safety rails:
- Old Gumroad URLs were cleared from `products.csv` (they can never ship). A build-time guard warns and ignores
  any `gumroad_url` left in the CSV. Pre-migration CSV preserved at `backups/products-gumroad-v2.csv`.
- Products without a `payhip_url` show a **"Coming soon"** state (no dead links).
- 2,186 empty filler rows removed from `products.csv` (they caused 2,186 build warnings on every deploy).

## To finish go-live

1. Paste the Payhip links for the 14 products into `payhip-links-mapping.txt`, then
   `node scripts/apply-payhip-links.mjs payhip-links-mapping.txt && npm run build`
   (or just put each link into the `payhip_url` column of `products.csv`).
2. Commit + push — Netlify auto-deploys (build `npm run build`, publish `dist`, Node 22).
3. Optional, in Netlify → Site settings → Environment variables:
   - `PAYHIP_API_KEY` (Payhip → Settings → Developer tab) if you use license keys.
   - `PAYHIP_WEBHOOK_SECRET` + webhook URL in Payhip if you want sale-event logging.
4. Test one purchase end-to-end.
