#!/usr/bin/env node
/**
 * generate-assets.mjs
 * ------------------------------------------------------------------
 * Generates placeholder cover images for catalog products (and a generic
 * fallback) so the store always renders a polished card, even before real
 * artwork exists. Nothing here is permanent — when you add a real product
 * image the CSV points to, these placeholders are simply ignored.
 *
 *   node scripts/generate-assets.mjs
 *
 * Runs automatically on `npm run build` (prebuild) and on Netlify.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../src/lib/csv.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_PRODUCTS = join(ROOT, 'public', 'images', 'products');
const FALLBACK = join(ROOT, 'public', 'images', 'placeholder.svg');

/** Muted, professional hues — deterministic pick per product id. */
const PALETTE = [
  { band: '#2E3A8C', soft: '#EEF0F8' }, // indigo
  { band: '#1F6F5C', soft: '#ECF5F1' }, // green
  { band: '#8A4A3A', soft: '#F7EFEC' }, // rust
  { band: '#475569', soft: '#F1F3F6' }, // slate
  { band: '#7A5AA6', soft: '#F3EFF8' }, // violet
  { band: '#B45309', soft: '#FAF2E6' }, // amber
  { band: '#0F6B8A', soft: '#EDF5F8' }, // teal
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function wrap(text, maxLen) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = `${cur} ${w}`.trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, 4);
}

function coverSvg({ id, name, type, subcategory }) {
  const { band, soft } = PALETTE[hashStr(id) % PALETTE.length];
  const lines = wrap(name, 26);
  const fontSize = 64 - Math.max(0, lines.length - 2) * 6;
  const lineH = fontSize * 1.22;
  const blockH = lines.length * lineH;
  const yStart = 420 - blockH / 2;
  const text = lines
    .map(
      (ln, i) =>
        `<text x="90" y="${(yStart + i * lineH).toFixed(1)}" font-size="${fontSize}" font-weight="700" fill="#15181D" font-family="'Space Grotesk','Inter',Arial,sans-serif" letter-spacing="-0.5">${esc(ln)}</text>`
    )
    .join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${esc(name)} — AI skill pack cover">
  <rect width="1200" height="900" fill="${soft}"/>
  <path d="M0 0h1200v24H0z" fill="${band}"/>
  <rect x="90" y="70" width="9" height="9" fill="${band}"/>
  <text x="112" y="80" font-size="17" font-weight="600" letter-spacing="2.5" fill="${band}" font-family="'Inter',Arial,sans-serif">PROMPT STATION</text>
  <g stroke="${band}" stroke-opacity="0.14" stroke-width="1">
    <line x1="90" y1="240" x2="1110" y2="240"/><line x1="90" y1="320" x2="1110" y2="320"/>
    <line x1="90" y1="400" x2="1110" y2="400"/><line x1="90" y1="480" x2="1110" y2="480"/>
    <line x1="90" y1="560" x2="1110" y2="560"/><line x1="90" y1="640" x2="1110" y2="640"/>
  </g>
  ${text}
  <rect x="90" y="760" rx="999" width="30" height="30" fill="${band}"/>
  <text x="132" y="782" font-size="18" fill="#3F454E" font-family="'Inter',Arial,sans-serif">${esc(type || 'skill-pack')}</text>
</svg>
`;
}

const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Prompt Station product cover">
  <rect width="1200" height="900" fill="#F1F3F6"/>
  <path d="M0 0h1200v24H0z" fill="#15181D"/>
  <rect x="90" y="70" width="9" height="9" fill="#15181D"/>
  <text x="112" y="80" font-size="17" font-weight="600" letter-spacing="2.5" fill="#15181D" font-family="'Inter',Arial,sans-serif">PROMPT STATION</text>
  <text x="90" y="430" font-size="56" font-weight="700" fill="#15181D" font-family="'Space Grotesk','Inter',Arial,sans-serif">Prompt Station</text>
  <text x="90" y="490" font-size="22" fill="#3F454E" font-family="'Inter',Arial,sans-serif">AI skill packs & prompt systems</text>
</svg>
`;

function main() {
  mkdirSync(PUBLIC_PRODUCTS, { recursive: true });
  const csvPath = join(ROOT, 'products.csv');
  let rows = [];
  if (existsSync(csvPath)) {
    rows = parseCsv(readFileSync(csvPath, 'utf8'));
  } else {
    console.warn('[assets] products.csv not found — skipping product placeholders.');
  }
  let created = 0;
  for (const r of rows) {
    const image = (r.image || '').trim();
    if (!image || !image.startsWith('images/')) continue;
    const target = join(ROOT, 'public', image);
    if (existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, coverSvg({ id: r.id, name: r.name, type: r.product_type, subcategory: r.subcategory }));
    created += 1;
  }
  if (!existsSync(FALLBACK)) {
    writeFileSync(FALLBACK, fallbackSvg);
    created += 1;
  }
  console.log(`✅ Placeholder assets ready (${created} created). Point the CSV image column at real files to replace them.`);
}

main();