/**
 * /api/payhip-license-verify — Netlify function that proxies Payhip's
 * OFFICIAL License Verify API.
 *
 * Two supported Payhip modes (tried in this order):
 *   1. Per-product secret (Payhip v2, recommended for public apps):
 *        GET https://payhip.com/api/v2/license/verify?license_key=…
 *        header: product-secret-key: <secret from the product's edit page>
 *      Secrets live server-side in netlify/payhip-secrets.json (gitignored),
 *      keyed by Payhip product key.
 *   2. Account API key (Payhip v1):
 *        GET https://payhip.com/api/v1/license/verify?product_link=…&license_key=…
 *        header: payhip-api-key: <PAYHIP_API_KEY env var>
 *      Find the key in Payhip → Settings → Developer tab.
 *
 * WHY A SERVERLESS PROXY?
 *   • Central point for rate limiting & logging (abuse prevention)
 *   • Keeps Payhip secrets off the client entirely
 *
 * REQUEST (POST, JSON)
 *   { "product_key": "…", "license_key": "…" }
 *
 * RESPONSE
 *   { "success": true, "product_name": "…", "uses": n, … } on valid licenses
 *   { "success": false, "message": "…" } otherwise
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE_PER_MINUTE = 10;

function ipKey(event) {
  return event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
}

// Simple in-memory sliding-window limiter (resets when the function cold-starts —
// fine for a storefront; do not rely on it for hard security guarantees).
const buckets = new Map();

function rateLimited(event) {
  const now = Date.now();
  const key = ipKey(event);
  const entry = buckets.get(key);
  if (!entry || now - entry.start > 60000) {
    buckets.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_PER_MINUTE;
}

function loadProductSecrets() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      join(here, '..', 'payhip-secrets.json'),   // netlify/payhip-secrets.json
      join(process.cwd(), 'netlify', 'payhip-secrets.json'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.warn('[license-verify] could not load payhip-secrets.json:', e.message);
  }
  return {};
}

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(data),
});

async function verifyV2(licenseKey, secret) {
  const url = `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(licenseKey)}`;
  const res = await fetch(url, { headers: { 'product-secret-key': secret } });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* empty/invalid response */ }
  return { res, data };
}

async function verifyV1(productKey, licenseKey, apiKey) {
  const url =
    `https://payhip.com/api/v1/license/verify?product_link=${encodeURIComponent(productKey)}` +
    `&license_key=${encodeURIComponent(licenseKey)}`;
  const res = await fetch(url, { headers: { 'payhip-api-key': apiKey } });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* empty/invalid response */ }
  return { res, data };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Origin': event.headers?.origin || '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { success: false, message: 'Method not allowed' });
  }

  if (rateLimited(event)) {
    return json(429, { success: false, message: 'Too many attempts — please wait a moment and try again.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { success: false, message: 'Invalid JSON body.' });
  }

  const productKey = String(body.product_key || body.product_id || '').trim();
  const licenseKey = String(body.license_key || '').trim();

  if (!productKey || productKey.length > 200 || !licenseKey || licenseKey.length > 100) {
    return json(400, { success: false, message: 'Provide a product_key and license_key (max lengths enforced).' });
  }

  const secrets = loadProductSecrets();
  const productSecret = secrets[productKey];
  const apiKey = process.env.PAYHIP_API_KEY;

  if (!productSecret && !apiKey) {
    return json(503, {
      success: false,
      message:
        'License checking is not configured yet. Add PAYHIP_API_KEY in Netlify → Site settings → Environment variables (Payhip: Settings → Developer tab), or a per-product secret in netlify/payhip-secrets.json.',
    });
  }

  try {
    const { res, data } = productSecret
      ? await verifyV2(licenseKey, productSecret)
      : await verifyV1(productKey, licenseKey, apiKey);

    // Payhip returns { "data": { …license object… } } on success and an
    // empty/absent data object when the key is invalid.
    const lic = data && typeof data === 'object' ? data.data : null;
    if (res.ok && lic && lic.license_key) {
      if (lic.enabled === false) {
        return json(200, { success: false, message: 'This license key has been disabled by the seller. Contact support if you believe this is a mistake.' });
      }
      console.log(`[license-verify] product=${productKey.slice(0, 12)}… success=true`);
      return json(200, {
        success: true,
        product_name: lic.product_name || null,
        uses: typeof lic.uses === 'number' ? lic.uses : null,
        buyer_email_masked: lic.buyer_email ? `${String(lic.buyer_email).slice(0, 2)}•••` : null,
      });
    }

    console.log(`[license-verify] product=${productKey.slice(0, 12)}… success=false`);
    return json(200, { success: false, message: 'That license key could not be verified. Double-check the key and selected product, then try again.' });
  } catch {
    return json(502, { success: false, message: 'Could not reach Payhip’s license service. Please try again shortly.' });
  }
}
