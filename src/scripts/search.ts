/**
 * search.ts — live search over the static catalog index.
 *
 * Server-rendered results are replaced/enhanced client-side:
 *  • debounced live matching on titles, descriptions, categories and tags
 *  • category chips + sort controls
 *  • an honest, conversational EMPTY STATE that offers to build the product
 *  • the failed query is carried into the service-request form (/request?q=)
 */

import { escapeHtml, ensure } from './utils';

interface IndexItem {
  slug: string;
  k: string; // category key
  n: string; // name
  c: string; // category title
  s: string; // subcategory title
  t: string[]; // tags
  d: string; // short description
  p: number; // price
  i: string | null; // image
  u: string; // payhip product url
  b: string; // payhip direct checkout url
  f: boolean; // featured
}

const input = ensure(document.querySelector<HTMLInputElement>('[data-search-input]'), 'search input');
const results = ensure(document.querySelector<HTMLElement>('[data-results]'), 'search results');
const countEl = document.querySelector<HTMLElement>('[data-count]');

let index: IndexItem[] = [];
let debounce: number | undefined;

function price(value: number) {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function cardHtml(item: IndexItem): string {
  const img = item.i
    ? `<img src="/${item.i}" alt="" width="1200" height="900" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]">`
    : '';
  const imgWrap = `<a href="/products/${escapeHtml(item.slug)}/" class="relative block aspect-[4/3] overflow-hidden bg-brand-soft" tabindex="-1" aria-hidden="true">${img}</a>`;
  return `
  <article class="card card-hover group flex flex-col overflow-hidden">
    ${imgWrap}
    <div class="flex flex-1 flex-col gap-2 p-4 sm:p-5">
      <p class="text-xs font-medium text-ink-faint">
        <a href="/catalog/${escapeHtml(item.k)}/" class="rounded-sm hover:text-brand hover:underline">${escapeHtml(item.c)}</a>
      </p>
      <h3 class="font-display text-[1.05rem] font-bold leading-snug tracking-tight">
        <a href="/products/${escapeHtml(item.slug)}/" class="rounded-sm transition-colors hover:text-brand">${escapeHtml(item.n)}</a>
      </h3>
      <div class="mt-auto flex items-center justify-between gap-3 pt-3">
        <span class="tabular font-display text-lg font-bold">${price(item.p)}</span>
        <a href="${escapeHtml(item.b || item.u)}" class="payhip-button inline-flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep">Buy now</a>
      </div>
    </div>
  </article>`;
}

function score(item: IndexItem, tokens: string[]): number {
  const name = item.n.toLowerCase();
  const cat = item.c.toLowerCase();
  const sub = item.s.toLowerCase();
  const desc = item.d.toLowerCase();
  const tags = item.t.join(' ').toLowerCase();
  if (tokens.every((t) => name.includes(t))) return 0;
  if (tokens.some((t) => name.includes(t))) return 1;
  if (tokens.every((t) => tags.includes(t))) return 2;
  if (tokens.some((t) => sub.includes(t) || cat.includes(t) || desc.includes(t))) return 3;
  return 4;
}

function looseMatch(item: IndexItem, tokens: string[]): boolean {
  const hay = `${item.n} ${item.c} ${item.s} ${item.d} ${item.t.join(' ')}`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

const state = { q: '', category: 'all', sort: 'relevance' };

function render() {
  const tokens = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  let items: IndexItem[] = index;
  let loose = false;
  if (tokens.length > 0) {
    const strict = items.filter((it) => tokens.every((t) => `${it.n} ${it.c} ${it.s} ${it.d} ${it.t.join(' ')}`.toLowerCase().includes(t)));
    if (strict.length > 0) {
      items = strict;
    } else {
      items = items.filter((it) => looseMatch(it, tokens));
      loose = items.length > 0;
    }
  }
  if (state.category !== 'all') items = items.filter((it) => it.c === state.category);
  const scored = items
    .map((it) => ({ it, score: tokens.length ? score(it, tokens) : 0 }))
    .sort((a, b) => {
      if (state.sort === 'price-asc') return a.it.p - b.it.p;
      if (state.sort === 'price-desc') return b.it.p - a.it.p;
      if (state.sort === 'name') return a.it.n.localeCompare(b.it.n);
      return a.score - b.score || Number(b.it.f) - Number(a.it.f) || a.it.n.localeCompare(b.it.n);
    })
    .map((x) => x.it);

  if (countEl) {
    countEl.textContent = tokens.length
      ? `${scored.length} result${scored.length === 1 ? '' : 's'} for “${state.q}”${loose ? ' (closest matches shown)' : ''}`
      : `${index.length} products in the catalog`;
  }

  if (tokens.length === 0) {
    results.innerHTML = `<div class="max-w-xl"><h2 class="font-display text-xl font-bold tracking-tight">Try searching for</h2><ul class="mt-4 space-y-2.5 text-sm">${index
      .filter((x) => x.f)
      .slice(0, 5)
      .map((x) => `<li><a href="/search/?q=${encodeURIComponent(x.s)}" class="font-semibold text-brand underline-offset-2 hover:underline">${escapeHtml(x.s)}</a></li>`)
      .join('')}<li><a href="/catalog/" class="font-semibold text-brand underline-offset-2 hover:underline">…or browse the full catalog</a></li></ul></div>`;
    return;
  }

  if (scored.length === 0) {
    results.innerHTML = emptyHtml(state.q);
    return;
  }
  const heading = `<div class="mb-6"><h2 class="font-display text-xl font-bold tracking-tight">Results for “${escapeHtml(state.q)}”</h2><p class="mt-1 text-sm text-ink-faint">${scored.length} match${scored.length === 1 ? '' : 'es'} found across the catalog${loose ? ' (closest matches shown)' : ''}</p></div>`;
  results.innerHTML = `${heading}<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">${scored.map(cardHtml).join('')}</div>`;
}

function emptyHtml(q: string): string {
  const e = escapeHtml(q);
  const suggestions = [...new Set(index.map((x) => x.c))].slice(0, 5);
  return `
  <div class="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
    <div class="card flex flex-col items-start p-8 sm:p-10">
      <p class="eyebrow">We’re listening</p>
      <h2 class="mt-3 font-display text-2xl font-bold tracking-tight">“${e}” isn’t in the store yet</h2>
      <ol class="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
        <li class="flex gap-3"><span class="font-display font-bold text-brand">1</span><span>We checked titles, descriptions, categories and tags — no matches for <strong>“${e}”</strong>.</span></li>
        <li class="flex gap-3"><span class="font-display font-bold text-brand">2</span><span>Every product in the catalog is a designed AI skill, so a missing niche is simply one we haven’t built yet.</span></li>
        <li class="flex gap-3"><span class="font-display font-bold text-brand">3</span><span>Tell us what you want it to do — we may be able to create it for you.</span></li>
      </ol>
      <div class="mt-7 flex flex-wrap gap-3">
        <a href="/request/?q=${encodeURIComponent(q)}&source=search" class="btn-primary px-5 py-3">Request it — we may build it →</a>
        <a href="/catalog/" class="btn-outline px-5 py-3">Browse the catalog</a>
      </div>
      <p class="mt-4 text-xs text-ink-faint">Your search term is passed straight into the request form — you won’t have to retype it.</p>
    </div>
    <aside class="rounded-md border border-line bg-surface p-6">
      <h2 class="font-display text-base font-bold tracking-tight">While you’re here, explore</h2>
      <ul class="mt-4 space-y-2 text-sm">
        ${suggestions.map((c) => `<li><a href="/search/?q=${encodeURIComponent(c)}" class="font-semibold text-brand underline-offset-2 hover:underline">${escapeHtml(c)}</a></li>`).join('')}
      </ul>
    </aside>
  </div>`;
}

function applyControls() {
  const categories = [...new Set(index.map((x) => x.c))].sort();

  // Sort select
  const sel = document.createElement('select');
  sel.className = 'mb-6 block rounded-md border border-line-strong bg-surface px-3 py-2 text-sm';
  sel.setAttribute('aria-label', 'Sort results');
  sel.innerHTML =
    '<option value="relevance">Sort: relevance</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name A to Z</option>';
  sel.value = state.sort;
  sel.addEventListener('change', () => {
    state.sort = sel.value;
    render();
  });

  // Category chips
  const chipWrap = document.createElement('div');
  chipWrap.className = 'mb-6 flex flex-wrap gap-2';
  const chip = (cat: string) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'border px-3 py-1.5 text-xs font-semibold rounded-md transition ' +
      (state.category === cat ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-soft hover:border-ink');
    btn.textContent = cat === 'all' ? 'All' : cat;
    btn.setAttribute('aria-pressed', String(state.category === cat));
    btn.addEventListener('click', () => {
      state.category = cat;
      chipWrap.innerHTML = '';
      chipWrap.append(chip('all'), ...categories.map((c) => chip(c)));
      render();
    });
    return btn;
  };
  chipWrap.append(chip('all'), ...categories.map((c) => chip(c)));

  const controls = document.createElement('div');
  controls.className = 'flex flex-wrap items-start justify-between gap-4';
  controls.append(chipWrap, sel);
  results.parentElement?.insertBefore(controls, results);
}

async function init() {
  // Prefer the index inlined at build time (works without network / JS fetch
  // policies); fall back to the static endpoint when not present.
  const inlineEl = document.getElementById('search-index-data');
  if (inlineEl) {
    try {
      index = JSON.parse(inlineEl.textContent || '[]');
    } catch {
      index = [];
    }
  }
  if (!index.length) {
    try {
      const res = await fetch('/search-index.json');
      if (!res.ok) throw new Error('index not found');
      index = await res.json();
    } catch {
      /* keep whatever we have */
    }
  }
  if (!index.length) return;

  // The initial query comes from the URL (?q=), not the input value: the page
  // is statically rendered so the input is empty at load time even when the
  // user arrived via a search link.
  const urlQ = new URLSearchParams(window.location.search).get('q') ?? '';
  state.q = urlQ.trim() || input.value.trim();
  input.value = state.q;
  applyControls();
  render();
}

input.addEventListener(
  'input',
  () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      state.q = input.value.trim();
      const url = new URL(window.location.href);
      url.searchParams.set('q', state.q);
      window.history.replaceState(null, '', url.toString());
      document.title = state.q ? `Search: ${state.q} — Prompt Station` : 'Search all AI skills — Prompt Station';
      render();
    }, 180);
  },
  { passive: true }
);

void init();