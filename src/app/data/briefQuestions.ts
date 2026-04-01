/**
 * Intake Brief question definitions — frontend copy of server/src/schemas/intake-brief.ts
 * Keep in sync with the server schema.
 *
 * Priority:
 *   required     🔴 — pipeline blocked until all answered
 *   recommended  🟡 — agents flag data gaps but proceed
 *   optional     🟢 — nice-to-have context
 */
export type BriefPriority = 'required' | 'recommended' | 'optional';
export type BriefQuestionType = 'free_text' | 'single_choice' | 'multi_choice' | 'number' | 'rating' | 'confirm';
export type BriefImportance = 'red' | 'yellow' | 'green';
export type IntakeLayer = 0 | 1 | 2 | 3 | 'pre_brief';
export type UxGroup = 'basics' | 'business' | 'tech' | 'audience' | 'goals';
export type BriefResponseValue = string | string[] | number | boolean | null;

export interface BriefQuestion {
  id: string;
  priority: BriefPriority;
  importance?: BriefImportance;
  intake_layer?: IntakeLayer;
  weight?: number;
  ux_group?: UxGroup;
  section: string;
  question: string;
  hint?: string;
  type: BriefQuestionType;
  options?: string[];
}

export interface BriefResponseEntry {
  value: BriefResponseValue;
  source: 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
}

export type BriefResponses = Record<string, BriefResponseValue | BriefResponseEntry>;

const BASE_BRIEF_QUESTIONS: BriefQuestion[] = [
  // ── Business Basics ──────────────────────────────────────
  {
    id: 'primary_goal', priority: 'required', section: 'Business',
    question: 'What is the single most important business goal for this audit?',
    hint: 'e.g. increase conversions, reduce churn, expand to new market',
    type: 'free_text',
  },
  {
    id: 'target_audience', priority: 'required', section: 'Business',
    question: 'Who is your primary target customer? (demographics, job role, location)',
    hint: '"B2B SaaS CTOs in Germany" beats "businesses"',
    type: 'free_text',
  },
  {
    id: 'revenue_model', priority: 'required', section: 'Business',
    question: 'What is your main revenue model?',
    type: 'single_choice',
    options: ['Subscription / SaaS', 'E-commerce (product sales)', 'Lead generation', 'Consulting / services', 'Freemium', 'Marketplace', 'Other'],
  },
  {
    id: 'monthly_visitors', priority: 'recommended', section: 'Business',
    question: 'Approximate monthly website visitors',
    hint: 'Rough estimate is fine (e.g. 5 000, 50 000)',
    type: 'number',
  },
  {
    id: 'monthly_revenue', priority: 'optional', section: 'Business',
    question: 'Approximate monthly revenue range',
    type: 'single_choice',
    options: ['< €5k', '€5k – €20k', '€20k – €100k', '€100k – €500k', '> €500k', 'Prefer not to say'],
  },

  // ── UX & Conversion ──────────────────────────────────────
  {
    id: 'primary_cta', priority: 'required', section: 'UX & Conversion',
    question: 'What is the primary call-to-action on your website?',
    hint: 'e.g. book a demo, start free trial, buy product',
    type: 'free_text',
  },
  {
    id: 'conversion_rate', priority: 'recommended', section: 'UX & Conversion',
    question: 'Current lead/sale conversion rate (if known)',
    hint: 'e.g. 2.5% of visitors become leads',
    type: 'free_text',
  },
  {
    id: 'biggest_ux_complaint', priority: 'recommended', section: 'UX & Conversion',
    question: 'Most common complaint or drop-off point from customers / analytics?',
    type: 'free_text',
  },

  // ── SEO & Digital ─────────────────────────────────────────
  {
    id: 'top_keywords', priority: 'recommended', section: 'SEO & Digital',
    question: 'List your 3–5 most important target keywords or search phrases',
    type: 'free_text',
  },
  {
    id: 'main_traffic_source', priority: 'recommended', section: 'SEO & Digital',
    question: 'Where does most of your current traffic come from?',
    type: 'multi_choice',
    options: ['Organic search (SEO)', 'Paid ads (Google/Meta)', 'Social media', 'Direct / referral', 'Email', 'Word of mouth', "I don't know"],
  },
  {
    id: 'has_google_analytics', priority: 'required', section: 'SEO & Digital',
    question: 'Do you have Google Analytics (or another analytics tool) installed?',
    type: 'single_choice',
    options: ['Yes, GA4', 'Yes, Universal Analytics', 'Yes, other tool', 'No', 'Not sure'],
  },
  {
    id: 'has_search_console', priority: 'recommended', section: 'SEO & Digital',
    question: 'Is Google Search Console set up and verified?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Not sure'],
  },

  // ── Tech Infrastructure ───────────────────────────────────
  {
    id: 'cms_platform', priority: 'recommended', section: 'Tech & Infrastructure',
    question: 'What platform / CMS runs your website?',
    hint: 'e.g. WordPress, Shopify, custom React app, Webflow',
    type: 'free_text',
  },
  {
    id: 'hosting_provider', priority: 'optional', section: 'Tech & Infrastructure',
    question: 'Who hosts your website?',
    hint: 'e.g. Hetzner, AWS, Vercel, managed WordPress hosting',
    type: 'free_text',
  },
  {
    id: 'has_staging', priority: 'optional', section: 'Tech & Infrastructure',
    question: 'Do you have a staging / development environment?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Not sure'],
  },

  // ── Security & Compliance ─────────────────────────────────
  {
    id: 'handles_payments', priority: 'required', section: 'Security & Compliance',
    question: 'Does your site handle payments directly (not via external checkout)?',
    type: 'single_choice',
    options: ['Yes — we process card data', 'No — we use Stripe/PayPal/etc. hosted checkout', 'No payments on site'],
  },
  {
    id: 'gdpr_region', priority: 'recommended', section: 'Security & Compliance',
    question: 'Does your business operate in the EU / EEA or target EU customers?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Partially'],
  },
  {
    id: 'has_privacy_policy', priority: 'recommended', section: 'Security & Compliance',
    question: 'Is a privacy policy published on the site?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Outdated / needs update'],
  },

  // ── Marketing & Positioning ───────────────────────────────
  {
    id: 'main_competitors', priority: 'recommended', section: 'Marketing',
    question: 'Name 2–3 direct competitors (URL or company name)',
    type: 'free_text',
  },
  {
    id: 'unique_value_prop', priority: 'required', section: 'Marketing',
    question: 'What makes you different from competitors? (UVP in 1–2 sentences)',
    type: 'free_text',
  },
  {
    id: 'active_channels', priority: 'recommended', section: 'Marketing',
    question: 'Which marketing channels are you actively investing in?',
    type: 'multi_choice',
    options: ['Google Ads', 'Facebook/Instagram Ads', 'LinkedIn Ads', 'Content/SEO', 'Email marketing', 'Influencer / affiliate', 'PR', 'None currently'],
  },

  // ── Automation & Processes ────────────────────────────────
  {
    id: 'uses_crm', priority: 'recommended', section: 'Automation',
    question: 'Do you use a CRM? If yes, which one?',
    hint: 'e.g. HubSpot, Pipedrive, Salesforce, none',
    type: 'free_text',
  },
  {
    id: 'email_automation', priority: 'recommended', section: 'Automation',
    question: 'Do you have automated email sequences (welcome, onboarding, re-engagement)?',
    type: 'single_choice',
    options: ['Yes, fully automated', 'Partial / manual', 'No'],
  },

  // ── Audit Scope ───────────────────────────────────────────
  {
    id: 'biggest_pain', priority: 'required', section: 'Audit Scope',
    question: 'In one sentence: what is the biggest problem you want this audit to solve?',
    type: 'free_text',
  },
  {
    id: 'budget_for_changes', priority: 'optional', section: 'Audit Scope',
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

function enrichQuestion(question: BriefQuestion): BriefQuestion {
  const importance: BriefImportance = question.priority === 'required'
    ? 'red'
    : question.priority === 'recommended'
      ? 'yellow'
      : 'green';
  const weight = importance === 'red' ? 3 : importance === 'yellow' ? 2 : 1;

  let ux_group: UxGroup = 'business';
  if (question.section.includes('Tech') || question.section.includes('Security')) {
    ux_group = 'tech';
  } else if (question.section.includes('SEO')) {
    ux_group = 'audience';
  } else if (question.id === 'primary_goal' || question.id === 'biggest_pain') {
    ux_group = 'goals';
  } else if (question.id === 'revenue_model' || question.id === 'monthly_revenue') {
    ux_group = 'basics';
  }

  let intake_layer: IntakeLayer = question.priority === 'required' ? 1 : 2;
  if (PRE_BRIEF_IDS.has(question.id)) {
    intake_layer = 'pre_brief';
  }

  return {
    ...question,
    importance,
    weight,
    ux_group,
    intake_layer,
  };
}

export const BRIEF_QUESTIONS: BriefQuestion[] = BASE_BRIEF_QUESTIONS.map(enrichQuestion);

export const REQUIRED_IDS = BRIEF_QUESTIONS.filter(q => q.priority === 'required').map(q => q.id);
export const EXPRESS_REQUIRED_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => EXPRESS_REQUIRED_IDS.has(q.id))
  .map(q => q.id);
export const PRE_BRIEF_QUESTION_IDS = BRIEF_QUESTIONS
  .filter(q => q.intake_layer === 'pre_brief')
  .map(q => q.id);
export const BRIEF_SECTIONS = [...new Set(BRIEF_QUESTIONS.map(q => q.section))];
export const BRIEF_UX_GROUPS = [...new Set(BRIEF_QUESTIONS.map(q => q.ux_group))];

function unwrapResponse(value: BriefResponseValue | BriefResponseEntry | undefined): BriefResponseValue | undefined {
  if (value != null && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return value.value;
  }
  return value as BriefResponseValue | undefined;
}

export function countAnswered(responses: BriefResponses, ids: string[]): number {
  return ids.filter(id => {
    const v = unwrapResponse(responses[id]);
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return true;
    if (typeof v === 'boolean') return true;
    if (Array.isArray(v)) return v.length > 0;
    return false;
  }).length;
}
