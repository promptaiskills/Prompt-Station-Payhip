/**
 * format.mjs — display helpers shared across components (plain ESM).
 */
import { SHOP } from '../config/site.mjs';

/** Human-readable price, e.g. $19 or $19.99. */
export function formatPrice(value, currency = SHOP.currency) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return `${value ?? ''}`;
  const symbol = SHOP.currencySymbols[currency] ?? `${currency} `;
  const decimals = Number.isInteger(num) ? 0 : 2;
  const body = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  });
  return `${symbol}${body}`;
}

/** Short human date, e.g. "Aug 12, 2026" — returns '' if unparseable. */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Slugify — used for fallback product slugs from names. */
export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Normalise text for fuzzy catalog matching (CSV → taxonomy). */
export function normalizeForMatch(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}