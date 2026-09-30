/**
 * contact.ts — contact & general inquiry form: validate + submit to Netlify.
 */

import { submitNetlifyForm } from './netlifyForm';

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
if (form) {
  const errorBox = form.querySelector<HTMLElement>('[data-contact-error]');
  const successBox = form.querySelector<HTMLElement>('[data-contact-success]');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const original = submitBtn?.textContent ?? '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }
    const result = await submitNetlifyForm(form);
    if (result.ok) {
      form.hidden = true;
      successBox?.removeAttribute('hidden');
      successBox?.focus();
    } else {
      if (errorBox) {
        errorBox.textContent = result.error ?? 'Something went wrong.';
        errorBox.removeAttribute('hidden');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    }
  });
}