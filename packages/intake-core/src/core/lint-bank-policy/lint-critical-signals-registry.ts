import criticalSignals from '../../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };
import questionBankCanon from '../../question-bank.v1.json' with { type: 'json' };
import {
  INTAKE_CRITICAL_SIGNAL_REGISTRY_POLICY,
  INTAKE_PHASE1_MAX_CRITICAL_SIGNALS,
} from '../../config/intake-readiness-policy.js';

import type { LintFinding } from './types.js';

interface CriticalSignalArtifactShape {
  signals: Record<
    string,
    {
      bankIds: string[];
      normalizerRef?: string;
      sourcesByPriority?: string[];
      evidenceType?: string;
      conflictResolutionRule?: string;
      unknownHandlingRule?: string;
    }
  >;
}

/** ADR Phase-1 guardrail: registry must stay deterministic and fully policy-owned. */
export function lintCriticalSignalRegistry(): LintFinding[] {
  const findings: LintFinding[] = [];
  const artifact = criticalSignals as CriticalSignalArtifactShape;
  const signalEntries = Object.entries(artifact.signals ?? {});
  const questionIds = new Set(
    (questionBankCanon as { questions: Array<{ id: string }> }).questions.map(q => q.id),
  );
  const seenSignalKeys = new Set<string>();
  if (signalEntries.length > INTAKE_PHASE1_MAX_CRITICAL_SIGNALS) {
    findings.push({
      code: 'CRITICAL_SIGNAL_PHASE1_CAP_EXCEEDED',
      severity: 'error',
      message:
        `Critical signal registry has ${signalEntries.length} keys; Phase-1 cap is ${INTAKE_PHASE1_MAX_CRITICAL_SIGNALS}.`,
    });
  }

  for (const [signalKey, def] of signalEntries) {
    if (seenSignalKeys.has(signalKey)) {
      findings.push({
        code: 'CRITICAL_SIGNAL_DUPLICATE_KEY',
        severity: 'error',
        message: `Critical signal key "${signalKey}" is duplicated in the artifact.`,
      });
      continue;
    }
    seenSignalKeys.add(signalKey);

    const policyEntry = INTAKE_CRITICAL_SIGNAL_REGISTRY_POLICY[signalKey];
    if (!policyEntry) {
      findings.push({
        code: 'CRITICAL_SIGNAL_POLICY_MISSING',
        severity: 'error',
        message: `Critical signal "${signalKey}" has no owner/threshold policy entry.`,
      });
    }

    if (!def.normalizerRef) {
      findings.push({
        code: 'CRITICAL_SIGNAL_NORMALIZER_MISSING',
        severity: 'error',
        message: `Critical signal "${signalKey}" must define normalizerRef.`,
      });
    }
    if (!def.sourcesByPriority?.length) {
      findings.push({
        code: 'CRITICAL_SIGNAL_SOURCES_PRIORITY_MISSING',
        severity: 'error',
        message: `Critical signal "${signalKey}" must define sourcesByPriority.`,
      });
    }
    if (!def.evidenceType) {
      findings.push({
        code: 'CRITICAL_SIGNAL_EVIDENCE_TYPE_MISSING',
        severity: 'error',
        message: `Critical signal "${signalKey}" must define evidenceType.`,
      });
    }
    if (!def.conflictResolutionRule) {
      findings.push({
        code: 'CRITICAL_SIGNAL_CONFLICT_RULE_MISSING',
        severity: 'error',
        message: `Critical signal "${signalKey}" must define conflictResolutionRule.`,
      });
    }
    if (!def.unknownHandlingRule) {
      findings.push({
        code: 'CRITICAL_SIGNAL_UNKNOWN_RULE_MISSING',
        severity: 'error',
        message: `Critical signal "${signalKey}" must define unknownHandlingRule.`,
      });
    }

    const seenBankIds = new Set<string>();
    for (const bankId of def.bankIds ?? []) {
      if (seenBankIds.has(bankId)) {
        findings.push({
          code: 'CRITICAL_SIGNAL_BANK_ID_DUPLICATE',
          severity: 'error',
          message: `Critical signal "${signalKey}" repeats bank id "${bankId}".`,
          detail: bankId,
        });
        continue;
      }
      seenBankIds.add(bankId);
      if (!questionIds.has(bankId)) {
        findings.push({
          code: 'CRITICAL_SIGNAL_BANK_ID_UNKNOWN',
          severity: 'error',
          message: `Critical signal "${signalKey}" references unknown bank id "${bankId}".`,
          detail: bankId,
        });
      }
    }
  }

  for (const policySignalKey of Object.keys(INTAKE_CRITICAL_SIGNAL_REGISTRY_POLICY)) {
    if (!seenSignalKeys.has(policySignalKey)) {
      findings.push({
        code: 'CRITICAL_SIGNAL_POLICY_ORPHAN',
        severity: 'error',
        message: `Policy entry "${policySignalKey}" has no matching critical-signal artifact key.`,
        detail: policySignalKey,
      });
    }
  }

  return findings;
}
