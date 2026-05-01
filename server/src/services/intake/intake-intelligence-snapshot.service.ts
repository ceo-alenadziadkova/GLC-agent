import { getBriefQuestionsByIds } from '../../schemas/intake-brief.js';
import { isIntakeIntelligenceSnapshotLlmEnabled } from '../../config/feature-flags.js';
import { mergeNlDraftIntoAuthoritativeResponses } from './intake-nl-authoritative.service.js';
import type { NlDescribeGraphDraft } from './nl-describe-graph-mapper.js';
import { buildTailoredQuestionsForResponses } from './intake-tailored-questions.service.js';
import {
  runIntakeIntelligenceSnapshotLlm,
  runIntakeIntelligenceUnderstandingLlm,
} from './intake-intelligence-snapshot-llm.service.js';
import { recordIntakeIntelligenceSnapshotKpi } from './intake-intelligence-snapshot-kpi.service.js';

const SNAPSHOT_SUMMARY_MAX_KEYS = 40;
const SNAPSHOT_STRING_MAX = 400;

function cellToSummary(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.slice(0, SNAPSHOT_STRING_MAX);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.join(', ').slice(0, SNAPSHOT_STRING_MAX);
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const val = (v as { value?: unknown }).value;
    if (typeof val === 'string') return val.slice(0, SNAPSHOT_STRING_MAX);
    if (typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return val.join(', ').slice(0, SNAPSHOT_STRING_MAX);
  }
  return '';
}

/**
 * Compact JSON for LLM prompt — keys are bank ids only; values truncated.
 */
export function buildResponsesSummaryForIntakeSnapshot(responses: Record<string, unknown>): string {
  const keys = Object.keys(responses)
    .filter(k => !k.startsWith('_'))
    .sort()
    .slice(0, SNAPSHOT_SUMMARY_MAX_KEYS);
  const slim: Record<string, string> = {};
  for (const k of keys) {
    const s = cellToSummary(responses[k]);
    if (s.length > 0) slim[k] = s;
  }
  return JSON.stringify(slim);
}

/**
 * Filters F2 suggestions to the deterministic tail and appends any missing ids in planner order.
 */
export function mergeF2WithDeterministicOrder(args: {
  suggested: readonly string[];
  deterministicOrder: readonly string[];
}): { orderedIds: string[]; invalidFiltered: number } {
  const allowed = new Set(args.deterministicOrder);
  const validFromLlm: string[] = [];
  const seen = new Set<string>();
  for (const id of args.suggested) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    validFromLlm.push(id);
  }
  const invalidFiltered = args.suggested.filter(id => !allowed.has(id)).length;
  for (const id of args.deterministicOrder) {
    if (!seen.has(id)) {
      seen.add(id);
      validFromLlm.push(id);
    }
  }
  return { orderedIds: validFromLlm, invalidFiltered };
}

function filterLabelOverrides(
  overrides: Record<string, string>,
  allowedIds: ReadonlySet<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (allowedIds.has(k) && v.trim().length > 0) {
      out[k] = v.trim().slice(0, 500);
    }
  }
  return out;
}

export type IntakeIntelligenceSnapshotResult = {
  questions: ReturnType<typeof getBriefQuestionsByIds>;
  question_ids: string[];
  case_keys: string[];
  next_recommended: string[];
  deterministic_question_ids: string[];
  narrative: string | null;
  inferred_preview: NlDescribeGraphDraft['inferred'];
  merge_would_apply_count: number;
  snapshot_no_new_inferred: boolean;
  label_overrides: Record<string, string>;
  f2_source: 'llm' | 'deterministic' | 'llm_mixed';
  kpi: {
    invalid_f2_ids_filtered: number;
    f2_suggestion_length: number;
  };
};

export async function runIntakeIntelligenceSnapshot(args: {
  responses: Record<string, unknown>;
  auditId: string | null;
  intakeTokenId?: string;
  skipLlm?: boolean;
  /** Optional performance / bootstrap Lighthouse slice for the LLM (ignored when `skipLlm` or LLM off). */
  lighthouseSummary?: Record<string, unknown> | null;
  /**
   * `understanding` — LLM-1 only (narrative + inferred + F2; no B1 `label_overrides` from the model). Used by authenticated `POST …/brief/intelligence-snapshot`.
   * `full` — single-call legacy (public token route): includes optional label overrides in one pass.
   */
  intelligenceLlmMode?: 'full' | 'understanding';
}): Promise<IntakeIntelligenceSnapshotResult> {
  const built = buildTailoredQuestionsForResponses(args.responses);
  const deterministicIds = built.questionIds;
  const summary = buildResponsesSummaryForIntakeSnapshot(args.responses);

  let narrative: string | null = null;
  let inferred: NlDescribeGraphDraft['inferred'] = [];
  let suggestedNext: string[] = [];
  let labelOverrides: Record<string, string> = {};
  let llmError: string | null = null;

  const llm =
    !args.skipLlm && isIntakeIntelligenceSnapshotLlmEnabled() && deterministicIds.length > 0;
  const useUnderstandingOnly = (args.intelligenceLlmMode ?? 'full') === 'understanding';

  if (llm) {
    try {
      const out = useUnderstandingOnly
        ? await runIntakeIntelligenceUnderstandingLlm({
            allowedF2Ids: deterministicIds,
            responsesSummary: summary,
            lighthouseSummary: args.lighthouseSummary,
          })
        : await runIntakeIntelligenceSnapshotLlm({
            allowedF2Ids: deterministicIds,
            responsesSummary: summary,
            lighthouseSummary: args.lighthouseSummary,
          });
      narrative = out.narrative;
      inferred = out.inferred;
      suggestedNext = out.suggestedNextQuestionIds;
      labelOverrides = useUnderstandingOnly ? {} : out.labelOverrides;
    } catch (e) {
      llmError = e instanceof Error ? e.message : 'unknown_llm_error';
      narrative = null;
      inferred = [];
      suggestedNext = [];
      labelOverrides = {};
    }
  }

  const { mergedResponses: _mr, appliedHints } = mergeNlDraftIntoAuthoritativeResponses({
    graphDraft: { inferred },
    existingResponses: args.responses,
    minConfidence: 'medium',
  });
  void _mr;
  const mergeWouldApplyCount = appliedHints.length;
  const snapshotNoNewInferred = mergeWouldApplyCount === 0;

  const { orderedIds, invalidFiltered } = mergeF2WithDeterministicOrder({
    suggested: suggestedNext.length > 0 ? suggestedNext : [],
    deterministicOrder: deterministicIds,
  });

  const allowedSet = new Set(deterministicIds);

  let f2Source: IntakeIntelligenceSnapshotResult['f2_source'] = 'deterministic';
  if (llm && !llmError) {
    if (suggestedNext.length === 0) {
      f2Source = 'deterministic';
    } else if (invalidFiltered > 0) {
      f2Source = 'llm_mixed';
    } else {
      f2Source = 'llm';
    }
  }

  const labelOverridesFiltered = filterLabelOverrides(labelOverrides, allowedSet);

  const result: IntakeIntelligenceSnapshotResult = {
    questions: getBriefQuestionsByIds(orderedIds),
    question_ids: orderedIds,
    case_keys: built.caseKeys,
    next_recommended: built.nextRecommended,
    deterministic_question_ids: deterministicIds,
    narrative,
    inferred_preview: inferred,
    merge_would_apply_count: mergeWouldApplyCount,
    snapshot_no_new_inferred: snapshotNoNewInferred,
    label_overrides: labelOverridesFiltered,
    f2_source: f2Source,
    kpi: {
      invalid_f2_ids_filtered: invalidFiltered,
      f2_suggestion_length: suggestedNext.length,
    },
  };

  await recordIntakeIntelligenceSnapshotKpi({
    auditId: args.auditId,
    intakeTokenId: args.intakeTokenId,
    mergeWouldApplyCount,
    snapshotNoNewInferred,
    f2Source,
    invalidF2IdsFiltered: invalidFiltered,
    f2SuggestionLength: suggestedNext.length,
    llmError: llmError ?? undefined,
  });

  return result;
}
