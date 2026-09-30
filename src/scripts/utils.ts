/**
 * utils.ts — small shared browser helpers (no dependencies).
 */

/** Escape a string for safe insertion into HTML text context. */
export function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Focusable element selector used by the focus trap. */
export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/**
 * Trap focus inside a container on Tab (cycles), letting Esc and other keys
 * bubble to the caller. Returns a cleanup function.
 */
export function trapFocus(container: HTMLElement): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = getFocusable(container);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || active === null)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

/** Assert an element exists (throws at runtime) and narrow its type. */
export function ensure<T>(value: T | null | undefined, what = 'element'): T {
  if (value === null || value === undefined) throw new Error(`Missing ${what}`);
  return value;
}

/** Read a JSON payload from a data-* attribute safely. */
export function readJson<T>(el: HTMLElement, attr: string): T | null {
  const raw = el.getAttribute(attr);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}