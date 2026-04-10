/**
 * Canonical ordered list of public Discovery wizard questions (copy, types, static fallbacks).
 * Single source for `discovery-ui-fragment.ts` and SPA `discovery-flow.ts` fallback (ADR Phase A).
 */
import type { BriefQuestion } from './audit-contract.js';

export type DiscoveryWizardQuestionSpec = {
  id: string;
  question: string;
  hint?: string;
  type: BriefQuestion['type'];
  optional?: boolean;
};

/** Fallback option lists when bank UI overrides omit the id (keep aligned with bank-question-ui-overrides). */
export const DISCOVERY_WIZARD_D1_UI_FALLBACK = [
  'Email',
  'Spreadsheets',
  'CRM',
  'Project or task tool',
  'Booking or scheduling tool',
  'Accounting software',
  'WhatsApp / voice notes',
  'Nothing specific',
] as const;

export const DISCOVERY_WIZARD_C_NOSITE_1_FALLBACK = [
  'Google search',
  'Google Business / Maps listing',
  'Social media',
  'OTA or marketplace',
  'Word of mouth only',
  'Not really online yet',
] as const;

export const DISCOVERY_WIZARD_C_NOSITE_4_FALLBACK = [
  'WhatsApp',
  'Phone call',
  'In-person walk-in',
  'Facebook or Instagram DM',
  'Email',
  'Booking platform',
  'Other',
] as const;

export interface BuildDiscoveryWizardQuestionsInput {
  /**
   * Resolve options for a bank id using server or SPA catalog, falling back to `readonly` lists from this module.
   */
  bankOrFallback: (id: string, fallback: readonly string[]) => string[];
  industryOptions: readonly string[];
}

/**
 * Full wizard row list before policy filter (`modes.discovery.included`).
 */
export function buildDiscoveryWizardQuestions(
  input: BuildDiscoveryWizardQuestionsInput,
): Array<DiscoveryWizardQuestionSpec & { options?: string[] }> {
  const { bankOrFallback, industryOptions } = input;
  return [
    {
      id: 'a2',
      question: 'Which industry are you in?',
      type: 'single_choice',
      options: bankOrFallback('a2', industryOptions),
    },
    {
      id: 'a1',
      question: 'Describe your business in one sentence.',
      hint: 'What do you do, and who do you do it for?',
      type: 'free_text',
    },
    {
      id: 'a4',
      question: 'How big is your team?',
      type: 'single_choice',
      options: ['Just me', '2–5 people', '6–20 people', 'More than 20'],
    },
    {
      id: 'a7',
      question: 'Where is the business right now?',
      hint: 'This shapes everything — from what to fix first to how fast to move.',
      type: 'single_choice',
      options: [
        'Just getting started',
        'Growing fast',
        'Stabilising',
        'Scaling',
        'Mature and optimising',
      ],
    },
    {
      id: 'd1',
      question: 'Which tools does your team use every day?',
      hint: 'Select all that apply.',
      type: 'multi_choice',
      options: bankOrFallback('d1', DISCOVERY_WIZARD_D1_UI_FALLBACK),
    },
    {
      id: 'd1b',
      question: 'How do you keep track of leads and potential clients?',
      type: 'single_choice',
      options: [
        'In my head or WhatsApp messages',
        'In a shared spreadsheet',
        'In a CRM or dedicated tool',
        "I don't track them systematically",
      ],
    },
    {
      id: 'c_nosite_1',
      question: 'When someone looks for your type of service — how do they find you?',
      hint: 'Where do people land when they search for what you offer?',
      type: 'multi_choice',
      options: bankOrFallback('c_nosite_1', DISCOVERY_WIZARD_C_NOSITE_1_FALLBACK),
    },
    {
      id: 'c_nosite_4',
      question: 'How do most new customer enquiries arrive?',
      hint: 'The channel where the first message lands is usually the fastest automation win.',
      type: 'multi_choice',
      options: bankOrFallback('c_nosite_4', DISCOVERY_WIZARD_C_NOSITE_4_FALLBACK),
    },
    {
      id: 'd2',
      question: 'What takes the most time in your week that you wish you could eliminate?',
      type: 'single_choice',
      options: [
        'Following up with leads and prospects',
        'Scheduling and confirming appointments',
        'Creating and sending quotes or invoices',
        'Reporting and tracking what is working',
        'Onboarding new clients',
        'Managing team tasks and handoffs',
        'Something else',
      ],
    },
    {
      id: 'f1',
      question: 'What is the main problem this audit should help you solve?',
      type: 'single_choice',
      options: [
        'Not enough new clients',
        'Too much time on admin and operations',
        'Clients come once and do not return',
        'Hard to scale — everything depends on me personally',
        'We lose leads because we respond too slowly',
        'I want to understand where to focus next',
      ],
    },
  ];
}
