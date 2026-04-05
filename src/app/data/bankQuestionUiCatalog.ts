/**
 * Maps question-bank v1 ids to BriefField-ready definitions (labels from question-bank.v1.json).
 * Keep option lists aligned with docs/QUESTION_BANK.md and server branch normalisation where relevant.
 */
import type { BriefQuestion, BriefPriority, BriefQuestionType } from './briefQuestions';
import { INDUSTRY_OPTIONS } from './industry-options';
import bankRaw from '../../../server/src/intake/question-bank.v1.json';

type RawQ = { id: string; section: string; label: string };

const RAW_QUESTIONS = (bankRaw as { questions: RawQ[] }).questions;
const LABEL_BY_ID = new Map(RAW_QUESTIONS.map(q => [q.id, q.label] as const));
const SECTION_BY_ID = new Map(RAW_QUESTIONS.map(q => [q.id, q.section] as const));

const SECTION_TITLE: Record<string, string> = {
  A: 'Business basics',
  B: 'Customers and growth',
  C: 'Website and digital',
  D: 'Tools and processes',
  E: 'Security and compliance',
  F: 'Goals for this audit',
};

type Override = { type?: BriefQuestionType; options?: string[]; hint?: string };

const OVERRIDES: Record<string, Override> = {
  // ── Section A ──────────────────────────────────────────────────────────────
  a2: { type: 'single_choice', options: [...INDUSTRY_OPTIONS] },
  a4: { type: 'single_choice', options: ['Just me', '2–10 people', '11–50', '51–200', '200+'] },
  a5: {
    type: 'single_choice',
    options: ['Yes, multi-page site', 'Yes, single landing page', 'Under construction', 'No website yet'],
  },
  a6: { type: 'single_choice', options: ['Yes', 'Sometimes', 'Rarely', 'No, offline only', 'Not sure'] },
  a7: {
    type: 'single_choice',
    options: ['Launching', 'Growing fast', 'Stabilising', 'Scaling', 'Mature and optimising'],
  },
  a8: { type: 'single_choice', options: ['< 50', '50–200', '200–1,000', '1,000+', 'Not sure'] },
  a9: {
    type: 'multi_choice',
    options: ['Spanish', 'English', 'German', 'French', 'Russian', 'Other'],
    hint: 'Automation and digital recommendations depend on which languages your customers actually use — a WhatsApp template in the wrong language does not convert.',
  },

  // ── Section B ──────────────────────────────────────────────────────────────
  b1: {
    type: 'free_text',
    hint: 'Think about your three best clients from last year — what do they have in common? Industry, situation, how they found you, what they valued most.',
  },
  b2: {
    type: 'multi_choice',
    options: ['Google / search', 'Paid ads', 'Social', 'Referrals', 'Cold outreach', 'Events', 'Partners', 'Other'],
    hint: 'Think about how customers find out you exist in the first place — word of mouth, platforms, ads, events.',
  },
  b_growth_attempts: {
    type: 'multi_choice',
    options: [
      'Paid ads (Google, Meta)',
      'Marketing agency or freelancer',
      'More social media content',
      'New platforms or directories',
      'Improved the service itself',
      'Nothing specific yet',
      'Other',
    ],
    hint: 'This helps us avoid recommending approaches that have already been tried — so we focus on what is most likely to move the needle for your situation.',
  },

  // ── Section C — website path ───────────────────────────────────────────────
  c3: { type: 'single_choice', options: ['Yes, GA4', 'Yes, another tool', 'No', "Don't know"] },
  c4: { type: 'single_choice', options: ['Yes', 'No', "What's that?"] },
  c7: {
    type: 'multi_choice',
    options: ['None / minimal', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Other'],
  },
  c9: { type: 'single_choice', options: ['< 6 months', '6–24 months', '2–5 years', '5+ years', 'Not sure'] },

  // ── Section C — no-website path ───────────────────────────────────────────
  c_nosite_1: {
    type: 'multi_choice',
    options: ['Google / search', 'Google Business listing', 'Social media', 'OTA or marketplace', 'Word of mouth', 'Not really online yet'],
    hint: 'When someone already knows your name or is looking for your type of service — where do they land? Google Maps, a social profile, a booking platform?',
  },
  c_nosite_2: {
    type: 'single_choice',
    options: ['Yes, soon', 'Yes, but not sure how', 'Eventually', 'Not a priority right now'],
  },
  c_nosite_3: {
    type: 'multi_choice',
    options: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'Google Business', 'TripAdvisor', 'None', 'Other'],
  },
  c_nosite_4: {
    type: 'multi_choice',
    options: ['WhatsApp', 'Phone call', 'In-person walk-in', 'Facebook or Instagram DM', 'Email', 'Booking platform (OTA)', 'Other'],
    hint: 'The channel where the first message arrives is usually the fastest automation win — answering the same questions repeatedly costs more time than most owners realise.',
  },
  c_nosite_5: {
    type: 'single_choice',
    options: ['Yes, I actively manage it', 'Yes, but rarely updated', 'No', 'Not sure what this is'],
    hint: 'Your Google Business card is your digital shopfront without a website. Actively managed listings get significantly more clicks and calls.',
  },
  c_nosite_reviews: {
    type: 'single_choice',
    options: [
      'I actively ask customers to leave a review',
      'Reviews come in — I respond',
      'Reviews come in but I rarely respond',
      "I don't really manage this",
      'No reviews yet',
    ],
    hint: 'For a business without a website, reviews are your most visible social proof. Automated review requests after a completed service are one of the highest-ROI quick wins we can recommend.',
  },

  // ── Section D — tools, conversion pipeline, operations ────────────────────
  d1: {
    type: 'multi_choice',
    options: [
      'Email',
      'Spreadsheets',
      'CRM',
      'Project or task tool',
      'Booking or PMS',
      'Accounting',
      'Support ticketing',
      'Voice notes or WhatsApp audio',
      'Other',
    ],
  },
  d_response_time: {
    type: 'single_choice',
    options: [
      "Within minutes — I'm always on",
      'Within a few hours',
      'Same day',
      'Next day or later',
      'It depends — sometimes fast, sometimes slow',
    ],
    hint: 'Response speed is one of the biggest conversion factors for local businesses — especially when customers are comparing options. If this varies, that is already an automation opportunity.',
  },
  d_closing_flow: {
    type: 'multi_choice',
    options: [
      'I send a quote or price manually',
      'We have a call or meeting first',
      'They visit in person',
      'I send them to a booking platform',
      'They pay immediately on first contact',
      'It varies a lot',
      'Other',
    ],
    hint: "This is where most small businesses lose leads without realising it. Each manual step between 'I'm interested' and 'I'm in' is a place we look to save time and improve your conversion rate.",
  },
  d_billing_flow: {
    type: 'single_choice',
    options: [
      'WhatsApp message or voice note',
      'Email with a document attached',
      'In person or printed',
      'Accounting software (Holded, Factusol…)',
      'Booking platform handles it',
      "We don't send formal confirmations",
      'Other',
    ],
    hint: 'If you are in Spain, how you invoice is also relevant to the incoming Verifactu e-invoicing requirement — we will flag this in the audit if it applies.',
  },
  d3: { type: 'single_choice', options: ['< 5h', '5–10h', '10–20h', '20h+', 'Not sure'] },
  d5: { type: 'single_choice', options: ['Yes, actively', 'Partially', 'No'] },
  d4a: { type: 'single_choice', options: ['Daily', 'Weekly', 'Occasionally', 'Not really'] },
  d4b: { type: 'single_choice', options: ['Yes easily', 'Sometimes', 'Rarely', 'No'] },
  d6: {
    type: 'multi_choice',
    options: ['Customer data', 'Financials', 'Inventory', 'Bookings', 'Support tickets', 'Marketing leads', 'Other'],
  },

  // ── Section E ──────────────────────────────────────────────────────────────
  e1: { type: 'single_choice', options: ['Yes', 'Sometimes', 'No', 'Not sure'] },
  e2: { type: 'single_choice', options: ['Yes', 'No', 'Partially / not sure'] },
  e3: { type: 'single_choice', options: ['Confident', 'Somewhat', 'Not confident', 'Not set up'] },
  e4: { type: 'single_choice', options: ['Yes, in place', 'In progress', 'No', 'Not sure'] },

  // ── Section F ──────────────────────────────────────────────────────────────
  f2: {
    type: 'multi_choice',
    options: [
      'Website performance and technology (speed, stability, technical health)',
      'Online visibility and SEO (finding and attracting the right traffic)',
      'Customer experience and conversions (turning visitors into customers)',
      'Marketing and positioning (clarity of message and differentiation)',
      'Process automation and efficiency (less manual work and handoffs)',
      'Security, compliance and risk (avoiding costly surprises)',
    ],
  },
  f3: { type: 'single_choice', options: ['1 — Struggling', '2', '3 — Okay-ish', '4', '5 — Nailing it'] },
  f4: {
    type: 'single_choice',
    options: [
      'Ready to move quickly on clear quick wins',
      'Ready to invest if ROI and impact are clear',
      'Prefer to understand the situation for now',
      'Need to align first with partner, owner, or team',
    ],
  },
  f5: {
    type: 'single_choice',
    options: [
      'Under €500',
      '€500–2,000',
      '€2,000–10,000',
      'Over €10,000',
      'No clear budget yet — depends on the recommendations',
    ],
  },
  f7: {
    type: 'single_choice',
    options: [
      'Me',
      'Ops or office manager',
      'IT provider or agency',
      'Owner or partner',
      'Board or investor',
      'Not sure',
    ],
  },
  f8: {
    type: 'single_choice',
    options: [
      'Opening or launch soon',
      'Seasonal peak coming',
      'Investor, partner, or board review',
      'Contract or compliance milestone',
      'No specific deadline',
    ],
  },
};

/** BriefField-ready question for a bank id (visibility handled separately). */
export function bankIdToBriefQuestion(id: string, priority: BriefPriority): BriefQuestion {
  const letter = SECTION_BY_ID.get(id) ?? 'A';
  const ov = OVERRIDES[id] ?? {};
  const t: BriefQuestionType = ov.type ?? 'free_text';
  return {
    id,
    priority,
    section: SECTION_TITLE[letter] ?? `Section ${letter}`,
    question: LABEL_BY_ID.get(id) ?? id,
    hint: ov.hint,
    type: t,
    options: ov.options,
  };
}
