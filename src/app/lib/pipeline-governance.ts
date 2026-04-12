import type {
  ControlObjectGovernanceView,
  GovernanceDecisionHint,
  PipelineEvent,
  RefineRecommendedEventData,
} from '../data/auditTypes';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parse `data.control_object` from a `control_object` pipeline event (best-effort). */
export function parseControlObjectGovernance(
  data: Record<string, unknown>
): ControlObjectGovernanceView | null {
  const raw = data.control_object;
  if (!isRecord(raw)) return null;
  const hint = raw.decision_hint;
  if (hint !== 'accept' && hint !== 'accept_with_warnings' && hint !== 'refine') return null;
  const confidence = raw.confidence;
  const counts = raw.counts;
  const context = raw.context;
  const human = raw.human_attention_required;
  if (!isRecord(confidence) || !isRecord(counts) || !isRecord(context) || !isRecord(human)) {
    return null;
  }
  const statuses = counts.statuses;
  if (!isRecord(statuses)) return null;
  return {
    decision_hint: hint as GovernanceDecisionHint,
    confidence: {
      overall: Number(confidence.overall) || 0,
      factual: Number(confidence.factual) || 0,
      strategic: Number(confidence.strategic) || 0,
      consistency: Number(confidence.consistency) || 0,
    },
    counts: {
      total_claims: Number(counts.total_claims) || 0,
      fact: Number(counts.fact) || 0,
      statuses: {
        confirmed_brief: Number(statuses.confirmed_brief) || 0,
        unverified: Number(statuses.unverified) || 0,
        likely_hallucination: Number(statuses.likely_hallucination) || 0,
        risky_promise: Number(statuses.risky_promise) || 0,
      },
    },
    context: {
      phase_id: String(context.phase_id ?? ''),
      execution_mode: String(context.execution_mode ?? 'normal'),
      audit_id: String(context.audit_id ?? ''),
    },
    human_attention_required: {
      required: Boolean(human.required),
      reasons: Array.isArray(human.reasons)
        ? human.reasons.filter((x): x is string => typeof x === 'string')
        : [],
    },
  };
}

export function parseRefineRecommendedData(
  data: Record<string, unknown>
): RefineRecommendedEventData | null {
  const hint = data.decision_hint;
  if (hint !== 'refine') return null;
  const reasoning = typeof data.reasoning === 'string' ? data.reasoning : '';
  const active = Array.isArray(data.active_error_types)
    ? data.active_error_types.filter((x): x is string => typeof x === 'string')
    : [];
  const coRaw = data.control_object;
  const control_object =
    isRecord(coRaw) ? parseControlObjectGovernance({ control_object: coRaw }) : undefined;
  return {
    decision_hint: 'refine',
    reasoning,
    active_error_types: active,
    control_object,
  };
}

/** Phases that completed in the block ending at `afterPhase` review gate (for filtering refine events). */
export function reviewBlockPhaseRange(afterPhase: number): { min: number; max: number } | null {
  if (afterPhase === 4) return { min: 1, max: 4 };
  if (afterPhase === 7) return { min: 5, max: 7 };
  return null;
}

export function refineEventsForReviewBlock(
  events: PipelineEvent[],
  afterPhase: number
): PipelineEvent[] {
  const range = reviewBlockPhaseRange(afterPhase);
  if (!range) return [];
  return events.filter(
    e => e.event_type === 'refine_recommended' && e.phase >= range.min && e.phase <= range.max
  );
}

export function latestControlObjectForPhase(
  events: PipelineEvent[],
  phase: number
): ControlObjectGovernanceView | null {
  const matches = events.filter(e => e.phase === phase && e.event_type === 'control_object');
  const last = matches[matches.length - 1];
  if (!last) return null;
  return parseControlObjectGovernance(last.data);
}

export function latestRefineForPhase(
  events: PipelineEvent[],
  phase: number
): RefineRecommendedEventData | null {
  const matches = events.filter(e => e.phase === phase && e.event_type === 'refine_recommended');
  const last = matches[matches.length - 1];
  if (!last) return null;
  return parseRefineRecommendedData(last.data);
}
