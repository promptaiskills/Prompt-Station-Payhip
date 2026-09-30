// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config/site.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE.url, // Canonical root — update in src/config/site.mjs before launch
  trailingSlash: 'ignore',
  compressHTML: true,
  server: {
    // Accept the sandbox preview proxy host during development/preview.
    allowedHosts: true,
  },
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      // Exclude utility/API pages from the sitemap
      filter: (page) => {
        if (page.includes('/search') || page.endsWith('.json') || page.includes('/legal/')) return false;
        return true;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});