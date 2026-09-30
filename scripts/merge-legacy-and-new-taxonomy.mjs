#!/usr/bin/env node
/** Merge old skills (backup) + new TXT skills into combined source files. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKUP_TAX = join(ROOT, 'backups', 'taxonomy-v1.json');
const BACKUP_CSV = join(ROOT, 'backups', 'products-v1.csv');
const CSV_PATH = join(ROOT, 'products.csv');
const SRC_DIR = join(ROOT, 'taxonomy-source');
const NEW_UPLOADS = '/home/user/uploads';

const stripEmoji = (s) =>
  s.replace(/\p{Extended_Pictographic}/gu, '').replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, '').trim();

// 1. Restore old data
console.log('Restoring old taxonomy + products from backup...');
const oldJson = JSON.parse(readFileSync(BACKUP_TAX, 'utf8'));
writeFileSync(join(ROOT, 'src', 'data', 'taxonomy.json'), readFileSync(BACKUP_TAX, 'utf8'));
writeFileSync(CSV_PATH, readFileSync(BACKUP_CSV, 'utf8'));
console.log('  old subcategories:', oldJson.stats.subcategories);

// 2. Merge each library
console.log('Merging new TXT skills into combined source files...');
for (let n = 1; n <= 11; n++) {
  const newTxt = readFileSync(join(NEW_UPLOADS, n + '.txt'), 'utf8');
  const lines = newTxt.split('\n').map(l => l.trim());

  // Parse new TXT: category headers + subcategories
  const newCats = [];
  let curCat = null;
  for (const raw of lines) {
    if (!raw) continue;
    if (/^[=#\-]{5,}\s*$/.test(raw)) continue;
    const itemMatch = raw.match(/^(\d+)[.)]?\s+(.*)$/);
    if (itemMatch) {
      const body = itemMatch[2].trim().replace(/["]+$/g, '');
      const colon = body.indexOf(':');
      const title = (colon === -1 ? body : body.slice(0, colon)).trim();
      const summary = (colon === -1 ? '' : body.slice(colon + 1)).trim();
      if (title && curCat) curCat.subs.push({ order: +itemMatch[1], title, summary });
      continue;
    }
    curCat = { title: stripEmoji(raw).replace(/^#+\s*/, '').trim(), subs: [] };
    if (curCat.title) newCats.push(curCat);
  }

  const oldColl = oldJson.collections.find(c => c.order === n);
  if (!oldColl) { console.error('  lib', n, 'not found in backup'); continue; }

  // Build merged TXT content
  let out = '\n\n';
  for (const oldCat of oldColl.categories) {
    out += oldCat.title + '\n';
    // Old subs
    for (const s of oldCat.subcategories) {
      out += s.order + '. ' + s.title + ': ' + (s.summary || '') + '\n';
    }
    // New subs — find matching category by normalized title
    const nrm = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = newCats.find(nc => nrm(nc.title) === nrm(oldCat.title));
    if (match) {
      const offset = oldCat.subcategories.length;
      for (const ns of match.subs) {
        out += (offset + ns.order) + '. ' + ns.title + ': ' + ns.summary + '\n';
      }
    } else {
      console.warn('  WARNING: no matching category in new TXT for [' + n + '] ' + oldCat.title);
    }
  }
  out += '\n';

  mkdirSync(SRC_DIR, { recursive: true });
  writeFileSync(join(SRC_DIR, n + '.txt'), out);
  const oldSubs = oldColl.categories.reduce((a, c) => a + c.subcategories.length, 0);
  const newSubCount = newCats.reduce((a, c) => a + c.subs.length, 0);
  console.log('  lib ' + n + ' => ' + oldSubs + ' old + ' + newSubCount + ' new = ' + (oldSubs + newSubCount) + ' skills');
}

console.log('\nDone. Now run:');
console.log('  node scripts/build-taxonomy.mjs');
console.log('  node scripts/seed-full-catalog.mjs');
console.log('  npm run assets');
console.log('  npm run build');