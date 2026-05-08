import type { DomainKey, DomainResult } from '../../../types/audit.js';
import type { FactCheckResult, FactCorrection } from '../types.js';
import { calculateConfidence } from './confidence.js';
import { applyCorrections } from './apply-corrections.js';
import { checkScoreConsistency } from './score-consistency.js';
import { checkSecurity } from './domain-checks/security-check.js';
import { checkSeo } from './domain-checks/seo-check.js';
import { checkTech } from './domain-checks/tech-check.js';
import { checkUx } from './domain-checks/ux-check.js';
import { checkMarketing } from './domain-checks/marketing-check.js';
import { checkAutomation } from './domain-checks/automation-check.js';

export type DomainCollectorCheck = (
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
) => void;

const domainCollectorChecks: Partial<Record<DomainKey, DomainCollectorCheck>> = {
  security_compliance: (result, collected, corrections) => checkSecurity(result, collected, corrections),
  seo_digital: (result, collected, corrections) => checkSeo(result, collected, corrections),
  tech_infrastructure: (result, collected, corrections) => checkTech(result, collected, corrections),
  ux_conversion: (result, collected, corrections) => checkUx(result, collected, corrections),
  marketing_utp: (result, collected, corrections) => checkMarketing(result, collected, corrections),
  automation_processes: (result, collected, corrections) => checkAutomation(result, collected, corrections),
};

function normalizeFindingStatus(
  issue: DomainResult['issues'][number],
): 'confirmed' | 'unverified' | 'not_assessed' {
  if (issue.status === 'confirmed' || issue.status === 'unverified' || issue.status === 'not_assessed') {
    return issue.status;
  }
  if (!Array.isArray(issue.evidence_refs) || issue.evidence_refs.length === 0) {
    return 'not_assessed';
  }
  if (issue.confidence === 'low' || issue.data_source === 'inferred') {
    return 'unverified';
  }
  return 'confirmed';
}

function normalizeVerificationMethod(
  issue: DomainResult['issues'][number],
  status: 'confirmed' | 'unverified' | 'not_assessed',
): 'single_source' | 'multi_source' | 'heuristic' | 'manual_review' | 'not_assessed' {
  if (issue.verification_method) {
    return issue.verification_method;
  }
  if (status === 'not_assessed') {
    return 'not_assessed';
  }
  if (issue.data_source === 'inferred') {
    return 'heuristic';
  }
  return issue.evidence_refs.length >= 2 ? 'multi_source' : 'single_source';
}

function enforceIssueReliability(result: DomainResult): DomainResult {
  const issues = result.issues.map((issue) => {
    const status = normalizeFindingStatus(issue);
    const verificationMethod = normalizeVerificationMethod(issue, status);
    const severity =
      status !== 'confirmed' && (issue.severity === 'critical' || issue.severity === 'high')
        ? 'medium'
        : issue.severity;
    return {
      ...issue,
      status,
      verification_method: verificationMethod,
      severity,
    };
  });
  return {
    ...result,
    issues,
  };
}

function enforceRecommendationGuardrails(result: DomainResult): DomainResult {
  const recommendations = result.recommendations.map((recommendation) => {
    const impact = recommendation.impact ?? '';
    const hasPercent = /\b\d{1,3}\s*-\s*\d{1,3}%|\b\d{1,3}%/.test(impact);
    const hasSourceCue = /\b(source|benchmark|industry|study)\b/i.test(impact);
    const status =
      recommendation.status ??
      ((recommendation.evidence_refs?.length ?? 0) > 0
        ? recommendation.data_source === 'inferred'
          ? 'unverified'
          : 'confirmed'
        : 'not_assessed');
    const verificationMethod =
      recommendation.verification_method ??
      (status === 'not_assessed'
        ? 'not_assessed'
        : recommendation.data_source === 'inferred'
          ? 'heuristic'
          : (recommendation.evidence_refs?.length ?? 0) >= 2
            ? 'multi_source'
            : 'single_source');

    const normalizedRecommendation = {
      ...recommendation,
      status,
      verification_method: verificationMethod,
    };
    if (!hasPercent || hasSourceCue) {
      return normalizedRecommendation;
    }
    return {
      ...normalizedRecommendation,
      impact: 'Expected measurable improvement in performance and user outcomes (requires baseline benchmarking).',
    };
  });
  return {
    ...result,
    recommendations,
  };
}

function enforceCollectorConflicts(
  result: DomainResult,
  collectedData: Record<string, Record<string, unknown>>,
): DomainResult {
  const security = collectedData['security_headers'];
  const ux = collectedData['ux_signals'];
  if (!security && !ux) return result;

  const ssl = security?.ssl as
    | { valid?: boolean; verification_status?: 'confirmed' | 'unverified' | 'not_assessed' }
    | undefined;
  const viewport = ux?.viewport_meta_present as boolean | undefined;
  const viewportStatus = ux?.viewport_assessment_status as 'confirmed' | 'unverified' | 'not_assessed' | undefined;

  const issues = result.issues.map((issue) => {
    const issueText = `${issue.title} ${issue.description ?? ''}`.toLowerCase();
    let next = { ...issue };
    if (
      ssl?.verification_status === 'confirmed' &&
      ssl.valid === true &&
      issueText.includes('invalid ssl')
    ) {
      next = {
        ...next,
        status: 'unverified',
        verification_method: 'manual_review',
        severity: 'medium',
      };
    }
    if (
      viewportStatus === 'confirmed' &&
      viewport === true &&
      issueText.includes('no viewport meta')
    ) {
      next = {
        ...next,
        status: 'unverified',
        verification_method: 'manual_review',
        severity: 'medium',
      };
    }
    return next;
  });

  return {
    ...result,
    issues,
  };
}

export function verifyKernel(args: {
  result: DomainResult;
  domainKey: DomainKey;
  collectedData: Record<string, Record<string, unknown>>;
}): FactCheckResult {
  const corrections: FactCorrection[] = [];

  const domainHook = domainCollectorChecks[args.domainKey];
  if (domainHook) {
    domainHook(args.result, args.collectedData, corrections);
  }

  // General checks
  checkScoreConsistency(args.result, corrections);

  // Calculate confidence before applying corrections (confidence should reflect original finding confidences)
  const confidence = calculateConfidence(args.result, corrections);

  const corrected = applyCorrections(args.result, corrections);
  const conflictResolved = enforceCollectorConflicts(corrected, args.collectedData);
  const guardedRecommendations = enforceRecommendationGuardrails(conflictResolved);
  return {
    result: enforceIssueReliability(guardedRecommendations),
    corrections,
    confidence,
  };
}

