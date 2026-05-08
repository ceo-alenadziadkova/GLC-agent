import {
  ensureHttpsUrl,
  getPreBriefSubmitSlotIds,
  isPreBriefSubmitSlotSatisfied,
  readinessBadgeFromProgress,
} from '@glc/intake-core';
import type {
  AuditCoveragePackage,
  BriefResponseSource,
  DomainKey,
  IntakeBriefCollectionMode,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
} from '../../data/auditTypes';
import type { BriefResponses } from '../../data/briefQuestions';
import { countAnswered, pipelineRequiredIdsForProductMode } from '../../data/briefQuestions';
import { effectiveBriefForPipelineGates, briefResponsesToIntakeMap } from '../../data/intakeBriefMap';
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

/**
 * Public URL path: discovery (no site), client portal self-serve, or pre-brief slice for consultant
 * (aligns with `IntakeBankWizard` / `BankClassicBriefFields` on New Audit step 1).
 * After intelligence wording, `tailoredPhaseUnlocked` switches the consultant+URL path to the full bank
 * (planner follow-ups + specialized questions), not only `pre_brief.bankIncluded`.
 */
export function newAuditStep1CollectionMode(args: {
  noPublicWebsite: boolean;
  isClientSelfServe?: boolean;
  /** After LLM wording step (or equivalent): show full eligible bank for consultant + public URL. */
  tailoredPhaseUnlocked?: boolean;
}): IntakeBriefCollectionMode | undefined {
  if (args.noPublicWebsite) {
    if (args.tailoredPhaseUnlocked) {
      return args.isClientSelfServe ? 'self_serve' : 'discovery';
    }
    return 'pre_brief';
  }
  if (args.isClientSelfServe) return 'self_serve';
  if (args.tailoredPhaseUnlocked) return undefined;
  return 'pre_brief';
}

function useConsultantPreBriefSubmitPipelineGate(args: {
  noPublicWebsite: boolean;
  isClientSelfServe?: boolean;
  tailoredPhaseUnlocked?: boolean;
}): boolean {
  return newAuditStep1CollectionMode({
    noPublicWebsite: args.noPublicWebsite,
    isClientSelfServe: args.isClientSelfServe,
    tailoredPhaseUnlocked: args.tailoredPhaseUnlocked,
  }) === 'pre_brief';
}

export type PipelineGateBase = {
  responses: BriefResponses;
  noPublicWebsite: boolean;
  briefProductMode: 'express' | 'full';
  step0Basics?: NewAuditStep0BasicsForPipelineGates;
  /** `true` = client portal; `false`/omit = consultant (pre-brief submit gate when URL path). */
  isClientSelfServe?: boolean;
  intakeVersionTuple?: IntakeVersionTuple | null;
  /** Full-bank + full SLA gates after tailored / wording round (consultant + URL). */
  tailoredPhaseUnlocked?: boolean;
};

export type NewAuditStep0Input = {
  url: string;
  noPublicWebsite: boolean;
  name: string;
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
    && input.name.trim().length > 0
    && input.industry.trim().length > 0
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
export function listMissingPipelineRequiredIds(params: PipelineGateBase): string[] {
  const effectiveBriefForGates = effectiveBriefForNewAuditPipelineGates({
    responses: params.responses,
    noPublicWebsite: params.noPublicWebsite,
    step0Basics: params.step0Basics,
  });
  if (useConsultantPreBriefSubmitPipelineGate(params)) {
    const m = briefResponsesToIntakeMap(effectiveBriefForGates) as Record<string, unknown>;
    const slotIds = getPreBriefSubmitSlotIds(m, 'pre_brief', params.intakeVersionTuple ?? undefined);
    return slotIds.filter(id => !isPreBriefSubmitSlotSatisfied(id, m));
  }
  const bankCollectionModeForGates = newAuditStep1CollectionMode({
    noPublicWebsite: params.noPublicWebsite,
    isClientSelfServe: params.isClientSelfServe,
    tailoredPhaseUnlocked: params.tailoredPhaseUnlocked,
  });
  const pipelineRequiredIds = pipelineRequiredIdsForProductMode(
    params.briefProductMode,
    effectiveBriefForGates,
    bankCollectionModeForGates,
  );
  return pipelineRequiredIds.filter(id => countAnswered(effectiveBriefForGates, [id]) === 0);
}

/** Pipeline-required question IDs that already have an answer (stable order from `pipelineRequiredIdsForProductMode`). */
export function listAnsweredPipelineRequiredIds(params: PipelineGateBase): string[] {
  const effectiveBriefForGates = effectiveBriefForNewAuditPipelineGates({
    responses: params.responses,
    noPublicWebsite: params.noPublicWebsite,
    step0Basics: params.step0Basics,
  });
  if (useConsultantPreBriefSubmitPipelineGate(params)) {
    const m = briefResponsesToIntakeMap(effectiveBriefForGates) as Record<string, unknown>;
    const slotIds = getPreBriefSubmitSlotIds(m, 'pre_brief', params.intakeVersionTuple ?? undefined);
    return slotIds.filter(id => isPreBriefSubmitSlotSatisfied(id, m));
  }
  const bankCollectionModeForGates = newAuditStep1CollectionMode({
    noPublicWebsite: params.noPublicWebsite,
    isClientSelfServe: params.isClientSelfServe,
    tailoredPhaseUnlocked: params.tailoredPhaseUnlocked,
  });
  const pipelineRequiredIds = pipelineRequiredIdsForProductMode(
    params.briefProductMode,
    effectiveBriefForGates,
    bankCollectionModeForGates,
  );
  return pipelineRequiredIds.filter(id => countAnswered(effectiveBriefForGates, [id]) > 0);
}

export function computeNewAuditWizardProgress(params: PipelineGateBase): NewAuditWizardProgress {
  const effectiveBriefForGates = effectiveBriefForNewAuditPipelineGates({
    responses: params.responses,
    noPublicWebsite: params.noPublicWebsite,
    step0Basics: params.step0Basics,
  });
  if (useConsultantPreBriefSubmitPipelineGate(params)) {
    const m = briefResponsesToIntakeMap(effectiveBriefForGates) as Record<string, unknown>;
    const slotIds = getPreBriefSubmitSlotIds(m, 'pre_brief', params.intakeVersionTuple ?? undefined);
    const missing = slotIds.filter(id => !isPreBriefSubmitSlotSatisfied(id, m));
    const pipelineRequiredTotal = slotIds.length;
    const answeredRequired = pipelineRequiredTotal - missing.length;
    const step2Complete = missing.length === 0;
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

  const bankCollectionModeForGates = newAuditStep1CollectionMode({
    noPublicWebsite: params.noPublicWebsite,
    isClientSelfServe: params.isClientSelfServe,
    tailoredPhaseUnlocked: params.tailoredPhaseUnlocked,
  });
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

