/**
 * Discovery flow — Mode C (discovery-first audit, often no public site).
 *
 * Online presence is multi-select (site + social + marketplaces can co-exist).
 * Pure logic: questions, branching, maturity scoring, findings generation.
 * No React or DOM dependencies — safe to import from any context.
 */

import { INDUSTRY_OPTIONS } from '../data/industry-options';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DiscoveryAnswers = Record<string, string | string[] | null>;

export type DiscoveryQuestionType = 'free_text' | 'single_choice' | 'multi_choice';

export interface DiscoveryQuestion {
  id: string;
  question: string;
  hint?: string;
  type: DiscoveryQuestionType;
  options?: string[];
  /** If true, empty answer is allowed and Next still advances (commits null). */
  optional?: boolean;
}

// ── Question bank ─────────────────────────────────────────────────────────────

const TOOLS_OPTIONS = [
  'WhatsApp / Telegram',
  'Google Sheets / Excel',
  'Email only',
  'Accounting software (e.g. 1C, QuickBooks)',
  'CRM (HubSpot, Bitrix, Salesforce…)',
  'Project management (Trello, Asana, Notion…)',
  'Custom or industry-specific software',
  'Nothing specific',
] as const;

/** Aligned with intake bank `c_nosite_1` / `c_nosite_3` (see `bankQuestionUiCatalog`). */
export const DISCOVERY_ONLINE_PRESENCE_OPTIONS = [
  'Full website (multi-page)',
  'Single landing page',
  'Website in development / not public yet',
  'Social media',
  'Marketplaces, directories, or other online platforms',
  'Mostly word of mouth, offline, or referrals',
] as const;

const [
  PRESENCE_FULL_SITE,
  PRESENCE_LANDING,
  PRESENCE_IN_DEV,
  PRESENCE_SOCIAL,
  PRESENCE_MARKETPLACES,
  PRESENCE_OFFLINE,
] = DISCOVERY_ONLINE_PRESENCE_OPTIONS;

/** Single-select values from older discovery sessions → current multi-select ids. */
const LEGACY_ONLINE_PRESENCE: Record<string, string[]> = {
  'Full website (multi-page)': [PRESENCE_FULL_SITE],
  'Single landing page': [PRESENCE_LANDING],
  'Social media profiles only': [PRESENCE_SOCIAL],
  'None — clients find us through word of mouth': [PRESENCE_OFFLINE],
};

export const DISCOVERY_SOCIAL_PLATFORM_OPTIONS = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'X (Twitter)',
  'Telegram',
  'WhatsApp Business / channel',
] as const;

const ALL_QUESTIONS: DiscoveryQuestion[] = [
  {
    id: 'biz_description',
    question: 'Describe your business in one sentence.',
    hint: 'What do you do, and who do you do it for?',
    type: 'free_text',
  },
  {
    id: 'industry',
    question: 'Which industry are you in?',
    type: 'single_choice',
    options: [...INDUSTRY_OPTIONS],
  },
  {
    id: 'team_size',
    question: 'How big is your team?',
    type: 'single_choice',
    options: ['Just me', '2–5 people', '6–20 people', 'More than 20'],
  },
  {
    id: 'tools_daily',
    question: 'Which tools does your team use every day?',
    hint: 'Select all that apply.',
    type: 'multi_choice',
    options: [...TOOLS_OPTIONS],
  },
  {
    id: 'manual_bottleneck',
    question: 'What task takes the most time and is still done manually?',
    hint: 'e.g. sending invoices, scheduling, following up with clients, updating records',
    type: 'free_text',
  },
  // Branch A: CRM detected in tools → ask which one
  {
    id: 'crm_name',
    question: 'Which CRM or client management tool do you use?',
    hint: 'e.g. HubSpot, Bitrix24, Salesforce, Pipedrive, AmoCRM',
    type: 'free_text',
  },
  // Branch B: no CRM → ask how leads are tracked
  {
    id: 'lead_tracking',
    question: 'How do you keep track of your leads and clients?',
    type: 'single_choice',
    options: [
      'In my head or WhatsApp messages',
      'In a shared spreadsheet',
      'In a CRM or dedicated tool',
      "I don't track them systematically",
    ],
  },
  {
    id: 'online_presence',
    question: 'Where are you visible online today?',
    hint: 'Select everything that applies — you can combine a site in progress with social and other channels.',
    type: 'multi_choice',
    options: [...DISCOVERY_ONLINE_PRESENCE_OPTIONS],
  },
  {
    id: 'social_platforms',
    question: 'Which social or messaging channels do you actively use for the business?',
    hint: 'Select all that apply.',
    type: 'multi_choice',
    options: [...DISCOVERY_SOCIAL_PLATFORM_OPTIONS],
  },
  {
    id: 'online_presence_notes',
    question: 'Anything else about your online presence?',
    hint: 'Optional — e.g. niche forums, an app, a planned launch, or a link we should know about.',
    type: 'free_text',
    optional: true,
  },
  // Branch: no real website → ask how clients find them
  {
    id: 'client_acquisition',
    question: 'How do most of your new clients find you?',
    type: 'multi_choice',
    options: [
      'Word of mouth / referrals',
      'Social media',
      'Google search',
      'Paid ads',
      'Marketplace or directory listing',
      'Outbound (cold calls / messages)',
      'Repeat clients only',
    ],
  },
  {
    id: 'biggest_challenge',
    question: "What's the biggest bottleneck in your business right now?",
    type: 'single_choice',
    options: [
      'Not enough new clients',
      'Too much time on admin and operations',
      'Clients come once and don\'t return',
      'Hard to scale — everything depends on me personally',
      'We lose leads because we respond too slowly',
      'No visibility into what\'s working and what\'s not',
    ],
  },
];

const QUESTION_MAP = new Map(ALL_QUESTIONS.map(q => [q.id, q]));

// ── Branching helpers ─────────────────────────────────────────────────────────

function hasCrm(answers: DiscoveryAnswers): boolean {
  const tools = answers.tools_daily;
  if (!Array.isArray(tools)) return false;
  return tools.some(t => t.includes('CRM'));
}

/** Normalises legacy single-string answers saved before multi-select. */
export function getOnlinePresenceSelections(answers: DiscoveryAnswers): string[] {
  const v = answers.online_presence;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    return LEGACY_ONLINE_PRESENCE[s] ?? [s];
  }
  return [];
}

function hasWebsite(answers: DiscoveryAnswers): boolean {
  const pres = getOnlinePresenceSelections(answers);
  return pres.some(
    p => p === PRESENCE_FULL_SITE || p === PRESENCE_LANDING || p === PRESENCE_IN_DEV,
  );
}

function hasSocialPresenceOption(answers: DiscoveryAnswers): boolean {
  return getOnlinePresenceSelections(answers).some(p => p === PRESENCE_SOCIAL);
}

function hasDigitalSurfaceBeyondOffline(answers: DiscoveryAnswers): boolean {
  const pres = getOnlinePresenceSelections(answers);
  return pres.some(
    p =>
      p === PRESENCE_FULL_SITE ||
      p === PRESENCE_LANDING ||
      p === PRESENCE_IN_DEV ||
      p === PRESENCE_SOCIAL ||
      p === PRESENCE_MARKETPLACES,
  );
}

/**
 * Returns the ordered question-id sequence for this set of answers.
 * Called on every answer change so the sequence adapts as the user progresses.
 */
export function buildQuestionSequence(answers: DiscoveryAnswers): string[] {
  const seq: string[] = [
    'biz_description',
    'industry',
    'team_size',
    'tools_daily',
    'manual_bottleneck',
  ];

  // Branch on tools: CRM detected → ask name; otherwise ask tracking method
  if (hasCrm(answers)) {
    seq.push('crm_name');
  } else {
    seq.push('lead_tracking');
  }

  seq.push('online_presence');

  if (hasSocialPresenceOption(answers)) {
    seq.push('social_platforms');
  }

  seq.push('online_presence_notes');

  const pres = getOnlinePresenceSelections(answers);
  if (pres.length > 0 && !hasWebsite(answers)) {
    seq.push('client_acquisition');
  }

  seq.push('biggest_challenge');

  return seq;
}

export function getQuestion(id: string): DiscoveryQuestion | undefined {
  return QUESTION_MAP.get(id);
}

// ── Maturity scoring ──────────────────────────────────────────────────────────

export type MaturityLevel = 1 | 2 | 3 | 4;

export interface MaturityResult {
  level: MaturityLevel;
  label: string;
  description: string;
  /** Hex colour for UI */
  color: string;
}

const MATURITY_META: Record<MaturityLevel, Omit<MaturityResult, 'level'>> = {
  1: {
    label: 'Level 1 — Manual',
    color: '#EF4444',
    description:
      'Most processes live in memory, WhatsApp, or a shared chat. High dependence on individual recall and manual coordination.',
  },
  2: {
    label: 'Level 2 — Basic Tools',
    color: '#F97316',
    description:
      'Spreadsheets and email cover most operations, with a few standalone apps. Data lives in silos with no integration.',
  },
  3: {
    label: 'Level 3 — Structured',
    color: '#F59E0B',
    description:
      'Specialised software handles core workflows. Partial automation exists, but tools do not share data.',
  },
  4: {
    label: 'Level 4 — Integrated',
    color: '#10B981',
    description:
      'Tools are connected and share data. Key processes run automatically. Decisions are informed by live metrics.',
  },
};

export function computeMaturity(answers: DiscoveryAnswers): MaturityResult {
  let score = 0;

  const tools = (answers.tools_daily as string[] | null) ?? [];
  if (tools.includes('CRM (HubSpot, Bitrix, Salesforce…)')) score += 3;
  if (tools.includes('Accounting software (e.g. 1C, QuickBooks)')) score += 2;
  if (tools.includes('Custom or industry-specific software')) score += 3;
  if (tools.includes('Project management (Trello, Asana, Notion…)')) score += 2;
  if (
    tools.includes('Nothing specific') ||
    (tools.length <= 2 &&
      tools.every(t => t.includes('WhatsApp') || t.includes('Email')))
  )
    score -= 1;

  const tracking = answers.lead_tracking as string | null;
  if (tracking?.includes('CRM')) score += 2;
  else if (tracking?.includes('spreadsheet')) score += 1;

  const pres = getOnlinePresenceSelections(answers);
  if (pres.includes(PRESENCE_FULL_SITE)) score += 2;
  else if (pres.includes(PRESENCE_LANDING) || pres.includes(PRESENCE_IN_DEV)) score += 1;
  if (pres.includes(PRESENCE_MARKETPLACES)) score += 1;

  const socialPlats = (answers.social_platforms as string[] | null) ?? [];
  if (hasSocialPresenceOption(answers) && socialPlats.length >= 1) score += 1;

  const team = answers.team_size as string | null;
  if (team === '6–20 people' || team === 'More than 20') score += 1;

  const level: MaturityLevel =
    score <= 2 ? 1 : score <= 5 ? 2 : score <= 8 ? 3 : 4;

  return { level, ...MATURITY_META[level] };
}

// ── Findings ──────────────────────────────────────────────────────────────────

export interface DiscoveryFinding {
  id: string;
  zone: string;
  headline: string;
  detail: string;
  impact: 'high' | 'medium';
}

export function computeFindings(answers: DiscoveryAnswers): DiscoveryFinding[] {
  const findings: DiscoveryFinding[] = [];

  const tools = (answers.tools_daily as string[] | null) ?? [];
  const tracking = answers.lead_tracking as string | null;
  const challenge = answers.biggest_challenge as string | null;
  const pres = getOnlinePresenceSelections(answers);
  const acquisition = (answers.client_acquisition as string[] | null) ?? [];
  const manual = (answers.manual_bottleneck as string | null) ?? '';

  // Lead tracking gap
  if (
    tracking?.includes('head') ||
    tracking?.includes("don't track")
  ) {
    findings.push({
      id: 'lead_tracking_gap',
      zone: 'Lead management',
      headline: 'Leads tracked informally — some are likely falling through',
      detail:
        'Without a central record of enquiries and follow-up status, potential clients are regularly missed. A simple CRM or even a structured spreadsheet closes most of this gap.',
      impact: 'high',
    });
  }

  // Slow response / churn challenge
  if (!hasCrm(answers) && challenge?.includes('respond too slowly')) {
    findings.push({
      id: 'followup_leakage',
      zone: 'Client retention',
      headline: 'Slow response rate losing leads to faster competitors',
      detail:
        'When follow-up depends on individual memory or manual checking, response time slips — especially during busy periods. Automated alerts and structured queues fix this without extra headcount.',
      impact: 'high',
    });
  }

  // Manual operations drain
  if (manual.trim().length > 8 || challenge?.includes('admin')) {
    findings.push({
      id: 'manual_drain',
      zone: 'Operations',
      headline: 'Manual processes consuming significant team capacity',
      detail:
        "Recurring tasks that run on someone's time — invoicing, scheduling, data entry, follow-up reminders — are prime automation candidates. Automating even one core workflow typically frees 3–8 hours per week.",
      impact: 'high',
    });
  }

  // Offline / referral-only digital posture (no site, social, or marketplace footprint)
  if (pres.length > 0 && !hasDigitalSurfaceBeyondOffline(answers)) {
    findings.push({
      id: 'online_visibility',
      zone: 'Online visibility',
      headline: 'Limited digital surface area for inbound discovery',
      detail:
        'You are not yet using a live site, social channels, or other online listings in a way we can build on for audits. Even one clear digital home — a landing page, a profile you post to weekly, or a directory you own — makes growth and measurement much easier.',
      impact: 'high',
    });
  }

  // Single channel dependency
  const meaningfulChannels = acquisition.filter(
    a => !a.includes('Repeat') && !a.includes('Word of mouth'),
  );
  if (
    (!hasWebsite(answers) && acquisition.length === 0 && pres.length > 0) ||
    (acquisition.length > 0 &&
      acquisition.length <= 2 &&
      meaningfulChannels.length === 0)
  ) {
    findings.push({
      id: 'channel_dependency',
      zone: 'Growth',
      headline: 'Growth depends on word of mouth alone',
      detail:
        'Referral-only businesses grow in bursts and stall in slow periods. Adding one systematic digital channel — typically SEO or a targeted social presence — creates a more predictable pipeline.',
      impact: 'medium',
    });
  }

  // Tool fragmentation
  if (tools.length >= 4 && !hasCrm(answers)) {
    findings.push({
      id: 'tool_fragmentation',
      zone: 'Systems',
      headline: 'Multiple disconnected tools creating data silos',
      detail:
        'Your team switches between several apps that do not share data. This causes duplicate entry, inconsistent records, and time lost searching for information across platforms.',
      impact: 'medium',
    });
  }

  // No visibility
  if (challenge?.includes('No visibility')) {
    findings.push({
      id: 'no_visibility',
      zone: 'Analytics',
      headline: "No data on what's working — decisions based on instinct",
      detail:
        'Without tracking conversion rates, client sources, and revenue by channel, it is impossible to know which activities to invest more in and which to cut. Basic dashboards take hours to set up and pay back immediately.',
      impact: 'medium',
    });
  }

  // Owner dependency
  if (
    challenge?.includes('depends on me') ||
    (answers.team_size === 'Just me' && !hasCrm(answers))
  ) {
    findings.push({
      id: 'owner_dependency',
      zone: 'Scalability',
      headline: 'Growth capped by founder involvement in daily operations',
      detail:
        'When key processes require your direct attention, capacity is limited to your personal bandwidth. Documenting and systematising 3–5 core workflows is the prerequisite for sustainable growth.',
      impact: 'medium',
    });
  }

  // Return max 4, high-impact first
  return findings
    .sort((a, b) =>
      a.impact === b.impact ? 0 : a.impact === 'high' ? -1 : 1,
    )
    .slice(0, 4);
}
