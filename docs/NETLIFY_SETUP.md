# Netlify deployment guide

## Requirements

- Node **22.x** (set automatically via `netlify.toml` → `NODE_VERSION = "22"`).
- The repo contains everything Netlify needs — no build plugins required.

## Option A — Git deploy (recommended)

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Netlify → **Add new site → Import an existing project**.
3. Netlify auto-detects the config from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy. First deploy runs `npm install` + `npm run build` (which also regenerates the taxonomy from your TXT
   files and any missing placeholder covers).

## Option B — CLI / drag-and-drop

```bash
npm install
npm run build
npx netlify deploy --prod --dir=dist     # drag-and-drop of dist/ works too
```

Netlify Forms are detected from the HTML at deploy time — always deploy the *built* `dist/` (not `src/`), and
remember the forms are submitted to the deployed site's own URL.

## Environment variables (Netlify → Site settings → Environment variables)

| Variable | Required? | Purpose |
| --- | --- | --- |
| (none) | — | The storefront, Payhip checkout links and forms run without any secrets |
| `PAYHIP_API_KEY` | Optional | Payhip account API key (Settings → Developer tab); powers `/api/payhip-license-verify` |
| `PAYHIP_WEBHOOK_SECRET` | Optional | Authenticates Payhip webhook calls to `/api/payhip-webhook?token=…` |
| `SITE_URL` | Optional (mirror) | The canonical domain is set in `src/config/site.mjs` → `SITE.url`; set the env var only if you want it visible to the functions too |

> Canonicals, sitemap, OG URLs and robots.txt use `SITE.url` — **that must be your real domain**, not the env var,
> though keeping both in sync is good practice.

## Built-in behaviour you get for free

- **Functions**: `netlify/functions/*` auto-deploy (ESM `.mjs`, no bundler config needed) →
  `/api/payhip-webhook`, `/api/payhip-license-verify`.
- **Forms**: `data-netlify="true"` forms (service-request, contact) are auto-activated, spam-filtered via their
  honeypots, and land in **Forms → Submissions** + email notifications.
- **404**: Netlify serves `dist/404.html` for unmatched routes automatically.
- **Redirects/headers**: configured in `netlify.toml` (security headers + `/_astro/*` immutable caching; a
  ready-to-enable CSP is included commented-out).

## Custom domain & SSL

1. Site config → Domain management → Add custom domain → follow the DNS instructions.
2. Set `SITE.url` in `src/config/site.mjs` to `https://www.yourdomain.com` (no trailing slash) and redeploy.
3. Update `public/robots.txt` sitemap URL (it uses the placeholder domain until you set yours).
4. Netlify provisions SSL automatically.

## Post-deploy verification (5 minutes)

1. Load `/`, `/catalog/`, one subcategory, one product, `/search/?q=copywriting`, `/request/`.
2. Submit the contact form — check Netlify **Forms** for the submission.
3. Load `/sitemap-index.xml` and `/robots.txt`.
4. From the Payhip side: test a "Buy" click with a **test product** (buy your own Payhip product, then refund
   the test order) — verify the Payhip checkout tab opens and the receipt/download email arrives.
5. Force a 404 (`/definitely-not-a-page`) and confirm the branded 404 shows.

## Local preview

Run `npm run build && npm run preview` to serve the production build locally. Note that Netlify Forms and
serverless functions only run on Netlify — locally, forms will show the honest "could not reach the submission
service" error, which is expected.