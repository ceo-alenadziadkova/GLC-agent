import sequencingPilot from '../../artifacts/intake-sequencing-pilot-1.0.0.json' with { type: 'json' };
import { INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY } from '../../config/intake-bridge-governance-policy.js';
import { INTAKE_SEQUENCING_PILOT_POLICY } from '../../config/intake-sequencing-policy.js';

import type { LintFinding } from './types.js';

interface SequencingPilotArtifactShape {
  pilotIndustryLabels?: string[];
  transitionTypes?: Array<{ id: string }>;
  dependencyRules?: Array<{
    id: string;
    lifecycle?: {
      owner?: string;
      kpiMetric?: string;
      state?: string;
      reviewByIsoDate?: string;
    };
  }>;
  strictRecommendedOrderWhenPilot?: string[];
  askSlotContract?: Record<
    string,
    {
      unlocksSignals?: string[];
      guardDomain?: string;
      transitionRuleRef?: string;
      sourcesByPriority?: string[];
      unknownPolicy?: string;
      conflictRuleRef?: string;
    }
  >;
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

  const orderedIds = new Set(artifact.strictRecommendedOrderWhenPilot ?? []);
  for (const [bankId, slot] of Object.entries(artifact.askSlotContract ?? {})) {
    if (!orderedIds.has(bankId)) {
      findings.push({
        code: 'SEQUENCING_PILOT_ASK_SLOT_ID_NOT_IN_ORDER',
        severity: 'error',
        message: `Ask-slot contract id "${bankId}" must exist in strictRecommendedOrderWhenPilot.`,
      });
    }
    if (!Array.isArray(slot.unlocksSignals) || slot.unlocksSignals.length === 0) {
      findings.push({
        code: 'SEQUENCING_PILOT_ASK_SLOT_UNLOCKS_SIGNALS_INVALID',
        severity: 'error',
        message: `Ask-slot contract for "${bankId}" must define non-empty unlocksSignals.`,
      });
    }
    if (!slot.guardDomain) {
      findings.push({
        code: 'SEQUENCING_PILOT_ASK_SLOT_GUARD_DOMAIN_MISSING',
        severity: 'error',
        message: `Ask-slot contract for "${bankId}" must define guardDomain.`,
      });
    }
  }

  const allowedOwners = new Set(INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.allowedOwners);
  const allowedStates = new Set(INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.allowedLifecycleStates);
  for (const rule of artifact.dependencyRules ?? []) {
    const lc = rule.lifecycle;
    if (!lc) {
      findings.push({
        code: 'SEQUENCING_PILOT_BRIDGE_LIFECYCLE_MISSING',
        severity: 'error',
        message: `Bridge dependency rule "${rule.id}" must define lifecycle governance metadata.`,
      });
      continue;
    }
    if (!lc.owner || !allowedOwners.has(lc.owner as (typeof INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.allowedOwners)[number])) {
      findings.push({
        code: 'SEQUENCING_PILOT_BRIDGE_OWNER_INVALID',
        severity: 'error',
        message: `Bridge dependency rule "${rule.id}" has invalid lifecycle.owner.`,
        detail: lc.owner,
      });
    }
    if (
      !lc.kpiMetric
      || !lc.kpiMetric.startsWith(INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.kpiMetricPrefix)
    ) {
      findings.push({
        code: 'SEQUENCING_PILOT_BRIDGE_KPI_METRIC_INVALID',
        severity: 'error',
        message: `Bridge dependency rule "${rule.id}" must define lifecycle.kpiMetric starting with "${INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.kpiMetricPrefix}".`,
        detail: lc.kpiMetric,
      });
    }
    if (!lc.state || !allowedStates.has(lc.state as (typeof INTAKE_BRIDGE_QUESTION_GOVERNANCE_POLICY.allowedLifecycleStates)[number])) {
      findings.push({
        code: 'SEQUENCING_PILOT_BRIDGE_STATE_INVALID',
        severity: 'error',
        message: `Bridge dependency rule "${rule.id}" has invalid lifecycle.state.`,
        detail: lc.state,
      });
    }
    if (!lc.reviewByIsoDate || !/^\d{4}-\d{2}-\d{2}$/.test(lc.reviewByIsoDate)) {
      findings.push({
        code: 'SEQUENCING_PILOT_BRIDGE_REVIEW_DATE_INVALID',
        severity: 'error',
        message: `Bridge dependency rule "${rule.id}" must define lifecycle.reviewByIsoDate in ISO date format (YYYY-MM-DD).`,
        detail: lc.reviewByIsoDate,
      });
    }
  }

  return findings;
}
