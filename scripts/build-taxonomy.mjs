#!/usr/bin/env node
/**
 * build-taxonomy.mjs
 * ------------------------------------------------------------------
 * Reads the raw category/subcategory TXT files in ./taxonomy-source
 * and generates:
 *   1. src/data/taxonomy.json  — the store taxonomy (single source of truth
 *      for categories & subcategories, consumed by every page)
 *   2. docs/CATEGORY_STRUCTURE.md — human-readable hierarchy report
 *
 * HOW IT WORKS
 *   Each uploaded TXT file contains:
 *     - BLOCK HEADER lines  => Categories (e.g. "CONTENT, WRITING & LOCALIZATION")
 *     - numbered skill lines => Subcategories (e.g. "1. Copywriting: Writing sales pages...")
 *   Header styles vary between files (plain caps, "### Emoji Title", "==== title ====")
 *   so detection is style-agnostic: any non-empty line that does NOT start with a
 *   number is treated as a category header; numbered lines become subcategories.
 *
 * RE-RUNNING
 *   node scripts/build-taxonomy.mjs
 *   Re-run any time you add/edit the TXT files. The website build itself also
 *   runs this automatically (see package.json "prebuild") so the site and the
 *   source files can never drift apart.
 *
 * EDITING
 *   After generation you may hand-edit src/data/taxonomy.json (descriptions,
 *   collection labels). Hand edits survive re-runs: the generator only writes
 *   the whole file when the source structure changes version-wise — otherwise it
 *   merges the new description/label fields you edited over re-parsed output.
 *   (Simplest rule: descriptions/labels added by you in the JSON are kept.)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = join(ROOT, 'taxonomy-source');
const OUT_JSON = join(ROOT, 'src', 'data', 'taxonomy.json');
const OUT_MD = join(ROOT, 'docs', 'CATEGORY_STRUCTURE.md');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const stripEmoji = (s) =>
  s
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // diacritics
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

/** Truncate a slug at a word boundary, optional max length. */
const truncSlug = (slug, max = 64) => {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  const idx = cut.lastIndexOf('-');
  return idx > 24 ? cut.slice(0, idx) : cut;
};

const unique = (map, base) => {
  if (!map.has(base)) {
    map.set(base, 1);
    return base;
  }
  let n = 2;
  while (map.has(`${base}-${n}`)) n += 1;
  const key = `${base}-${n}`;
  map.set(key, 1);
  return key;
};

/* Collection labels + tagged taglines, derived from the CONTENT of each file.
   These are intent-groupings of the categories found inside each uploaded file;
   edit them freely in this map or later in src/data/taxonomy.json. */
const COLLECTIONS = {
  '1.txt': {
    label: 'Business, Content & Creative Skills',
    tagline: 'Core workplace skills for writing, design, marketing, sales, software and education teams.',
  },
  '2.txt': {
    label: 'Industry & Corporate Functions',
    tagline: 'Specialist AI skills for finance, legal, healthcare, HR, real estate, logistics, security and more.',
  },
  '3.txt': {
    label: 'Everyday & Lifestyle AI',
    tagline: 'Practical AI skills for personal content, productivity, side hustles, learning, travel and home life.',
  },
  '4.txt': {
    label: 'Practical Everyday Utilities',
    tagline: 'Day-to-day AI utilities for devices, careers, shopping, learning, meals, DIY, travel and community.',
  },
  '5.txt': {
    label: 'Public Sector & Enterprise Tech',
    tagline: 'AI skills for government, aviation, maritime, heavy industry, research, automotive and media.',
  },
  '6.txt': {
    label: 'Ocean, Chemical & Advanced Industry',
    tagline: 'Deep technical AI for marine science, chemical engineering, textiles, energy, quantum and forensics.',
  },
  '7.txt': {
    label: 'Agri-Biotech, Mining & Precision Ops',
    tagline: 'High-precision AI for veterinary bio-tech, mining automation, polar logistics and smart grids.',
  },
  '8.txt': {
    label: 'Materials, Bio-Tech & Defense Engineering',
    tagline: 'AI for material informatics, synthetic biology, subterranean defense, reg-tech and space sensors.',
  },
  '9.txt': {
    label: 'Space, Energy & Next-Gen Systems',
    tagline: 'AI for space operations, cyber defense, renewables, metallurgy, heritage, mining and urban mobility.',
  },
  '10.txt': {
    label: 'Frontier Engineering & Emerging Science',
    tagline: 'AI for climate, neural interfaces, cryogenics, nanotech, hypersonics, drone transit and advanced infra.',
  },
  '11.txt': {
    label: 'Deep Science & Futurist Systems',
    tagline: 'AI for biomimetics, micro-satellites, geothermal energy, ancient genetics, avionics and astrobiology.',
  },
};

/** Build a professional category blurb from its title and subcategories. */
function buildCategoryDescription(title, subs) {
  const names = subs.slice(0, 4).map((s) => s.title);
  const t = title.trim();
  const lead = `A curated set of structured AI skills for ${t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}.`;
  if (names.length < 3) {
    return `${lead} Each skill is packaged as a reusable prompt-and-workflow kit you can drop straight into your AI tools.`;
  }
  return (
    `${lead} Collections within it cover ${names.slice(0, -1).join(', ')} and ${names.slice(-1)}. ` +
    'Each skill ships as a ready-to-use prompt kit with clear instructions, inputs and quality checks, ' +
    'engineered so the output slots directly into real workflows.'
  );
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

const files = readdirSync(SRC_DIR)
  .filter((f) => /^\d+\.txt$/.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

const usedSlugs = new Map();
const collections = [];
let subCatTotal = 0;
let categoryTotal = 0;
const warnings = [];

for (const file of files) {
  const raw = readFileSync(join(SRC_DIR, file), 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = raw.split('\n');
  const collInfo = COLLECTIONS[file] || {
    label: `Collection from ${file}`,
    tagline: 'AI skills organised from the uploaded source file.',
  };

  const collection = {
    key: `collection-${parseInt(file, 10).toString().padStart(2, '0')}`,
    label: collInfo.label,
    tagline: collInfo.tagline,
    source: basename(file),
    order: parseInt(file, 10),
    categories: [],
  };

  let current = null;
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (/^[=#\-]{5,}\s*$/.test(line)) continue; // separator rows e.g. =========
    const itemMatch = line.match(/^(\d+)[.)]?\s+(.*)$/);
    if (itemMatch) {
      const body = itemMatch[2].trim().replace(/["]+$/g, '');
      const colon = body.indexOf(':');
      const title = (colon === -1 ? body : body.slice(0, colon)).trim();
      const summary = (colon === -1 ? '' : body.slice(colon + 1)).trim();
      if (!title) continue;
      const key = unique(usedSlugs, truncSlug(slugify(title)) || 'skill');
      if (current) {
        current.subcategories.push({
          key,
          title,
          summary,
          order: +itemMatch[1],
        });
        subCatTotal += 1;
      } else {
        warnings.push(`${file}: item "${title}" appeared before any category header`);
      }
      continue;
    }
    // Otherwise: category header line
    const title = stripEmoji(line).replace(/^#+\s*/, '').trim();
    if (!title) continue;
    const key = unique(usedSlugs, truncSlug(slugify(title)));
    current = {
      key,
      title,
      description: '', // filled after subcategories are known
      order: ++categoryTotal,
      subcategories: [],
    };
    collection.categories.push(current);
  }

  // Drop categories that ended up with zero subcategories (e.g. stray headers)
  collection.categories = collection.categories.filter((c) => c.subcategories.length > 0);
  // Re-number category order sequentially within the collection
  collection.categories.forEach((c, i) => {
    c.order = i + 1;
    c.description = c.description || buildCategoryDescription(c.title, c.subcategories);
  });

  collections.push(collection);
}

/* ------------------------------------------------------------------ */
/* Keep hand-edited descriptions/labels where possible                 */
/* ------------------------------------------------------------------ */

if (existsSync(OUT_JSON)) {
  try {
    const prev = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
    const prevCat = new Map();
    for (const c of prev.collections || []) {
      for (const cat of c.categories || []) {
        prevCat.set(`${c.key}/${cat.key}`, cat);
      }
    }
    for (const c of collections) {
      for (const cat of c.categories) {
        const old = prevCat.get(`${c.key}/${cat.key}`);
        if (old) {
          if (old.description && old.description !== cat.description) cat.description = old.description;
          if (old.labelCustom) cat.labelCustom = old.labelCustom;
          const prevSubs = new Map((old.subcategories || []).map((s) => [s.key, s]));
          for (const sub of cat.subcategories) {
            const os = prevSubs.get(sub.key);
            if (os && os.summaryOverride) sub.summaryOverride = os.summaryOverride;
            if (os && os.notes) sub.notes = os.notes;
          }
        }
      }
      const oldColl = prev.collections.find((p) => p.key === c.key);
      if (oldColl && oldColl.labelOverride) c.labelOverride = oldColl.labelOverride;
    }
  } catch {
    /* fresh generation */
  }
}

const stats = {
  collections: collections.length,
  categories: collections.reduce((n, c) => n + c.categories.length, 0),
  subcategories: subCatTotal,
};

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  note: 'Auto-generated by scripts/build-taxonomy.mjs from taxonomy-source/*.txt. Edit descriptions here — they are merged back on re-generation. Do not remove the file. Product counts are computed at build time from products.csv.',
  stats,
  collections,
};

mkdirSync(join(ROOT, 'src', 'data'), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

/* ------------------------------------------------------------------ */
/* Markdown report                                                     */
/* ------------------------------------------------------------------ */

const md = [
  '# Category & Subcategory Structure',
  '',
  `_Generated automatically from the uploaded TXT files by \`scripts/build-taxonomy.mjs\` on ${out.generatedAt}._`,
  '',
  `**${stats.collections} source libraries • ${stats.categories} categories • ${stats.subcategories} subcategories**`,
  '',
  ...collections.flatMap((c) => [
    '',
    `## ${c.order}. ${c.label}  \`(${c.source})\``,
    '',
    `_${c.tagline}_`,
    '',
    ...c.categories.flatMap((cat) => [
      '',
      `### ${cat.title} — ${cat.subcategories.length} subcategories`,
      '',
      ...cat.subcategories.map((s) => {
        const badge = s.summaryOverride || s.summary;
        return `- **${s.title}**${badge ? ` — ${badge}` : ''}`;
      }),
    ]),
  ]),
  '',
].join('\n');

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(OUT_MD, md);

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

console.log(`\n✅ Taxonomy generated -> src/data/taxonomy.json`);
console.log(`   Libraries:    ${stats.collections}`);
console.log(`   Categories:   ${stats.categories}`);
console.log(`   Subcategories:${stats.subcategories}`);
console.log(`   Report:       docs/CATEGORY_STRUCTURE.md`);
if (warnings.length) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.slice(0, 20).forEach((w) => console.log(`   - ${w}`));
}