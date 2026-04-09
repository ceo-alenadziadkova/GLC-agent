/**
 * Discovery flow — Mode C (public, no auth required).
 *
 * Pure logic only: questions, branching, findings generation, triage scoring.
 * No React or DOM dependencies — safe to import from any context.
 *
 * Question IDs use bank IDs (a2, a4, d1, c_nosite_1, etc.) so that answers
 * stored from the discovery session carry directly into IntakeBankWizard when
 * the client registers — no translation layer needed.
 */

import { buildIntakePlan } from '../../../server/src/intake/core/build-intake-plan';
import { buildDiscoveryWizardQuestions } from '../../../server/src/intake/discovery-wizard-questions';
import { getQuestionBankSchemaMeta } from '../../../server/src/intake/question-bank';
import { getBankQuestionUiOptions } from '../data/bankQuestionUiCatalog';
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

export interface DiscoveryFinding {
  id: string;
  zone: string;
  headline: string;
  detail: string;
  impact: 'high' | 'medium';
  /** Used by the results screen to select the appropriate Phosphor icon and tag label. */
  hook: 'revenue' | 'time' | 'visibility' | 'risk' | 'scale';
}

function toDiscoveryQuestionType(type: string): DiscoveryQuestionType {
  if (type === 'free_text' || type === 'single_choice' || type === 'multi_choice') {
    return type;
  }
  // Discovery UI supports only these three variants; fallback keeps the wizard renderable.
  return 'free_text';
}

// ── Questions ─────────────────────────────────────────────────────────────────
//
// Bank ids must stay in sync with `intake-policy.v1.json` modes.discovery.included
// (see `server/src/tests/discovery-wizard-policy-sync.test.ts`).
// Labels default to `question-bank.v1.json`; option lists for shared ids come from
// `getBankQuestionUiOptions` (`bankQuestionUiCatalog`) where applicable (ADR Phase A dedup).

function makeDiscoveryQuestion(
  id: string,
  spec: Omit<DiscoveryQuestion, 'id' | 'question'> & { question?: string },
): DiscoveryQuestion {
  const bank = getQuestionBankSchemaMeta(id);
  return {
    ...spec,
    id,
    question: spec.question ?? bank?.label ?? id,
  };
}

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
  _PRESENCE_IN_DEV,
  PRESENCE_SOCIAL,
  _PRESENCE_MARKETPLACES,
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

/** Bundled fallback when GET /api/discover/ui-fragment fails — same builder as `buildPublicDiscoveryUiFragment` on the server. */
const FALLBACK_QUESTIONS: DiscoveryQuestion[] = buildDiscoveryWizardQuestions({
  bankOrFallback: (id, fallback) => [...(getBankQuestionUiOptions(id) ?? [...fallback])],
  industryOptions: INDUSTRY_OPTIONS,
}).map(row =>
  makeDiscoveryQuestion(row.id, {
    question: row.question,
    hint: row.hint,
    type: toDiscoveryQuestionType(row.type),
    options: row.options,
    optional: row.optional,
  }),
);

/** Bank ids used by the public Discovery wizard (subset of policy discovery included). */
export const DISCOVERY_WIZARD_BANK_IDS: readonly string[] = FALLBACK_QUESTIONS.map(q => q.id);

let activeQuestions: DiscoveryQuestion[] = FALLBACK_QUESTIONS;
const questionMap = new Map<string, DiscoveryQuestion>();

function rebuildDiscoveryQuestionMap(): void {
  questionMap.clear();
  for (const q of activeQuestions) {
    questionMap.set(q.id, q);
  }
}
rebuildDiscoveryQuestionMap();

/**
 * Hydrates wizard copy/options from GET /api/discover/ui-fragment. Pass null/undefined/empty
 * to restore the bundled fallback (e.g. tests).
 */
export function setDiscoveryUiFragmentQuestions(questions: DiscoveryQuestion[] | null | undefined): void {
  activeQuestions = questions && questions.length > 0 ? questions : FALLBACK_QUESTIONS;
  rebuildDiscoveryQuestionMap();
}

// ── Branching helpers ─────────────────────────────────────────────────────────

function hasCrm(answers: DiscoveryAnswers): boolean {
  const tools = answers['d1'];
  if (!Array.isArray(tools)) return false;
  return tools.includes('CRM');
}

/**
 * Normalises legacy single-string answers saved before multi-select was introduced.
 * Exported for backward-compat reading of old discovery sessions.
 */
export function getOnlinePresenceSelections(answers: DiscoveryAnswers): string[] {
  const v = answers['online_presence'];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    return LEGACY_ONLINE_PRESENCE[s] ?? [s];
  }
  return [];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the ordered question-id sequence for this set of answers.
 * Called on every answer change so the sequence adapts as the user progresses.
 * Order and deferral come from server `layout-rules.v1.json` (public_discovery) +
 * `buildIntakePlan` (branch + discovery policy). `a5` defaults to `no_website` because
 * this flow targets businesses without a public site (the page does not ask `a5`).
 */
export function buildQuestionSequence(answers: DiscoveryAnswers): string[] {
  const plan = buildIntakePlan({
    responses: {
      ...(answers as Record<string, unknown>),
      a5: (answers as Record<string, unknown>)['a5'] ?? 'no_website',
    },
    productMode: 'full',
    collectionMode: 'discovery',
    surface: 'public_discovery',
  });
  return plan.visible.filter(id => questionMap.has(id));
}

export function getQuestion(id: string): DiscoveryQuestion | undefined {
  return questionMap.get(id);
}

// ── Triage score ──────────────────────────────────────────────────────────────

/**
 * Returns a 1–5 triage score for the consultant queue.
 * The score is derived only from the **count** of findings returned by `computeFindings`
 * (same answer set → same cards → same score). Individual finding `impact` (high vs medium)
 * does not change this number — a screen full of medium-severity items lowers the score
 * like several high-severity items would.
 * Stored server-side as `maturity_level` for backend compatibility.
 * NOT shown to the user — internal signal only.
 * More findings → lower numeric score → higher follow-up priority in the consultant queue.
 */
export function computeScore(answers: DiscoveryAnswers): number {
  const n = computeFindings(answers).length;
  if (n === 0) return 5;
  if (n <= 2) return 4;
  if (n <= 4) return 3;
  if (n <= 6) return 2;
  return 1;
}

// ── Findings engine ───────────────────────────────────────────────────────────

function industryLabel(answers: DiscoveryAnswers): string {
  return (answers['a2'] as string | null) ?? 'your industry';
}

function teamLabel(answers: DiscoveryAnswers): string {
  const t = answers['a4'] as string | null;
  if (!t || t === 'Just me') return 'as a solo operator';
  if (t === '2–5 people') return 'with a small team';
  return 'at your team size';
}

/** Natural-language list for enquiry channels (c_nosite_4). */
function channelsLabel(chs: string[]): string {
  if (chs.length === 0) return 'your enquiry channels';
  if (chs.length === 1) return chs[0];
  if (chs.length === 2) return `${chs[0]} and ${chs[1]}`;
  return `${chs.slice(0, -1).join(', ')}, and ${chs[chs.length - 1]}`;
}

function stageLabel(stage: string | null): string {
  if (!stage) return 'at your stage';
  const map: Record<string, string> = {
    'Just getting started': 'while you are launching',
    'Growing fast': 'while you are growing fast',
    Stabilising: 'during stabilisation',
    Scaling: 'while you scale',
    'Mature and optimising': 'as you optimise',
  };
  return map[stage] ?? 'at your current stage';
}

/** True when d1 is empty or only trivial / spreadsheet-only tooling. */
function d1SoloWeakTools(tools: string[]): boolean {
  if (tools.length === 0) return true;
  const trivial = new Set([
    'Email',
    'Nothing specific',
    'Other',
    'WhatsApp / voice notes',
    'Voice notes or WhatsApp audio',
  ]);
  const meaningful = tools.filter(t => !trivial.has(t));
  return meaningful.length === 0 || (meaningful.length === 1 && meaningful[0] === 'Spreadsheets');
}

function d1EffectivelyEmpty(tools: string[]): boolean {
  return (
    tools.length === 0 ||
    (tools.length === 1 && (tools[0] === 'Nothing specific' || tools[0] === 'Other'))
  );
}

/**
 * Generates a prioritised list of business findings from the discovery answers.
 * Detail strings inject named signals (channel, bottleneck, stage, industry)
 * to create specific, personalized observations — not generic advice.
 */
export function computeFindings(answers: DiscoveryAnswers): DiscoveryFinding[] {
  const findings: DiscoveryFinding[] = [];

  const tools    = (answers['d1'] as string[] | null) ?? [];
  const tracking = answers['d1b'] as string | null;
  const channels = (answers['c_nosite_4'] as string[] | null) ?? [];
  const presence = (answers['c_nosite_1'] as string[] | null) ?? [];
  const bottleneck = answers['d2'] as string | null;
  const goal     = answers['f1'] as string | null;
  const stage    = answers['a7'] as string | null;
  const industry = answers['a2'] as string | null;

  const noCrm         = !hasCrm(answers);
  const hasWhatsApp   = channels.includes('WhatsApp');
  const hasPhone      = channels.includes('Phone call');
  const isSolo        = answers['a4'] === 'Just me';
  const isLaunching   = stage === 'Just getting started';
  const isGrowingFast = stage === 'Growing fast';

  const isNotOnline = presence.includes('Not really online yet');

  const isLocalServiceBusiness =
    industry === 'Hospitality' ||
    industry === 'Food & Beverage' ||
    industry === 'Healthcare';
  const isRealEstate = industry === 'Real Estate';

  const hasGoogleSearch = presence.some(p => p === 'Google search' || p === 'Google / search');
  const hasGoogleBusinessListing = presence.some(
    p => p === 'Google Business / Maps listing' || p === 'Google Business listing',
  );
  const hasNoGooglePresence = !hasGoogleSearch && !hasGoogleBusinessListing;

  // ── Rule 1: No CRM + WhatsApp as primary channel ────────────────────────────
  if (noCrm && hasWhatsApp) {
    const ch = channels.filter(c => c !== 'WhatsApp');
    const tail = ch.length ? ` The same pattern often shows up across ${channelsLabel(ch)}.` : '';
    findings.push({
      id: 'no_crm_whatsapp',
      zone: 'Automation',
      headline: 'Every WhatsApp thread is revenue walking out the door',
      detail: `You are managing leads inside WhatsApp with no CRM record.${tail} There is no follow-up sequence, no reminder when a lead goes cold, and no count of how many enquiries slipped away. For ${industryLabel(answers)} ${teamLabel(answers)}, wiring WhatsApp into a simple pipeline is often the fastest revenue win.`,
      impact: 'high',
      hook: 'revenue',
    });
  }

  // ── Rule 2: Lead tracking in head / WhatsApp (d1b) ─────────────────────────────
  if (
    tracking === 'In my head or WhatsApp messages' ||
    (typeof tracking === 'string' && tracking.includes("don't track"))
  ) {
    findings.push({
      id: 'lead_in_head',
      zone: 'Revenue',
      headline: 'You are losing clients you never see in a pipeline',
      detail: `Without a system to log enquiries from ${channelsLabel(channels)}, follow-ups live in memory and chat. Deals that close within hours of first contact are the ones you never see — every slow reply is money left on the table ${stageLabel(stage)}.`,
      impact: 'high',
      hook: 'revenue',
    });
  }

  // ── Rule 3: Not online at all (skip when Rule 13 covers the same case with goal context)
  if (isNotOnline && goal !== 'Not enough new clients') {
    findings.push({
      id: 'invisible',
      zone: 'Visibility',
      headline: 'You are invisible to clients searching for you right now',
      detail: `People are actively looking for ${industryLabel(answers)} services and none of that search traffic reaches you. The audit maps the fastest path to being found — starting with channels that take hours to set up, not months.`,
      impact: 'high',
      hook: 'visibility',
    });
  }

  // ── Rule 4: Only one acquisition / visibility path selected (c_nosite_1) ───
  const solePresence = presence.length === 1 ? presence[0] : null;
  if (solePresence && solePresence !== 'Not really online yet') {
    const only = solePresence;
    findings.push({
      id: 'single_channel',
      zone: 'Growth risk',
      headline: 'All new demand is flowing through a single narrow path',
      detail: `You indicated people find you mainly via "${only}". When that one path hiccups — algorithm, seasonality, or a quiet referral month — revenue wobbles with no backup. ${industryLabel(answers)} businesses ${teamLabel(answers)} usually need at least one parallel acquisition route; the audit shows which to add first.`,
      impact: 'high',
      hook: 'risk',
    });
  }

  // ── Rule 5: Hospitality / F&B / healthcare with no Google presence ──────────
  if (isLocalServiceBusiness && hasNoGooglePresence) {
    findings.push({
      id: 'hospitality_no_google',
      zone: 'Visibility',
      headline: 'Your most important local discovery surface is not working for you yet',
      detail: `For ${industryLabel(answers)}, Google Maps is the first touchpoint for the majority of new clients. A verified Google Business profile is free, takes under an hour, and starts driving enquiries immediately.`,
      impact: 'high',
      hook: 'visibility',
    });
  }

  // ── Rule 6: Launching stage ───────────────────────────────────────────────────
  if (isLaunching) {
    findings.push({
      id: 'launching',
      zone: 'Operations',
      headline: 'The systems you build now define your ceiling later',
      detail: 'At the launch stage, manual workarounds feel fast — until you are busy. Every process built on WhatsApp, spreadsheets, or memory costs 3x more to replace once the business picks up. The audit identifies which shortcuts to avoid and which to invest in now.',
      impact: 'medium',
      hook: 'scale',
    });
  }

  // ── Rule 7: d2 bottleneck is a known automatable workflow ───────────────────
  const automatableD2 = new Set([
    'Following up with leads and prospects',
    'Scheduling and confirming appointments',
    'Creating and sending quotes or invoices',
    'Reporting and tracking what is working',
  ]);
  if (bottleneck && automatableD2.has(bottleneck)) {
    const hourEstimate = isSolo ? '3–5' : '5–10';
    findings.push({
      id: 'd2_automatable',
      zone: 'Automation',
      headline: 'Your biggest time drain is highly automatable',
      detail: `"${bottleneck}" is one of the most commonly automated workflows for ${industryLabel(answers)} businesses. For a team ${teamLabel(answers)}, eliminating this typically frees ${hourEstimate} hours per week — redirected straight to client work.`,
      impact: 'high',
      hook: 'time',
    });
  }

  // ── Rule 8: Solo + empty or spreadsheet-only stack ─────────────────────────
  if (isSolo && d1SoloWeakTools(tools)) {
    findings.push({
      id: 'solo_no_tools',
      zone: 'Operations',
      headline: 'You are carrying the whole operation without a real stack',
      detail: `Running ${industryLabel(answers)} solo on spreadsheets and ad hoc tools caps how many clients you can serve before quality slips. The bottleneck feels like "not enough hours" but it is usually three repeatable workflows — the audit ranks which to automate first so you reclaim 5–10 hours a week.`,
      impact: 'high',
      hook: 'time',
    });
  }

  // ── Rule 9: No substantive tools (non-solo, or solo not already covered by Rule 8)
  if (d1EffectivelyEmpty(tools) && !(isSolo && d1SoloWeakTools(tools))) {
    findings.push({
      id: 'no_tools',
      zone: 'Operations',
      headline: 'Operating without systems is your largest hidden cost',
      detail: `No tools means every piece of information lives in memory or a chat thread. When you grow — or when someone is unavailable — everything stalls. The audit identifies the minimum viable stack for a ${industryLabel(answers)} business at your stage.`,
      impact: 'high',
      hook: 'risk',
    });
  }

  // ── Rule 10: CRM exists but still has a manual bottleneck ───────────────────
  if (!noCrm && bottleneck && !bottleneck.startsWith('Something')) {
    findings.push({
      id: 'crm_but_bottleneck',
      zone: 'Automation',
      headline: 'Your CRM exists but your team works around it',
      detail: `You have the infrastructure but it is not reducing your workload. "${bottleneck}" is still manual. This usually means the setup does not match your actual workflow — something the audit's automation phase maps in detail.`,
      impact: 'medium',
      hook: 'time',
    });
  }

  // ── Rule 11: Growing fast with narrow acquisition base ───────────────────────
  if (isGrowingFast && presence.length <= 2) {
    findings.push({
      id: 'fast_growth_single_channel',
      zone: 'Growth risk',
      headline: 'Fast growth on a narrow base is structurally fragile',
      detail: 'Growing fast with 1–2 acquisition sources means an algorithm change or a referral drought can cut your pipeline in half overnight. Diversification at this stage is cheaper than recovery later.',
      impact: 'medium',
      hook: 'risk',
    });
  }

  // ── Rule 12: Real estate without CRM ─────────────────────────────────────────
  if (isRealEstate && noCrm) {
    findings.push({
      id: 'realestate_no_crm',
      zone: 'Revenue',
      headline: 'Real estate runs on relationships — and yours are not tracked',
      detail: 'In real estate, the majority of deals come from repeat clients or referrals. Without a CRM, you have no visibility into your warm pipeline, no follow-up triggers, no relationship history. Each contact is effectively reset.',
      impact: 'high',
      hook: 'revenue',
    });
  }

  // ── Rule 13: Goal is clients + c_nosite_1 includes "Not really online yet" ───
  if (goal === 'Not enough new clients' && isNotOnline) {
    findings.push({
      id: 'goal_clients_no_presence',
      zone: 'Visibility',
      headline: 'You want more clients, but they cannot find you',
      detail: `You said new clients are the priority, yet you also signalled you are not really online yet — so search and discovery traffic is not reaching you. The fastest fix is rarely more ad spend; it is showing up where ${industryLabel(answers)} buyers already look, starting with the zero-cost moves the audit sequences.`,
      impact: 'high',
      hook: 'visibility',
    });
  }

  // ── Rule 14: Goal is admin overload but d1 is thin ─────────────────────────
  if (goal === 'Too much time on admin and operations' && d1SoloWeakTools(tools)) {
    findings.push({
      id: 'goal_admin_no_tools',
      zone: 'Automation',
      headline: 'Admin overload is a systems problem, not a time problem',
      detail: 'Adding hours to the day does not fix admin overload — the right workflow setup does. The audit identifies the 20% of your processes generating 80% of your admin burden and maps them to specific automation options.',
      impact: 'high',
      hook: 'time',
    });
  }

  // ── Rule 15: Phone as enquiry channel without CRM ───────────────────────────
  if (hasPhone && noCrm) {
    const otherCh = channels.filter(c => c !== 'Phone call');
    const chTail = otherCh.length ? `, often alongside ${channelsLabel(otherCh)}` : '';
    findings.push({
      id: 'phone_primary',
      zone: 'Automation',
      headline: 'Phone calls are high-intent — and they vanish without a system',
      detail: `You told us enquiries arrive by phone${chTail}. Without CRM logging, callbacks slip, voicemails stack, and revenue leaks on busy days. A lightweight capture plus SMS or WhatsApp handoff often pays for itself in one recovered job.`,
      impact: 'medium',
      hook: 'revenue',
    });
  }

  // ── Prioritise and de-duplicate ───────────────────────────────────────────────
  const hookOrder: Record<DiscoveryFinding['hook'], number> = {
    revenue: 0, time: 1, visibility: 2, risk: 3, scale: 4,
  };

  const sorted = [...findings].sort((a, b) => {
    if (a.impact !== b.impact) return a.impact === 'high' ? -1 : 1;
    return hookOrder[a.hook] - hookOrder[b.hook];
  });

  // Max 2 findings per zone to avoid repetitive output
  const zoneCounts: Record<string, number> = {};
  const deduped: DiscoveryFinding[] = [];
  for (const f of sorted) {
    const count = zoneCounts[f.zone] ?? 0;
    if (count < 2) {
      deduped.push(f);
      zoneCounts[f.zone] = count + 1;
    }
    if (deduped.length === 4) break;
  }
  return deduped;
}
