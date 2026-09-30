# products.csv — every column explained

`products.csv` is the **entire product catalog**. One row = one product.
Edit it in any spreadsheet app (Excel, Google Sheets, Numbers), save as CSV, rebuild.

The header row must stay exactly as shipped. All columns are **lowercase with underscores**.
**All columns are optional except:** `id`, `name`, `category`, `subcategory`, `price`
(plus `payhip_url` if you want a Buy button — rows without it show "Coming soon").

| # | Column | Required | What it does | Notes / defaults |
| --- | --- | --- | --- | --- |
| 1 | `id` | ✅ | Unique product code (e.g. `PS-0100`) | Used as SKU in structured data. Must be unique. |
| 2 | `name` | ✅ | Product title | Shown on cards, pages, search, title tag. |
| 3 | `slug` | ⭕ | URL: `/products/<slug>/` | If empty, generated from the name automatically. |
| 4 | `short_description` | ⭕ | 1–2 sentence summary | Card subtitle + fallback SEO description. |
| 5 | `description` | ⭕ | Full product page description | Use `\n\n` (literal backslash-n-n) to separate paragraphs. |
| 6 | `category` | ✅ | Category title **or** its slug, e.g. `CONTENT, WRITING & LOCALIZATION` | Fuzzy-matched against the taxonomy; build logs a warning if unmatched. |
| 7 | `subcategory` | ✅ | Subcategory title **or** its slug, e.g. `Copywriting` | Same matching rules as category. |
| 8 | `price` | ✅ | Price as a plain number: `12` or `19.99` | Decimal, no currency symbol. |
| 9 | `currency` | ⭕ | 3-letter code | Default `USD`. Symbols come from `SHOP.currencySymbols` in site config. |
| 10 | `compare_at_price` | ⭕ | Former/higher price for a "was $X, now $Y" display | Leave blank for none. |
| 11 | `image` | ⭕ | Main cover path under `public/`, e.g. `images/products/name.svg` | Missing file → branded placeholder. Can also be an absolute URL. |
| 12 | `gallery_images` | ⭕ | Extra gallery images, pipe-separated: `img1.png\|img2.png` | The main image is always first in the gallery. |
| 13 | `product_type` | ⭕ | Chip on cards: `prompt-pack`, `workflow-kit`, `template`, `course`… | Displayed as-is (hyphens become spaces). |
| 14 | `file_format` | ⭕ | What the buyer receives: `Markdown + PDF`, `ZIP`… | Shown near the Buy button & in the details table. |
| 15 | `compatibility` | ⭕ | Tools it works with: `ChatGPT · Claude · Gemini` | Shown in the details table. |
| 16 | `benefits` | ⭕ | Bullet list, pipe-separated `Benefit 1\|Benefit 2` | Rendered as a checklist on the product page. |
| 17 | `includes` | ⭕ | "What's included" list, pipe-separated | Rendered as a checklist. |
| 18 | `features` | ⭕ | Notable features list, pipe-separated | Rendered as a checklist. |
| 19 | `faqs` | ⭕ | FAQ entries: `Question::Answer` separated by `\|\|` | Rendered in an accessible accordion. |
| 20 | `tags` | ⭕ | Search keywords, pipe-separated, e.g. `copywriting\|ads` | Matched by search; shown on the product page. |
| 21 | `payhip_url` | ✅* | Payhip product link — full URL (`https://payhip.com/b/KEY`), `b/KEY`, or the bare product KEY | Used for the Buy button (direct checkout link is derived automatically). *Rows without it show "Coming soon". Bulk helper: `node scripts/apply-payhip-links.mjs mapping.txt`. |
| 22 | `payhip_product_id` | ⭕ | Payhip product key (the code in the product URL, e.g. `ZjHXI`) | Only needed for the license-verify widget. |
| 23 | `payhip_permalink` | ⭕ | Product key as a fallback (if `payhip_url` empty, builds the URL from this) | Optional convenience. |
| 24 | `featured` | ⭕ | `YES`/`YES` empty | Controls homepage "Editor’s picks" & featured badges. |
| 25 | `status` | ⭕ | `published` (default) or `draft` | Draft rows are excluded from the storefront entirely. |
| 26 | `seo_title` | ⭕ | Exact `<title>` for the product page | Auto-generated from the name if empty. |
| 27 | `seo_description` | ⭕ | Meta description (≤ ~170 chars) | Auto-generated from the short description if empty. |
| 28 | `updated_at` | ⭕ | `YYYY-MM-DD` | Sorts "latest drops". |
| 29 | `order` | ⭕ | Integer sort weight (lower = first) | Within any section/grid. |

## Tips

- **Literal `\n`** in the description column becomes a real newline; `\n\n` = new paragraph.
- **Pipes** separate list items. If a bullet itself contains a comma, wrap the *whole cell* in quotes
  (most spreadsheets do this automatically when saving CSV).
- **Unmatched `category`/`subcategory` values** are logged at build time as `[CATALOG]` warnings — the product
  still builds (it appears in search + its own page) but won't appear under the intended collection page.
- **Never edit `src/data/taxonomy.json` category names** unless you also update the CSV values; it's easier to
  keep the CSV using the display titles exactly as shown on the site.

## Copy-paste header row

```
id,name,slug,short_description,description,category,subcategory,library,price,currency,compare_at_price,image,gallery_images,product_type,file_format,compatibility,benefits,includes,features,faqs,tags,payhip_url,payhip_product_id,payhip_permalink,featured,status,seo_title,seo_description,updated_at,order
```

## Adding a whole new category

1. Add a new numbered TXT file to `taxonomy-source/` (e.g. `12.txt`) with a header line + numbered skill lines.
2. Run `npm run taxonomy` (or just `npm run build`) — the category and its collections appear in the catalog
   automatically.
3. Add products with that new `category`/`subcategory` to the CSV.