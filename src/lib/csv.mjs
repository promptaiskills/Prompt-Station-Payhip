/**
 * csv.mjs — tiny RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF).
 * Shared by the build scripts and the Astro build (plain ESM, zero deps).
 *
 * @param {string} text
 * @param {{ header?: boolean }} [opts]
 * @returns {Array<Record<string, string>>} array of row objects (header keys)
 */
export function parseCsv(text, opts = {}) {
  const { header = true } = opts;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const clean = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // final field/row
  row.push(field);
  rows.push(row);

  if (!header) return rows;

  const head = (rows[0] || []).map((h) => h.trim().toLowerCase());
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    if (rows[r].length === 1 && !rows[r][0].trim()) continue; // skip blank lines
    const obj = {};
    for (let c = 0; c < head.length; c += 1) {
      obj[head[c]] = (rows[r][c] ?? '').trim();
    }
    out.push(obj);
  }
  return out;
}

/** Split a CSV cell that uses a pipe separator into a trimmed array. */
export function splitList(value, sep = '|') {
  const v = String(value || '').trim();
  if (!v) return [];
  return v
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}