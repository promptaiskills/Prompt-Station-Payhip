#!/usr/bin/env node
/**
 * seed-library-products.mjs
 * ------------------------------------------------------------------
 * Seeds a curated starter catalog into products.csv for EVERY library
 * (Libraries 2–11, mapped from 2.txt…11.txt), matching the quality and
 * pattern already used for Library 1. Existing rows in products.csv are
 * preserved; new rows are appended. Run once manually:
 *
 *   node scripts/seed-library-products.mjs
 *
 * NOT wired into the build — products.csv is the source of truth afterwards;
 * edit it directly for your real catalog.
 *
 * Every category/subcategory is resolved against src/data/taxonomy.json and
 * verified to exist inside the intended library before anything is written.
 * Resolution order: exact key → exact title within the library → unique title
 * globally. The script refuses to write on any unresolved/ambiguous reference.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../src/lib/csv.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CSV_PATH = join(ROOT, 'products.csv');
const TAX_PATH = join(ROOT, 'src', 'data', 'taxonomy.json');
const taxonomy = JSON.parse(readFileSync(TAX_PATH, 'utf8'));

const nrm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* ------------------------------------------------ taxonomy lookup */
const collections = taxonomy.collections;

function resolve(libOrder, categoryRef, subRef) {
  const coll = collections.find((c) => c.order === libOrder);
  if (!coll) throw new Error(`Library order ${libOrder} not found in taxonomy`);

  const findCat = (ref) => {
    const key = String(ref).trim().toLowerCase();
    const byKey = coll.categories.find((c) => c.key === key);
    if (byKey) return byKey;
    const nr = nrm(ref);
    const byTitle = coll.categories.filter((c) => nrm(c.title) === nr);
    if (byTitle.length === 1) return byTitle[0];
    if (byTitle.length > 1) throw new Error(`[L${libOrder}] Ambiguous category title "${ref}"`);
    throw new Error(`[L${libOrder}] Category "${ref}" not found in library "${coll.label}"`);
  };
  const cat = findCat(categoryRef);

  const findSub = (ref) => {
    const key = String(ref).trim().toLowerCase();
    const byKey = cat.subcategories.find((s) => s.key === key);
    if (byKey) return { sub: byKey, cat };
    const nr = nrm(ref);
    const byTitle = cat.subcategories.filter((s) => nrm(s.title) === nr);
    if (byTitle.length === 1) return { sub: byTitle[0], cat };
    if (byTitle.length > 1) throw new Error(`[L${libOrder}] Ambiguous subcategory title "${ref}" in "${cat.title}"`);
    // Strict: a subcategory that is not inside the pinned library is an error.
    // Cross-library lookups would silently mis-map products (e.g. "Financial
    // Forecasting" exists in 1.txt but not in 2.txt).
    throw new Error(`[L${libOrder}] Subcategory "${ref}" not found in category "${cat.title}" (library "${coll.label}") — pick a subcategory that exists in this library.`);
  };
  const { sub, cat: realCat } = findSub(subRef);
  return { category: realCat, subcategory: sub, collection: coll };
}

/* ------------------------------------------------ product shorthand */
const P = (d) => ({
  id: d.id,
  name: d.name,
  slug: d.slug,
  short: d.short,
  desc: d.desc,
  categoryRef: d.cat,
  subcategoryRef: d.sub,
  price: d.price,
  compare: d.compare || '',
  type: d.type || 'prompt-pack',
  format: d.format || 'Markdown + PDF',
  compat: d.compat || 'ChatGPT · Claude · Gemini',
  ben: d.ben,
  inc: d.inc,
  fea: d.fea || [],
  faq: d.faq || '',
  tags: d.tags,
  featured: d.feat ? 'YES' : '',
  updated_at: d.date,
  order: d.ord ?? 100,
});

const NEW_PRODUCTS = [
  /* ================= Library 2 — Industry & Corporate Functions ========== */
  P({ id: 'PS-0101', name: 'Retirement & Pension Simulation Kit', slug: 'retirement-pension-simulation-kit',
    cat: 'FINANCE, FINTECH & WEALTH MANAGEMENT', sub: 'Retirement & Pension Simulation', price: 18, compare: 24, type: 'workflow-kit',
    short: 'A structured AI skill that stress-tests retirement plans — contribution scenarios, income gaps and the assumptions behind them.',
    desc: 'Retirement planning only feels solid when the scenarios have been walked through. This skill turns your AI assistant into a scenario analyst: intake your pension and savings inputs, model contribution and withdrawal scenarios, and surface income gaps with the assumptions clearly logged.\n\nIt produces comparable scenario sheets and an annual review run-sheet, so the same logic gets applied every year instead of starting from scratch.',
    ben: 'Comparable scenario sheets every year|Income gaps surfaced with assumptions|Clean handoff to an advisor|Reusable annual review rhythm',
    inc: 'Plan data intake sheet|Scenario engine prompts|Income-gap analysis worksheet|Assumption log template|Annual review run-sheet',
    fea: ['Every scenario logs stated assumptions', 'Explicitly framed as a planning aid, not investment advice'],
    faq: 'Is this investment advice?::No — it structures your own planning scenarios. Decisions stay with you and your advisor.',
    tags: 'retirement|pension|planning|scenarios|finance',
    feat: true, date: '2026-08-21', ord: 10 }),

  P({ id: 'PS-0102', name: 'Tenant-Landlord Dispute Prep Pack', slug: 'tenant-dispute-prep-kit',
    cat: 'LEGAL TECH & REGULATORY AFFAIRS', sub: 'Tenant-Landlord Dispute Prep', price: 15, type: 'prompt-pack',
    short: 'Organize facts, correspondence and obligations into a clear dispute timeline with next-step options.',
    desc: 'Disputes are won on preparation, not volume. This skill helps you assemble every relevant fact — lease terms, payments, notice history, messages — into a clean chronology and a plain-language position summary.\n\nIt produces questions an advisor would ask, flags missing evidence, and drafts professional correspondence notes. It informs your preparation; it does not replace legal advice, and the pack says so clearly.',
    ben: 'Builds a complete, dated dispute timeline|Flags missing evidence early|Plain-language position summary|Clear next-step options before you pay a lawyer',
    inc: 'Evidence gathering checklist|Lease term extraction prompts|Correspondence timeline builder|Position summary template|Questions to ask an advisor',
    fea: ['Explicitly framed as preparation, not legal advice'],
    faq: 'Is this legal advice?::No — it is a preparation checklist and drafting aid. Review anything you send with an appropriate professional.',
    tags: 'tenant|landlord|dispute|legal|correspondence',
    date: '2026-08-21', ord: 11 }),

  P({ id: 'PS-0103', name: 'Radiology Pre-Screening Support Pack', slug: 'radiology-prescreen-support-pack',
    cat: 'HEALTHCARE, MEDICAL INFORMATICS & WELLNESS', sub: 'Radiology Pre-Screening Support', price: 22, type: 'workflow-kit',
    short: 'A structured protocol that triages study descriptions and flags follow-up questions for radiologist review.',
    desc: 'Radiology teams are time-constrained. This skill structures AI support for the administrative half of the workflow: summarizing study indications, organizing prior reports, and drafting a concise list of items for the radiologist to confirm.\n\nIt exists to assist — never to diagnose — and its output is explicitly labelled as a pre-screening aid requiring professional review.',
    ben: 'Reduces administrative reading time|Consistent, labelled pre-screen summaries|Organized prior-report digests|Clearly bounded as decision support only',
    inc: 'Study indication summarizer|Prior report digest builder|Follow-up question checklist|Handoff template for the reading room|Review-and-disclaim protocol',
    fea: ['Bounded: output always requires professional review'],
    faq: 'Does this make diagnoses?::No. It assists with documentation and triage; every output is clearly marked for professional review.',
    tags: 'radiology|healthcare|triage|documentation|clinical',
    date: '2026-08-22', ord: 12 }),

  P({ id: 'PS-0104', name: 'Job Description Optimization Kit', slug: 'job-description-optimizer-kit',
    cat: 'HUMAN RESOURCES, HIRING & CORPORATE CULTURE', sub: 'Job Description Optimization', price: 13, type: 'prompt-pack',
    short: 'Turn flat job ads into clear, inclusive descriptions that attract the right candidates and screen better.',
    desc: 'Most job descriptions are written once and never improved. This skill applies a repeatable review: clarity, inclusivity, compensation framing, skills versus qualifications, and search keywords a candidate would actually use.\n\nYou get a before/after rewrite, a checklist your hiring team can reuse, and guidance tuned to reduce irrelevant applications.',
    ben: 'Attracts more on-target candidates|Reduces irrelevant applications|Consistent format across roles|Built-in inclusivity and bias review',
    inc: 'JD review checklist|Rewrite prompt set (8 prompts)|Skills versus qualifications sorter|Keyword matcher for job boards|Team style guide template',
    fea: ['Includes an inclusivity review pass'],
    faq: 'Will this work for technical roles too?::Yes — the process is role-agnostic; it just organizes the skills, context and culture the right way.',
    tags: 'hiring|hr|job-descriptions|recruiting|inclusive',
    date: '2026-08-22', ord: 13 }),

  P({ id: 'PS-0105', name: 'Freight Route Optimization Pack', slug: 'freight-route-optimizer-pack',
    cat: 'SUPPLY CHAIN, LOGISTICS & MANUFACTURING', sub: 'Freight Route Logistics Optimization', price: 17, type: 'workflow-kit',
    short: 'A structured skill for comparing routes, consolidating loads and cutting freight cost per delivery.',
    desc: 'Freight decisions get made on instinct far too often. This skill gives your AI a fixed analytical protocol: normalize cost and time for every leg, surface consolidation opportunities, and rank route options against the constraints that matter to you.\n\nIt includes the math, the assumptions and the exception rules, so the same logic is applied every week — not just when someone remembers.',
    ben: 'Comparable cost-per-delivery every time|Load consolidation opportunities surfaced|Constraint-aware route shortlists|Repeatable weekly rhythm',
    inc: 'Route compare scorecard|Cost normalization prompts|Consolidation opportunity scanner|Constraint checklist template|Weekly review run-sheet',
    fea: ['Applies one logic every planning cycle'],
    faq: 'Does it integrate with my TMS?::It works on exports from any TMS or spreadsheet, keeping your existing tools in place.',
    tags: 'logistics|freight|routes|supply-chain|cost',
    date: '2026-08-23', ord: 14 }),

  P({ id: 'PS-0106', name: 'Phishing Simulator & Awareness Training Kit', slug: 'phishing-simulator-training-kit',
    cat: 'CYBERSECURITY, IT OPERATIONS & PRIVACY', sub: 'Phishing Email Simulation & Training', price: 19, type: 'workflow-kit',
    short: 'Design safe, realistic phishing simulations and turn every click into a teaching moment.',
    desc: 'Security awareness works when it is measured and gentle. This skill helps you design phishing simulations that are realistic but safe, write the follow-up training for people who fall for them, and report results without creating blame.\n\nIt includes scenario banks, reporting templates and an escalation path for genuine incidents so simulations never get mistaken for real attacks.',
    ben: 'Realistic but safe simulation scenarios|Blame-free follow-up training|Clear metrics for leadership|Handles genuine-attack edge cases',
    inc: 'Scenario bank (12 campaigns)|Simulation brief template|Reporter playbook|Training follow-up prompt set|False-positive handling protocol',
    fea: ['Designed to build a security culture, not punish mistakes'],
    faq: 'Can it detect real phishing?::No. It trains your team; genuine incident detection is handled by your security tools and process.',
    tags: 'security|phishing|awareness|training|cybersecurity',
    date: '2026-08-23', ord: 15 }),

  /* ================= Library 3 — Everyday & Lifestyle AI ================ */
  P({ id: 'PS-0201', name: 'Faceless Channel Video Narrative Builder', slug: 'faceless-channel-video-builder',
    cat: 'Consumer Content Creation, Socials & Personal Branding', sub: 'Faceless Channel Video Narrative Builders', price: 14, type: 'prompt-pack',
    short: 'Plan and script consistent faceless-channel videos — hooks, beats, b-roll notes and voiceover — in one repeatable flow.',
    desc: 'Faceless channels live or die by structure. This skill gives you a repeatable video-building flow: hook, narrative beats, b-roll suggestions and a voiceover script that matches your established style.\n\nPaste in a topic and your voice rules and you get a shoot-ready rundown in minutes — the same structure every time, so your channel stays consistent.',
    ben: 'Consistent video structure every upload|Hooks engineered for retention|B-roll and voiceover guidance included|Reusable for any niche',
    inc: 'Hook laboratory prompts|Beat-by-beat rundown template|B-roll suggestion engine|Voiceover script writer|Publishing checklist',
    fea: ['One repeatable flow, any topic'],
    faq: 'Does it generate the video itself?::No — it produces the plan, script and shot list you feed into your editing workflow.',
    tags: 'faceless|youtube|content|scripting|video',
    feat: true, date: '2026-08-24', ord: 20 }),

  P({ id: 'PS-0202', name: 'LinkedIn Thought-Leadership Kit', slug: 'linkedin-thought-leadership-kit',
    cat: 'Everyday Corporate Productivity, Career & Remote Work', sub: 'LinkedIn Thought-Leadership Ghostwriting', price: 12, type: 'prompt-pack',
    short: 'Draft LinkedIn posts that sound like you — from raw idea to polished thought-leadership post in one session.',
    desc: 'Most LinkedIn ghostwriting reads like a robot. This skill first captures your voice: how you open, how long your sentences run, what you will and will not say. Then it drafts posts from your raw notes with that voice locked in.\n\nEach draft ships with a headline option set and a comment-perk strategy so the post has a job to do, not just something to say.',
    ben: 'Posts that sound like you, not a template|One voice locked across your profile|Headlines and hooks included|Built to start real conversations',
    inc: 'Voice capture workbook|Post drafting prompt set|Headline option lab|Comment & engagement starter pack|Posting calendar skeleton',
    fea: ['Voice capture runs before any drafting'],
    faq: 'Can I use it for client ghostwriting?::Yes — the voice workbook makes it easy to lock a different voice per client.',
    tags: 'linkedin|personal-brand|ghostwriting|thought-leadership',
    date: '2026-08-24', ord: 21 }),

  P({ id: 'PS-0203', name: 'Etsy SEO Tag Optimizer Pack', slug: 'etsy-seo-tag-optimizer',
    cat: 'Micro-E-Commerce, Side Hustles & Craft Selling', sub: 'Etsy Handmade Item SEO Tag Optimizers', price: 11, type: 'workflow-kit',
    short: 'Turn 13-character tag limits and thin listings into search terms shoppers actually type on Etsy.',
    desc: 'Etsy search runs on tags and titles, but most sellers guess. This skill teaches your AI to think like an Etsy shopper: harvest real search phrasings, map them to the 13-character tag structure, and rewrite titles that move the needle.\n\nIt batches the work across your whole shop so one afternoon refreshes every listing.',
    ben: 'Tags built from real shopper phrasing|20 tag ideas per listing|Title rewrites that fit Etsy rules|Batch refresh for the whole shop',
    inc: 'Search-phrase harvesting prompts|13-char tag builder|Title rewrite engine|Listing batch worksheet|Etsy rules cheat sheet',
    fea: ['Respects Etsy’s actual 13-character tag limit'],
    faq: 'Is this against Etsy rules?::No. It produces organic keyword and title improvements — no spam or forbidden tactics.',
    tags: 'etsy|seo|tags|handmade|marketplace',
    date: '2026-08-25', ord: 22 }),

  P({ id: 'PS-0204', name: 'Flashcard Deck Compiler', slug: 'flashcard-deck-compiler',
    cat: 'Accessible Education, Upskilling & Language Practice', sub: 'Flashcard Deck Study Compilers', price: 9, type: 'prompt-pack',
    short: 'Turn notes, chapters or videos into well-formed flashcards with spaced-repetition-friendly phrasing.',
    desc: 'Good flashcards are about phrasing, not volume. This skill converts your source material into compact question-and-answer cards that survive spaced repetition: atomic facts, clear stems, no ambiguous prompts.\n\nIt exports to plain copy-paste blocks ready for Anki, Quizlet or any deck tool, and includes a difficulty-tiering pass so you can study in layers.',
    ben: 'Anyone can write atomic cards|No ambiguous prompts|Ready to paste into Anki or Quizlet|Difficulty tiers for layered study',
    inc: 'Source summarizer|Card phrasing prompt set|Difficulty-tiering pass|Deck QA checklist|Export formatter',
    fea: ['Spaced-repetition-aware card design'],
    faq: 'Which tools does it export to?::Plain text blocks that paste cleanly into Anki, Quizlet and most SRS apps.',
    tags: 'flashcards|study|learning|anki|note-taking',
    date: '2026-08-25', ord: 23 }),

  P({ id: 'PS-0205', name: 'Pantry Leftover Recipe Builder', slug: 'pantry-leftover-recipe-builder',
    cat: 'Daily Home, Lifestyle & Family Management', sub: 'Pantry Ingredient Leftover Recipe Builders', price: 8, type: 'prompt-pack',
    short: 'Turn whatever is in your fridge and cupboards into realistic meals — with allergy swaps and steps included.',
    desc: '“What can I make with these leftovers?” finally has a trained answer. This skill inventories what you have, proposes realistic meals (not aspirational ones), swaps in what you actually own and writes simple step-by-step instructions.\n\nIt watches for allergens and low-effort nights, and generates a printable shopping note for the two or three things you might be missing.',
    ben: 'Meals from what you already own|Allergen-aware swaps|Step-by-step simplicity|Less food waste, fewer takeaway evenings',
    inc: 'Ingredient inventory prompt|Meal idea engine|Allergen & swap checker|Step-by-step recipe writer|Missing-items list builder',
    fea: ['Low-effort night mode included'],
    faq: 'Can it handle dietary restrictions?::Yes — tell it the restrictions and the swap engine stays within them.',
    tags: 'recipes|meal-planning|leftovers|budget|home',
    date: '2026-08-26', ord: 24 }),

  P({ id: 'PS-0206', name: 'Weekend Road Trip Planner', slug: 'weekend-road-trip-planner',
    cat: 'Leisure Travel, Tourism & Local Exploration', sub: 'Weekend Road Trip Route Stop Planners', price: 10, type: 'workflow-kit',
    short: 'Design a weekend itinerary that balances driving time, stops, budget and energy — in one session.',
    desc: 'Road trips fail on balance: too much driving, too many “quick stops”, no plan for lunch. This skill takes your start point, weekend length and budget and lays out a route with sensible driving blocks, worthwhile stops and realistic timing.\n\nIt produces a day-by-day plan with alternatives, so you can adapt on the road without losing the structure.',
    ben: 'Balanced driving vs. stop time|Day-by-day itinerary with alternatives|Budget-conscious activity picks|Adaptable on the road',
    inc: 'Trip brief questionnaire|Route block planner|Stop worthiness evaluator|Day-by-day itinerary builder|On-the-road alternative list',
    fea: ['Includes a “rainy day” alternative plan'],
    faq: 'Does it use live traffic?::No — it plans routes and timing; check live conditions in your maps app on the day.',
    tags: 'travel|road-trip|itinerary|weekend|planning',
    date: '2026-08-26', ord: 25 }),

  /* ================= Library 4 — Practical Everyday Utilities =========== */
  P({ id: 'PS-0301', name: 'Smart Notification Triager', slug: 'smart-notification-triager',
    cat: 'Smartphone, App & Digital Lifestyle Utilities', sub: 'Smart Notification Triager', price: 8, type: 'prompt-pack',
    short: 'A rules-based skill that turns notification overload into a daily triage list that respects your focus.',
    desc: 'Notifications are a workflow, not a stream. This skill helps you define your personal triage rules once, then turns a daily export of pings into a short “act now / batch later / ignore” list.\n\nIt’s designed to be honest about your time — the output is a decision list, not another dashboard to check.',
    ben: 'A single daily decision list|Rules you define once, applied daily|Respects focus blocks you set|Cuts the compulsion to check',
    inc: 'Triage rules workbook|Daily notification export format|Decision list builder|Focus-block scheduler|Weekly review prompts',
    fea: ['One daily list, not another dashboard'],
    faq: 'Can it silence notifications?::No — it organizes what exists into actions. Do the muting in your OS settings.',
    tags: 'productivity|notifications|focus|habits|phone',
    feat: true, date: '2026-08-27', ord: 30 }),

  P({ id: 'PS-0302', name: 'Resume Action-Verb Strengthener', slug: 'resume-action-verb-strengthener',
    cat: 'Career Enhancement, Resumes & Remote Workplace Essentials', sub: 'Resume Action-Verb Strengtheners', price: 11, type: 'prompt-pack',
    short: 'Rewrite dull resume bullets into specific, measurable achievements without inventing anything.',
    desc: 'Recruiters skim bullets. This skill rewrites yours around action verbs, scope and measurable outcomes — while keeping every claim strictly true to what you actually did.\n\nIt includes a truth-guard that refuses to inflate, plus a version tailored for the exact job description you are applying to.',
    ben: 'Bullets recruiters can skim and remember|Strictly truthful — no inflated claims|Role-tailored versions ready to send|ATS-friendly phrasing',
    inc: 'Bullet rewriting prompt set|Truth guard checklist|Job-description tailoring engine|ATS formatting notes|Final proofread pass',
    fea: ['Truth guard refuses to exaggerate'],
    faq: 'Will it fabricate results?::No — the pack enforces that every claim is traceable to your real experience.',
    tags: 'resume|career|job-search|ats|writing',
    date: '2026-08-27', ord: 31 }),

  P({ id: 'PS-0303', name: 'Review Sincerity Sorter', slug: 'review-sincerity-sorter',
    cat: 'Smarter Online Shopping, Budgeting & Selling Utilities', sub: 'E-Commerce Review Sincerity Check Sorters', price: 9, type: 'prompt-pack',
    short: 'Separate genuine buyer feedback from incentivized fluff before you decide.',
    desc: 'Reviews mix real experience with planted praise. This skill teaches your AI to flag the patterns that suggest low-signal reviews — generic phrasing, incentive language, mismatched detail — and to extract the credible takeaways.\n\nYou get a verdict per review and an overall buying summary you can trust enough to act on.',
    ben: 'See which reviews to trust at a glance|Spots incentivized and generic patterns|Credible-takeaway summaries|Better purchasing decisions',
    inc: 'Review scoring rubric|Pattern recognition prompt set|Takeaway extractor|Buying summary template|Comparison helper',
    fea: ['Gives a trust verdict, not just a score'],
    faq: 'Is this a replacement for review sites?::No — it is a decision aid you run over reviews you have already found.',
    tags: 'reviews|shopping|ecommerce|buying-decisions',
    date: '2026-08-28', ord: 32 }),

  P({ id: 'PS-0304', name: 'Allergen Swap Calculator', slug: 'allergen-swap-calculator',
    cat: 'Simple Meal Prep, Kitchen Management & Household Diet Utilities', sub: 'Recipe Allergen Ingredient Swap Calculators', price: 9, type: 'prompt-pack',
    short: 'Adjust any recipe for allergies and dietary needs with practical, tested-style swaps — not vague substitutes.',
    desc: '“Just use a substitute” is not a plan. This skill reads a recipe, identifies allergen problem points, and proposes specific ingredient swaps with quantities and notes on what changes in texture, taste or timing.\n\nIt flags hidden ingredients most people miss (sauces, coatings, thickeners) and keeps the recipe realistic for a normal kitchen.',
    ben: 'Practical, kitchen-realistic swaps|Hidden-allergen spotting|Quantity-safe adjustments|Printable adapted recipe cards',
    inc: 'Recipe allergen scan|Swap suggestion engine|Hidden ingredient spotter|Adapted recipe formatter|Label reading checklist',
    fea: ['Flags hidden allergens in sauces and coatings'],
    faq: 'Is this medical advice?::No — it is an ingredient-mapping aid. Confirm critical allergies with the relevant professional.',
    tags: 'allergies|recipes|diet|meal-prep|cooking',
    date: '2026-08-28', ord: 33 }),

  P({ id: 'PS-0305', name: 'Room Decluttering Action Planner', slug: 'room-decluttering-planner',
    cat: 'Practical Home Organization, DIY & Family Care', sub: 'Room Decluttering Action Checklist Builders', price: 8, type: 'workflow-kit',
    short: 'Break any room into small, finishable decluttering sessions with clear keep/donate/toss decisions.',
    desc: 'Decluttering stalls when a room feels like one big task. This skill splits any room into zones and finishes: what to do in the next twenty minutes, what to decide next, and the keep/donate/toss logic to apply — including the emotional shortcuts that stop you stalling.\n\nIt tracks progress so the whole house becomes a series of completed small wins.',
    ben: 'Always a 20-minute next step visible|Decisions made by a consistent rule|Finished zones, not half-finished rooms|Sustains momentum',
    inc: 'Room zone splitter|20-minute session prompts|Keep/donate/toss decision rules|Progress tracker template|Donation logistics checklist',
    fea: ['Designed for short, finishable sessions'],
    faq: 'Will it work for one tiny corner?::Yes — the same method scales from a drawer to an entire house.',
    tags: 'declutter|home|organization|habits|minimalism',
    date: '2026-08-29', ord: 34 }),

  P({ id: 'PS-0306', name: 'Packing Weather Matcher', slug: 'packing-weather-matcher',
    cat: 'Local Leisure, Travel Packing & Weekend Travel Planners', sub: 'Travel Suitcase Packing Weather Matchers', price: 8, type: 'prompt-pack',
    short: 'A packing list built from the actual forecast and your itinerary — no more “maybe bring a jumper”.',
    desc: 'Packing lists fail when they ignore the forecast. This skill takes your destination, dates and plans, checks the expected conditions, and builds a garment list with quantities and versatility notes.\n\nIt answers the “what if it rains?” question with a backup plan, and trims the list to what you will realistically wear.',
    ben: 'Built from the actual forecast|Quantities, not vague suggestions|Rain-day fallbacks included|Itinerary-aware outfit planning',
    inc: 'Trip context form|Forecast-to-outfit mapper|Versatile item picker|Rain backup plan builder|Final checklist formatter',
    fea: ['Versatility-first item selection'],
    faq: 'Can it plan outfits for a business trip?::Yes — tell it the dress code and days and it adjusts the mix.',
    tags: 'packing|travel|weather|itinerary|weekend',
    date: '2026-08-29', ord: 35 }),

  /* ================= Library 5 — Public Sector & Enterprise Tech ======== */
  P({ id: 'PS-0401', name: 'Public Transit Route Optimizer', slug: 'transit-route-optimizer',
    cat: 'Government, Public Infrastructure & Civic Tech', sub: 'Public Transit Route Optimization', price: 24, type: 'workflow-kit',
    short: 'A data-driven skill for reviewing transit routes against ridership, coverage and equity constraints.',
    desc: 'Transit planning is a constraint puzzle: coverage, frequency, cost, equity. This skill structures the review — normalize ridership and timing data, score route options against the constraints your agency sets, and produce a readable recommendation memo.\n\nIt is built for public-sector analysts who need defensible, reproducible analysis rather than another opinion.',
    ben: 'Reproducible route scoring for any review|Equity and coverage constraints surfaced|Readable recommendation memos|Audit-friendly documentation',
    inc: 'Data normalization prompts|Constraint scorecard|Route option evaluator|Recommendation memo template|Public communications draft',
    fea: ['Assumptions logged for auditability'],
    faq: 'Does it replace transit planning software?::No — it organizes the analysis and output around your existing data and tools.',
    tags: 'transit|public-sector|planning|data|equity',
    feat: true, date: '2026-08-21', ord: 40 }),

  P({ id: 'PS-0402', name: 'Aircraft Fuel Optimization Pack', slug: 'aircraft-fuel-optimizer',
    cat: 'Aviation, Aerospace & Drone Logistics', sub: 'Aircraft Fuel Optimization', price: 21, type: 'workflow-kit',
    short: 'A structured method to review flight legs for fuel-saving opportunities without touching live operations.',
    desc: 'Fuel is the biggest variable cost in aviation and the angles to save are consistent: routing, payload, climb planning, tankering. This skill standardizes the review of a flight plan against those levers and outputs a prioritized savings brief.\n\nIt’s an analytical aid for planning and ops teams; it never automates live flight decisions.',
    ben: 'Consistent fuel-save review each cycle|Prioritized saving opportunities|Plain-language ops briefs|Auditable assumptions',
    inc: 'Leg review scorecard|Lever checklist (routing, payload, climb)|Savings prioritization prompts|Ops brief template|Benchmark tracking sheet',
    fea: ['Strictly decision-support, not automation'],
    faq: 'Does it connect to live flight systems?::No — it works on exported flight plans and logs, off-line.',
    tags: 'aviation|fuel|operations|optimization|flight',
    date: '2026-08-21', ord: 41 }),

  P({ id: 'PS-0403', name: 'Port Container Crane Scheduler', slug: 'port-crane-scheduler',
    cat: 'Maritime, Shipping & Oceanography', sub: 'Port Container Crane Scheduling', price: 20, type: 'workflow-kit',
    short: 'Build shift-level crane plans that balance berth time, yard congestion and equipment constraints.',
    desc: 'Crane scheduling decides whether a port hits its berth times. This skill structures the planning problem — vessel calls, move counts, crane availability, yard positions — into a feasible shift-level plan with the priorities your terminal sets.\n\nIt is a planning aid for terminal operations teams working over existing TOS data and spreadsheets.',
    ben: 'Feasible shift plans faster|Berth-time pressure balanced|Yard congestion considered|Consistent priorities each cycle',
    inc: 'Data intake format|Priority ruleset prompts|Shift plan builder|Conflict resolver|Post-shift review sheet',
    fea: ['Works over exported TOS/terminal data'],
    faq: 'Does it integrate with my terminal system?::It consumes exports from your TOS and spreadsheet tools rather than integrating live.',
    tags: 'maritime|ports|scheduling|cranes|logistics',
    date: '2026-08-22', ord: 42 }),

  P({ id: 'PS-0404', name: 'Construction Safety Check Pack', slug: 'construction-safety-check-pack',
    cat: 'Heavy Industry, Mining & Construction', sub: 'Construction Site Worker Safety Checks', price: 16, type: 'workflow-kit',
    short: 'A structured walkthrough protocol that turns site photos and notes into prioritized safety observations.',
    desc: 'Safety observation quality varies with who is walking the site. This skill standardizes the review: take site photos and notes, map observations against a checklist of common hazards, and produce a prioritized, plain-language list for the site team.\n\nIt is documentation support for safety professionals — it does not replace inspections or judgement.',
    ben: 'Consistent hazard coverage on every walk|Prioritized (not alphabetical) fixes|Photo-to-observation mapping|Easy weekly closeout reports',
    inc: 'Walkthrough checklist by trade|Observation organizer prompts|Priority scoring rubric|Closeout report template|Follow-up tracker',
    fea: ['Observations logged to a repeatable rubric'],
    faq: 'Does this replace a safety officer?::No. It is an aid for professionals to document and standardize walkthroughs.',
    tags: 'construction|safety|site|inspection|compliance',
    date: '2026-08-22', ord: 43 }),

  P({ id: 'PS-0405', name: 'Hotel Dynamic Pricing Kit', slug: 'hotel-dynamic-pricing-kit',
    cat: 'Hospitality, Tourism & Event Tech', sub: 'Hotel Room Dynamic Pricing', price: 18, type: 'workflow-kit',
    short: 'Turn occupancy, events and compset signals into defensible nightly price recommendations.',
    desc: 'Revenue managers juggle too many signals to do it by gut. This skill structures the daily pricing review — occupancy, forward bookings, local events, compset moves — into a clear recommended price per room type with the reasoning attached.\n\nIt produces the numbers you can defend to ownership and the note you can hand to the channel manager.',
    ben: 'Defensible nightly price recommendations|All key signals in one view|Room-type level granularity|Ready for revenue meetings',
    inc: 'Signal intake format|Room-type recommendation engine|Compset comparison prompts|Rate code decision guide|Revenue meeting brief',
    fea: ['Every recommendation carries its reasoning'],
    faq: 'Does it publish rates automatically?::No — it recommends; you publish in your PMS or channel manager.',
    tags: 'hotel|revenue-management|pricing|hospitality',
    date: '2026-08-23', ord: 44 }),

  P({ id: 'PS-0406', name: 'Protein Folding Predictor Pack', slug: 'protein-folding-predictor',
    cat: 'Scientific Research, Biotech & Pharma', sub: 'Protein Folding Molecular Prediction', price: 25, type: 'workflow-kit',
    short: 'A structured literature and sequence-analysis aid for exploring protein structure questions responsibly.',
    desc: 'Researchers spend days re-deriving what papers already answer. This skill structures the exploration: pull the sequence context, summarize what is known about the family and fold, and propose testable hypotheses — while routing heavy computational folding to the tools that actually do it.\n\nIt is a reasoning and literature aid for scientists, explicitly not a folding engine itself.',
    ben: 'Faster literature-to-hypothesis flow|Rigorous citation handling|Knows the boundary of LLM reasoning|Clean experiments briefs',
    inc: 'Sequence context summarizer|Family & fold knowledge prompts|Hypothesis builder|Tools routing guide (AlphaFold etc.)|Lab notes template',
    fea: ['Routes heavy computation to real folding tools'],
    faq: 'Does this predict structures itself?::No — it guides reasoning and literature; structural prediction belongs to dedicated tools.',
    tags: 'bioinformatics|protein|research|science|pharma',
    date: '2026-08-23', ord: 45 }),

  /* ================= Library 6 — Ocean, Chemical & Advanced Industry ==== */
  P({ id: 'PS-0501', name: 'Mangrove Carbon Audit Pack', slug: 'mangrove-carbon-audit',
    cat: 'Oceanography, Marine Ecology & Subsea Infrastructure', sub: 'Mangrove Blue Carbon Sequestration Auditing', price: 23, type: 'workflow-kit',
    short: 'A structured protocol for estimating mangrove blue carbon from satellite and field data with clear assumptions.',
    desc: 'Blue carbon claims live or die on methodology. This skill structures the audit: normalize satellite and field measurements, apply standard carbon-stock estimation steps, log every assumption, and produce a defensible report outline.\n\nIt is an analysis scaffold for environmental consultants — the numbers still come from your data and methods.',
    ben: 'Defensible estimation methodology|Every assumption explicitly logged|Consultant-grade report structure|Repeatable across sites',
    inc: 'Data normalization prompts|Stock estimation step guide|Assumption log template|Report outline builder|Verification checklist',
    fea: ['Assumption log makes audits defensible'],
    faq: 'Does it measure carbon itself?::No — it structures the estimation and reporting around your measurements.',
    tags: 'blue-carbon|mangroves|climate|audit|environment',
    feat: true, date: '2026-08-24', ord: 50 }),

  P({ id: 'PS-0502', name: 'Cosmetic Formula Stability Pack', slug: 'cosmetic-formula-stability-pack',
    cat: 'Chemical Engineering, Toxicology & Polymer Synthesis', sub: 'Cosmetic Formula Stability & Separation Predictions', price: 22, type: 'prompt-pack',
    short: 'A structured review that anticipates emulsion stability issues before the batch leaves the kitchen.',
    desc: 'Failed stability tests are expensive. This skill structures formulation review: map ingredients and concentrations, flag separation risks and incompatibilities from known chemistry patterns, and propose the tests that would catch problems early.\n\nIt is a formulation-reasoning aid for product developers — not a replacement for the lab.',
    ben: 'Anticipate separation risks earlier|Structured formulation review every time|Test-plan proposals matched to risk|Clean handoffs to the lab',
    inc: 'Formulation intake sheet|Risk pattern checklist|Incompatibility flag prompts|Stability test planner|Amendment tracker',
    fea: ['Runs risk checks before the batch, not after'],
    faq: 'Can it replace lab stability testing?::No — it proposes what to stress-test; results still come from the lab.',
    tags: 'cosmetics|formulation|stability|chemistry|product-development',
    date: '2026-08-24', ord: 51 }),

  P({ id: 'PS-0503', name: 'Smart Fabric Diagnostics Skill', slug: 'smart-fabric-diagnostics',
    cat: 'Textile Technology & Automated Apparel Engineering', sub: 'Smart Fabric Conductive Thread Integrity Diagnostics', price: 18, type: 'workflow-kit',
    short: 'Turn resistance-test data from conductive garments into a fault-location report your engineers can act on.',
    desc: 'Conductive thread failures are the industry’s quiet quality problem. This skill structures the diagnostic flow: intake resistance traces and test logs, isolate anomaly patterns consistent with broken or degrading threads, and output a fault-location report with likely causes.\n\nIt is an engineering-analysis aid — the electrical measurements remain from your equipment.',
    ben: 'Fault patterns surfaced consistently|Reports an engineer can act on|Test logs interpretable at a glance|Root-cause hypotheses prioritized',
    inc: 'Test data intake format|Anomaly pattern reference|Fault-location reasoning prompts|Report template|Batch trend tracker',
    fea: ['Output is engineer-ready, not data-dump'],
    faq: 'Does it perform electrical testing?::No — it interprets the resistance/test data your equipment produces.',
    tags: 'textiles|smart-fabric|diagnostics|quality|engineering',
    date: '2026-08-25', ord: 52 }),

  P({ id: 'PS-0504', name: 'Post-Quantum Transition Audit Kit', slug: 'post-quantum-transition-audit',
    cat: 'Quantum Computing Support & Cryptographic Readiness', sub: 'Post-Quantum Cryptographic Protocol Transition Auditing', price: 26, type: 'workflow-kit',
    short: 'Map where your cryptography lives and build the inventory that makes a post-quantum migration possible.',
    desc: 'You cannot migrate what you have not inventoried. This skill structures the first step of post-quantum readiness: catalogue the systems, protocols and certificate types in your estate, flag the ones most exposed to future quantum attack, and draft the transition-priority list.\n\nIt produces the living inventory and the executive brief — the actual crypto migration stays with your security team and tooling.',
    ben: 'A real cryptographic estate inventory|Exposure-priority ranking|Board-ready transition brief|Living document to update',
    inc: 'Estate inventory questionnaire|Protocol & key-type mapper|Exposure scoring rubric|Transition priority list|Executive brief template',
    fea: ['Focuses on the inventory nobody else starts'],
    faq: 'Does it migrate anything?::No — it builds the inventory and priorities your security team executes.',
    tags: 'quantum|cryptography|security|compliance|migration',
    date: '2026-08-25', ord: 53 }),

  P({ id: 'PS-0505', name: 'Wildfire Containment Simulator Aid', slug: 'wildfire-containment-simulator',
    cat: 'Forestry, Timber Operations & Wilderness Fire Management', sub: 'Wildfire Backfire Ignition Containment Simulator Models', price: 24, type: 'workflow-kit',
    short: 'Structure backfire-planning discussions with terrain, wind and fuel loaded — as an aid, not a fire-model.',
    desc: 'Backfire planning means weighing terrain, wind and fuel across a window of hours. This skill standardizes the briefing: assemble the factors your team actually uses, compare containment scenarios in plain terms, and produce the decision brief for the operations chief.\n\nIt is explicit decision-support for professionals; it is not a fire-behavior model and never replaces an incident command decision.',
    ben: 'Standardized scenario briefings|Terrain · wind · fuel all surfaced|Fast comparison of containment options|Explicit decision-support framing',
    inc: 'Factor intake checklist|Scenario comparison prompts|Containment brief template|Watch-hour summary builder|Post-incident review log',
    fea: ['Clear boundary: an aid, not a fire model'],
    faq: 'Does it predict fire behavior?::No — it organizes the factors and options your team weighs; predictions come from real models and judgement.',
    tags: 'wildfire|forestry|emergency|planning|safety',
    date: '2026-08-26', ord: 54 }),

  P({ id: 'PS-0506', name: 'Bloodstain Pattern Analysis Skill', slug: 'bloodstain-pattern-analyzer',
    cat: 'Forensic Science, Archaeology & Antiquities Tracking', sub: 'Crime Scene Bloodstain Pattern Kinetic Trajectory Reconstructors', price: 27, type: 'workflow-kit',
    short: 'Structure scene documentation and pattern classification notes — strictly as an aid to qualified analysts.',
    desc: 'Bloodstain pattern work depends on disciplined documentation. This skill structures the note-taking: organize scene photos and measurements by pattern type, check observations against classification criteria, and draft consistent documentation for the analyst file.\n\nIt clearly bounds itself as documentation support; interpretation and conclusions remain with qualified forensic personnel.',
    ben: 'Disciplined, consistent scene notes|Pattern-classification checklist|Photo-to-note organization|Audit-ready documentation',
    inc: 'Scene intake format|Pattern classification checklist|Documentation drafting prompts|Photo annotation guide|Peer-review checklist',
    fea: ['Explicitly scoped to documentation support'],
    faq: 'Is this a substitute for a qualified analyst?::No — conclusions in court come from qualified analysts; this aids their documentation.',
    tags: 'forensics|crime-scene|documentation|analysis|science',
    date: '2026-08-26', ord: 55 }),

  /* ================= Library 7 — Agri-Biotech, Mining & Precision Ops === */
  P({ id: 'PS-0601', name: 'Avian Influenza Mutation Tracker', slug: 'avian-flu-mutation-predictor',
    cat: 'Veterinary Pharmaceuticals, Livestock Genetics & Agri-Biotech', sub: 'Avian Influenza Airborne Mutation Predictors', price: 25, type: 'workflow-kit',
    short: 'Structure variant-watch over season, migration and humidity data into a prioritized risk briefing.',
    desc: 'Avian influenza variants spread with seasons, bird migration and humidity — and surveillance generates data faster than humans can read it. This skill structures the watch: assemble case data, migration windows and environmental logs, spot correlation patterns, and output a prioritized risk briefing for the veterinary team.\n\nIt is surveillance-decision support; laboratory confirmation and policy remain with professionals.',
    ben: 'Walk in with a structured risk briefing|Migration and humidity factors surfaced|Consistent weekly cadence|Clear escalation triggers',
    inc: 'Data intake format|Correlation-check prompts|Risk briefing template|Escalation trigger checklist|Weekly surveillance log',
    fea: ['Escalation triggers defined up front'],
    faq: 'Does it predict exact mutations?::No — it organizes and correlates surveillance data; pathogen confirmation stays in the lab.',
    tags: 'veterinary|avian-flu|surveillance|biosecurity|agritech',
    feat: true, date: '2026-08-27', ord: 60 }),

  P({ id: 'PS-0602', name: 'High-Wall Shift Tracker Pack', slug: 'high-wall-shift-tracker',
    cat: 'High-Tech Mining Automation, Mineralogy & Subsurface Robotics', sub: 'Open-Pit Mine High-Wall Dirt Shift Trackers', price: 28, type: 'workflow-kit',
    short: 'Turn radar and survey readings on high-wall movement into a structured early-warning briefing.',
    desc: 'High-wall movement is one of open-pit mining’s deadliest signals — and it hides inside noisy radar data. This skill structures the review: normalize radar and survey exports, separate genuine shifts from noise, and produce a prioritized movement briefing with suggested re-check intervals.\n\nIt is early-warning decision support; the instrumentation and evacuation authority stay with engineering and ops.',
    ben: 'Movement genuinely separated from noise|Prioritized shift briefing each cycle|Suggested re-check cadences|Audit-friendly log',
    inc: 'Radar export intake format|Noise-vs-shift filter prompts|Movement briefing template|Re-check interval guide|Escalation log',
    fea: ['Noise filtering built into the workflow'],
    faq: 'Does it replace slope monitoring radar?::No — it interprets the readings your monitoring system already produces.',
    tags: 'mining|slope|radar|safety|monitoring',
    date: '2026-08-27', ord: 61 }),

  P({ id: 'PS-0603', name: 'Arctic Ice Floe Radar Analyzer', slug: 'arctic-ice-floe-radar',
    cat: 'Polar Logistics, Glaciology & Sub-Zero Infrastructure', sub: 'Arctic Shipping Ice Floe Thickness Radar Analytics', price: 26, type: 'workflow-kit',
    short: 'Turn ice-sounding reports into a route-feasibility briefing for Arctic transits.',
    desc: 'Arctic shipping lives on the quality of ice information. This skill structures the work-up: assemble ice radar/sounding reports along the candidate track, profile thickness and pressure-ridge hazards, and produce a route-feasibility briefing for the navigation team.\n\nIt is planning support for crewed decisions; live conditions always rule.',
    ben: 'Route feasibility briefings in one flow|Thickness hazards profiled per leg|Crew-decision framing|Reusable each transit season',
    inc: 'Sounding data intake format|Hazard profile prompts|Route feasibility brief template|Contingency options builder|Post-transit log',
    fea: ['Built around crew decisions, not automation'],
    faq: 'Does it navigate the ship?::No — it supports the voyage planning work-up; the crew decides from live conditions.',
    tags: 'arctic|shipping|ice|polar|logistics',
    date: '2026-08-28', ord: 62 }),

  P({ id: 'PS-0604', name: 'Drone Swarm RF Tracker', slug: 'drone-swarm-rf-tracker',
    cat: 'Autonomous Drone Defense, Airspace Security & Countermeasures', sub: 'Drone Swarm RF Fingerprint Trajectory Trackers', price: 29, type: 'workflow-kit',
    short: 'Structure RF observation data from drone events into threat-pattern briefings for security teams.',
    desc: 'Drone incidents arrive as noise until someone connects the dots. This skill structures RF observation triage: log detection metadata, fingerprint repeat patterns, link events across a time window, and produce a threat-pattern briefing for the security team.\n\nIt is an analyst aid for authorized security operations — not a weaponized system, and always within the operator’s legal remit.',
    ben: 'Event-to-pattern linking in one flow|Repeat-actor fingerprinting surfaced|Briefings your team can act on|Legal-remit framing built in',
    inc: 'Detection log intake format|Fingerprint matching prompts|Pattern timeline builder|Briefing template|Post-incident review log',
    fea: ['Scope stays within authorized operations'],
    faq: 'Does it take down drones?::No — it analyzes authorized RF observations; any countermeasure is a separate, legal decision.',
    tags: 'drones|rf|security|airspace|analysis',
    date: '2026-08-28', ord: 63 }),

  P({ id: 'PS-0605', name: 'Prior-Art Linker Pack', slug: 'prior-art-linker',
    cat: 'Deep-Tech Patent Analytics, IP Valuation & Clearances', sub: 'Patent Claim Prior-Art Concept Linkers', price: 25, type: 'workflow-kit',
    short: 'Turn claim language into structured concept maps and candidate prior-art leads for your search.',
    desc: 'Prior-art search starts with breaking claims into concepts — and missing one concept can sink a search. This skill maps claim language into discrete claim elements, links each to candidate art categories and search phrasings, and prepares the structured brief your searching tool or attorney can run with.\n\nIt prepares the work; it is not a legal opinion.',
    ben: 'Claims broken into searchable elements|Missed-concept risk reduced|Search phrasings ready to run|Attorney-ready briefing',
    inc: 'Claim element splitter|Concept-to-phrasing mapper|Candidate-art category list|Search brief template|Review checklist',
    fea: ['Designed to feed real search tools'],
    faq: 'Is this a legal opinion?::No — it structures the search preparation; opinions come from your IP professional.',
    tags: 'patents|ip|prior-art|search|legal-tech',
    date: '2026-08-29', ord: 64 }),

  P({ id: 'PS-0606', name: 'Smart Meter Theft Analyzer', slug: 'smart-meter-theft-analyzer',
    cat: 'Advanced Grid Orchestration, Microgrids & Fusion Support', sub: 'Smart Meter Electricity Theft Detection Analytics', price: 24, type: 'workflow-kit',
    short: 'Flag consumption anomalies worth a field check, with case files your revenue-protection team can act on.',
    desc: 'Electricity theft hides in plain pattern deviations — until someone looks. This skill structures the scan: intake smart-meter consumption exports, flag profiles that deviate from reasonable norms, rank by confidence, and create a case file for field verification.\n\nIt assists revenue-protection teams; the field check and enforcement remain operational decisions.',
    ben: 'Anomaly ranking worth investigating|Case files ready for field teams|Normal-vs-suspicious logic defined|Repeatable monthly scan',
    inc: 'Consumption data intake format|Anomaly pattern library|Confidence-ranking rubric|Case file template|Monthly review log',
    fea: ['Output is field-ready, not just a flag'],
    faq: 'Does it confirm theft?::No — it identifies anomalies for investigation; confirmation happens on the ground.',
    tags: 'grid|smart-meter|energy|analytics|revenue-protection',
    date: '2026-08-29', ord: 65 }),

  /* ================= Library 8 — Materials, Bio-Tech & Defense Engineering = */
  P({ id: 'PS-0701', name: 'Graphene Defect Crystallography Skill', slug: 'graphene-defect-skill',
    cat: 'Advanced Material Informatics & Molecular Engineering', sub: 'Graphene Layer Defect Crystallography', price: 27, type: 'workflow-kit',
    short: 'Turn microscopy and spectral annotations into mutation-flagged integrity reports for materials teams.',
    desc: 'A defect in a graphene layer changes everything downstream. This skill structures the review: intake microscopy/spectral annotations, classify defect signatures against known types, and produce an integrity report with confidence ratings.\n\nIt is an analysis aid for materials teams; the imaging equipment stays yours.',
    ben: 'Defect signatures classified consistently|Confidence-rated integrity reports|Traceable reasoning per image|Standardized batch reviews',
    inc: 'Image annotation intake format|Defect-type reference library|Classification prompts|Integrity report template|Batch trend tracker',
    fea: ['Every classification carries its reasoning'],
    faq: 'Does it image samples?::No — it interprets the annotations and data your instruments produce.',
    tags: 'graphene|materials|nanotech|quality|engineering',
    feat: true, date: '2026-08-21', ord: 70 }),

  P({ id: 'PS-0702', name: 'CRISPR Off-Target Cleansing Kit', slug: 'crispr-offtarget-kit',
    cat: 'Precision Bio-Manufacturing & Synthetic Biology', sub: 'CRISPR Off-Target Mutation Cleansing Tools', price: 29, type: 'workflow-kit',
    short: 'A structured review flow for flagging potential off-target risk sites in CRISPR design work.',
    desc: 'Off-target risk assessment is about methodical review, not vibes. This skill structures the analysis: collect guide and annotation data, run the risk-factor checklist used in the field, and produce a prioritized risk memo with recommended verification steps.\n\nIt is a decision-support cover sheet for wet-lab teams; actual experimental validation stays in the lab.',
    ben: 'Consistent off-target risk review|Prioritized risk memos|Verification steps recommended|Audit-friendly records',
    inc: 'Guide data intake format|Risk-factor checklist|Risk memo template|Verification planning prompts|Batch review tracker',
    fea: ['Explicitly hands verification back to the lab'],
    faq: 'Does it validate edits?::No — it flags risk factors for review; validation happens in your experiments.',
    tags: 'crispr|biotech|synthetic-biology|risk|research',
    date: '2026-08-21', ord: 71 }),

  P({ id: 'PS-0703', name: 'Tunnel Seismic Early-Warning Aid', slug: 'tunnel-seismic-warning',
    cat: 'Autonomous Subterranean Defense & Tectonic Security', sub: 'Underground Tunnel Seismic Collapse Early Warnings', price: 28, type: 'workflow-kit',
    short: 'Turn ground-sensor streams into a shift-detection briefing with escalation triggers built in.',
    desc: 'Early warning means listening to the ground consistently. This skill structures the monitoring review: intake geophone and ground-sensor exports, separate meaningful shifts from noise, and produce a shift-detection briefing with pre-agreed escalation triggers.\n\nIt is decision support for engineers and security teams; instrumentation authority stays operational.',
    ben: 'Signal truly separated from noise|Escalation triggers defined up front|Engineer-ready briefing each cycle|Audit trail preserved',
    inc: 'Sensor export intake format|Noise-vs-signal filter prompts|Shift briefing template|Escalation trigger checklist|Incident log',
    fea: ['Escalation agreed before the event, not after'],
    faq: 'Does it replace ground instrumentation?::No — it interprets the streams your instruments already capture.',
    tags: 'tunnels|seismic|monitoring|engineering|security',
    date: '2026-08-22', ord: 72 }),

  P({ id: 'PS-0704', name: 'Exoskeleton Motion Sync Pack', slug: 'exoskeleton-motion-sync',
    cat: 'Specialist Medical Devices, Exoskeletons & Prosthetics', sub: 'Robotic Exoskeleton Joint Torque Biomotion Syncers', price: 30, type: 'workflow-kit',
    short: 'Organize gait and torque logs from exoskeleton trials into tuning-topic briefs for the engineering team.',
    desc: 'Exoskeleton tuning lives in torque-and-gait logs nobody has time to read line by line. This skill structures the review: intake trial data, isolate deviation patterns against expected biomotion profiles, and output a tuning-topic brief with candidate adjustments.\n\nIt is engineering-analysis support; all device parameter changes remain with qualified engineers and clinical staff.',
    ben: 'Trial logs turned into tuning topics|Deviation patterns surfaced consistently|Engineer-ready briefs|Clinical safety boundaries respected',
    inc: 'Trial data intake format|Biomotion profile reference|Deviation-analysis prompts|Tuning brief template|Revision log',
    fea: ['Safety-bounded: adjustments stay with engineers'],
    faq: 'Does it change device settings?::No — it analyzes logs and proposes topics; changes are made by qualified staff.',
    tags: 'exoskeleton|medical-devices|biomotion|engineering|rehab',
    date: '2026-08-22', ord: 73 }),

  P({ id: 'PS-0705', name: 'Bullet Train Wheel Monitor Pack', slug: 'bullet-train-wheel-monitor',
    cat: 'Advanced Vehicle Dynamics, Rail & Track Infrastructure', sub: 'High-Speed Bullet Train Wheel Flat-Spot Acoustic Diagnostics', price: 26, type: 'workflow-kit',
    short: 'Correlate acoustic wheel data with potential flat-spot signatures and maintenance triggers.',
    desc: 'Wheel flats at high speed show up acoustically before they show up visibly — if someone checks. This skill structures the review: intake wayside acoustic and maintenance data, filter for flat-spot signatures, and produce a condition briefing with suggested inspection timing.\n\nIt is analysis support for rolling-stock maintenance teams; the maintenance action stays theirs.',
    ben: 'Flat-spot signatures surfaced consistently|Inspection timing recommendations|Maintenance-ready briefs|Controlled false-positive framing',
    inc: 'Acoustic data intake format|Signature filter prompts|Condition briefing template|Inspection timing guide|Maintenance log',
    fea: ['Inspections recommended, decisions stay with teams'],
    faq: 'Does it stop trains?::No — it flags conditions for the maintenance team to act on.',
    tags: 'rail|high-speed|maintenance|acoustics|wheels',
    date: '2026-08-23', ord: 74 }),

  P({ id: 'PS-0706', name: 'Cloud Seeding Trajectory Planner', slug: 'cloud-seeding-trayectory',
    cat: 'Micro-Climate Geo-Engineering & Crop Protection', sub: 'Cloud Seeding Silver Iodide Trajectory Particle Planners', price: 27, type: 'workflow-kit',
    short: 'Structure seeding-window planning around weather, dispersion and compliance — as operations support.',
    desc: 'Seeding windows are narrow and weather is noisy. This skill structures the planning work-up: assemble forecast and dispersion inputs, evaluate candidate windows against your operating criteria, and produce a seeding-plan brief with the compliance notes your program needs.\n\nIt is an operational-planning aid; execution, licensing and weather judgements stay with the program’s professionals.',
    ben: 'Window-evaluation briefs in one flow|Dispersion and compliance surfaced|Reusable each season|Explicit operations-support framing',
    inc: 'Weather input intake format|Window-evaluation rubric|Seeding plan brief template|Compliance checklist|Season log',
    fea: ['Compliance noted at every step'],
    faq: 'Does it conduct seeding?::No — it supports planning; operations follow your program’s licensing and judgement.',
    tags: 'geoengineering|weather|crops|planning|climate',
    date: '2026-08-23', ord: 75 }),

  /* ================= Library 9 — Space, Energy & Next-Gen Systems ======= */
  P({ id: 'PS-0801', name: 'Satellite Collision Avoidance Kit', slug: 'satellite-collision-avoidance',
    cat: 'Space Tech, Satellite Operations & Astrophysics', sub: 'Satellite Constellation Collision Avoidance', price: 30, type: 'workflow-kit',
    short: 'Turn conjunction reports into structured screening briefs and decision points for operators.',
    desc: 'Conjunction assessment is a decision pipeline under time pressure. This skill structures it: intake screens from your SSA feeds, rank risk by your thresholds, and produce a screening brief with decision points and documentation ready for the ops loop.\n\nIt is decision support for satellite operators; maneuver decisions and authority remain with the flight team.',
    ben: 'Conjunction screens ranked by your rules|Decision points made explicit|Ops-loop-ready documentation|Consistent log each pass',
    inc: 'Screen intake format|Risk-threshold rubric|Screening brief template|Decision-point builder|Event log',
    fea: ['Brings structure to the time-pressured loop'],
    faq: 'Does it maneuver satellites?::No — it organizes the assessment; the flight team decides and commands.',
    tags: 'satellites|space|collision|operations|ssa',
    feat: true, date: '2026-08-24', ord: 80 }),

  P({ id: 'PS-0802', name: 'Honeypot Analytics Pack', slug: 'honeypot-analytics',
    cat: 'Advanced Cybersecurity Deception & Digital Forensics', sub: 'Cyber Honeypot Attack Pattern Analytics', price: 24, type: 'workflow-kit',
    short: 'Turn honeypot telemetry into attacker-profile briefings for the threat-intel team.',
    desc: 'Honeypots generate noise; the value is in the pattern behind the noise. This skill structures the analysis: intake honeypot telemetry, cluster interaction patterns, fingerprint tools and TTPs, and produce a weekly threat-intel briefing.\n\nIt is an analyst aid for authorized operations; deployment and response stay with your security function.',
    ben: 'Noise clusters into attacker profiles|Tool and TTP fingerprints surfaced|Weekly intel briefings|Structured, shareable outputs',
    inc: 'Telemetry intake format|Pattern-clustering prompts|TTP fingerprint reference|Intel brief template|Weekly summary log',
    fea: ['Purpose-built for authorized intel teams'],
    faq: 'Does it deploy honeypots?::No — it analyzes what your existing honeypot deployments record.',
    tags: 'cybersecurity|honeypots|threat-intel|analysis|defense',
    date: '2026-08-24', ord: 81 }),

  P({ id: 'PS-0803', name: 'Solar Inverter Degradation Scanner', slug: 'solar-inverter-scanner',
    cat: 'Renewable Infrastructure & Smart Energy Systems', sub: 'Solar Array Inverter Degradation Scans', price: 21, type: 'workflow-kit',
    short: 'Turn inverter production data into degradation-pattern reports and inspection priorities.',
    desc: 'Inverters fail softly. This skill structures fleet review: intake production and error exports, isolate degradation patterns against expected curves, and produce a fleet report with inspection priorities.\n\nIt is an O&M analysis aid; field work and warranties stay with your operations team.',
    ben: 'Soft failures surfaced before outages|Fleet-level pattern reports|Inspection priorities clear|Works on standard exports',
    inc: 'Production data intake format|Degradation-curve reference|Pattern-isolation prompts|Fleet report template|Inspection priority log',
    fea: ['Fleet view, not just single units'],
    faq: 'Does it fix inverters?::No — it flags degradation for O&M teams to prioritize.',
    tags: 'solar|renewables|inverters|om|energy',
    date: '2026-08-25', ord: 82 }),

  P({ id: 'PS-0804', name: 'Alloy Tensile Strength Predictor', slug: 'alloy-tensile-strength',
    cat: 'Metallurgical, Chemical & Material Operations', sub: 'Alloy Microstructure Tensile Strength Prediction', price: 24, type: 'workflow-kit',
    short: 'Correlate microstructure and processing annotations with expected strength bands for design reviews.',
    desc: 'Strength estimates change the whole design review. This skill structures the estimate: intake composition, processing and microstructure annotations, apply the field’s correlation logic, and output strength-band assessments with confidence bounds.\n\nIt is a first-pass engineering aid; final properties still come from certified testing.',
    ben: 'Strength bands with confidence bounds|Consistent across design reviews|Traceable reasoning per estimate|Hands off to test planning',
    inc: 'Alloy data intake format|Correlation-logic prompts|Strength-band template|Confidence rubric|Test planning notes',
    fea: ['Every estimate carries confidence bounds'],
    faq: 'Does it replace tensile testing?::No — it provides first-pass estimates; certification requires actual tests.',
    tags: 'metallurgy|alloys|materials|design|engineering',
    date: '2026-08-25', ord: 83 }),

  P({ id: 'PS-0805', name: 'Faded Document Restoration Kit', slug: 'faded-document-restoration',
    cat: 'Cultural Heritage, Archive & Language Preservation', sub: 'Faded Document Text Ink Restoration', price: 18, type: 'workflow-kit',
    short: 'Structure multispectral and photo scans of faint documents into readable-draft restoration workflows.',
    desc: 'Faded ink hides history — until imaging and careful restoration reveal it. This skill structures the workflow: organize source scans, apply enhancement and comparison steps in your imaging tools, and draft the recovered text with confidence notes for the archivist.\n\nIt coordinates the process around your imaging software; it does not fabricate text from nothing.',
    ben: 'Restoration workflow runs in order|Recovered text drafted with confidence notes|Hands off cleanly to archivists|Reusable per document set',
    inc: 'Source scan organizer|Enhancement-step prompts|Recovered-text drafting flow|Confidence note template|Archive metadata builder',
    fea: ['No fabrication: gaps stay flagged'],
    faq: 'Does it invent missing text?::No — it drafts what the imaging supports and flags uncertain regions honestly.',
    tags: 'heritage|archives|restoration|imaging|language',
    date: '2026-08-26', ord: 84 }),

  P({ id: 'PS-0806', name: 'Equine Gait Diagnostics Skill', slug: 'equine-gait-diagnostic',
    cat: 'Veterinary Science & Animal Husbandry', sub: 'Equine Gait Lameness Video Diagnostics', price: 20, type: 'workflow-kit',
    short: 'Turn training videos into structured observational notes and gait-review checklists for vets.',
    desc: 'Lameness shows in the video before it shows in the exam — if you watch for the right things. This skill structures the review: intake video observations frame by frame, organize them against a gait-assessment checklist, and produce an observational report for the veterinarian’s file.\n\nIt is an observation aid; diagnosis and treatment stay with the vet.',
    ben: 'Frames organized against a real checklist|Observational reports for the vet|Consistent review cadence|Video timing references included',
    inc: 'Video observation intake format|Gait-assessment checklist|Frame-reference prompts|Observational report template|Owner communication draft',
    fea: ['Scoped to observation, never diagnosis'],
    faq: 'Does this diagnose lameness?::No — it prepares structured observations that support the veterinarian’s assessment.',
    tags: 'veterinary|equine|lameness|diagnostics|animal-care',
    date: '2026-08-26', ord: 85 }),

  /* ============ Library 10 — Frontier Engineering & Emerging Science ===== */
  P({ id: 'PS-0901', name: 'Cloud Seeding Dispersion Scheduler', slug: 'cloud-seeding-scheduler',
    cat: 'Climate Modification, Weather Control & Atmospheric Security', sub: 'Cloud Seeding Flare Dispersion Schedulers', price: 27, type: 'workflow-kit',
    short: 'Plan seeding operations around dispersion windows and compliance — as program operations support.',
    desc: 'Seeding programs live and die on window timing. This skill structures the operations work-up: assemble forecast, dispersion and logistics inputs, evaluate candidate windows against program criteria, and produce a seeding-ops brief with compliance notes.\n\nIt is planning support for licensed programs; weather judgement and execution remain with the responsible professionals.',
    ben: 'Window planning on one structured sheet|Dispersion and compliance surfaced|Season-reusable briefs|Explicit operations-support framing',
    inc: 'Window criteria worksheet|Dispersion input prompts|Seeding-ops brief template|Compliance checklist|Season log',
    fea: ['Compliance lines are explicit, not implied'],
    faq: 'Does it authorize seeding?::No — it supports planning under your program’s licensing and judgement.',
    tags: 'climate|seeding|weather|operations|compliance',
    feat: true, date: '2026-08-27', ord: 90 }),

  P({ id: 'PS-0902', name: 'Neural Impulse Signal Denoiser', slug: 'neural-impulse-denoiser',
    cat: 'Neurological Interfaces & Cognitive Cybernetics', sub: 'Motor Cortex Neural Impulse Signal Denoising', price: 31, type: 'workflow-kit',
    short: 'Structure neural-signal preprocessing logs into clean filtering summaries for the research team.',
    desc: 'Neural recordings are buried in noise; preprocessing choices decide what survives. This skill organizes the pipeline review: intake signal logs and filter settings, summarize the preprocessing steps applied, and produce a filter-summary report with cleanliness metrics and flagged decisions for the researchers.\n\nIt documents and reviews the pipeline your lab already runs; it is not a signal-processing engine.',
    ben: 'Filter decisions documented consistently|Cleanliness metrics surfaced per run|Researcher-ready summaries|Reproducible pipelines',
    inc: 'Signal log intake format|Filter-settings mapper|Cleanliness metric prompts|Filter-summary template|Decision log',
    fea: ['Turns pipelines into reproducible records'],
    faq: 'Does it process the signals?::No — it reviews and documents the preprocessing your research stack performs.',
    tags: 'neural|bci|signal-processing|research|documentation',
    date: '2026-08-27', ord: 91 }),

  P({ id: 'PS-0903', name: 'Hydrogen Boil-Off Vent Scheduler', slug: 'hydrogen-boiloff-scheduler',
    cat: 'Cryogenic Engineering, Superconductors & Deep Freeze Ops', sub: 'Liquid Hydrogen Storage Boil-Off Vent Schedulers', price: 26, type: 'workflow-kit',
    short: 'Plan tank-maintenance and vent windows around boil-off forecasts and safety constraints.',
    desc: 'Liquid hydrogen storage runs on timing and thermal discipline. This skill structures the planning: intake tank pressure and thermal data, model the boil-off trend, and produce a vent/maintenance window plan with the safety constraints your team operates under.\n\nIt is planning support for cryogenic operations staff; pressure safety decisions stay with them.',
    ben: 'Vent windows planned from data, not gut|Safety constraints made explicit|Maintenance windows coordinated|Consistent logging',
    inc: 'Tank data intake format|Boil-off trend prompts|Window planning worksheet|Safety constraint checklist|Event log',
    fea: ['Safety constraints bound every recommendation'],
    faq: 'Does it control the tank?::No — it plans windows; operating actions stay with trained staff.',
    tags: 'cryogenics|hydrogen|storage|safety|engineering',
    date: '2026-08-28', ord: 92 }),

  P({ id: 'PS-0904', name: 'Nanotube Alignment Loom System Pack', slug: 'nanotube-loom-system',
    cat: 'Advanced Nanotech, Graphene & Molecular Scale Fabrication', sub: 'Carbon Nanotube Alignment Laser Loom Systems', price: 29, type: 'workflow-kit',
    short: 'Organize alignment-run data into uniformity reports and tuning topics for fabrication teams.',
    desc: 'Alignment quality decides what a nanotube assembly is worth. This skill structures the review: intake run logs and metrology exports, evaluate alignment uniformity against target bands, and produce a run report with tuning topics for the fabrication team.\n\nIt is analysis support; process tuning stays with the fabrication engineers.',
    ben: 'Uniformity evaluated against targets|Run reports an engineer can act on|Tuning topics surfaced|Batch-level trends tracked',
    inc: 'Run log intake format|Uniformity metric prompts|Run report template|Tuning topic builder|Batch tracker',
    fea: ['Target bands make results unambiguous'],
    faq: 'Does it operate the loom?::No — it reviews run data and proposes tuning topics for engineers.',
    tags: 'nanotech|graphene|fabrication|quality|engineering',
    date: '2026-08-28', ord: 93 }),

  P({ id: 'PS-0905', name: 'Mycorrhizal Nutrient Scheduler', slug: 'mycorrhizal-scheduler',
    cat: 'Micro-Ecological Management, Soil Science & Biomarker Tech', sub: 'Mycorrhizal Fungi Root Network Nutrient Schedulers', price: 20, type: 'workflow-kit',
    short: 'Sketch soil-fertility plans that respect fungal networks — a farm-management decision aid.',
    desc: 'Healthy soil is a fungal network, and tilling or dosing schedules break it. This skill structures soil management planning: assemble soil-test and cropping inputs, reason about network-friendly timing, and produce a fertility-plan sketch with the follow-up tests you should run.\n\nIt is a farm-management aid to be validated against real agronomy advice and lab results.',
    ben: 'Soil plans that respect fungal networks|Follow-up tests built into the plan|Season-reusable templates|Plain-field language',
    inc: 'Soil test intake format|Network-friendly rule prompts|Fertility plan template|Test scheduling guide|Season log',
    fea: ['Plans are explicit proposals, ready for validation'],
    faq: 'Does it replace agronomy advice?::No — it drafts plans for you to review with your agronomist and lab data.',
    tags: 'soil|fungi|agriculture|fertility|management',
    date: '2026-08-29', ord: 94 }),

  P({ id: 'PS-0906', name: 'Launchpad Deluge Acoustic Timer', slug: 'launchpad-deluge-timer',
    cat: 'Heavy Aerospace, Hypersonics & Supersonic Mechanics', sub: 'Rocket Launchpad Water Deluge Acoustic Suppression Timers', price: 28, type: 'workflow-kit',
    short: 'Organize launch-deluge test records into timing-performance summaries for pad engineering teams.',
    desc: 'The deluge system protects the pad from its own launch acoustics — and it only works if the timing is right. This skill structures the review: intake deluge test timings and sensor releases, compare against design envelopes, and produce performance summaries with the engineering note your team needs.\n\nIt is an engineering-analysis aid; pad systems and launch authority remain operational.',
    ben: 'Test records become performance summaries|Timing compared against envelopes|Engineering notes drafted|Launch-season trend visible',
    inc: 'Test data intake format|Envelope comparison prompts|Performance summary template|Notes drafter|Season trend tracker',
    fea: ['Envelope comparisons make issues obvious'],
    faq: 'Does it control the deluge?::No — it reviews test data and supports the engineers who operate the system.',
    tags: 'aerospace|launchpad|deluge|testing|engineering',
    date: '2026-08-29', ord: 95 }),

  /* ============ Library 11 — Deep Science & Futurist Systems ============= */
  P({ id: 'PS-1001', name: 'Ornithopter Aerodynamic Tuner', slug: 'ornithopter-aero-tuner',
    cat: 'Advanced Biomimetic Robotics & Kinetic Synthesis', sub: 'Avian-Flap Ornithopter Aerodynamic Tuning', price: 25, type: 'workflow-kit',
    short: 'Turn flight-test logs from flapping prototypes into tuning topics for your robotics team.',
    desc: 'Flapping flight is a research loop of tune-and-test — and the logs pile up. This skill structures the review: intake flight logs and telemetry, isolate performance deviations from the aero model, and produce tuning-topic briefs the robotics team can iterate on.\n\nIt is an analysis aid for R&D teams; the prototype and flight tests stay yours.',
    ben: 'Flight logs become tuning topics|Deviations tied to the aero model|Iteration cycles shortened|R&D-ready briefs',
    inc: 'Flight log intake format|Aero-model reference prompts|Deviation analysis|Tuning brief template|Test loop tracker',
    fea: ['Built for fast R&D iteration'],
    faq: 'Does it fly the prototype?::No — it analyzes flight logs and proposes tuning topics for the team.',
    tags: 'biorobotics|ornithopter|aerodynamics|r&d|flight',
    feat: true, date: '2026-08-28', ord: 100 }),

  P({ id: 'PS-1002', name: 'CubeSat Swarm Sync Pack', slug: 'cubesat-swarm-sync',
    cat: 'Micro-Satellite Swarm Orchestration & Astro-Logistics', sub: 'CubeSat Swarm RF Baseline Interferometry Syncers', price: 30, type: 'workflow-kit',
    short: 'Structure inter-satellite baseline data into sync-quality reports for swarm operations.',
    desc: 'CubeSat swarms only work when baselines stay tight. This skill structures the review: intake inter-satellite ranging and time-sync logs, evaluate against baseline budgets, and produce sync-quality reports with flagged excursions for the ops team.\n\nIt is operations-analysis support; commanding and orbit control stay with the flight team.',
    ben: 'Baselines evaluated against budgets|Sync excursions flagged early|Ops-team-ready reports|Constellation trend visibility',
    inc: 'Baseline log intake format|Budget comparison prompts|Sync-quality report template|Excursion flag list|Trend tracker',
    fea: ['Excursion reporting beyond raw telemetry'],
    faq: 'Does it command the swarm?::No — it analyzes baselines and surfaces issues; commanding stays with flight ops.',
    tags: 'cubesat|swarm|space|rf|operations',
    date: '2026-08-28', ord: 101 }),

  P({ id: 'PS-1003', name: 'Geothermal Corrosion Analyzer', slug: 'geothermal-corrosion-analyzer',
    cat: 'Deep-Earth Geothermal Fluids & Magma Engineering', sub: 'Supercritical Geothermal Well Corrosion Inflow Analytics', price: 27, type: 'workflow-kit',
    short: 'Turn well-chemistry logs into corrosion-risk briefings for geothermal asset teams.',
    desc: 'Supercritical wells attack their own steel. This skill structures the review: intake well-chemistry and flow logs, correlate aggressive species against corrosion-relevant thresholds, and produce a corrosion-risk briefing with sampling recommendations.\n\nIt is an engineering-analysis aid; well integrity decisions stay with the asset engineers.',
    ben: 'Corrosion risk surfaced per well|Sampling recommendations included|Asset-team-ready briefs|Trends tracked across wells',
    inc: 'Well-chemistry intake format|Threshold correlation prompts|Risk briefing template|Sampling scheduler|Fleet trend log',
    fea: ['From chemistry log to risk briefing in one flow'],
    faq: 'Does it fix corrosion?::No — it flags risk and recommends sampling; integrity work stays with engineers.',
    tags: 'geothermal|corrosion|wells|energy|engineering',
    date: '2026-08-29', ord: 102 }),

  P({ id: 'PS-1004', name: 'Ancient DNA Assembler Aid', slug: 'ancient-dna-assembler',
    cat: 'Archaeological Bio-Anthropology & Ancient Genetics', sub: 'Damaged Ancient DNA Fragment Read Assemblers', price: 28, type: 'workflow-kit',
    short: 'Organize ancient-DNA fragment data and contamination checks into assembly-log reports for genomics teams.',
    desc: 'Ancient DNA arrives fragmented, damaged and contaminated — and assembly lives in the details. This skill structures the documentation: intake fragment and contamination-control logs, organize by sample and read quality, and produce assembly-log reports that flag issues for the genomics team.\n\nIt is a documentation-and-review aid; sequencing and assembly engines stay with your bioinformatics stack.',
    ben: 'Assembly logs organized per sample|Contamination controls surfaced|Flags ready for the bioinformatician|Reproducible recordkeeping',
    inc: 'Fragment log intake format|Contamination-control checklist|Read-quality organizer|Assembly-log template|Issue flag list',
    fea: ['Documentation built for reproducibility'],
    faq: 'Does it assemble genomes?::No — it organizes and reviews the data around the assembly tools your team runs.',
    tags: 'ancient-dna|genomics|archaeology|bioinformatics|research',
    date: '2026-08-29', ord: 103 }),

  P({ id: 'PS-1005', name: 'Exoskeleton Motor Sync Skill', slug: 'exoskeleton-motor-sync',
    cat: 'Specialist Medical Devices & Prosthetic Intelligence', sub: 'Robotic Exoskeleton Joint Motor Biomotion Syncers', price: 29, type: 'workflow-kit',
    short: 'Turn motor and gait telemetry from exo trials into tuning-topic briefs — analysis support, not device control.',
    desc: 'Exoskeleton motors must mirror human biomotion exactly, or therapy suffers. This skill structures the telemetry review: intake motor and gait logs, compare against expected motion profiles, and produce tuning-topic briefs with candidate adjustments for the engineering and clinical team.\n\nIt is analysis support; settings changes remain with qualified staff.',
    ben: 'Telemetry becomes tuning topics|Motion-profile deviations surfaced|Engineering and clinical briefs|Trial-to-trial trends tracked',
    inc: 'Telemetry intake format|Motion-profile reference prompts|Tuning-topic builder|Brief template|Revision log',
    fea: ['Clinical and engineering concerns both surfaced'],
    faq: 'Does it adjust the device?::No — it proposes tuning topics; qualified staff make any changes.',
    tags: 'exoskeleton|medical-devices|biomotion|rehab|engineering',
    date: '2026-08-30', ord: 104 }),

  P({ id: 'PS-1006', name: 'Mars Soil Spectrometer Sorter', slug: 'mars-soil-spectrometer-sorter',
    cat: 'High-Value Space Science, Astrobiology & Astrochemistry', sub: 'Astrobiology Mars Soil Drilling Mass Spectrometer Sorters', price: 32, type: 'workflow-kit',
    short: 'Organize instrument-readout data from soil studies into sample-class summaries for science teams.',
    desc: 'Planetary sample data is precious and noisy. This skill structures the science floor: intake instrument readouts, organize by sample run, summarize class signatures, and produce sample-class summaries with follow-up investigative suggestions for the science team.\n\nIt is data-organizing support for researchers; sample handling and mission conclusions stay with the team.',
    ben: 'Readouts organized by sample run|Class signatures summarized clearly|Follow-up points suggested|Science-team-ready output',
    inc: 'Readout intake format|Sample organizer|Class-signature prompts|Summary template|Follow-up suggestion list',
    fea: ['Built for precious, irreversible data'],
    faq: 'Does it interpret biosignatures?::No — it organizes and summarizes; scientific interpretation remains with the team.',
    tags: 'astrobiology|mars|spectrometry|space-science|research',
    date: '2026-08-30', ord: 105 }),
];

/* ------------------------------------------------ emit CSV */
const HEADER = [
  'id', 'name', 'slug', 'short_description', 'description', 'category',
  'subcategory', 'library', 'price', 'currency', 'compare_at_price', 'image',
  'gallery_images', 'product_type', 'file_format', 'compatibility',
  'benefits', 'includes', 'features', 'faqs', 'tags', 'payhip_url',
  'payhip_product_id', 'payhip_permalink', 'featured', 'status',
  'seo_title', 'seo_description', 'updated_at', 'order',
];

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const usedSlugs = new Set(HEADER.map((h) => h));
const usedIds = new Set(['id']);

/** Products are id-prefixed by library: PS-01xx → Library 2 … PS-10xx → Library 11. */
const libOrderFor = (id) => parseInt(String(id).slice(3, 5), 10) + 1;

function expand(def) {
  const libOrder = libOrderFor(def.id);
  const { category, subcategory } = resolve(libOrder, def.categoryRef, def.subcategoryRef);
  let slug = def.slug || slugify(def.name);
  let candidate = slug;
  while (usedSlugs.has(candidate)) {
    candidate = `${slug}-${(usedSlugs.size + 1)}`.slice(0, 64);
  }
  usedSlugs.add(candidate);
  if (usedIds.has(def.id)) throw new Error(`Duplicate product id ${def.id}`);
  usedIds.add(def.id);

  return {
    id: def.id,
    name: def.name,
    slug: candidate,
    short_description: def.short,
    description: def.desc,
    category: category.title,
    subcategory: subcategory.title,
    library: `${libOrder}.txt`,
    price: def.price,
    currency: 'USD',
    compare_at_price: def.compare || '',
    image: `images/products/${candidate}.svg`,
    gallery_images: '',
    product_type: def.type,
    file_format: def.format,
    compatibility: def.compat,
    benefits: Array.isArray(def.ben) ? def.ben.join('|') : def.ben || '',
    includes: Array.isArray(def.inc) ? def.inc.join('|') : def.inc || '',
    features: Array.isArray(def.fea) ? def.fea.join('|') : def.fea || '',
    faqs: def.faq || '',
    tags: Array.isArray(def.tags) ? def.tags.join('|') : def.tags || '',
    payhip_url: 'https://payhip.com/b/YOUR_PRODUCT_KEY',
    payhip_product_id: '',
    payhip_permalink: '',
    featured: def.featured,
    status: 'published',
    seo_title: '',
    seo_description: '',
    updated_at: def.updated_at,
    order: def.order,
  };
}

function main() {
  const existing = existsSync(CSV_PATH) ? parseCsv(readFileSync(CSV_PATH, 'utf8')) : [];
  // Upsert by id: existing rows are preserved, seeded ids are refreshed.
  const byId = new Map();
  for (const r of existing) {
    if (r.id && !byId.has(r.id)) byId.set(r.id, r);
  }

  // Validation pass: every new product must resolve before anything is written
  for (const def of NEW_PRODUCTS) {
    resolve(libOrderFor(def.id), def.categoryRef, def.subcategoryRef);
    expand(def);
  }
  // Reset counters for the real pass
  usedSlugs.clear();
  HEADER.forEach((h) => usedSlugs.add(h));
  usedIds.clear();

  for (const def of NEW_PRODUCTS) {
    byId.set(def.id, expand(def));
  }

  const rows = Array.from(byId.values());
  writeFileSync(CSV_PATH, [HEADER.join(','), ...rows.map((r) => HEADER.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n');
  console.log(`✅ products.csv written: ${rows.length} rows total (${NEW_PRODUCTS.length} seeded rows across Libraries 2–11).`);
}

main();