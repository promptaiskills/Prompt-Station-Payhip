/**
 * =============================================================================
 *  PROMPT STATION — CENTRAL SITE CONFIGURATION
 * =============================================================================
 *  THIS IS THE ONE FILE YOU EDIT BEFORE GOING LIVE.
 *
 *  Every business value the storefront needs lives here (or in the product
 *  catalog CSV — see the README). Nothing else in the codebase should require
 *  editing to rebrand or re-point the store.
 *
 *  ---------------------------------------------------------------------------
 *  !!! REPLACE EVERY "YOUR_..." PLACEHOLDER BELOW BEFORE LAUNCH !!!
 *  ---------------------------------------------------------------------------
 *
 *  Quick checklist of what this file controls:
 *   • SITE   — business name, tagline, description, canonical URL, contact, socials
 *   • PAYHIP — seller handle, store URL, product/checkout link helpers
 *   • SEO    — default titles/descriptions used when a CSV row has none
 *   • SHOP   — currency, featured categories, catalog limits
 *   • SERVICE — the custom "AI skill design" request service copy
 *
 *  Any value you leave as YOUR_... will be visible to visitors, so replace all
 *  of them (the launch checklist in docs/LAUNCH_CHECKLIST.md lists each one).
 * =============================================================================
 */

export const SITE = {
  /** Business/brand name shown in the header, footer, title tag & logo. */
  name: 'Prompt Station',

  /** Short tagline — used under the logo, in meta and on the homepage. */
  tagline: 'AI skills for structural work & real workflow impact',

  /** One-sentence store description (meta description & OG fallback). */
  description:
    'Prompt Station is a marketplace for ready-to-use AI skills — prompt packs and workflow kits that produce high quality work from AI, across business, creative, technical and scientific disciplines.',

  /** Canonical site URL — MUST be your production domain (no trailing slash). */
  url: 'https://promptstationhq.netlify.app', // ← REPLACE with your real domain before launch

  /** Locale of the storefront copy. */
  locale: 'en-US',

  /** Contact details. */
  contact: {
    email: 'promptstation@gmail.com', // ← REPLACE
    supportEmail: 'promptstation@gmail.com', // ← REPLACE (same is fine)
  },

  /** Social links — leave as '' to hide the icon in the footer. */
  social: {
    x: '', // e.g. 'https://x.com/yourhandle'
    instagram: '', // e.g. 'https://instagram.com/yourhandle'
    linkedin: '', // e.g. 'https://linkedin.com/company/yourhandle'
    youtube: '', // e.g. 'https://youtube.com/@yourhandle'
  },

  /** Footer trust note (only claims that are true for your setup). */
  trustNote:
    'Payments are processed securely by Payhip (cards via Stripe, plus PayPal). Download links arrive instantly by email after purchase.',
};

/* ===========================================================================
 * PAYHIP — integration settings.
 * ---------------------------------------------------------------------------
 * How the storefront works with Payhip:
 *   1. Every product row in products.csv carries its own Payhip product URL
 *      (or just the product key, normalised below).
 *   2. Buy buttons hand the customer to Payhip's hosted checkout — a secure
 *      Payhip page opened from this site; payment details never touch us.
 *   3. Delivery happens on Payhip's side: an email receipt with a secure
 *      download page link right after payment — the storefront never sees
 *      the paid files. See docs/LIMITATIONS.md.
 * ------------------------------------------------------------------------- */
export const PAYHIP = {
  /** Your Payhip username/handle — used only for the store link & examples. */
  sellerHandle: 'promptstationhq',

  /** Link to your Payhip store page (used in the footer/help). */
  storeUrl: 'https://payhip.com/promptstationhq',

  /**
   * Where the "Access my purchases" links point.
   * Payhip has no public buyer library page: buyers keep the secure download
   * page link from their email receipt (5 downloads / 30 days). So we point
   * at the on-site Purchasing & delivery guide which explains exactly that
   * and how to get a re-send.
   */
  purchasesHelpUrl: '/how-it-works/#delivery',

  /**
   * Product URLs in products.csv may be written as:
   *   https://payhip.com/b/KEY                       (product page URL)
   *   https://YOUR-CUSTOM-DOMAIN.com/b/KEY           (custom-domain store)
   *   b/KEY                                          (path only)
   *   KEY                                            (bare product key)
   * They are normalised at build time against the store domain above.
   */
  normalizeProductUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u.replace(/\/+$/, '');
    if (/^b\/[\w-]+$/i.test(u)) return `https://payhip.com/${u}`;
    if (/^[\w-]+$/.test(u)) return `https://payhip.com/b/${u}`; // bare key
    return `https://payhip.com/${u.replace(/^\/+/, '')}`;
  },

  /** Extract the Payhip product key from any normalised product URL
   *  (…/b/KEY or …/buy?link=KEY). Returns '' when not derivable. */
  productKeyFromUrl(url) {
    try {
      const u = new URL(String(url || '').trim());
      const m = u.pathname.match(/\/b\/([\w-]+)/);
      if (m) return m[1];
      return u.searchParams.get('link') || '';
    } catch {
      return '';
    }
  },

  /**
   * Direct checkout URL for a product — skips Payhip's own product page and
   * opens straight at payment (Payhip docs: /buy?link=KEY). Falls back to the
   * product page URL when no key can be derived (e.g. unknown link shapes).
   */
  checkoutUrlFor(productUrl) {
    const key = PAYHIP.productKeyFromUrl(productUrl);
    if (!key) return productUrl;
    try {
      return `${new URL(productUrl).origin}/buy?link=${encodeURIComponent(key)}`;
    } catch {
      return `https://payhip.com/buy?link=${encodeURIComponent(key)}`;
    }
  },

  /** Whether the optional "verify your purchase" widget is shown (needs real
   *  Payhip license keys + product keys in the CSV to be useful). */
  licenseVerifyEnabled: true,
};

/* ===========================================================================
 * SEO — defaults only. Per-product SEO lives in products.csv.
 * ------------------------------------------------------------------------- */
export const SEO = {
  /** Appends the brand name only when the title doesn't already include it. */
  titleTemplate: (title) => (title.includes(SITE.name) ? title : `${title} — ${SITE.name}`),
  defaultTitle: `${SITE.name} — ${SITE.tagline}`,
  defaultDescription: SITE.description,
  /** Default OpenGraph image (absolute path under the site). */
  ogImage: '/og-default.png',
  ogImageAlt: `${SITE.name} — AI skills for real workflow impact`,
  /** Twitter card type. */
  twitterCard: 'summary_large_image',
};

/* ===========================================================================
 * SHOP — storefront behaviour defaults.
 * ------------------------------------------------------------------------- */
export const SHOP = {
  /** Default currency when a product row leaves the column empty. */
  currency: 'USD',
  /** Currency display settings. */
  currencySymbols: {
    USD: '$', EUR: '€', GBP: '£', KES: 'KSh ', JPY: '¥', CAD: 'C$', AUD: 'A$', INR: '₹', NGN: '₦', ZAR: 'R',
  },
  /** Products per page/section before "show more" patterns kick in. */
  perPage: 24,
  /** Category keys highlighted on the homepage (must exist in taxonomy.json). */
  featuredCategories: [
    'content-writing-and-localization',
    'design-media-and-entertainment',
    'business-sales-and-operations',
    'marketing-advertising-and-pr',
    'software-coding-and-technical-services',
    'finance-fintech-and-wealth-management',
  ],
  /** Number of "latest products" shown on the homepage. */
  latestCount: 6,
};

/* ===========================================================================
 * SERVICE — the conversational service-request experience (/request).
 * ------------------------------------------------------------------------- */
export const SERVICE = {
  name: 'Custom AI Skill Design',
  eyebrow: 'Don’t see the skill you need?',
  headline: 'We can build an AI skill around your workflow',
  intro:
    'The catalog ships pre-built skills, but every team works differently. If you need a customized AI skill — a particular nature, behavior, topic set, or output format — tell us what you are trying to accomplish and we will design it for you.',
  audience:
    'For professionals, teams and studios who want AI to slot into their exact process: writers, designers, analysts, engineers, operators, researchers and founders.',
  whatYouCanRequest: [
    'A customized version of an existing skill, tuned to your voice, brand or process',
    'A brand-new skill from scratch — describe the behavior, topics and output you need',
    'A workflow kit: prompts + run sheets + quality checks for a specific recurring task',
    'Format preferences: markdown, PDF, spreadsheets, Notion pages or tool-specific packs',
  ],
  process: [
    { title: 'Tell us the outcome', body: 'Name the skill you want and what it must produce. One sentence is enough to start.' },
    { title: 'We refine the brief', body: 'You’ll receive clarifying questions or a short proposal; iterate until it feels right.' },
    { title: 'We build & you test', body: 'You get a working skill pack with instructions, examples and quality checks.' },
    { title: 'Refinement pass', body: 'One round of adjustments is included so the skill matches your output bar.' },
  ],
  /** Placeholder copy — update to the real policy for your shop. */
  turnaround: 'Most requests get a first draft within 3–7 business days. Tell us your deadline and we will prioritise it.',
  formNote:
    'Requests are reviewed by a human. If we can build it, you’ll receive a quote and delivery estimate — no obligation.',
};
