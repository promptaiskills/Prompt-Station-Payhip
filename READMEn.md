# Prompt Station — Storefront

A production-ready, fully data-driven ecommerce storefront for AI skills (prompt packs & workflow kits),
built with **Astro + Tailwind CSS**, fulfilled through **Payhip**, and deployed on **Netlify**.

- **Catalog**: 1,100+ skill collections across 106 categories, generated from your uploaded TXT files.
- **Products**: driven entirely by a single `products.csv` — add a row, rebuild, the product appears everywhere.
- **Checkout**: Buy buttons hand off to Payhip's secure hosted checkout (direct checkout links); delivery stays on Payhip.
- **Search**: full-text search with a conversational "request it" empty state.
- **Service requests**: 4-step conversational form (Netlify Forms).

---

## Quick start

```bash
npm install
npm run build      # builds the full static site (also regenerates taxonomy + placeholder images)
npm run dev        # local dev server at http://localhost:4321
```

> Node 22+ is required (`netlify.toml` already sets `NODE_VERSION = 22`).

## Before you go live — the 30-minute version

1. **Edit `src/config/site.mjs`** — replace every `YOUR_...` placeholder (domain, email, Payhip username, socials).
2. **Edit `products.csv`** — replace the sample rows with your real products (see `docs/CSV_COLUMNS.md`).
3. **`npm run build`** and check the console output for `[CATALOG]` warnings (unmatched rows).
4. **Deploy** — connect the repo to Netlify (build `npm run build`, publish `dist`), or `npm run deploy`.
5. **Go through `docs/LAUNCH_CHECKLIST.md`** — it maps every remaining task.

Everything you must replace is listed in the launch checklist. Nothing is scattered: business config lives in
**one file** (`src/config/site.mjs`), Payhip config in **one section** of that file, the catalog in **one CSV**.

---

## Architecture at a glance

```
products.csv ───────────────┐
                           ▼
taxonomy-source/*.txt  ──► scripts/build-taxonomy.mjs ──► src/data/taxonomy.json
                           ▲                                  │
                           └──── (runs automatically on build) │
                                                               ▼
                                    src/lib/catalog.ts  (data engine: products × taxonomy)
                                               │
        ┌──────────────┬──────────────┬────────┴───────┬──────────────┐
        ▼              ▼              ▼                ▼              ▼
   product pages  category pages subcategory pages  search index  sitemap/SEO
   /products/x  /catalog/x     /catalog/x/y      /search-index.json
```

### The three data inputs

| Input | What it drives | How to change it |
| --- | --- | --- |
| `taxonomy-source/*.txt` | Categories & subcategories (the store's information architecture) | Edit/add a numbered TXT file, run `npm run taxonomy` (auto-runs on build) |
| `products.csv` | Every product, its page, price, Payhip link, images, SEO | Add/edit a row, rebuild |
| `src/config/site.mjs` | Brand, domain, contact, socials, Payhip handle, currency, service copy | Edit the file |

### How to add a new product (the normal case)

1. Duplicate a row in `products.csv`.
2. Change `id`, `name`, `price`, `payhip_url` (+ image path and SEO fields as desired).
3. Keep `category` / `subcategory` as the exact titles from the catalog (fuzzy matching tolerates minor differences).
4. `npm run build` → the product now has its own page, appears in its subcategory page, search, sitemap, structured data.
5. (Optional) run `npm run assets` to auto-generate a placeholder cover if you have no artwork yet.

> **No HTML, no component edits, no new pages.** New categories/subcategories follow from the TXT files, not code.

---

## Key folders

| Path | Purpose |
| --- | --- |
| `src/config/site.mjs` | ⚙️ **All business configuration** — the file you edit before launch |
| `src/data/taxonomy.json` | Generated category/subcategory taxonomy (editable by hand; merged on regen) |
| `src/lib/` | Data engine: CSV parser, catalog lookups, formatters |
| `src/components/` | Layout, header/footer, product card, buy button, breadcrumbs, FAQ, empty states |
| `src/pages/` | Homepage, catalog, category, subcategory, product, search, request, how-it-works, about, contact, legal, 404 |
| `src/scripts/` | Small browser scripts (header, buy dialog, search, forms, gallery, verify) |
| `netlify/functions/` | Serverless functions: Payhip webhook receiver + license verification |
| `products.csv` | 🛒 **The product catalog** |
| `taxonomy-source/` | Your uploaded category/subcategory TXT files (keep in sync) |
| `public/images/products/` | Product covers (CSV points at these paths; placeholders included) |
| `docs/` | All runbook documentation |

---

## Features & how they work

- **Static-first, tiny JS.** 1,222 pages, ~85 KB total CSS + JS. No framework in the browser beyond small vanilla modules.
- **Data-driven everything.** Category pages, subcategory pages, product pages, featured/latest/related sections,
  search index, sitemap and JSON-LD are all generated from `products.csv` + `taxonomy.json`.
- **Purchase experience.** `src/components/PayhipButton.astro` + `src/scripts/buy.ts`:
  accessible checkout dialog → Payhip hosted checkout (new tab) → honest ready/opened/popup-blocked states.
  Files are never served by this site; Payhip handles payment AND delivery (see `docs/LIMITATIONS.md` for the
  honest expiry of this model).
- **Search.** `/search` server-renders initial results, then upgrades to live client-side filtering with category
  chips and sorting. The empty state carries the failed query into the request form.
- **Conversational service requests.** `/request` is a guided 4-step flow; without JavaScript it degrades to a
  plain working form. Submissions go to Netlify Forms (no backend needed).
- **SEO.** Unique titles/descriptions from the CSV, canonical URLs, OG/Twitter cards, `Product`, `BreadcrumbList`,
  `ItemList`, `WebSite`, `FAQPage` and `Service` schema, sitemap, robots.txt.
- **Accessibility.** Semantic landmarks, skip link, focus-visible rings, accessible dialog/focus trap, native
  `<details>` everywhere JS isn't needed, `prefers-reduced-motion` support, keyboard navigable menus.
- **Security.** No secrets in the client. Netlify env vars for the optional webhook secret. Honeypots on forms.
  Security headers in `netlify.toml`. Paid files never live in `public/`.

## Documentation index

| Doc | Contents |
| --- | --- |
| [`docs/CSV_COLUMNS.md`](docs/CSV_COLUMNS.md) | Every column in the catalog, what it does, defaults, examples |
| [`docs/CATEGORY_STRUCTURE.md`](docs/CATEGORY_STRUCTURE.md) | The full hierarchy generated from your TXT files |
| [`docs/PAYHIP_SETUP.md`](docs/PAYHIP_SETUP.md) | Buy buttons & checkout links, product URLs, webhooks, license keys |
| [`docs/NETLIFY_SETUP.md`](docs/NETLIFY_SETUP.md) | Deploy, forms, functions, env vars, custom domain |
| [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) | Every value to replace + final verification steps |
| [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) | Payhip purchase-verification & file-delivery limits, honestly explained |