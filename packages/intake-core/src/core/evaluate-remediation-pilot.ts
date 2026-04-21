import type { IntakeReadinessTraceEntry } from '../audit-contract.js';
import { INTAKE_REMEDIATION_PILOT_MAX_QUEUE } from '../config/intake-remediation-policy.js';
import { getResponseString, isIntakeAnswered } from '../unwrap.js';
import { resolveSequencingPilotArtifact } from './resolve-sequencing-artifact.js';
import type { IntakePlan } from './types.js';

/**
 * Deterministic remediation queue: unanswered bank ids that are both eligible and listed in the
 * sequencing pilot allow-list, in allow-list order, capped at {@link INTAKE_REMEDIATION_PILOT_MAX_QUEUE}.
 */
export function selectRemediationPilotQueue(args: {
  plan: IntakePlan;
  responses: Record<string, unknown>;
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
  const queue: string[] = [];
  for (const bankId of seq.remediationAllowedBankIds) {
    if (queue.length >= INTAKE_REMEDIATION_PILOT_MAX_QUEUE) break;
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
    if (!isIntakeAnswered(cell)) {
      queue.push(bankId);
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
