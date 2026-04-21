import sequencingPilot from '../../artifacts/intake-sequencing-pilot-1.0.0.json' with { type: 'json' };
import { INTAKE_SEQUENCING_PILOT_POLICY } from '../../config/intake-sequencing-policy.js';

import type { LintFinding } from './types.js';

interface SequencingPilotArtifactShape {
  pilotIndustryLabels?: string[];
  transitionTypes?: Array<{ id: string }>;
  dependencyRules?: Array<{ id: string }>;
}

/**
 * Phase-1 CI guardrails: keep sequencing pilot intentionally small and deterministic.
 */
export function lintSequencingPilotGuardrails(): LintFinding[] {
  const findings: LintFinding[] = [];
  const artifact = sequencingPilot as SequencingPilotArtifactShape;

  const verticals = artifact.pilotIndustryLabels ?? [];
  if (verticals.length > INTAKE_SEQUENCING_PILOT_POLICY.maxPilotVerticals) {
    findings.push({
      code: 'SEQUENCING_PILOT_TOO_MANY_VERTICALS',
      severity: 'error',
      message: `Sequencing pilot has ${verticals.length} vertical labels; max is ${INTAKE_SEQUENCING_PILOT_POLICY.maxPilotVerticals}.`,
    });
  }

  const transitions = artifact.transitionTypes ?? [];
  if (transitions.length > INTAKE_SEQUENCING_PILOT_POLICY.maxTransitionTypes) {
    findings.push({
      code: 'SEQUENCING_PILOT_TOO_MANY_TRANSITIONS',
      severity: 'error',
      message: `Sequencing pilot has ${transitions.length} transition types; max is ${INTAKE_SEQUENCING_PILOT_POLICY.maxTransitionTypes}.`,
    });
  }

  const bridgeRulesCount = (artifact.dependencyRules ?? []).length;
  if (bridgeRulesCount > INTAKE_SEQUENCING_PILOT_POLICY.maxBridgeQuestions) {
    findings.push({
      code: 'SEQUENCING_PILOT_TOO_MANY_BRIDGE_QUESTIONS',
      severity: 'error',
      message: `Sequencing pilot defines ${bridgeRulesCount} bridge dependency rules; max is ${INTAKE_SEQUENCING_PILOT_POLICY.maxBridgeQuestions}.`,
    });
  }

  return findings;
}
