/**
 * verify.ts — optional "verify your Payhip license" widget (how-it-works).
 *
 * Calls the serverless function /api/payhip-license-verify (a thin,
 * rate-limited proxy to Payhip's official License Verify API). This is a
 * REAL, honest check — the site does not invent purchase state.
 */

const form = document.querySelector<HTMLFormElement>('[data-verify-form]');
if (form) {
  const productSelect = form.querySelector<HTMLSelectElement>('[name="product_key"]');
  const keyInput = form.querySelector<HTMLInputElement>('[name="license_key"]');
  const out = form.querySelector<HTMLElement>('[data-verify-out]');
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submit = btn as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!productSelect || !keyInput || !out) return;
    if (!productSelect.value || !keyInput.value.trim()) {
      out.textContent = 'Choose a product and enter the license key from your purchase email.';
      out.className = 'verify-out mt-4 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn';
      out.hidden = false;
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Checking…';

    try {
      const res = await fetch('/api/payhip-license-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_key: productSelect.value, license_key: keyInput.value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success === true) {
        const name = data.product_name || productSelect.options[productSelect.selectedIndex]?.textContent;
        out.className = 'verify-out mt-4 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success';
        out.textContent = `Valid license for “${name}”. Your download link lives in your Payhip purchase email — contact us if you need it re-sent.`;
      } else {
        out.className = 'verify-out mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger';
        out.textContent = (data.message as string) || 'That license could not be verified. Double-check the key and product, then try again.';
      }
    } catch {
      out.className = 'verify-out mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger';
      out.textContent = 'Verification service unavailable right now — try again shortly, or check your Payhip purchase email.';
    }
    submit.disabled = false;
    submit.textContent = 'Verify license';
  });
}
