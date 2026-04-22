import criticalSignals from '../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };

import type { IntakeCriticalSignalConfidence, IntakeReadinessTraceEntry } from '../audit-contract.js';
import {
  INTAKE_CRITICAL_SIGNAL_REGISTRY_POLICY,
  INTAKE_UNKNOWN_POLICY,
  INTAKE_UNKNOWN_SOURCE_VALUE,
} from '../config/intake-readiness-policy.js';
import type { IntakePlan } from './types.js';
import { getResponseString, isIntakeAnswered } from '../unwrap.js';

export interface CriticalSignalDefinitionV1 {
  bankIds: string[];
  normalizerRef: string;
  sourcesByPriority?: Array<'explicit' | 'recon_confirmed' | 'imported' | 'inferred'>;
  evidenceType?: 'explicit' | 'inferred' | 'recon_confirmed' | 'imported';
  conflictResolutionRule?: string;
  unknownHandlingRule?: string;
}

export interface CriticalSignalsPilotArtifactV1 {
  version: string;
  pilotIndustryLabels: string[];
  unknownBlocksAuditReady: boolean;
  signals: Record<string, CriticalSignalDefinitionV1>;
}

const ART = criticalSignals as CriticalSignalsPilotArtifactV1;
const UNKNOWN_BLOCKS_AUDIT_READY_RULE = 'unknown_blocks_audit_ready';

type SignalEvidenceSource = 'explicit' | 'recon_confirmed' | 'imported' | 'inferred';

function responseSource(value: unknown): string | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'source' in (value as Record<string, unknown>)) {
    return (value as { source?: string }).source;
  }
  return undefined;
}

function isUnknownSourced(value: unknown): boolean {
  return responseSource(value) === INTAKE_UNKNOWN_SOURCE_VALUE;
}

function minConfidence(
  a: IntakeCriticalSignalConfidence,
  b: IntakeCriticalSignalConfidence,
): IntakeCriticalSignalConfidence {
  const rank: Record<IntakeCriticalSignalConfidence, number> = {
    unknown: 0,
    low: 1,
    medium: 2,
    high: 3,
  };
  return rank[a] < rank[b] ? a : b;
}

function clampUnknownConfidenceFloor(value: IntakeCriticalSignalConfidence): IntakeCriticalSignalConfidence {
  // Unknown input is never positive evidence; keep confidence at low/unknown.
  if (value === 'high' || value === 'medium') return 'low';
  return value;
}

function normalizeSource(value: string | undefined): SignalEvidenceSource | null {
  if (!value) return null;
  if (value === 'explicit' || value === 'recon_confirmed' || value === 'imported' || value === 'inferred') {
    return value;
  }
  return null;
}

/**
 * Pilot critical signals (ADR §6): bank ids + normalizer refs only — question copy stays in the bank JSON.
 */
export function evaluateCriticalSignalsPilot(args: {
  responses: Record<string, unknown>;
  plan: IntakePlan;
}): { satisfied: boolean; trace: IntakeReadinessTraceEntry[]; confidenceByKey: Record<string, IntakeCriticalSignalConfidence> } {
  const trace: IntakeReadinessTraceEntry[] = [];
  const confidenceByKey: Record<string, IntakeCriticalSignalConfidence> = {};
  const industry = getResponseString(args.responses, 'a2');
  const pilotIndustry = ART.pilotIndustryLabels.some(l => l === industry);
  if (!pilotIndustry) {
    const pilotLabels = ART.pilotIndustryLabels.join(', ');
    trace.push({
      code: 'pilot_signals_skipped',
      semanticCause: `Critical signal pilot rules apply only to configured pilot industry labels: ${pilotLabels}`,
    });
    return { satisfied: true, trace, confidenceByKey };
  }

  const eligible = new Set(args.plan.eligible);
  let satisfied = true;

  for (const [signalKey, def] of Object.entries(ART.signals)) {
    let signalWorst: IntakeCriticalSignalConfidence = 'high';
    let evaluatedAnyEligibleBank = false;
    trace.push({
      code: 'critical_signal_metadata_applied',
      semanticCause:
        'Critical signal metadata (source priority, evidence type, conflict rule, unknown rule) applied for evaluation',
      signalKey,
      detail: {
        normalizerRef: def.normalizerRef,
        sourcesByPriority: def.sourcesByPriority ?? [],
        evidenceType: def.evidenceType ?? null,
        conflictResolutionRule: def.conflictResolutionRule ?? null,
        unknownHandlingRule: def.unknownHandlingRule ?? null,
      },
    });

    for (const bankId of def.bankIds) {
      if (!eligible.has(bankId)) {
        trace.push({
          code: 'signal_not_in_eligible_ceiling',
          semanticCause: 'Branch/policy eligibility excludes this bank id for the current answer graph',
          signalKey,
          questionId: bankId,
          detail: { normalizerRef: def.normalizerRef },
        });
        continue;
      }
      evaluatedAnyEligibleBank = true;
      const cell = args.responses[bankId];
      if (!isIntakeAnswered(cell)) {
        satisfied = false;
        signalWorst = minConfidence(signalWorst, 'unknown');
        trace.push({
          code: 'critical_signal_unanswered',
          semanticCause: `Pilot critical signal "${signalKey}" is unanswered for audit execution readiness`,
          signalKey,
          questionId: bankId,
        });
        continue;
      }
      if (
        (def.unknownHandlingRule === UNKNOWN_BLOCKS_AUDIT_READY_RULE || ART.unknownBlocksAuditReady) &&
        !INTAKE_UNKNOWN_POLICY.unknownMaySatisfyAuditReadiness &&
        isUnknownSourced(cell)
      ) {
        satisfied = false;
        signalWorst = minConfidence(
          signalWorst,
          clampUnknownConfidenceFloor(INTAKE_UNKNOWN_POLICY.maxConfidenceFromUnknown),
        );
        trace.push({
          code: 'critical_signal_unknown_source',
          semanticCause: `Pilot critical signal "${signalKey}" is unknown-sourced; cannot authorize audit_ready without explicit evidence`,
          signalKey,
          questionId: bankId,
        });
      } else {
        const rawSource = responseSource(cell);
        const source = normalizeSource(rawSource);
        const sourcePriority = def.sourcesByPriority ?? [];
        const policyEntry = INTAKE_CRITICAL_SIGNAL_REGISTRY_POLICY[signalKey];
        const policyFloor = policyEntry?.minimumConfidenceForAuditReady ?? 'low';
        const answeredConfidence: IntakeCriticalSignalConfidence =
          policyFloor === 'high' ? 'high' : policyFloor === 'medium' ? 'medium' : 'low';
        let sourceBoundedConfidence: IntakeCriticalSignalConfidence = answeredConfidence;
        if (sourcePriority.length > 0 && rawSource) {
          const idx = source ? sourcePriority.indexOf(source) : -1;
          if (idx < 0) {
            sourceBoundedConfidence = 'low';
            trace.push({
              code: 'critical_signal_source_priority_miss',
              semanticCause:
                'Answer source is not present in critical signal source priority list; confidence is bounded to low',
              signalKey,
              questionId: bankId,
              detail: {
                source: rawSource,
                sourcesByPriority: sourcePriority,
              },
            });
          } else if (idx >= 2) {
            // Lower-priority sources cannot elevate confidence above low in the pilot.
            sourceBoundedConfidence = 'low';
          }
        }
        signalWorst = minConfidence(signalWorst, sourceBoundedConfidence);
      }
    }

    confidenceByKey[signalKey] = evaluatedAnyEligibleBank ? signalWorst : 'unknown';
  }

  return { satisfied, trace, confidenceByKey };
}
