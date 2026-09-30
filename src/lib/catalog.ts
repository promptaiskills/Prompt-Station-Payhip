/**
 * catalog.ts — the data engine.
 *
 * Loads products.csv at build time, fingerprints each row to the taxonomy
 * generated from the uploaded TXT files (src/data/taxonomy.json), and exposes
 * typed lookups used by every page: product pages, catalog pages, search index,
 * featured/related/recent products.
 *
 * The CSV is intentionally the ONLY place product data lives. Add a row →
 * rebuild → the product appears in its subcategory page, product page, search
 * index, sitemap and structured data automatically.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, splitList } from './csv.mjs';
import { slugify, normalizeForMatch } from './format.mjs';
import taxonomyJson from '../data/taxonomy.json';
import { SITE, SEO, SHOP, PAYHIP } from '../config/site.mjs';

/* ------------------------------------------------------------------ types */

export interface TaxonomySub {
  key: string;
  title: string;
  summary: string;
  order?: number;
}
export interface TaxonomyCategory {
  key: string;
  title: string;
  description: string;
  order?: number;
  subcategories: TaxonomySub[];
}
export interface TaxonomyCollection {
  key: string;
  label: string;
  tagline?: string;
  source?: string;
  order?: number;
  categories: TaxonomyCategory[];
}
interface TaxonomyFile {
  generatedAt?: string;
  stats?: { collections?: number; categories?: number; subcategories?: number };
  collections: TaxonomyCollection[];
}

export interface ProductFaq {
  q: string;
  a: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string; // paragraphs split by \n
  categoryKey: string;
  categoryTitle: string;
  subcategoryKey: string;
  subcategoryTitle: string;
  subcategorySummary: string;
  collectionKey: string;
  collectionLabel: string;
  price: number;
  currency: string;
  compareAtPrice: number | null;
  image: string | null;
  gallery: string[];
  productType: string;
  fileFormat: string;
  compatibility: string;
  benefits: string[];
  includes: string[];
  features: string[];
  faqs: ProductFaq[];
  tags: string[];
  payhipUrl: string;
  /** Direct Payhip checkout URL (/buy?link=KEY) — derived from payhipUrl. */
  payhipCheckoutUrl: string;
  payhipProductId: string;
  payhipPermalink: string;
  featured: boolean;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string | null;
  updatedAtTs: number;
  order: number;
}

export interface SearchIndexItem {
  slug: string;
  k: string; // category key (stable URL seed)
  n: string; // name
  c: string; // category title
  s: string; // subcategory title
  t: string[]; // tags
  d: string; // short description
  p: number; // price
  i: string | null; // image
  u: string; // payhip product url
  b: string; // payhip direct checkout url (falls back to u)
  f: boolean; // featured
}

type CatLookup = Map<string, TaxonomyCategory>;
type SubLookup = Map<string, TaxonomySub & { category: TaxonomyCategory; collection: TaxonomyCollection }>;

/* ------------------------------------------------------------------ internals */

export const taxonomy = taxonomyJson as unknown as TaxonomyFile;

export const collections: TaxonomyCollection[] = taxonomy.collections ?? [];

/** Resolve a `library` column value (e.g. "2.txt", "Library 2", "L2" or the
 *  collection key "collection-02") to a taxonomy collection, or undefined. */
export function matchCollection(ref: string | undefined | null): TaxonomyCollection | undefined {
  const v = String(ref ?? '').trim().toLowerCase();
  if (!v) return undefined;

  const txt = v.match(/(\d+)\s*\.txt/);
  if (txt) return collections.find((c) => c.order === Number(txt[1]));

  const num = v.match(/library\s*(\d+)/) || v.match(/(?:^|\b)l(\d+)\b/) || v.match(/^(\d+)$/);
  if (num) return collections.find((c) => c.order === Number(num[1]));

  const byKey = collections.find((c) => c.key === v);
  if (byKey) return byKey;

  const n = normalizeForMatch(ref ?? '');
  return collections.find((c) => normalizeForMatch(c.label) === n) ?? collections.find((c) => normalizeForMatch(c.source ?? '') === n);
}

const catByKey = new Map<string, TaxonomyCategory>();
const catByNorm = new Map<string, TaxonomyCategory[]>();
const subByKey = new Map<string, TaxonomySub & { category: TaxonomyCategory; collection: TaxonomyCollection }>();
const subByNormGlobal = new Map<string, Array<TaxonomySub & { category: TaxonomyCategory }>>();

for (const coll of collections) {
  for (const cat of coll.categories ?? []) {
    catByKey.set(cat.key, cat);
    const nrm = normalizeForMatch(cat.title);
    const arr = catByNorm.get(nrm) ?? [];
    arr.push(cat);
    catByNorm.set(nrm, arr);
    for (const sub of cat.subcategories ?? []) {
      subByKey.set(sub.key, { ...sub, category: cat, collection: coll });
      const snrm = normalizeForMatch(sub.title);
      const sarr = subByNormGlobal.get(snrm) ?? [];
      sarr.push({ ...sub, category: cat });
      subByNormGlobal.set(snrm, sarr);
    }
  }
}

function matchCategory(value: string, coll?: TaxonomyCollection): TaxonomyCategory | null {
  const v = normalizeForMatch(value);
  if (!v) return null;

  if (coll) {
    const byKey = coll.categories.find((c) => c.key === v);
    if (byKey) return byKey;
    const byNorm = coll.categories.filter((c) => normalizeForMatch(c.title) === v);
    if (byNorm.length >= 1) return byNorm[0];
  }

  const byKey = catByKey.get(v);
  if (byKey) return byKey;
  const byNorm = catByNorm.get(v);
  if (byNorm && byNorm.length === 1) return byNorm[0];
  if (byNorm && byNorm.length > 1) {
    // identical titles in different collections — prefer the requested library
    if (coll) {
      const inColl = byNorm.find((c) => coll.categories.some((x) => x.key === c.key));
      if (inColl) return inColl;
    }
    return byNorm[0];
  }

  // prefix match (≥5 chars)
  const pool = coll ? coll.categories : Array.from(catByNorm.values()).flat();
  let best: TaxonomyCategory | null = null;
  for (const c of pool) {
    const nrm = normalizeForMatch(c.title);
    if (v.length >= 5 && (nrm.startsWith(v) || v.startsWith(nrm))) {
      best = c;
      if (nrm.startsWith(v)) break; // strong match
    }
  }
  return best;
}

function matchSubcategory(category: TaxonomyCategory | null, value: string, coll?: TaxonomyCollection) {
  const v = normalizeForMatch(value);
  if (!v) return null;

  // Strict library scope: search only within the requested collection.
  if (coll) {
    const scope = coll.categories.flatMap((c) => c.subcategories.map((s) => ({ s, cat: c })));
    const byKey = scope.find(({ s }) => s.key === v);
    if (byKey) return { ...byKey.s, category: byKey.cat, collection: coll };
    const byNorm = scope.filter(({ s }) => normalizeForMatch(s.title) === v);
    if (byNorm.length >= 1) return { ...byNorm[0].s, category: byNorm[0].cat, collection: coll };
  }

  // Global pools (each entry carries its own category)
  const poolGlobal = subByNormGlobal.get(v) ?? [];
  let pool = category ? poolGlobal.filter((s) => s.category.key === category.key) : poolGlobal;
  if (pool.length === 0 && category) pool = poolGlobal;
  if (pool.length >= 1) {
    const first = pool[0];
    const collection = collections.find((c) => c.categories.some((x) => x.key === first.category.key)) ?? null;
    return { ...first, collection };
  }

  // prefix match (≥5 chars)
  let best: (TaxonomySub & { category: TaxonomyCategory; collection: TaxonomyCollection | null }) | null = null;
  for (const [nrm, subs] of subByNormGlobal) {
    if (v.length >= 5 && (nrm.startsWith(v) || v.startsWith(nrm))) {
      const candidates = category ? subs.filter((s) => s.category.key === category.key) : subs;
      const picked = candidates[0] ?? (category ? undefined : subs[0]);
      if (picked) {
        const collection = collections.find((c) => c.categories.some((x) => x.key === picked.category.key)) ?? null;
        best = { ...picked, collection };
        if (nrm.startsWith(v)) break;
      }
    }
  }
  return best;
}

function loadCsvRows(): Array<Record<string, string>> {
  const path = join(process.cwd(), 'products.csv');
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    console.error(
      `\n[ERROR] products.csv not found at ${path}.\n` +
        `The store's catalog is data-driven — copy products.csv (see the README) into the project root.\n`
    );
    return [];
  }
  return parseCsv(text);
}

function toBool(v: string | undefined, fallback = false): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  return ['yes', 'true', '1', 'y', 'on'].includes(s);
}

function parseFaqs(raw: string): ProductFaq[] {
  const entries = splitList(raw, '||');
  const out: ProductFaq[] = [];
  for (const entry of entries) {
    const idx = entry.indexOf('::');
    if (idx === -1) {
      out.push({ q: entry, a: '' });
    } else {
      out.push({ q: entry.slice(0, idx).trim(), a: entry.slice(idx + 2).trim() });
    }
  }
  return out.filter((f) => f.q);
}

const parseDescription = (raw: string) => String(raw ?? '').replace(/\\n/g, '\n').trim();

/* ------------------------------------------------------------------ build */

let catalogCache: {
  products: Product[];
  bySlug: Map<string, Product>;
  bySubcategory: Map<string, Product[]>;
  byCategory: Map<string, Product[]>;
} | null = null;

function buildCatalog() {
  const products: Product[] = [];
  const bySlug = new Map<string, Product>();
  const bySubcategory = new Map<string, Product[]>();
  const byCategory = new Map<string, Product[]>();
  const usedSlugs = new Map<string, number>();
  const warnings: string[] = [];

  const rows = loadCsvRows();
  for (const r of rows) {
    const id = r.id;
    const name = r.name;
    if (!id || !name) {
      warnings.push(`Skipped a CSV row missing "id" or "name" (${JSON.stringify(r).slice(0, 120)}...)`);
      continue;
    }
    const coll = matchCollection(r.library);
    if (r.library && !coll) warnings.push(`${id}: library "${r.library}" did not match a known library (use 1.txt…11.txt, "Library N" or a collection key).`);
    const category = matchCategory(r.category, coll ?? undefined);
    const sub = matchSubcategory(category, r.subcategory, coll ?? undefined);
    if (!category) warnings.push(`${id}: category "${r.category}" did not match the taxonomy (fix the CSV or taxonomy${coll ? ` — not found in library "${coll.label}"` : ''}).`);
    if (!sub) warnings.push(`${id}: subcategory "${r.subcategory}" did not match the taxonomy (fix the CSV or taxonomy${coll ? ` — not found in library "${coll.label}"` : ''}).`);

    let slug = slugify(r.slug) || slugify(name) || 'product';
    slug = slug.slice(0, 100);
    let candidate = slug;
    let i = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${slug}-${i}`;
      i += 1;
    }
    usedSlugs.set(candidate, 1);
    slug = candidate;

    const price = Number.parseFloat(r.price ?? '');
    const currency = r.currency || SHOP.currency;
    const compareAtPrice = r.compare_at_price ? Number.parseFloat(r.compare_at_price) : null;
    const updatedAt = r.updated_at || null;
    const updatedAtTs = updatedAt ? Date.parse(updatedAt) || 0 : 0;

    // status semantics: empty/'published' → live, anything else (draft,
    // unpublished, hidden) keeps the row out of the storefront.
    const status = (r.status || 'published').toLowerCase();
    const isPublished = !['draft', 'unpublished', 'hidden'].includes(status);

    // Payhip product link. Accepts a full payhip.com/b/KEY URL, b/KEY, or the
    // bare product key — normalised via PAYHIP.normalizeProductUrl. Legacy
    // gumroad_url values are ignored (with a warning) so no dead Gumroad
    // links can ever reach the live site.
    const urlRaw = r.payhip_url || (r.payhip_permalink ? `https://payhip.com/b/${r.payhip_permalink}` : '');
    if (!urlRaw && r.gumroad_url) {
      warnings.push(`${id}: legacy "gumroad_url" ignored — set the product's new Payhip link in the "payhip_url" column.`);
    }
    const payhipUrl = PAYHIP.normalizeProductUrl(urlRaw);
    const payhipCheckoutUrl = payhipUrl ? PAYHIP.checkoutUrlFor(payhipUrl) : '';
    const image = r.image || null;
    const gallery = [image, ...splitList(r.gallery_images)].filter((x): x is string => Boolean(x));

    const categoryTitle = category?.title ?? r.category;
    const subTitle = sub?.title ?? r.subcategory;
    const collectionKey = sub?.collection?.key ?? category?.key ?? '';
    const collectionLabel = sub?.collection?.label ?? 'Catalog';

    const product: Product = {
      id,
      name,
      slug,
      shortDescription: r.short_description || '',
      description: parseDescription(r.description || r.short_description || ''),
      categoryKey: category?.key ?? '',
      categoryTitle,
      subcategoryKey: sub?.key ?? '',
      subcategoryTitle: subTitle,
      subcategorySummary: sub?.summary ?? '',
      collectionKey,
      collectionLabel,
      price: Number.isFinite(price) ? price : 0,
      currency,
      compareAtPrice: Number.isFinite(compareAtPrice ?? NaN) ? compareAtPrice : null,
      image,
      gallery: [...new Set(gallery)],
      productType: r.product_type || 'skill-pack',
      fileFormat: r.file_format || '',
      compatibility: r.compatibility || '',
      benefits: splitList(r.benefits),
      includes: splitList(r.includes),
      features: splitList(r.features),
      faqs: parseFaqs(r.faqs),
      tags: splitList(r.tags).map((t) => t.toLowerCase()),
      payhipUrl,
      payhipCheckoutUrl,
      payhipProductId: r.payhip_product_id || '',
      payhipPermalink: r.payhip_permalink || '',
      featured: toBool(r.featured),
      published: isPublished,
      seoTitle: r.seo_title || `${name} — ${SITE.name}`,
      seoDescription: r.seo_description || (r.short_description || SEO.defaultDescription).slice(0, 170),
      updatedAt,
      updatedAtTs,
      order: Number.parseInt(r.order ?? '0', 10) || 0,
    };

    products.push(product);
    bySlug.set(product.slug, product);
    if (product.published && product.subcategoryKey) {
      const arr = bySubcategory.get(product.subcategoryKey) ?? [];
      arr.push(product);
      bySubcategory.set(product.subcategoryKey, arr);
    }
    if (product.published && product.categoryKey) {
      const arr = byCategory.get(product.categoryKey) ?? [];
      arr.push(product);
      byCategory.set(product.categoryKey, arr);
    }
  }

  const sortProducts = (a: Product, b: Product) =>
    Number(b.featured) - Number(a.featured) ||
    a.order - b.order ||
    b.updatedAtTs - a.updatedAtTs ||
    a.name.localeCompare(b.name);

  products.sort(sortProducts);
  for (const arr of bySubcategory.values()) arr.sort(sortProducts);
  for (const arr of byCategory.values()) arr.sort(sortProducts);

  if (warnings.length) {
    console.warn(`\n[CATALOG] ${warnings.length} warning(s) while reading products.csv:`);
    warnings.forEach((w) => console.warn(`  • ${w}`));
  }

  catalogCache = { products, bySlug, bySubcategory, byCategory };
  return catalogCache;
}

/* ------------------------------------------------------------------ public API */

export function getCatalog() {
  return catalogCache ?? buildCatalog();
}

export function getProducts(): Product[] {
  return getCatalog().products.filter((p) => p.published);
}

export function getProductBySlug(slug: string): Product | undefined {
  const p = getCatalog().bySlug.get(slug);
  return p && p.published ? p : undefined;
}

export function getProductsBySubcategory(subKey: string): Product[] {
  return getCatalog().bySubcategory.get(subKey) ?? [];
}

export function getProductsByCategory(catKey: string): Product[] {
  return getCatalog().byCategory.get(catKey) ?? [];
}

export function getFeaturedProducts(limit = 8): Product[] {
  return getProducts().filter((p) => p.featured).slice(0, limit);
}

export function getLatestProducts(limit = SHOP.latestCount): Product[] {
  return [...getProducts()]
    .sort((a, b) => b.updatedAtTs - a.updatedAtTs || b.order - a.order)
    .slice(0, limit);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const pool = getProducts().filter((p) => p.id !== product.id);
  const sameSub = pool.filter((p) => p.subcategoryKey === product.subcategoryKey);
  const sameCat = pool.filter((p) => p.categoryKey === product.categoryKey && p.subcategoryKey !== product.subcategoryKey);
  const rest = pool.filter((p) => !sameSub.includes(p) && !sameCat.includes(p));
  return [...sameSub, ...sameCat, ...rest].slice(0, limit);
}

/** Counts for a subcategory: products available in the store vs total taxonomy. */
export function getSubcategoryStats(subKey: string) {
  return getProductsBySubcategory(subKey).length;
}

export function getCategoryStats(catKey: string) {
  const cat = catByKey.get(catKey);
  const subs = cat?.subcategories ?? [];
  const products = getProductsByCategory(catKey);
  return {
    category: cat ?? null,
    subcategoryCount: subs.length,
    subcategoriesWithProducts: subs.filter((s) => getSubcategoryStats(s.key) > 0).length,
    productCount: products.length,
  };
}

export function getCollectionStats(collKey: string) {
  const coll = collections.find((c) => c.key === collKey);
  const cats = coll?.categories ?? [];
  let productCount = 0;
  let subCount = 0;
  for (const c of cats) {
    subCount += c.subcategories.length;
    productCount += getProductsByCategory(c.key).length;
  }
  return { collection: coll ?? null, categoryCount: cats.length, subcategoryCount: subCount, productCount };
}

export function getSubcategoryByIdentity(catKey: string, subKey: string) {
  const cat = catByKey.get(catKey);
  const sub = subByKey.get(subKey);
  if (!cat || !sub || sub.category.key !== cat.key) return { category: cat ?? null, subcategory: null };
  return { category: cat, subcategory: sub };
}

export function getSearchIndex(): SearchIndexItem[] {
  return getProducts().map((p) => ({
    slug: p.slug,
    k: p.categoryKey,
    n: p.name,
    c: p.categoryTitle,
    s: p.subcategoryTitle,
    t: p.tags,
    d: p.shortDescription,
    p: p.price,
    i: p.image,
    u: p.payhipUrl,
    b: p.payhipCheckoutUrl || p.payhipUrl,
    f: p.featured,
  }));
}

/** Category keys popular on the catalog index / homepage. */
export function getFeaturedCategories(keys: string[] = SHOP.featuredCategories) {
  return keys
    .map((k) => ({ key: k, ...getCategoryStats(k) }))
    .filter((c) => c.category);
}