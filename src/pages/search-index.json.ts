/**
 * /search-index.json — static endpoint generated at build time.
 * Slim per-product records consumed by the client-side search page.
 */
import type { APIRoute } from 'astro';
import { getSearchIndex } from '../lib/catalog.ts';

export const GET: APIRoute = () => {
  const index = getSearchIndex();
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};