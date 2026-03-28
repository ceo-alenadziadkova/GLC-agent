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

export const BRIEF_QUESTIONS: BriefQuestion[] = [
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

// ─── Zod schema for responses validation ──────────────────────────────────────

const answerSchema = z.union([
  z.string().max(2000),
  z.array(z.string()).max(10),
  z.number(),
  z.null(),
]);

export const BriefResponsesSchema = z.record(z.string(), answerSchema);

export type BriefResponses = z.infer<typeof BriefResponsesSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const REQUIRED_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.priority === 'required')
  .map(q => q.id);

export const RECOMMENDED_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.priority === 'recommended')
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
