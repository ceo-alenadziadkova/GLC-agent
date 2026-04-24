import type { IntakeReadinessTraceEntry } from '../audit-contract.js';
import { getResponseString, isIntakeAnswered } from '../unwrap.js';
import { resolveSurfaceMatrixPilotPolicy } from './load-surface-matrix-pilot.js';
import { resolveSequencingPilotArtifact } from './resolve-sequencing-artifact.js';
import type { IntakePlan, IntakeSurface } from './types.js';
import type { IntakeBriefCollectionMode } from '../audit-contract.js';

function isRemediationCellHandled(cell: unknown): boolean {
  if (isIntakeAnswered(cell)) return true;
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    const source = (cell as { source?: unknown }).source;
    if (source === 'unknown') {
      return true;
    }
  }
  return false;
}

/**
 * Deterministic remediation queue: unanswered bank ids that are both eligible and listed in the
 * sequencing pilot allow-list, in allow-list order, capped at {@link INTAKE_REMEDIATION_PILOT_MAX_QUEUE}.
 */
export function selectRemediationPilotQueue(args: {
  plan: IntakePlan;
  responses: Record<string, unknown>;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
}): { queue: string[]; trace: IntakeReadinessTraceEntry[] } {
  const trace: IntakeReadinessTraceEntry[] = [];
  const seq = resolveSequencingPilotArtifact(args.plan.versions.sequencingVersion);
  if (!seq) {
    return { queue: [], trace };
  }

  const industry = getResponseString(args.responses, 'a2');
  const pilot = seq.pilotIndustryLabels.some(l => l === industry);
  if (!pilot) {
    const pilotLabels = seq.pilotIndustryLabels.join(', ');
    trace.push({
      code: 'remediation_pilot_skipped',
      semanticCause: `Pilot remediation applies only to configured pilot industry labels: ${pilotLabels}`,
    });
    return { queue: [], trace };
  }

  const eligible = new Set(args.plan.eligible);
  const surfacePolicy = resolveSurfaceMatrixPilotPolicy({
    collectionMode: args.collectionMode,
    surface: args.surface,
  });
  const remediationMax = Math.max(0, Math.floor(surfacePolicy.remediationMax));
  if (remediationMax === 0) {
    trace.push({
      code: 'remediation_budget_zero_for_surface',
      semanticCause:
        'Surface remediation policy has zero budget for this pass; remediation queue is intentionally empty',
    });
    return { queue: [], trace };
  }
  const queue: string[] = [];
  for (const bankId of seq.remediationAllowedBankIds) {
    if (queue.length >= remediationMax) break;
    if (!eligible.has(bankId)) {
      trace.push({
        code: 'remediation_candidate_ineligible',
        semanticCause:
          'Remediation allow-list includes a bank id that is not eligible under current branch/policy — skipped',
        questionId: bankId,
      });
      continue;
    }
    const cell = args.responses[bankId];
    if (!isRemediationCellHandled(cell)) {
      queue.push(bankId);
    } else if (
      cell &&
      typeof cell === 'object' &&
      !Array.isArray(cell) &&
      (cell as { source?: unknown }).source === 'unknown'
    ) {
      trace.push({
        code: 'remediation_candidate_skipped_unknown_already_acknowledged',
        semanticCause:
          'Remediation idempotence: unknown-marked signal is treated as already acknowledged for this pass',
        questionId: bankId,
      });
    }
  }

  if (queue.length > 0) {
    trace.push({
      code: 'remediation_queue_built',
      semanticCause: 'Built deterministic remediation queue from pilot allow-list and unanswered eligible cells',
      detail: { bankIds: [...queue] },
    });
  }

  return { queue, trace };
}
