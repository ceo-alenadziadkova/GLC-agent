/**
 * Runtime signal priority ordering (Sprint 3) — shared by readiness envelope and `nextRecommended` sequencing.
 */
import type { IntakeReadinessTraceEntry, IntakeSignalPriorityState } from '../audit-contract.js';
import criticalSignals from '../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };

const SIGNAL_PRIORITY_RANK: Record<'P0' | 'P1' | 'P2', number> = { P0: 0, P1: 1, P2: 2 };
const SIGNAL_CONFIDENCE_RANK = { unknown: 0, low: 1, medium: 2, high: 3 } as const;

type PilotSignalsArtifact = { signals?: Record<string, unknown> };

function normalizeStringValue(v: unknown): string {
  if (typeof v === 'string') return v.toLowerCase().trim();
  if (Array.isArray(v)) return v.map(item => normalizeStringValue(item)).join(' ');
  return '';
}

export function computeSignalPrioritization(args: {
  responses: Record<string, unknown>;
  confidenceByKey: Record<string, 'high' | 'medium' | 'low' | 'unknown'>;
}): { bySignalKey: Record<string, IntakeSignalPriorityState>; nextSignalKeys: string[] } {
  const bySignalKey: Record<string, IntakeSignalPriorityState> = {};
  const stage = normalizeStringValue(args.responses.a7);
  const primaryProblem = normalizeStringValue(args.responses.f1);
  const signalKeys = Object.keys((criticalSignals as PilotSignalsArtifact).signals ?? {});

  for (const signalKey of signalKeys) {
    const confidence = args.confidenceByKey[signalKey] ?? 'unknown';
    let state: IntakeSignalPriorityState =
      confidence === 'unknown' || confidence === 'low'
        ? { currentPriority: 'P0', skipPolicy: 'ask_now', reason: 'low_or_unknown_confidence' }
        : { currentPriority: 'P1', skipPolicy: 'ask_now', reason: 'baseline_priority' };

    if (signalKey === 'industry' || signalKey === 'website_presence') {
      state = confidence === 'high'
        ? { currentPriority: 'P1', skipPolicy: 'ask_now', reason: 'foundation_signal_confirmed' }
        : { currentPriority: 'P0', skipPolicy: 'ask_now', reason: 'foundation_signal_unconfirmed' };
    }

    if (stage.includes('launch') && (signalKey === 'operations_bottleneck' || signalKey === 'delivery_shape_baseline')) {
      state = { currentPriority: 'P2', skipPolicy: 'defer', reason: 'launching_stage_defer_operations_depth' };
    }
    if (stage.includes('scal') && (signalKey === 'operations_bottleneck' || signalKey === 'delivery_shape_baseline')) {
      state = { currentPriority: 'P0', skipPolicy: 'ask_now', reason: 'scaling_stage_prioritize_operations' };
    }
    if (signalKey === 'primary_problem' && primaryProblem.includes('compliance')) {
      state = { currentPriority: 'P0', skipPolicy: 'ask_now', reason: 'primary_problem_mentions_compliance' };
    }

    const industry = normalizeStringValue(args.responses.a2);
    if (
      (industry.includes('e-commerce') || industry.includes('ecommerce') || industry.includes('e commerce')) &&
      signalKey === 'audit_focus'
    ) {
      state = { currentPriority: 'P0', skipPolicy: 'ask_now', reason: 'ecommerce_vertical_elevates_audit_focus' };
    }

    bySignalKey[signalKey] = state;
  }

  const nextSignalKeys = [...signalKeys].sort((a, b) => {
    const pa = bySignalKey[a]?.currentPriority ?? 'P2';
    const pb = bySignalKey[b]?.currentPriority ?? 'P2';
    const pr = SIGNAL_PRIORITY_RANK[pa] - SIGNAL_PRIORITY_RANK[pb];
    if (pr !== 0) return pr;
    const ca = args.confidenceByKey[a] ?? 'unknown';
    const cb = args.confidenceByKey[b] ?? 'unknown';
    const cr = SIGNAL_CONFIDENCE_RANK[ca] - SIGNAL_CONFIDENCE_RANK[cb];
    if (cr !== 0) return cr;
    return a.localeCompare(b);
  });

  return { bySignalKey, nextSignalKeys };
}

export function deriveSignalPrioritization(args: {
  responses: Record<string, unknown>;
  confidenceByKey: Record<string, 'high' | 'medium' | 'low' | 'unknown'>;
  trace: IntakeReadinessTraceEntry[];
}): { bySignalKey: Record<string, IntakeSignalPriorityState>; nextSignalKeys: string[] } {
  const result = computeSignalPrioritization({
    responses: args.responses,
    confidenceByKey: args.confidenceByKey,
  });
  for (const signalKey of Object.keys((criticalSignals as PilotSignalsArtifact).signals ?? {})) {
    const state = result.bySignalKey[signalKey];
    if (!state) continue;
    args.trace.push({
      code: 'signal_priority_evaluated',
      semanticCause: `Signal "${signalKey}" evaluated with priority ${state.currentPriority} (${state.skipPolicy}) due to ${state.reason}`,
      signalKey,
      detail: {
        currentPriority: state.currentPriority,
        skipPolicy: state.skipPolicy,
        reason: state.reason,
      },
    });
  }
  return result;
}
