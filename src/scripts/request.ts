/**
 * request.ts — conversational service-request experience.
 *
 * A single <form> (data-request-form) is enhanced into a guided, 4-step
 * flow while remaining a plain, fully-usable form without JavaScript:
 *  • steps are <fieldset data-step="1..N"> — JS hides all but the current one
 *  • native validation per step (required, email…)
 *  • the searched term (?q=) is preserved into the hidden `searched_query`
 *  • submits to Netlify Forms via netlifyForm.ts and swaps to a success panel
 */

import { submitNetlifyForm } from './netlifyForm';
import { ensure } from './utils';

const form = ensure(document.querySelector<HTMLFormElement>('[data-request-form]'), 'request form');

const STEPS = Array.from(form.querySelectorAll<HTMLElement>('[data-step]'));
const fieldsets = STEPS.length;
const progress = document.querySelector<HTMLElement>('[data-request-progress]');
const banner = document.querySelector<HTMLElement>('[data-search-banner]');
const bannerText = document.querySelector<HTMLElement>('[data-search-banner-text]');
const success = document.querySelector<HTMLElement>('[data-request-success]');

interface StepCtx {
  next?: HTMLButtonElement | null;
  back?: HTMLButtonElement | null;
}

const controls: StepCtx[] = [];

function stepValid(step: HTMLElement): boolean {
  const inputs = step.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  for (const el of inputs) {
    if (!el.value && el.hasAttribute('required')) return false;
    if (el instanceof HTMLInputElement && el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) return false;
  }
  return true;
}

function showStep(i: number) {
  STEPS.forEach((s, idx) => {
    s.hidden = idx !== i;
  });
  if (progress) {
    const label = STEPS[i]?.getAttribute('data-label') || '';
    progress.setAttribute('aria-current', 'step');
    progress.textContent = `Step ${i + 1} of ${fieldsets} — ${label}`;
  }
  const current = STEPS[i];
  const ctx = controls[i] ?? {};
  ctx.back?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function init() {
  // Hide all but the first step (JS enhancement only — no-JS keeps everything)
  showStep(0);

  const q = new URLSearchParams(window.location.search).get('q');
  const hiddenTerm = form.querySelector<HTMLInputElement>('input[name="searched_query"]');
  if (q && hiddenTerm) {
    hiddenTerm.value = q;
    if (banner && bannerText) {
      bannerText.textContent = q;
      banner.hidden = false;
    }
  }
  const dismiss = banner?.querySelector<HTMLButtonElement>('[data-dismiss]');
  dismiss?.addEventListener('click', () => {
    if (banner) banner.hidden = true;
    if (hiddenTerm) hiddenTerm.value = '';
  });

  STEPS.forEach((step, i) => {
    const next = step.querySelector<HTMLButtonElement>('[data-next]');
    const back = step.querySelector<HTMLButtonElement>('[data-back]');
    controls[i] = { next, back };
    next?.addEventListener('click', () => {
      if (!stepValid(step)) {
        step.querySelector<HTMLInputElement>('input:invalid, textarea:invalid, select:invalid')?.focus();
        return;
      }
      showStep(i + 1);
    });
    back?.addEventListener('click', () => showStep(i - 1));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!stepValid(STEPS[STEPS.length - 1])) {
      showStep(STEPS.length - 1);
      STEPS[STEPS.length - 1].querySelector<HTMLInputElement>('input:invalid, textarea:invalid, select:invalid')?.focus();
      return;
    }
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const original = submitBtn?.textContent ?? '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending request…';
    }

    const result = await submitNetlifyForm(form);

    if (result.ok) {
      form.hidden = true;
      if (progress) progress.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
      const errBox = document.querySelector<HTMLElement>('[data-request-error]');
      if (errBox) {
        errBox.textContent = result.error ?? 'Something went wrong.';
        errBox.hidden = false;
      }
    }
  });
}

init();