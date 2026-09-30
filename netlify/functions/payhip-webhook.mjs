/**
 * /api/payhip-webhook — Netlify function that receives Payhip webhook events
 * (configure in Payhip → Settings → Webhooks, pointing at
 * https://YOUR-SITE.netlify.app/api/payhip-webhook?token=THE_SAME_SECRET).
 *
 * WHAT IT'S FOR
 *   • Optional order/notification logging (visible in Netlify's function logs)
 *   • A foundation for CRM, thank-you emails, or discount automation later
 *   • Proof-of-integration for the Payhip → site notification path
 *
 * HONEST LIMITATIONS
 *   • Payhip webhook payloads are JSON POSTs; we log a masked summary.
 *     The practical protection is the shared token below — set
 *     PAYHIP_WEBHOOK_SECRET to a long random string before production.
 *   • We never store or expose paid file URLs / credentials.
 *
 * If PAYHIP_WEBHOOK_SECRET is not set, the function still accepts events
 * (helpful during first setup) — set it before production.
 */

const SECRET = process.env.PAYHIP_WEBHOOK_SECRET;

export async function handler(event) {
  if (SECRET) {
    const token = event.queryStringParameters?.token;
    const headerToken = event.headers?.['x-payhip-secret'];
    if (token !== SECRET && headerToken !== SECRET) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'unauthorized' }) };
    }
  }

  let payload = {};
  const raw = event.body;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw: String(raw).slice(0, 2000) };
    }
  }

  const mask = (email = '') => {
    const [local, domain] = String(email).split('@');
    if (!domain) return email || '—';
    return `${local.slice(0, 2)}•••@${domain}`;
  };

  // Payhip event shapes can vary between event types; pull common fields
  // best-effort and keep the whole payload in the log line.
  const p = payload?.data ?? payload ?? {};
  const summary = {
    event: payload?.event || payload?.type || event.queryStringParameters?.event || 'unknown',
    order_id: p.id || p.order_id || p.sale_id || null,
    product_name: p.product_name || p.product?.name || null,
    product_key: p.product_link || p.product_key || null,
    price: p.total ?? p.price ?? p.amount ?? null,
    currency: p.currency ?? null,
    email: mask(p.email || p.buyer_email || p.customer_email),
    timestamp: p.created_at || payload?.created_at || new Date().toISOString(),
    received: new Date().toISOString(),
  };

  // Logged to Netlify's function logs (Functions → this function → Logs).
  console.log('[payhip-webhook]', JSON.stringify(summary));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, received: summary.received }),
  };
}
