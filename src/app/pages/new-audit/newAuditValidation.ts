import { ensureHttpsUrl, readinessBadgeFromProgress } from '@glc/intake-core';
import type {
  AuditCoveragePackage,
  BriefResponseSource,
  DomainKey,
  IntakeNextBestAction,
  IntakeReadinessBadge,
} from '../../data/auditTypes';
import type { BriefResponses } from '../../data/briefQuestions';
import { countAnswered, pipelineRequiredIdsForProductMode } from '../../data/briefQuestions';
import { effectiveBriefForPipelineGates } from '../../data/intakeBriefMap';
import { NEW_AUDIT_COVERAGE_SELECTION_LIMITS } from '../../config/new-audit-coverage-policy';
import { buildStep0IntakePatch } from '../../lib/new-audit-helpers';

/** Step 0 Basics merged into pipeline gate previews (matches save/launch `buildStep0IntakePatch`). */
export type NewAuditStep0BasicsForPipelineGates = {
  url: string;
  name: string;
  industry: string;
  industrySpecify: string;
  answerSource: BriefResponseSource;
};

/** Merged brief used for pipeline gates (Step 0 patch + responses); same basis as progress and missing-id lists. */
export function effectiveBriefForNewAuditPipelineGates(params: {
  responses: BriefResponses;
  noPublicWebsite: boolean;
  step0Basics?: NewAuditStep0BasicsForPipelineGates;
}): BriefResponses {
  const base = effectiveBriefForPipelineGates(params.responses);
  if (!params.step0Basics) return base;
  const patch = buildStep0IntakePatch(
    params.step0Basics.name,
    params.step0Basics.industry,
    params.step0Basics.industrySpecify,
    params.step0Basics.url,
    params.noPublicWebsite,
    params.step0Basics.answerSource,
  );
  return { ...patch, ...base };
}

export type NewAuditStep0Input = {
  url: string;
  noPublicWebsite: boolean;
  industry: string;
  industrySpecify: string;
  selectedDomains: DomainKey[];
  /** `null` = client has not chosen a package yet (portal self-serve only). */
  coveragePackage: AuditCoveragePackage | null;
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

  if (input.coveragePackage == null) {
    return { step1Valid, coverageValid: false, step0Valid: false };
  }

  const limits = NEW_AUDIT_COVERAGE_SELECTION_LIMITS[input.coveragePackage];
  const coverageValid = input.selectedDomains.length >= limits.min && input.selectedDomains.length <= limits.max;

  const step0Valid = step1Valid && coverageValid;
  return { step1Valid, coverageValid, step0Valid };
}

/** Pipeline-required question IDs not yet answered (same gating as `computeNewAuditWizardProgress`). */
export function listMissingPipelineRequiredIds(params: {
  responses: BriefResponses;
  noPublicWebsite: boolean;
  briefProductMode: 'express' | 'full';
  step0Basics?: NewAuditStep0BasicsForPipelineGates;
}): string[] {
  const effectiveBriefForGates = effectiveBriefForNewAuditPipelineGates({
    responses: params.responses,
    noPublicWebsite: params.noPublicWebsite,
    step0Basics: params.step0Basics,
  });
  const bankCollectionModeForGates = params.noPublicWebsite ? 'discovery' : undefined;
  const pipelineRequiredIds = pipelineRequiredIdsForProductMode(
    params.briefProductMode,
    effectiveBriefForGates,
    bankCollectionModeForGates,
  );
  return pipelineRequiredIds.filter(id => countAnswered(effectiveBriefForGates, [id]) === 0);
}

/** Pipeline-required question IDs that already have an answer (stable order from `pipelineRequiredIdsForProductMode`). */
export function listAnsweredPipelineRequiredIds(params: {
  responses: BriefResponses;
  noPublicWebsite: boolean;
  briefProductMode: 'express' | 'full';
  step0Basics?: NewAuditStep0BasicsForPipelineGates;
}): string[] {
  const effectiveBriefForGates = effectiveBriefForNewAuditPipelineGates({
    responses: params.responses,
    noPublicWebsite: params.noPublicWebsite,
    step0Basics: params.step0Basics,
  });
  const bankCollectionModeForGates = params.noPublicWebsite ? 'discovery' : undefined;
  const pipelineRequiredIds = pipelineRequiredIdsForProductMode(
    params.briefProductMode,
    effectiveBriefForGates,
    bankCollectionModeForGates,
  );
  return pipelineRequiredIds.filter(id => countAnswered(effectiveBriefForGates, [id]) > 0);
}

export function computeNewAuditWizardProgress(params: {
  responses: BriefResponses;
  noPublicWebsite: boolean;
  briefProductMode: 'express' | 'full';
  step0Basics?: NewAuditStep0BasicsForPipelineGates;
}): NewAuditWizardProgress {
  const effectiveBriefForGates = effectiveBriefForNewAuditPipelineGates({
    responses: params.responses,
    noPublicWebsite: params.noPublicWebsite,
    step0Basics: params.step0Basics,
  });
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

