/**
 * gallery.ts — tiny, dependency-free product gallery.
 * Thumbnails swap the main image (and its alt + source set when provided).
 * Without JavaScript the first image + thumbnail links remain fully usable.
 */

const ROOT = document.querySelector('[data-gallery]');

if (ROOT) {
  const main = ROOT.querySelector<HTMLImageElement>('[data-gallery-main]');
  const thumbs = ROOT.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]');

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      if (!main) return;
      const src = thumb.getAttribute('data-src');
      const alt = thumb.getAttribute('data-alt') || main.alt;
      if (src) {
        main.src = src;
        main.alt = alt;
      }
      thumbs.forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
    });
    thumb.setAttribute('aria-pressed', 'false');
  });
  if (main) {
    thumbs[0]?.setAttribute('aria-pressed', 'true');
  }
}