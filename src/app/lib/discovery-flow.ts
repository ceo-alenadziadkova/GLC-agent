/**
 * Discovery flow — Mode C (public, no auth required).
 *
 * Pure logic only: questions, branching, findings generation, triage scoring.
 * No React or DOM dependencies — safe to import from any context.
 *
 * Question IDs use bank IDs (a2, a4, d1, c_nosite_1, etc.) so answers
 * carry directly into IntakeBankWizard. Visibility/order are resolved by
 * shared intake-core (`buildIntakePlan`) to avoid a separate questionnaire model.
 */

import {
  buildIntakePlan,
  buildPublicDiscoveryUiFragment,
  DISCOVERY_FINDINGS_CONFIG,
  DISCOVERY_FINDINGS_COPY,
  DISCOVERY_GLUE_COPY,
  DISCOVERY_SOCIAL_PLATFORM_OPTIONS,
  fillDiscoveryFindingTemplate,
  getQuestionBankSchemaMeta,
  includesCrmTool,
  normalizeIndustry,
  normalizeOnlinePresence,
  normalizePrimaryGoal,
  normalizeStage,
  normalizeTeamSize,
} from '@glc/intake-core';

const FC = DISCOVERY_FINDINGS_CONFIG;
const GLUE = DISCOVERY_GLUE_COPY;

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
// (see `server/src/tests/discovery-policy-sync.test.ts`).
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

export { DISCOVERY_SOCIAL_PLATFORM_OPTIONS };

/** Bundled fallback when GET /api/discover/ui-fragment fails — exact same payload source as the server route. */
const FALLBACK_QUESTIONS: DiscoveryQuestion[] = buildPublicDiscoveryUiFragment().questions.map(row =>
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
  return includesCrmTool(tools);
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
  const t = FC.triage;
  if (n === 0) return t.ifZero;
  if (n <= 2) return t.ifAtMost2;
  if (n <= 4) return t.ifAtMost4;
  if (n <= 6) return t.ifAtMost6;
  return t.otherwise;
}

// ── Findings engine ───────────────────────────────────────────────────────────

function industryLabel(answers: DiscoveryAnswers): string {
  return (answers['a2'] as string | null) ?? GLUE.industryDefault;
}

function teamLabel(answers: DiscoveryAnswers): string {
  const t = normalizeTeamSize(answers['a4']);
  if (t === 'solo' || t === 'unknown') return GLUE.team.soloOrUnknown;
  if (t === 'small') return GLUE.team.small;
  return GLUE.team.other;
}

/** Sentence-leading clause after a period (not mid-phrase like `teamLabel`). */
function teamClauseAfterPeriod(answers: DiscoveryAnswers): string {
  const t = normalizeTeamSize(answers['a4']);
  const c = GLUE.teamClauseAfterPeriod;
  if (t === 'solo' || t === 'unknown') return c.soloOrUnknown;
  if (t === 'small') return c.small;
  return c.other;
}

/** Natural-language list for enquiry channels (c_nosite_4). */
function channelsLabel(chs: string[]): string {
  const { empty, listSeparator, twoJoiner, manyLastPrefix } = GLUE.channels;
  if (chs.length === 0) return empty;
  if (chs.length === 1) return chs[0];
  if (chs.length === 2) return `${chs[0]}${twoJoiner}${chs[1]}`;
  return `${chs.slice(0, -1).join(listSeparator)}${manyLastPrefix}${chs[chs.length - 1]}`;
}

function stageLabel(stage: string | null): string {
  const bucket = normalizeStage(stage);
  if (bucket === 'launching') return GLUE.stage.launching;
  if (bucket === 'growing') return GLUE.stage.growing;
  if (!stage) return GLUE.stage.missing;
  return GLUE.stage.other;
}

/** True when d1 is empty or only trivial / spreadsheet-only tooling. */
function d1SoloWeakTools(tools: string[]): boolean {
  if (tools.length === 0) return true;
  const trivial = new Set(FC.d1TrivialTools);
  const meaningful = tools.filter(t => !trivial.has(t));
  return (
    meaningful.length === 0 ||
    (meaningful.length === 1 && meaningful[0] === FC.d1SoloWeakSpreadsheetOnlyLabel)
  );
}

function d1EffectivelyEmpty(tools: string[]): boolean {
  return tools.length === 0 || (tools.length === 1 && tools[0] === FC.d1EffectivelyEmptyIfOnlyOption);
}

function pushDiscoveryCopyFinding(
  findings: DiscoveryFinding[],
  id: string,
  vars: Record<string, string | undefined>,
): void {
  const row = DISCOVERY_FINDINGS_COPY[id];
  if (!row) return;
  findings.push({
    id,
    zone: row.zone,
    headline: fillDiscoveryFindingTemplate(row.headline, vars),
    detail: fillDiscoveryFindingTemplate(row.detail, vars),
    impact: row.impact,
    hook: row.hook,
  });
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
  const f1Raw = answers['f1'];
  const stage    = answers['a7'] as string | null;
  const industry = answers['a2'] as string | null;
  const goalBucket = normalizePrimaryGoal(f1Raw);

  const noCrm = !hasCrm(answers);
  const hasWhatsApp = channels.some(c => c.toLowerCase().includes(FC.channelWhatsAppSubstring));
  const hasPhone = channels.includes(FC.channelPhoneLabel);
  const teamBucket = normalizeTeamSize(answers['a4']);
  const stageBucket = normalizeStage(stage);
  const isSolo = teamBucket === 'solo';
  const isLaunching = stageBucket === 'launching';
  const isGrowingFast = stageBucket === 'growing';

  const presenceNorm = normalizeOnlinePresence(presence);
  const isNotOnline = presenceNorm.hasNotOnline;

  const industryNorm = normalizeIndustry(industry);
  const isLocalServiceBusiness = FC.localServiceIndustryNorms.includes(industryNorm);
  const isRealEstate = industryNorm === FC.realEstateIndustryNorm;

  const hasGoogleSearch = presenceNorm.hasGoogleSearch;
  const hasGoogleBusinessListing = presenceNorm.hasGoogleBusiness;
  const hasNoGooglePresence = !hasGoogleSearch && !hasGoogleBusinessListing;

  // ── Rule 1: No CRM + WhatsApp as primary channel ────────────────────────────
  if (noCrm && hasWhatsApp) {
    const ch = channels.filter(c => c !== FC.whatsappToolbarChannelLabel);
    const channelsTail = ch.length ? ` The same pattern often shows up across ${channelsLabel(ch)}.` : '';
    pushDiscoveryCopyFinding(findings, 'no_crm_whatsapp', {
      channelsTail,
      industry: industryLabel(answers),
      team: teamLabel(answers),
    });
  }

  // ── Rule 2: Informal lead tracking (d1b) ───────────────────────────────────────
  const trackingInformal =
    typeof tracking === 'string' &&
    (FC.trackingInformalExact.includes(tracking) ||
      FC.trackingInformalSubstrings.some(s => tracking.toLowerCase().includes(s)));
  if (trackingInformal) {
    pushDiscoveryCopyFinding(findings, 'lead_in_head', {
      channels: channelsLabel(channels),
      stage: stageLabel(stage),
    });
  }

  // ── Rule 3: Not online at all (skip when Rule 13 covers the same case with goal context)
  if (isNotOnline && goalBucket !== FC.excludeInvisibleFindingWhenGoalBucket) {
    pushDiscoveryCopyFinding(findings, 'invisible', {
      industry: industryLabel(answers),
    });
  }

  // ── Rule 4: Only one acquisition / visibility path selected (c_nosite_1) ───
  const solePresence = presence.length === 1 ? presence[0] : null;
  if (solePresence && solePresence !== FC.solePresenceChannelExclude) {
    const only = solePresence;
    pushDiscoveryCopyFinding(findings, 'single_channel', {
      soleChannel: only,
      industry: industryLabel(answers),
      team: teamLabel(answers),
    });
  }

  // ── Rule 5: Hospitality / F&B / healthcare with no Google presence ──────────
  if (isLocalServiceBusiness && hasNoGooglePresence) {
    pushDiscoveryCopyFinding(findings, 'hospitality_no_google', {
      industry: industryLabel(answers),
    });
  }

  // ── Rule 6: Launching stage ───────────────────────────────────────────────────
  if (isLaunching) {
    pushDiscoveryCopyFinding(findings, 'launching', {});
  }

  // ── Rule 7: d2 bottleneck is a known automatable workflow ───────────────────
  const automatableD2 = new Set(FC.automatableD2Options);
  if (bottleneck && automatableD2.has(bottleneck)) {
    const hourEstimate = isSolo ? FC.d2AutomatableHoursRangeSolo : FC.d2AutomatableHoursRangeNonSolo;
    pushDiscoveryCopyFinding(findings, 'd2_automatable', {
      bottleneck,
      industry: industryLabel(answers),
      teamClause: teamClauseAfterPeriod(answers),
      hoursRange: hourEstimate,
    });
  }

  // ── Rule 8: Solo + empty or spreadsheet-only stack ─────────────────────────
  if (isSolo && d1SoloWeakTools(tools)) {
    pushDiscoveryCopyFinding(findings, 'solo_no_tools', {
      industry: industryLabel(answers),
    });
  }

  // ── Rule 9: No substantive tools (non-solo, or solo not already covered by Rule 8)
  if (d1EffectivelyEmpty(tools) && !(isSolo && d1SoloWeakTools(tools))) {
    pushDiscoveryCopyFinding(findings, 'no_tools', {
      industry: industryLabel(answers),
    });
  }

  // ── Rule 10: CRM exists but still has a manual bottleneck ───────────────────
  if (!noCrm && bottleneck && !bottleneck.startsWith(FC.crmBottleneckIgnorePrefix)) {
    pushDiscoveryCopyFinding(findings, 'crm_but_bottleneck', {
      bottleneck,
    });
  }

  // ── Rule 11: Growing fast with narrow acquisition base ───────────────────────
  if (isGrowingFast && presence.length <= 2) {
    pushDiscoveryCopyFinding(findings, 'fast_growth_single_channel', {});
  }

  // ── Rule 12: Real estate without CRM ─────────────────────────────────────────
  if (isRealEstate && noCrm) {
    pushDiscoveryCopyFinding(findings, 'realestate_no_crm', {});
  }

  // ── Rule 13: Goal is clients + c_nosite_1 includes "Not really online yet" ───
  if (goalBucket === FC.excludeInvisibleFindingWhenGoalBucket && isNotOnline) {
    pushDiscoveryCopyFinding(findings, 'goal_clients_no_presence', {
      industry: industryLabel(answers),
    });
  }

  // ── Rule 14: Goal is admin overload but d1 is thin ─────────────────────────
  if (goalBucket === FC.goalBucketAdminOverload && d1SoloWeakTools(tools)) {
    pushDiscoveryCopyFinding(findings, 'goal_admin_no_tools', {});
  }

  // ── Rule 15: Phone as enquiry channel without CRM ───────────────────────────
  if (hasPhone && noCrm) {
    const otherCh = channels.filter(c => c !== FC.channelPhoneLabel);
    const chTail = otherCh.length ? `, often alongside ${channelsLabel(otherCh)}` : '';
    pushDiscoveryCopyFinding(findings, 'phone_primary', {
      phoneChannelLower: FC.channelPhoneLabel.toLowerCase(),
      chTail,
    });
  }

  // ── Prioritise and de-duplicate ───────────────────────────────────────────────
  const hookOrder = Object.fromEntries(FC.hookSortOrder.map((h, i) => [h, i])) as Record<
    DiscoveryFinding['hook'],
    number
  >;

  const sorted = [...findings].sort((a, b) => {
    if (a.impact !== b.impact) return a.impact === 'high' ? -1 : 1;
    return hookOrder[a.hook] - hookOrder[b.hook];
  });

  const zoneCounts: Record<string, number> = {};
  const deduped: DiscoveryFinding[] = [];
  for (const f of sorted) {
    const count = zoneCounts[f.zone] ?? 0;
    if (count < FC.maxFindingsPerZone) {
      deduped.push(f);
      zoneCounts[f.zone] = count + 1;
    }
    if (deduped.length === FC.maxFindingsReturned) break;
  }
  return deduped;
}
