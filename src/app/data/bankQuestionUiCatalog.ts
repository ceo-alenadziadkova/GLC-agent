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
  b2: {
    type: 'multi_choice',
    options: ['Google / search', 'Paid ads', 'Social', 'Referrals', 'Cold outreach', 'Events', 'Partners', 'Other'],
  },
  c3: { type: 'single_choice', options: ['Yes, GA4', 'Yes, another tool', 'No', "Don't know"] },
  c4: { type: 'single_choice', options: ['Yes', 'No', "What's that?"] },
  c7: {
    type: 'multi_choice',
    options: ['None / minimal', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Other'],
  },
  c9: { type: 'single_choice', options: ['< 6 months', '6–24 months', '2–5 years', '5+ years', 'Not sure'] },
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
      'Other',
    ],
  },
  d3: { type: 'single_choice', options: ['< 5h', '5–10h', '10–20h', '20h+', 'Not sure'] },
  d5: { type: 'single_choice', options: ['Yes, actively', 'Partially', 'No'] },
  d4a: { type: 'single_choice', options: ['Daily', 'Weekly', 'Occasionally', 'Not really'] },
  d4b: { type: 'single_choice', options: ['Yes easily', 'Sometimes', 'Rarely', 'No'] },
  d6: {
    type: 'multi_choice',
    options: ['Customer data', 'Financials', 'Inventory', 'Bookings', 'Support tickets', 'Marketing leads', 'Other'],
  },
  e1: { type: 'single_choice', options: ['Yes', 'Sometimes', 'No', 'Not sure'] },
  e2: { type: 'single_choice', options: ['Yes', 'No', 'Partially / not sure'] },
  e3: { type: 'single_choice', options: ['Confident', 'Somewhat', 'Not confident', 'Not set up'] },
  e4: { type: 'single_choice', options: ['Yes, in place', 'In progress', 'No', 'Not sure'] },
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
