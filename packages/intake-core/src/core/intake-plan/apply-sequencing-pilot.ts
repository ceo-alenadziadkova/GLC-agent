import type { IntakeReadinessTraceEntry } from '../../audit-contract.js';
import {
  INTAKE_UNKNOWN_POLICY,
  INTAKE_UNKNOWN_SOURCE_VALUE,
} from '../../config/intake-readiness-policy.js';
import { getResponseString, isIntakeAnswered } from '../../unwrap.js';
import { resolveSequencingPilotArtifact } from '../resolve-sequencing-artifact.js';

/**
 * Sequencing layer runs after eligibility + policy + layout (ADR precedence §3.3).
 * Pilot: reorder `nextRecommended` for Healthcare using the sequencing artifact order only.
 */
export function applySequencingPilotToPlan(args: {
  sequencingVersion: string;
  nextRecommended: string[];
  visible: string[];
  responses: Record<string, unknown>;
}): {
  nextRecommended: string[];
  sequencingTrace: IntakeReadinessTraceEntry[];
} {
  const isSequencingPrerequisiteAnswered = (value: unknown): boolean => {
    if (!isIntakeAnswered(value)) return false;
    if (
      !INTAKE_UNKNOWN_POLICY.unknownMaySatisfyAuditReadiness &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'source' in (value as Record<string, unknown>)
    ) {
      const source = (value as { source?: string }).source;
      return source !== INTAKE_UNKNOWN_SOURCE_VALUE;
    }
    return true;
  };

  const seq = resolveSequencingPilotArtifact(args.sequencingVersion);
  const trace: IntakeReadinessTraceEntry[] = [];
  if (!seq) {
    return { nextRecommended: args.nextRecommended, sequencingTrace: trace };
  }

  const industry = getResponseString(args.responses, 'a2');
  const pilot = seq.pilotIndustryLabels.some(l => l === industry);
  if (!pilot) {
    const pilotLabels = seq.pilotIndustryLabels.join(', ');
    trace.push({
      code: 'sequencing_pilot_skipped',
      semanticCause: `Pilot sequencing order applies only to configured pilot industry labels: ${pilotLabels}`,
    });
    return { nextRecommended: args.nextRecommended, sequencingTrace: trace };
  }

  const order = seq.strictRecommendedOrderWhenPilot;
  const visible = new Set(args.visible);
  const inPlan = args.nextRecommended.filter(id => visible.has(id));
  const tail = args.nextRecommended.filter(id => !visible.has(id));
  const rank = new Map<string, number>();
  order.forEach((id, i) => rank.set(id, i));
  const sorted = [...inPlan].sort((a, b) => {
    const ra = rank.has(a) ? (rank.get(a) as number) : 999;
    const rb = rank.has(b) ? (rank.get(b) as number) : 999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  trace.push({
    code: 'sequencing_pilot_applied',
    semanticCause: 'Reordered nextRecommended using pilot sequencing artifact (branch/policy/layout already applied)',
    detail: { transitionTypes: seq.transitionTypes.map(t => t.id) },
  });
  for (const bankId of sorted) {
    const slot = seq.askSlotContract?.[bankId];
    if (!slot) continue;
    trace.push({
      code: 'sequencing_ask_slot_contract_applied',
      semanticCause:
        'Ask-slot contract metadata applied for deterministic signal unlocking and transition governance',
      questionId: bankId,
      detail: {
        unlocksSignals: slot.unlocksSignals,
        guardDomain: slot.guardDomain,
        transitionRuleRef: slot.transitionRuleRef ?? null,
        sourcesByPriority: slot.sourcesByPriority ?? [],
        unknownPolicy: slot.unknownPolicy ?? null,
        conflictRuleRef: slot.conflictRuleRef ?? null,
      },
    });
  }

  const rules = [...(seq.dependencyRules ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  for (const rule of rules) {
    const pendingBankId = rule.requiresAnsweredBankIds.find(
      bid => !isSequencingPrerequisiteAnswered(args.responses[bid]),
    );
    if (pendingBankId != null) {
      trace.push({
        code: 'sequencing_dep_prerequisite_pending',
        semanticCause: rule.semanticCause,
        questionId: pendingBankId,
        detail: {
          ruleId: rule.id,
          transitionId: rule.transitionId,
          owner: rule.lifecycle.owner,
          kpiMetric: rule.lifecycle.kpiMetric,
          lifecycleState: rule.lifecycle.state,
          reviewByIsoDate: rule.lifecycle.reviewByIsoDate,
        },
      });
    } else {
      trace.push({
        code: 'sequencing_dep_satisfied',
        semanticCause: rule.semanticCause,
        detail: {
          ruleId: rule.id,
          transitionId: rule.transitionId,
          owner: rule.lifecycle.owner,
          kpiMetric: rule.lifecycle.kpiMetric,
          lifecycleState: rule.lifecycle.state,
          reviewByIsoDate: rule.lifecycle.reviewByIsoDate,
        },
      });
    }
  }

  return { nextRecommended: [...sorted, ...tail], sequencingTrace: trace };
}

