/**
 * header.ts — minimal progressive header behavior:
 *  • mobile menu toggle (button ↔ panel, aria-expanded, Esc close, focus return)
 *  • catalog <details> drop-down closes on outside click / Esc
 *  • search panel toggle + autofocus
 * Everything is optional — without JS the menu links remain usable.
 */

const MOBILE_BUTTON = document.querySelector<HTMLButtonElement>('[data-menu-button]');
const MOBILE_PANEL = document.querySelector<HTMLElement>('[data-menu-panel]');
const SEARCH_BUTTON = document.querySelector<HTMLButtonElement>('[data-search-button]');
const SEARCH_PANEL = document.querySelector<HTMLElement>('[data-search-panel]');
const CATALOG_DETAILS = document.querySelector<HTMLElement>('[data-catalog-menu]');

function closeMobileMenu() {
  if (!MOBILE_BUTTON || !MOBILE_PANEL) return;
  MOBILE_BUTTON.setAttribute('aria-expanded', 'false');
  MOBILE_PANEL.hidden = true;
}

if (MOBILE_BUTTON && MOBILE_PANEL) {
  MOBILE_BUTTON.addEventListener('click', () => {
    const open = MOBILE_BUTTON.getAttribute('aria-expanded') === 'true';
    MOBILE_BUTTON.setAttribute('aria-expanded', String(!open));
    MOBILE_PANEL.hidden = open;
    if (!open) {
      const first = MOBILE_PANEL.querySelector<HTMLElement>('a, button');
      requestAnimationFrame(() => first?.focus());
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

if (SEARCH_BUTTON && SEARCH_PANEL) {
  SEARCH_BUTTON.addEventListener('click', () => {
    const open = SEARCH_BUTTON.getAttribute('aria-expanded') === 'true';
    SEARCH_BUTTON.setAttribute('aria-expanded', String(!open));
    SEARCH_PANEL.hidden = open;
    if (!open) {
      const input = SEARCH_PANEL.querySelector<HTMLInputElement>('input[name="q"]');
      requestAnimationFrame(() => input?.focus());
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && SEARCH_PANEL && !SEARCH_PANEL.hidden) {
      SEARCH_PANEL.hidden = true;
      SEARCH_BUTTON.setAttribute('aria-expanded', 'false');
      SEARCH_BUTTON.focus();
    }
  });
}

if (CATALOG_DETAILS) {
  const summary = CATALOG_DETAILS.querySelector('summary');
  CATALOG_DETAILS.addEventListener('toggle', () => {
    if ((CATALOG_DETAILS as HTMLDetailsElement).open && summary) {
      summary.setAttribute('aria-expanded', 'true');
    } else if (summary) {
      summary.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', (e) => {
    if (CATALOG_DETAILS instanceof HTMLDetailsElement && CATALOG_DETAILS.open && !CATALOG_DETAILS.contains(e.target as Node)) {
      CATALOG_DETAILS.open = false;
      summary?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && CATALOG_DETAILS instanceof HTMLDetailsElement && CATALOG_DETAILS.open) {
      CATALOG_DETAILS.open = false;
      summary?.setAttribute('aria-expanded', 'false');
      summary?.focus();
    }
  });
}