#!/usr/bin/env node
/**
 * seed-csv.mjs — one-time helper that generated the initial products.csv
 * with correct RFC-4180 quoting. It is NOT part of the build pipeline.
 *
 * To use later to rebuild the starter file:
 *   node scripts/seed-csv.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const HEADER = [
  'id', 'name', 'slug', 'short_description', 'description', 'category',
  'subcategory', 'price', 'currency', 'compare_at_price', 'image',
  'gallery_images', 'product_type', 'file_format', 'compatibility',
  'benefits', 'includes', 'features', 'faqs', 'tags', 'payhip_url',
  'payhip_product_id', 'payhip_permalink', 'featured', 'status',
  'seo_title', 'seo_description', 'updated_at', 'order',
];

/* The starter catalog. Category and subcategory accept either the exact
   taxonomy title or its slug — the build fuzzy-matches for you. */
const ROWS = [
  {
    id: 'PS-0001', name: 'Copywriting Skill Pack — Sales Pages & Ads', slug: 'copywriting-skill-pack',
    short_description: 'A ready-to-run AI copywriting skill that drafts sales pages, ad copy and landing page text that sounds like your brand.',
    description: 'A complete, structural AI skill for writing copy that sells.\n\nIt gives your AI assistant a precise writer persona, a proven brief-to-draft workflow, and quality checks so every draft matches your tone, audience and offer. Use it for ad campaigns, homepage copy, product pages and email promos.\n\nDelivered as a drop-in pack: set your brand voice once, then generate on-brand drafts in minutes.',
    category: 'CONTENT, WRITING & LOCALIZATION', subcategory: 'Copywriting',
    price: 12, currency: 'USD', compare_at_price: 16,
    image: 'images/products/copywriting-skill-pack.svg', gallery_images: '',
    product_type: 'prompt-pack', file_format: 'Markdown + PDF',
    compatibility: 'ChatGPT · Claude · Gemini · NotebookLM',
    benefits: 'Write on-brand first drafts in minutes|Reuse one voice across ad, page and email copy|Skip the blank-page block with structured briefs|Ship faster while keeping quality checks built in',
    includes: 'Brand voice definition sheet|Brief-to-draft workflow|Sales page prompt set (7 prompts)|Ad copy prompt set (6 prompts)|Quality & tone checklist',
    features: 'Single source of truth for tone|Skips blank-page starting phase|Built-in on-brand QA pass',
    faqs: 'Ready to run in any major chatbot or assistant::Works in ChatGPT, Claude, Gemini and NotebookLM without extra setup',
    tags: 'copywriting|ad-copy|sales-pages|marketing|prompts',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: 'YES', status: 'published',
    seo_title: 'Copywriting Skill Pack — Sales Pages & Ads that sound like your brand | Prompt Station',
    seo_description: 'A ready-to-run AI copywriting skill that drafts sales pages, ad copy and landing page text that sounds like your brand.',
    updated_at: '2026-08-20', order: 1,
  },
  {
    id: 'PS-0002', name: 'SEO Research & Article Optimization Kit', slug: 'seo-optimization-kit',
    short_description: 'An AI skill that turns keyword research into search-friendly, structured articles your team can publish.',
    description: 'Turn search intent into publishable articles without the guesswork.\n\nThis skill walks your AI step by step: researching what people actually search for, structuring an article around the question, writing with headings and internal links, then reviewing against SEO best practice.\n\nComes with reusable run-sheets so your writers get consistent, on-strategy output every time.',
    category: 'CONTENT, WRITING & LOCALIZATION', subcategory: 'SEO Optimization',
    price: 14, currency: 'USD', compare_at_price: '',
    image: 'images/products/seo-optimization-kit.svg', gallery_images: '',
    product_type: 'workflow-kit', file_format: 'Markdown + PDF',
    compatibility: 'ChatGPT · Claude · Gemini',
    benefits: 'Research real search queries faster|Consistent article structure every time|Fewer review rounds on SEO basics|Reusable run-sheets for your whole team',
    includes: 'Keyword research run-sheet|Article outline builder|Writing prompt set (9 prompts)|On-page SEO checklist|Meta title & description generator',
    features: 'Interstitials: research → outline → draft → review',
    faqs: 'Works with the AI chat tools your team already use',
    tags: 'seo|articles|content-marketing|research|keywords',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: '', status: 'published',
    seo_title: 'SEO Research & Article Optimization Kit | Prompt Station',
    seo_description: 'An AI skill that turns keyword research into search-friendly, structured articles your team can publish.',
    updated_at: '2026-08-18', order: 2,
  },
  {
    id: 'PS-0003', name: 'Web Design Prompt Suite', slug: 'web-design-prompt-suite',
    short_description: 'A structured AI skill for turning briefs into complete website layouts, sections and design rationale.',
    description: 'Go from brief to website build faster with an AI skill that thinks like a design lead.\n\nIt structures the entire web design workflow: clarifying the brief, choosing layout patterns, writing section-by-section specifications, and producing buildable HTML/CSS with a design system in mind.\n\nEngineered for designers and developers who want AI as a structured collaborator — not a random content generator.',
    category: 'DESIGN, MEDIA & ENTERTAINMENT', subcategory: 'Web Design',
    price: 17, currency: 'USD', compare_at_price: 24,
    image: 'images/products/web-design-prompt-suite.svg', gallery_images: '',
    product_type: 'prompt-pack', file_format: 'Markdown + ZIP (HTML/CSS)',
    compatibility: 'ChatGPT · Claude · Gemini · Cursor · v0',
    benefits: 'Move from brief to structure in one session|Section-level specs developers can build from|Design rationale baked into every decision|Works with your existing design stack',
    includes: 'Brief-clarification prompt|Layout patterns reference deck|Section-by-section spec template|HTML/CSS starter patterns|Design QA checklist',
    features: 'Thinks in structure, not random output',
    faqs: 'Includes token-efficient prompts for Cursor and v0',
    tags: 'web-design|frontend|ui|html|css|design-systems',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: 'YES', status: 'published',
    seo_title: 'Web Design Prompt Suite — brief to buildable layouts | Prompt Station',
    seo_description: 'A structured AI skill for turning briefs into complete website layouts, sections and design rationale.',
    updated_at: '2026-08-16', order: 3,
  },
  {
    id: 'PS-0004', name: 'Customer Support Chatbot Blueprint', slug: 'customer-support-chatbot-blueprint',
    short_description: 'A complete build-kit for AI support automations that answer common questions 24/7 without feeling robotic.',
    description: 'Design, prompt and deploy an AI support bot that handles routine questions and hands off gracefully.\n\nThis skill includes the decision flow (when to answer, when to escalate), canned responses that keep your brand voice, and a testing checklist so the bot fails gracefully instead of confusing customers.\n\nBuilt to work with the major chatbot builders and LLM platforms.',
    category: 'BUSINESS, SALES & OPERATIONS', subcategory: 'Customer Support Chatbots',
    price: 19, currency: 'USD', compare_at_price: '',
    image: 'images/products/customer-support-chatbot-blueprint.svg', gallery_images: '',
    product_type: 'workflow-kit', file_format: 'Markdown + JSON',
    compatibility: 'Any chatbot builder · OpenAI · Claude · custom LLM APIs',
    benefits: 'Answer routine questions 24/7|Clear escalation rules built in|Brand-consistent canned responses|Test the bot before it ships',
    includes: 'Intent map & decision flow|System prompt pack|Knowledge-base structure template|Escalation playbook|Bot testing checklist',
    features: 'Fails gracefully by design',
    faqs: 'Does not claim to replace human support — it structures the handoff',
    tags: 'support|chatbots|automation|service|operations',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: 'YES', status: 'published',
    seo_title: 'Customer Support Chatbot Blueprint — 24/7 AI support flow | Prompt Station',
    seo_description: 'A complete build-kit for AI support automations that answer common questions 24/7 without feeling robotic.',
    updated_at: '2026-08-14', order: 4,
  },
  {
    id: 'PS-0005', name: 'Data Analysis to Insight Toolkit', slug: 'data-analysis-to-insight-toolkit',
    short_description: 'An AI skill that turns spreadsheets and raw data sets into clear charts, summaries and business decisions.',
    description: 'Stop pasting raw tables into AI and hoping for sense. This skill gives your AI a structured analysis protocol.\n\nIt defines how to inspect the data, spot anomalies and patterns, pick the right visualisation, and write a plain-language brief your stakeholders can act on.\n\nIncludes reusable run-sheets for monthly reports, ad-hoc deep dives and dashboards.',
    category: 'BUSINESS, SALES & OPERATIONS', subcategory: 'Data Analysis',
    price: 15, currency: 'USD', compare_at_price: '',
    image: 'images/products/data-analysis-to-insight-toolkit.svg', gallery_images: '',
    product_type: 'workflow-kit', file_format: 'Markdown + XLSX templates',
    compatibility: 'ChatGPT · Claude · Gemini · Copilot',
    benefits: 'Turn raw data into decisions faster|Standard structure for every analysis|Charts that answer the actual question|Reusable templates for recurring reports',
    includes: 'Analysis protocol|Pattern & anomaly checklist|Chart selection guide|Insight brief template|Month-end report run-sheet',
    features: 'Analyses the question before the numbers',
    faqs: 'Excel or Google Sheets friendly with copy-paste templates',
    tags: 'data-analysis|analytics|excel|dashboards|reporting',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: '', status: 'published',
    seo_title: 'Data Analysis to Insight Toolkit | Prompt Station',
    seo_description: 'An AI skill that turns spreadsheets and raw data sets into clear charts, summaries and business decisions.',
    updated_at: '2026-08-12', order: 5,
  },
  {
    id: 'PS-0006', name: 'Email Campaign Personalization Pack', slug: 'email-campaign-personalization-pack',
    short_description: 'An AI skill that writes personalized email sequences for different buyer segments without losing your brand voice.',
    description: 'Personalization at scale usually breaks the brand. This skill fixes that with a segmentation-first process.\n\nDefine your audiences once, then let the skill draft campaigns that speak to each segment — while enforcing the same tone, structure and calls to action.\n\nBuilt for weekly news, onboarding flows, and promo campaigns where copy needs to feel one-to-one.',
    category: 'CONTENT, WRITING & LOCALIZATION', subcategory: 'Email Marketing',
    price: 11, currency: 'USD', compare_at_price: 14,
    image: 'images/products/email-campaign-personalization-pack.svg', gallery_images: '',
    product_type: 'prompt-pack', file_format: 'Markdown',
    compatibility: 'ChatGPT · Claude · Gemini · Mailchimp · Klaviyo',
    benefits: 'Segment-aware copy for every campaign|Consistent voice across audiences|Faster onboarding & promo flows|Plug into your existing email tools',
    includes: 'Persona & segment workbook|Campaign brief template|Sequence prompt set (8 prompts)|Subject line lab|Voice guardrails sheet',
    features: 'Enforces one voice across segments',
    faqs: 'Works alongside Mailchimp, Klaviyo and any ESP',
    tags: 'email-marketing|campaigns|personalization|segments|automation',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: '', status: 'published',
    seo_title: 'Email Campaign Personalization Pack | Prompt Station',
    seo_description: 'An AI skill that writes personalized email sequences for different buyer segments without losing your brand voice.',
    updated_at: '2026-08-10', order: 6,
  },
  {
    id: 'PS-9000', name: 'Sample Draft Skill — invisible to storefront', slug: '',
    short_description: 'This row is a demo of the status column. While status is draft the product never appears anywhere.',
    description: 'Sample draft row: set status to published and rebuild to bring it live.',
    category: 'CONTENT, WRITING & LOCALIZATION', subcategory: 'Transcription and Summaries',
    price: 10, currency: 'USD', compare_at_price: '',
    image: 'images/products/draft-demo.svg', gallery_images: '',
    product_type: 'prompt-pack', file_format: 'Markdown',
    compatibility: '', benefits: '', includes: '', features: '',
    faqs: 'How do I turn this on?::Change the status column to published and rebuild.',
    tags: 'sample|draft',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '', payhip_permalink: '',
    featured: '', status: 'draft',
    seo_title: 'Sample Draft Skill', seo_description: 'This is a draft demo row hidden from the storefront.',
    updated_at: '2026-08-01', order: 99,
  },
];

const csv = (value) => {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

writeFileSync(join(ROOT, 'products.csv'), [HEADER.join(','), ...ROWS.map((r) => HEADER.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
console.log(`✅ Wrote products.csv with ${ROWS.length} rows (RFC-4180 quoted).`);