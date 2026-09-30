/**
 * buy.ts — purchase experience for Payhip-backed products.
 *
 * WHAT IT DOES
 *  1. Intercepts a click on a .payhip-button and opens an accessible
 *     "secure checkout" dialog that confirms product + price, explains how
 *     delivery works, and then hands off to Payhip's hosted checkout
 *     (direct checkout link: https://payhip.com/buy?link=KEY) in a new tab.
 *  2. Communicates honest states: ready → checkout opened (guidance) /
 *     error (popup blocked or link unavailable → plain navigation).
 *
 * WHAT IT DOES NOT DO
 *  • It never claims to verify a purchase (that is impossible client-side).
 *  • It never exposes or proxies paid file URLs — files stay on Payhip.
 *  • It never touches Payhip credentials.
 */

import { trapFocus, readJson } from './utils';

interface BuyPayload {
  name: string;
  price: number;
  currency: string;
  compareAt: number | null;
  url: string;      // Payhip product page
  checkout: string; // Payhip direct checkout (/buy?link=KEY)
  slug: string;
  format: string;
}

let dialog: HTMLElement | null = null;
let restoreFocus: HTMLElement | null = null;
let cleanupTrap: (() => void) | null = null;

/* ------------------------------------------------------------------ dialog */

function currencySymbol(code: string): string {
  const map: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', KES: 'KSh ', JPY: '¥', CAD: 'C$', AUD: 'A$', INR: '₹', NGN: '₦', ZAR: 'R' };
  return map[code] ?? `${code} `;
}

function fmtPrice(value: number, code: string): string {
  const sym = currencySymbol(code);
  const decimals = Number.isInteger(value) ? 0 : 2;
  return `${sym}${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
}

function buildDialog(p: BuyPayload): HTMLElement {
  const d = document.createElement('div');
  d.className = 'ps-buy-dialog';
  d.innerHTML = `
    <div class="fixed inset-0 z-[70] overflow-y-auto bg-ink/45 p-4 sm:p-6" data-backdrop>
      <div role="dialog" aria-modal="true" aria-labelledby="ps-buy-title" class="mx-auto mt-8 w-full max-w-md rounded-lg border border-line bg-surface shadow-xl" tabindex="-1">
        <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p class="eyebrow">Secure checkout</p>
            <h2 id="ps-buy-title" class="mt-1 font-display text-lg font-bold leading-snug tracking-tight"></h2>
          </div>
          <button type="button" class="rounded-md p-1.5 text-ink-faint transition hover:bg-ink/5 hover:text-ink" data-close aria-label="Close and return to product">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="px-5 py-5" data-body></div>
        <div class="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-footer></div>
      </div>
    </div>`;
  d.querySelector('[data-body]')!.innerHTML = `
    <div class="mb-4 flex items-baseline gap-2">
      <span class="tabular font-display text-2xl font-bold" data-price></span>
      <span class="text-xs text-ink-soft" data-format></span>
    </div>
    <p class="mb-4 text-sm leading-relaxed text-ink-soft" data-note></p>
    <div class="mb-4 rounded-md border border-line bg-paper p-3 text-sm text-ink-soft" data-status role="status">
      <span data-status-label>Ready when you are.</span>
      <span data-status-detail class="block text-ink-faint"></span>
    </div>
    <details class="group text-sm">
      <summary class="flex items-center justify-between rounded-md px-3 py-2.5 font-semibold text-ink transition hover:bg-ink/5">
        How delivery works
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="transition-transform group-open:rotate-180"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </summary>
      <div class="px-3 pb-3 pt-1 leading-relaxed text-ink-soft" data-delivery></div>
    </details>`;
  const footer = d.querySelector('[data-footer]')!;
  footer.innerHTML = `
    <a href="${p.url}" target="_blank" rel="noopener" class="text-xs font-semibold text-brand underline-offset-2 hover:underline" data-direct>View on Payhip →</a>
    <div class="flex gap-2">
      <button type="button" class="btn-outline px-3 py-2 text-sm" data-close>Back to product</button>
      <button type="button" class="btn-primary px-4 py-2 text-sm" data-continue>Continue to secure checkout</button>
    </div>`;
  return d;
}

function openDialog(p: BuyPayload) {
  restoreFocus = document.activeElement as HTMLElement;
  dialog = buildDialog(p);
  const title = dialog.querySelector<HTMLElement>('#ps-buy-title')!;
  const price = dialog.querySelector<HTMLElement>('[data-price]')!;
  const format = dialog.querySelector<HTMLElement>('[data-format]')!;
  const note = dialog.querySelector<HTMLElement>('[data-note]')!;
  const status = dialog.querySelector<HTMLElement>('[data-status]')!;
  const statusLabel = dialog.querySelector<HTMLElement>('[data-status-label]')!;
  const statusDetail = dialog.querySelector<HTMLElement>('[data-status-detail]')!;
  const delivery = dialog.querySelector<HTMLElement>('[data-delivery]')!;
  const continueBtn = dialog.querySelector<HTMLButtonElement>('[data-continue]')!;
  const directLink = dialog.querySelector<HTMLAnchorElement>('[data-direct]')!;
  const closeButtons = dialog.querySelectorAll<HTMLButtonElement>('[data-close]');
  const backdrop = dialog.querySelector<HTMLElement>('[data-backdrop]')!;

  title.textContent = p.name;
  price.textContent = fmtPrice(p.price, p.currency);
  format.textContent = p.format ? `· ${p.format}` : '';
  note.textContent =
    'Payment is processed securely by Payhip (cards via Stripe, PayPal available). Once payment succeeds, your download links are emailed to you instantly.';
  delivery.innerHTML =
    '<ol class="list-decimal space-y-1.5 pl-4">' +
    '<li>Complete payment on Payhip’s secure checkout page.</li>' +
    '<li>Payhip emails your receipt with a secure download page link immediately.</li>' +
    '<li>Keep that email — the link lets you re-download your files (5 downloads per file for 30 days).</li>' +
    '<li>Lost the email? Contact us and we’ll re-send your download link.</li>' +
    '</ol>';

  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  cleanupTrap = trapFocus(dialog);
  const panel = dialog.querySelector<HTMLElement>('[role="dialog"]')!;
  // focus first control (continue) after a tick so the dialog is announced last
  requestAnimationFrame(() => continueBtn.focus());

  const setState = (label: string, detail: string, variant: 'busy' | 'ok' | 'error' | 'warn') => {
    statusLabel.textContent = label;
    statusDetail.textContent = detail;
    status.className =
      'mb-4 rounded-md border p-3 text-sm ' +
      (variant === 'busy' ? 'border-line bg-paper text-ink-soft' : variant === 'ok' ? 'border-success/30 bg-success-soft text-success' : variant === 'error' ? 'border-danger/30 bg-danger-soft text-danger' : 'border-line bg-warn-soft text-warn');
  };
  const setStage = (stage: 'ready' | 'opened' | 'blocked') => {
    if (stage === 'ready') {
      continueBtn.disabled = false;
      continueBtn.textContent = 'Continue to secure checkout';
      setState('Ready when you are.', 'You’ll finish payment on Payhip’s secure page — a new tab will open.', 'busy');
    } else if (stage === 'opened') {
      continueBtn.disabled = false;
      continueBtn.textContent = 'Reopen checkout tab';
      setState('Checkout opened', 'Complete payment in the Payhip tab. Need it again? Use “Reopen checkout tab”.', 'ok');
    } else {
      continueBtn.disabled = false;
      continueBtn.textContent = 'Try again';
      setState('Popup was blocked', 'Your browser blocked the new tab. Allow popups for this site, or use the “View on Payhip” link below.', 'error');
    }
  };

  directLink.addEventListener('click', () => closeDialog());
  closeButtons.forEach((b) => b.addEventListener('click', closeDialog));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDialog();
  });
  document.addEventListener('keydown', onKeydown);

  function launch() {
    const target = p.checkout || p.url;
    if (!target) {
      setStage('blocked');
      return;
    }
    const win = window.open(target, '_blank', 'noopener');
    if (win) {
      setStage('opened');
    } else {
      setStage('blocked');
    }
  }
  continueBtn.addEventListener('click', launch);

  setStage('ready');

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeDialog();
  }

  function closeDialog() {
    document.removeEventListener('keydown', onKeydown);
    cleanupTrap?.();
    dialog?.remove();
    dialog = null;
    document.body.style.overflow = '';
    panel?.focus({ preventScroll: true });
    restoreFocus?.focus({ preventScroll: true });
  }
}

/* ------------------------------------------------------------------ wiring */

document.addEventListener(
  'click',
  (e) => {
    // Only capture clicks on Payhip buttons we manage
    const target = (e.target as HTMLElement).closest?.('a.payhip-button') as HTMLAnchorElement | null;
    if (!target) return;

    const payload = readJson<BuyPayload>(target, 'data-ps');
    if (!payload) return; // plain link (e.g. search results) — let it navigate

    e.preventDefault();
    e.stopPropagation();

    openDialog(payload);
  },
  true
);
