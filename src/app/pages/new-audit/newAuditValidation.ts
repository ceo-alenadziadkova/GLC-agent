import { ensureHttpsUrl, readinessBadgeFromProgress } from '@glc/intake-core';
import type { IntakeNextBestAction, IntakeReadinessBadge } from '../../data/auditTypes';
import type { AuditCoveragePackage, DomainKey } from '../../data/auditTypes';
import type { BriefResponses } from '../../data/briefQuestions';
import { countAnswered, pipelineRequiredIdsForProductMode } from '../../data/briefQuestions';
import { effectiveBriefForPipelineGates } from '../../data/intakeBriefMap';
import { NEW_AUDIT_COVERAGE_SELECTION_LIMITS } from '../../config/new-audit-coverage-policy';

export type NewAuditStep0Input = {
  url: string;
  noPublicWebsite: boolean;
  industry: string;
  industrySpecify: string;
  selectedDomains: DomainKey[];
  coveragePackage: AuditCoveragePackage;
};

export type NewAuditWizardProgress = {
  answeredRequired: number;
  pipelineRequiredTotal: number;
  step2Complete: boolean;
  progressPct: number;
  readinessBadge: IntakeReadinessBadge;
  nextBestAction: IntakeNextBestAction;
};

export function isValidUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const prefixed = ensureHttpsUrl(trimmed);
    return new URL(prefixed).hostname.includes('.');
  } catch {
    return false;
  }
}

export function validateNewAuditStep0Input(input: NewAuditStep0Input): {
  step1Valid: boolean;
  coverageValid: boolean;
  step0Valid: boolean;
} {
  const step1Valid =
    (input.noPublicWebsite || isValidUrl(input.url))
    && (input.industry !== 'Other' || input.industrySpecify.trim().length > 0);

  const limits = NEW_AUDIT_COVERAGE_SELECTION_LIMITS[input.coveragePackage];
  const coverageValid = input.selectedDomains.length >= limits.min && input.selectedDomains.length <= limits.max;

  const step0Valid = step1Valid && coverageValid;
  return { step1Valid, coverageValid, step0Valid };
}

export function computeNewAuditWizardProgress(params: {
  responses: BriefResponses;
  noPublicWebsite: boolean;
  briefProductMode: 'express' | 'full';
}): NewAuditWizardProgress {
  const effectiveBriefForGates = effectiveBriefForPipelineGates(params.responses);
  const bankCollectionModeForGates = params.noPublicWebsite ? 'discovery' : undefined;

  const pipelineRequiredIds = pipelineRequiredIdsForProductMode(
    params.briefProductMode,
    effectiveBriefForGates,
    bankCollectionModeForGates,
  );

  const pipelineRequiredTotal = pipelineRequiredIds.length;
  const answeredRequired = countAnswered(effectiveBriefForGates, pipelineRequiredIds);
  const step2Complete = answeredRequired === pipelineRequiredTotal;

  const progressPct = pipelineRequiredTotal === 0
    ? 100
    : Math.min(100, Math.round((answeredRequired / pipelineRequiredTotal) * 100));

  const readinessBadge = readinessBadgeFromProgress(progressPct);
  const nextBestAction: IntakeNextBestAction = step2Complete ? 'add_recommended' : 'complete_required';

  return {
    answeredRequired,
    pipelineRequiredTotal,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
  };
}

