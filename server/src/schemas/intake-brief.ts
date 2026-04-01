/**
 * Intake Brief — 25 questions across all domains.
 *
 * Priority legend:
 *   🔴 required     — pipeline is BLOCKED until all required questions are answered
 *   🟡 recommended  — pipeline proceeds but agents flag data gaps
 *   🟢 optional     — nice-to-have context
 *
 * Each question maps to one or more domain agents that will receive it in
 * their context slice (via ContextBuilder.build()).
 */
import { z } from 'zod';
import type { BriefQuestion } from '../types/audit.js';

// ─── Question definitions ─────────────────────────────────────────────────────

const BASE_BRIEF_QUESTIONS: BriefQuestion[] = [
  // ── Business Basics (all agents) ──────────────────────────────────────────
  {
    id: 'primary_goal',
    priority: 'required',
    domains: ['all'],
    question: 'What is the single most important business goal for this audit?',
    hint: 'e.g. increase conversions, reduce churn, expand to new market',
    type: 'free_text',
  },
  {
    id: 'target_audience',
    priority: 'required',
    domains: ['all'],
    question: 'Who is your primary target customer? (demographics, job role, location)',
    hint: 'Be specific: "B2B SaaS CTOs in Germany" beats "businesses"',
    type: 'free_text',
  },
  {
    id: 'revenue_model',
    priority: 'required',
    domains: ['all'],
    question: 'What is your main revenue model?',
    type: 'single_choice',
    options: ['Subscription / SaaS', 'E-commerce (product sales)', 'Lead generation', 'Consulting / services', 'Freemium', 'Marketplace', 'Other'],
  },
  {
    id: 'monthly_visitors',
    priority: 'recommended',
    domains: ['seo_digital', 'ux_conversion', 'marketing_utp'],
    question: 'Approximate monthly website visitors',
    hint: 'Rough estimate is fine (e.g. 5 000, 50 000)',
    type: 'number',
  },
  {
    id: 'monthly_revenue',
    priority: 'optional',
    domains: ['all'],
    question: 'Approximate monthly revenue range',
    type: 'single_choice',
    options: ['< €5k', '€5k – €20k', '€20k – €100k', '€100k – €500k', '> €500k', 'Prefer not to say'],
  },

  // ── UX & Conversion ───────────────────────────────────────────────────────
  {
    id: 'primary_cta',
    priority: 'required',
    domains: ['ux_conversion'],
    question: 'What is the primary call-to-action on your website? (what do you want visitors to do)',
    hint: 'e.g. book a demo, start free trial, buy product',
    type: 'free_text',
  },
  {
    id: 'conversion_rate',
    priority: 'recommended',
    domains: ['ux_conversion', 'marketing_utp'],
    question: 'Current lead/sale conversion rate (if known)',
    hint: 'e.g. 2.5% of visitors become leads',
    type: 'free_text',
  },
  {
    id: 'biggest_ux_complaint',
    priority: 'recommended',
    domains: ['ux_conversion'],
    question: 'What is the most common complaint or drop-off point from customers / analytics?',
    type: 'free_text',
  },

  // ── SEO & Digital ─────────────────────────────────────────────────────────
  {
    id: 'top_keywords',
    priority: 'recommended',
    domains: ['seo_digital'],
    question: 'List your 3–5 most important target keywords or search phrases',
    type: 'free_text',
  },
  {
    id: 'main_traffic_source',
    priority: 'recommended',
    domains: ['seo_digital', 'marketing_utp'],
    question: 'Where does most of your current traffic come from?',
    type: 'multi_choice',
    options: ['Organic search (SEO)', 'Paid ads (Google/Meta)', 'Social media', 'Direct / referral', 'Email', 'Word of mouth', 'I don\'t know'],
  },
  {
    id: 'has_google_analytics',
    priority: 'required',
    domains: ['seo_digital', 'ux_conversion'],
    question: 'Do you have Google Analytics (or another analytics tool) installed?',
    type: 'single_choice',
    options: ['Yes, GA4', 'Yes, Universal Analytics', 'Yes, other tool', 'No', 'Not sure'],
  },
  {
    id: 'has_search_console',
    priority: 'recommended',
    domains: ['seo_digital'],
    question: 'Is Google Search Console set up and verified?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Not sure'],
  },

  // ── Tech Infrastructure ───────────────────────────────────────────────────
  {
    id: 'cms_platform',
    priority: 'recommended',
    domains: ['tech_infrastructure'],
    question: 'What platform / CMS runs your website?',
    hint: 'e.g. WordPress, Shopify, custom React app, Webflow',
    type: 'free_text',
  },
  {
    id: 'hosting_provider',
    priority: 'optional',
    domains: ['tech_infrastructure', 'security_compliance'],
    question: 'Who hosts your website?',
    hint: 'e.g. Hetzner, AWS, Vercel, managed WordPress hosting',
    type: 'free_text',
  },
  {
    id: 'has_staging',
    priority: 'optional',
    domains: ['tech_infrastructure'],
    question: 'Do you have a staging / development environment?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Not sure'],
  },

  // ── Security & Compliance ─────────────────────────────────────────────────
  {
    id: 'handles_payments',
    priority: 'required',
    domains: ['security_compliance'],
    question: 'Does your site handle payments directly (not via external checkout)?',
    type: 'single_choice',
    options: ['Yes — we process card data', 'No — we use Stripe/PayPal/etc. hosted checkout', 'No payments on site'],
  },
  {
    id: 'gdpr_region',
    priority: 'recommended',
    domains: ['security_compliance'],
    question: 'Does your business operate in the EU / EEA or target EU customers?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Partially'],
  },
  {
    id: 'has_privacy_policy',
    priority: 'recommended',
    domains: ['security_compliance'],
    question: 'Is a privacy policy published on the site?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Outdated / needs update'],
  },

  // ── Marketing & Positioning ───────────────────────────────────────────────
  {
    id: 'main_competitors',
    priority: 'recommended',
    domains: ['marketing_utp', 'seo_digital'],
    question: 'Name 2–3 direct competitors (URL or company name)',
    type: 'free_text',
  },
  {
    id: 'unique_value_prop',
    priority: 'required',
    domains: ['marketing_utp', 'ux_conversion'],
    question: 'What makes you different from competitors? (your UVP in 1–2 sentences)',
    type: 'free_text',
  },
  {
    id: 'active_channels',
    priority: 'recommended',
    domains: ['marketing_utp'],
    question: 'Which marketing channels are you actively investing in?',
    type: 'multi_choice',
    options: ['Google Ads', 'Facebook/Instagram Ads', 'LinkedIn Ads', 'Content/SEO', 'Email marketing', 'Influencer / affiliate', 'PR', 'None currently'],
  },

  // ── Automation & Processes ────────────────────────────────────────────────
  {
    id: 'uses_crm',
    priority: 'recommended',
    domains: ['automation_processes'],
    question: 'Do you use a CRM? If yes, which one?',
    hint: 'e.g. HubSpot, Pipedrive, Salesforce, none',
    type: 'free_text',
  },
  {
    id: 'email_automation',
    priority: 'recommended',
    domains: ['automation_processes', 'marketing_utp'],
    question: 'Do you have automated email sequences (welcome, onboarding, re-engagement)?',
    type: 'single_choice',
    options: ['Yes, fully automated', 'Partial / manual', 'No'],
  },

  // ── Audit Scope ───────────────────────────────────────────────────────────
  {
    id: 'biggest_pain',
    priority: 'required',
    domains: ['all'],
    question: 'In one sentence: what is the biggest problem you want this audit to solve?',
    type: 'free_text',
  },
  {
    id: 'budget_for_changes',
    priority: 'optional',
    domains: ['all'],
    question: 'Approximate budget available for implementing audit recommendations',
    type: 'single_choice',
    options: ['< €1k', '€1k – €5k', '€5k – €20k', '€20k – €50k', '> €50k', 'No budget decided yet'],
  },
];

const EXPRESS_REQUIRED_IDS = new Set<string>([
  'primary_goal',
  'target_audience',
  'revenue_model',
  'primary_cta',
  'has_google_analytics',
  'handles_payments',
  'biggest_pain',
]);

const PRE_BRIEF_IDS = new Set<string>([
  'primary_goal',
  'target_audience',
  'primary_cta',
  'has_google_analytics',
  'handles_payments',
  'biggest_pain',
]);

/** Fewer «high» signals keeps impact weighting meaningful. */
const HIGH_REVENUE_QUESTION_IDS = new Set<string>([
  'primary_goal',
  'biggest_pain',
  'uses_crm',
  'handles_payments',
  'unique_value_prop',
]);

const CONSULTANT_HINTS: Record<string, string> = {
  primary_goal: 'Confirm the north-star KPI and timeline; note tensions between growth vs. cost.',
  target_audience: 'Probe jobs-to-be-done, regions, and budget authority.',
  revenue_model: 'Clarify average deal size or basket value and seasonality.',
  monthly_visitors: 'Validate traffic source split if they are guessing.',
  monthly_revenue: 'If declined, note order-of-magnitude verbally for context only.',
  primary_cta: 'Walk through the main funnel step-by-step as a user would.',
  conversion_rate: 'Ask how measured (tool, definition of conversion).',
  biggest_ux_complaint: 'Ask for evidence: quotes, support tickets, or analytics.',
  top_keywords: 'Check branded vs. non-branded priority.',
  main_traffic_source: 'Challenge single-channel reliance if they depend on one lane.',
  has_google_analytics: 'Ask who owns access and if goals are configured.',
  has_search_console: 'Confirm verification and coverage issues familiarity.',
  cms_platform: 'Note who can deploy changes and typical release cadence.',
  hosting_provider: 'Capture SLA concerns and incident history if any.',
  has_staging: 'If no staging, flag launch-risk for changes.',
  handles_payments: 'Clarify PCI scope and who owns gateway configuration.',
  gdpr_region: 'Check legal owner for privacy and consent tooling.',
  has_privacy_policy: 'Ask when it was last reviewed vs. actual tracking.',
  main_competitors: 'Get named URLs and why customers pick them.',
  unique_value_prop: 'Test positioning in one sentence; note customer language vs. internal jargon.',
  active_channels: 'Prioritise spend and internal bandwidth per channel.',
  uses_crm: 'Capture edition, integrations, and data hygiene.',
  email_automation: 'Map triggers, volumes, and ownership.',
  biggest_pain: 'Restate pain as a measurable gap they agree with.',
  budget_for_changes: 'Frame as ranges for fix vs. strategic initiatives.',
};

const TRIGGERS_FOLLOWUP: Record<string, string[]> = {
  uses_crm: ['email_automation'],
  has_google_analytics: ['conversion_rate'],
  revenue_model: ['primary_cta'],
};

function enrichQuestion(question: BriefQuestion): BriefQuestion {
  const importance = question.priority === 'required'
    ? 'red'
    : question.priority === 'recommended'
      ? 'yellow'
      : 'green';
  const weight = importance === 'red' ? 3 : importance === 'yellow' ? 2 : 1;

  let ux_group: BriefQuestion['ux_group'] = 'business';
  if (question.domains.includes('tech_infrastructure') || question.domains.includes('security_compliance')) {
    ux_group = 'tech';
  } else if (question.domains.includes('seo_digital')) {
    ux_group = 'audience';
  } else if (question.id === 'primary_goal' || question.id === 'biggest_pain') {
    ux_group = 'goals';
  } else if (question.id === 'revenue_model' || question.id === 'monthly_revenue') {
    ux_group = 'basics';
  }

  let intake_layer: BriefQuestion['intake_layer'] = question.priority === 'required' ? 1 : 2;
  if (PRE_BRIEF_IDS.has(question.id)) {
    intake_layer = 'pre_brief';
  }

  const revenue_signal = HIGH_REVENUE_QUESTION_IDS.has(question.id)
    ? 'high'
    : question.priority === 'optional'
      ? 'low'
      : 'medium';

  return {
    ...question,
    importance,
    weight,
    ux_group,
    intake_layer,
    consultant_hint: CONSULTANT_HINTS[question.id],
    revenue_signal,
    triggers_followup: TRIGGERS_FOLLOWUP[question.id] ?? [],
  };
}

export const BRIEF_QUESTIONS: BriefQuestion[] = BASE_BRIEF_QUESTIONS.map(enrichQuestion);

// ─── Zod schema for responses validation ──────────────────────────────────────

const answerSchema = z.union([
  z.string().max(2000),
  z.array(z.string()).max(10),
  z.number(),
  z.boolean(),
  z.object({
    value: z.union([z.string().max(2000), z.array(z.string()).max(10), z.number(), z.boolean(), z.null()]),
    source: z.enum(['client', 'consultant', 'recon_confirmed', 'unknown']),
  }),
  z.null(),
]);

export const BriefResponsesSchema = z.record(z.string(), answerSchema);

export type BriefResponses = z.infer<typeof BriefResponsesSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const REQUIRED_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.priority === 'required')
  .map(q => q.id);

export const EXPRESS_REQUIRED_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => EXPRESS_REQUIRED_IDS.has(q.id))
  .map(q => q.id);

export const RECOMMENDED_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.priority === 'recommended')
  .map(q => q.id);

export const OPTIONAL_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.priority === 'optional')
  .map(q => q.id);

export const PRE_BRIEF_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.intake_layer === 'pre_brief')
  .map(q => q.id);

/**
 * Returns domain-specific slice of questions for a given agent.
 * Agents receive only questions tagged with their domain key or 'all'.
 */
export function getQuestionsForDomain(domainKey: string): BriefQuestion[] {
  return BRIEF_QUESTIONS.filter(q =>
    q.domains.includes('all') || q.domains.includes(domainKey as BriefQuestion['domains'][number])
  );
}
