#!/usr/bin/env node
/**
 * apply-payhip-links.mjs — one-shot helper to wire Payhip product links into
 * products.csv.
 *
 * Usage:
 *   node scripts/apply-payhip-links.mjs path/to/mapping.txt
 *
 * The mapping file contains one product per line:
 *   slug , https://payhip.com/b/KEY      (full URL, b/KEY, or bare KEY all work)
 *   slug , KEY
 * Separators may be a comma, tab, semicolon or pipe. Lines starting with #
 * are ignored. Instead of the slug you may also use the product id (PS-00001)
 * or the exact product name.
 *
 * The script normalises every value to a full Payhip URL, writes the
 * `payhip_url` column of products.csv in place, and prints a summary of
 * matched / unmatched lines.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAYHIP } from '../src/config/site.mjs';
import { parseCsv } from '../src/lib/csv.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-payhip-links.mjs path/to/mapping.txt');
  process.exit(1);
}

const csvPath = join(process.cwd(), 'products.csv');
const text = readFileSync(csvPath, 'utf8');
const rows = parseCsv(text);
if (!rows.length) {
  console.error('products.csv is empty or unreadable.');
  process.exit(1);
}
const header = Object.keys(rows[0]);
if (!header.includes('payhip_url')) {
  console.error('products.csv has no payhip_url column.');
  process.exit(1);
}

const bySlug = new Map(rows.map((r) => [String(r.slug || '').trim().toLowerCase(), r]));
const byId = new Map(rows.map((r) => [String(r.id || '').trim().toLowerCase(), r]));
const byName = new Map(rows.map((r) => [String(r.name || '').trim().toLowerCase(), r]));

const mapping = readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

let applied = 0;
const unmatched = [];

for (const line of mapping) {
  const parts = line.split(/\s*[,;\t|]\s*/);
  if (parts.length < 2) {
    unmatched.push({ line, reason: 'could not split into "slug , payhip link"' });
    continue;
  }
  const ref = parts[0].trim();
  const link = parts.slice(1).join(',').trim(); // allow commas inside pasted URLs
  const row =
    bySlug.get(ref.toLowerCase()) ||
    byId.get(ref.toLowerCase()) ||
    byName.get(ref.toLowerCase());
  if (!row) {
    unmatched.push({ line, reason: `no product matches "${ref}" (slug, id or name)` });
    continue;
  }
  row.payhip_url = PAYHIP.normalizeProductUrl(link);
  applied += 1;
}

// --- write back -----------------------------------------------------------
const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const out = [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
writeFileSync(csvPath, out, 'utf8');

console.log(`✅ Applied ${applied} Payhip link(s) to products.csv.`);
if (unmatched.length) {
  console.warn(`⚠️  ${unmatched.length} line(s) not applied:`);
  for (const u of unmatched.slice(0, 20)) console.warn(`  • ${u.line} — ${u.reason}`);
  if (unmatched.length > 20) console.warn(`  …and ${unmatched.length - 20} more`);
}
console.log('Now run: npm run build');
