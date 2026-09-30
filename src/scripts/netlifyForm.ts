/**
 * netlifyForm.ts — submit any Netlify-Forms-backed form via fetch.
 * Works on the deployed site (Netlify Forms are detected server-side);
 * on local dev it will fail gracefully with an honest error message.
 */

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export async function submitNetlifyForm(form: HTMLFormElement): Promise<SubmitResult> {
  try {
    const data = new URLSearchParams();
    const elements = Array.from(form.elements) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    for (const el of elements) {
      if (!el.name || el.disabled) continue;
      if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'button' || el.type === 'image')) continue;
      if (el.type === 'checkbox' && !(el as HTMLInputElement).checked) continue;
      if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked) continue;
      if (el.name === 'hp' && (el as HTMLInputElement).value) {
        // Honeypot filled — silently accept without sending anything.
        return { ok: true };
      }
      data.append(el.name, el.value);
    }
    const action = form.getAttribute('action') || window.location.pathname;
    const res = await fetch(action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
      },
      body: data.toString(),
      referrerPolicy: 'no-referrer',
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Submission failed (server responded ${res.status}). Please try again or email us directly.` };
  } catch {
    return {
      ok: false,
      error:
        'Could not reach the submission service (are you previewing locally without Netlify?). Please email us directly — we reply fast.',
    };
  }
}