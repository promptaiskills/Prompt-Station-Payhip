#!/usr/bin/env node
/**
 * seed-full-catalog.mjs
 * ------------------------------------------------------------------
 * Fills EVERY subcategory in the taxonomy (11 libraries × 100 = 1,100)
 * with a complete, published product row in products.csv.
 *
 * Curated rows (already in the CSV) are preserved verbatim. Missing
 * subcategories get a structured auto-generated product built from the
 * taxonomy's own title + summary, so every collection page is stocked
 * and none reads "not yet stocked".
 *
 *   node scripts/seed-full-catalog.mjs
 *
 * Idempotent: rerunning skips subcategories that already have a product.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../src/lib/csv.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TAX = join(ROOT, 'src', 'data', 'taxonomy.json');
const CSV_PATH = join(ROOT, 'products.csv');

const HEADER = [
  'id', 'name', 'slug', 'short_description', 'description', 'category',
  'subcategory', 'library', 'price', 'currency', 'compare_at_price', 'image',
  'gallery_images', 'product_type', 'file_format', 'compatibility',
  'benefits', 'includes', 'features', 'faqs', 'tags', 'payhip_url',
  'payhip_product_id', 'payhip_permalink', 'featured', 'status',
  'seo_title', 'seo_description', 'updated_at', 'order',
];

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/* Deterministic fake-RNG (mulberry32) so reruns produce stable content. */
function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

const TYPE_LABEL = { 'prompt-pack': 'prompt pack', 'workflow-kit': 'workflow kit', 'skill-pack': 'skill pack' };

const P1 = [
  (s) => `This structured skill pack focuses on one thing: ${s.substr(0, 1).toLowerCase() + s.slice(1)}. It turns that task into a clear intake → process → output routine you can run with any modern chat AI, so the same job comes out consistent every time.`,
  (s) => `Purpose-built around ${s.substr(0, 1).toLowerCase() + s.slice(1)}, this pack gives you a repeatable, step-by-step way to brief your AI assistant, work through the task, and land on a review-ready result instead of starting from a blank prompt each time.`,
  (s) => `The job here is ${s.substr(0, 1).toLowerCase() + s.slice(1)} — and this pack turns it into a dependable workflow. You get a structured prompt sequence, sensible checkpoints, and output templates, all designed to keep your AI assistant on-task and your final result easy to review.`,
];
const P2 = [
  'Everything inside is copy-paste ready: a short intake checklist, a step-by-step prompt sequence, a worked example in your field, and adaptable output templates. The AI does the heavy lifting from your brief, while the structure keeps the result focused and auditable.',
  'The pack walks you from initial context through to finished output: what to gather first, which prompts to run in order, what to check before you call it done, and how to adapt the templates to your own context. No prompt engineering degree required.',
  'Inside you will find the intake sheet, the full prompt chain, a worked example, and review checklists that catch the usual mistakes before you share the result. Adapt them to your context and the same process works again and again.',
];
const P3 = [
  'You keep full control throughout — the assistant proposes, you decide. The pack ships as Markdown + PDF, is DRM-free, and works in ChatGPT, Claude, Gemini, or your own tooling. One-time purchase, instant delivery, yours to keep and adapt.',
  'No subscriptions, no retraining, no special software. Open the pack in any chat assistant you already use, follow the numbered steps, and reuse the templates as often as you like. It is built to be edited to your exact context.',
];

const BENEFITS = [
  (t, s) => `Purpose-built for ${t} — the process maps directly to the real task`,
  (t) => 'Copy-paste prompts you can adapt to your context',
  (t) => 'Intake-to-output routine with review checkpoints',
  (t) => 'Reusable templates that keep results consistent',
  (t) => 'Works in ChatGPT, Claude, Gemini and any chat assistant',
  (t) => 'Ship as Markdown + PDF, DRM-free',
  (t) => 'Plain-language instructions for non-technical users',
];
const INCLUDES = [
  (t) => `Intake & context sheet for ${t}`,
  () => 'Step-by-step prompt sequence',
  () => 'Worked example in the field',
  (t) => `Output & review checklist for ${t}`,
  () => 'Quick-reference card (one page)',
  () => 'Plain-language adaptation guide',
];
const FEATURES = [
  'Designed to run in any modern chat AI',
  'Formatted for copy-paste, easy to edit',
  'Instant delivery via Payhip',
  'Free updates (linked to your purchase)',
];
const FAQS = [
  'Do I need special software?::No. The pack works in ChatGPT, Claude, Gemini, or any chat assistant you already use.',
  'Is this an AI model?::No — it is a structured skill pack (prompts, templates, checklists) that makes your existing assistant better at this task.',
  'What exactly do I get?::The full pack as Markdown + PDF, delivered instantly after checkout, with a license to use and adapt it.',
];

function buildProduct({ libOrder, collection, cat, sub, id, seq }) {
  const key = `${libOrder}:${sub.key}`;
  const r = rng(key + ':' + id);
  const type = r() < 0.55 ? 'workflow-kit' : r() < 0.8 ? 'prompt-pack' : 'skill-pack';

  const title = sub.title.trim();
  const titleLower = title.charAt(0).toLowerCase() + title.slice(1);
  const summary = sub.summary ? sub.summary.trim().replace(/[.!?]+$/, '') : `planning, executing and reviewing ${titleLower}`;

  const name = title;
  const slug = sub.key;

  // description paragraphs — rotate variants by hash of the key
  const p1 = P1[Math.floor(r() * P1.length)](summary);
  const p2 = P2[Math.floor(r() * P2.length)];
  const p3 = P3[Math.floor(r() * P3.length)];
  const description = `${p1}\n\n${p2}\n\n${p3}`;

  const ben = BENEFITS.map((f) => f(titleLower)).slice(0, 4);
  const inc = INCLUDES.map((f) => f(titleLower)).slice(0, 5);
  const fea = FEATURES.slice(0, 3);

  const tags = [
    ...titleLower.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['and', 'the', 'for', 'with'].includes(w)).slice(0, 5),
    collection.label.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).slice(0, 2),
    'ai', 'skill',
  ].filter(Boolean).slice(0, 8);

  const price = 9 + Math.floor(r() * 7) * 3; // 9..27
  const compare = r() < 0.4 ? String(Math.round(price * 1.35)) : '';

  return {
    id,
    name,
    slug,
    short_description: sub.summary ? sub.summary.trim() : `A structured AI skill pack for ${titleLower}.`,
    description,
    category: cat.title,
    subcategory: sub.title,
    library: `${libOrder}.txt`,
    price: String(price),
    currency: 'USD',
    compare_at_price: compare,
    image: `images/products/${slug}.svg`,
    gallery_images: '',
    product_type: type,
    file_format: 'Markdown + PDF',
    compatibility: 'ChatGPT · Claude · Gemini',
    benefits: ben.join('|'),
    includes: inc.join('|'),
    features: fea.join('|'),
    faqs: FAQS.join('\n'),
    tags: tags.join('|'),
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '',
    payhip_permalink: '',
    featured: 'false',
    status: 'published',
    seo_title: name,
    seo_description: sub.summary ? sub.summary.trim() : '',
    updated_at: '2026-09-01',
    order: String(sub.order || seq),
  };
}

function main() {
  const taxonomy = JSON.parse(readFileSync(TAX, 'utf8'));
  const collections = taxonomy.collections ?? [];

  // Existing rows (preserved verbatim; first occurrence wins per id)
  const existing = existsSync(CSV_PATH) ? parseCsv(readFileSync(CSV_PATH, 'utf8')) : [];
  const byId = new Map();
  const covered = new Set(); // `${libOrder}:${subkey}` handled (curated or new)
  for (const r of existing) {
    if (!r.id) continue;
    if (!byId.has(r.id)) byId.set(r.id, r);
  }

  // Map curated rows to taxonomy subcategories by (library, exact title).
  for (const r of existing) {
    if (!r.id || r.status === 'draft') continue;
    const m = /^(\d+)\.txt$/.exec((r.library || '').trim());
    const libOrder = m ? Number(m[1]) : null;
    if (!libOrder) continue;
    const coll = collections.find((c) => c.order === libOrder);
    if (!coll) continue;
    let found = null;
    for (const cat of coll.categories) {
      const sub = cat.subcategories.find((s) => s.title.trim() === (r.subcategory || '').trim());
      if (sub) { found = sub; break; }
    }
    if (found) covered.add(`${libOrder}:${found.key}`);
  }

  // Per-library sequence counters (avoid clashing with curated ids).
  const seqByLib = new Map();
  for (const coll of collections) seqByLib.set(coll.order, 1);
  for (const r of existing) {
    const m = /^PS-(\d{2})/.exec((r.id || '').trim());
    if (!m) continue;
    const libOrder = Number(m[1]) + 1;
    if (!seqByLib.has(libOrder)) continue;
    const s = parseInt((r.id || '').replace(/^PS-\d{2}/, '') || '0', 10);
    if (!Number.isNaN(s) && s >= (seqByLib.get(libOrder) || 1)) seqByLib.set(libOrder, s + 1);
  }

  const slugUsed = new Set(HEADER.map((h) => h));
  for (const r of byId.values()) if (r.slug) slugUsed.add(r.slug);

  let created = 0;
  for (const coll of collections) {
    for (const cat of coll.categories) {
      for (const sub of cat.subcategories) {
        const cov = `${coll.order}:${sub.key}`;
        if (covered.has(cov)) continue;
        const seq = seqByLib.get(coll.order) || 1;
        seqByLib.set(coll.order, seq + 1);
        const id = `PS-${String(coll.order - 1).padStart(2, '0')}${String(seq).padStart(3, '0')}`;
        let slug = sub.key;
        if (slugUsed.has(slug)) slug = `${slug}-skill`;
        slugUsed.add(slug);
        const row = buildProduct({ libOrder: coll.order, collection: coll, cat, sub, id, seq });
        row.slug = slug;
        byId.set(id, row);
        covered.add(cov);
        created += 1;
      }
    }
  }

  const rows = Array.from(byId.values());
  writeFileSync(CSV_PATH, [HEADER.join(','), ...rows.map((r) => HEADER.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n');
  console.log(`✅ products.csv written: ${rows.length} rows total; ${created} subcategories newly stocked.`);
}

main();