import { useMemo } from 'react';
import type { AuditCoveragePackage, BriefResponseSource, DomainKey, IntakeVersionTuple } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import {
  computeNewAuditWizardProgress,
  effectiveBriefForNewAuditPipelineGates,
  listAnsweredPipelineRequiredIds,
  validateNewAuditStep0Input,
} from '../newAuditValidation';

export function useWizardValidationProgress(params: {
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  selectedDomains: DomainKey[];
  coveragePackage: AuditCoveragePackage | null;
  responses: BriefResponses;
  briefProductMode: 'express' | 'full';
  responseSource: BriefResponseSource;
  isClientSelfServe: boolean;
  draftIntakeVersions: IntakeVersionTuple | null;
  briefTailoredFollowUpUnlocked: boolean;
}) {
  const { step0Valid, coverageValid } = useMemo(
    () =>
      validateNewAuditStep0Input({
        url: params.url,
        noPublicWebsite: params.noPublicWebsite,
        name: params.name,
        industry: params.industry,
        industrySpecify: params.industrySpecify,
        selectedDomains: params.selectedDomains,
        coveragePackage: params.coveragePackage,
      }),
    [
      params.url,
      params.noPublicWebsite,
      params.name,
      params.industry,
      params.industrySpecify,
      params.selectedDomains,
      params.coveragePackage,
    ],
  );

  const progress = useMemo(
    () =>
      computeNewAuditWizardProgress({
        responses: params.responses,
        noPublicWebsite: params.noPublicWebsite,
        briefProductMode: params.briefProductMode,
        step0Basics: {
          url: params.url,
          name: params.name,
          industry: params.industry,
          industrySpecify: params.industrySpecify,
          answerSource: params.responseSource,
        },
        isClientSelfServe: params.isClientSelfServe,
        intakeVersionTuple: params.draftIntakeVersions,
        tailoredPhaseUnlocked: params.briefTailoredFollowUpUnlocked,
      }),
    [
      params.responses,
      params.noPublicWebsite,
      params.briefProductMode,
      params.url,
      params.name,
      params.industry,
      params.industrySpecify,
      params.responseSource,
      params.isClientSelfServe,
      params.draftIntakeVersions,
      params.briefTailoredFollowUpUnlocked,
    ],
  );

  const answeredPipelineRequiredIds = useMemo(
    () =>
      listAnsweredPipelineRequiredIds({
        responses: params.responses,
        noPublicWebsite: params.noPublicWebsite,
        briefProductMode: params.briefProductMode,
        step0Basics: {
          url: params.url,
          name: params.name,
          industry: params.industry,
          industrySpecify: params.industrySpecify,
          answerSource: params.responseSource,
        },
        isClientSelfServe: params.isClientSelfServe,
        intakeVersionTuple: params.draftIntakeVersions,
        tailoredPhaseUnlocked: params.briefTailoredFollowUpUnlocked,
      }),
    [
      params.responses,
      params.noPublicWebsite,
      params.briefProductMode,
      params.url,
      params.name,
      params.industry,
      params.industrySpecify,
      params.responseSource,
      params.isClientSelfServe,
      params.draftIntakeVersions,
      params.briefTailoredFollowUpUnlocked,
    ],
  );

  const pipelineGateBriefResponses = useMemo(
    () =>
      effectiveBriefForNewAuditPipelineGates({
        responses: params.responses,
        noPublicWebsite: params.noPublicWebsite,
        step0Basics: {
          url: params.url,
          name: params.name,
          industry: params.industry,
          industrySpecify: params.industrySpecify,
          answerSource: params.responseSource,
        },
      }),
    [
      params.responses,
      params.noPublicWebsite,
      params.url,
      params.name,
      params.industry,
      params.industrySpecify,
      params.responseSource,
    ],
  );

  return {
    step0Valid,
    coverageValid,
    answeredPipelineRequiredIds,
    pipelineGateBriefResponses,
    ...progress,
  };
}
