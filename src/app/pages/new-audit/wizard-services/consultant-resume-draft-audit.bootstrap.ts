import type { DomainKey } from '@glc/intake-core';
import type { AuditCoveragePackage, IntakeVersionTuple } from '../../../data/auditTypes';
import { INTAKE_BRIEF_SLA_PRODUCT_MODE } from '../../../data/auditTypes';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import { normalizeIntakeToResponses } from '../../../data/intakeBriefMap';
import type { BriefResponses } from '../../../data/briefQuestions';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { NEW_AUDIT_ALL_COVERAGE_DOMAINS } from '../../../config/new-audit-coverage-policy';
import { unwrapBriefString } from '../../../lib/new-audit-helpers';
import {
  computeNewAuditWizardProgress,
  validateNewAuditStep0Input,
} from '../newAuditValidation';
import { resolveResponseSource } from './response-source.resolver';
import type { BriefLayoutChoice } from '../wizard-state/useBriefLayoutState';

export type ConsultantResumeDraftAuditBootstrap = {
  draftAuditId: string;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  responses: BriefResponses;
  draftIntakeVersions: IntakeVersionTuple | null;
  coveragePackage: AuditCoveragePackage;
  selectedDomains: DomainKey[];
  briefTailoredPhaseUnlocked: boolean;
  briefLayoutChoice: BriefLayoutChoice;
  interviewMode: boolean;
  step: 0 | 1 | 2 | 3;
  basicsSubStep: 0 | 1;
};

/** Derives New Audit wizard snapshot for a consultant `created` audit (pipeline not started). */
export function bootstrapConsultantNewAuditWizardFromAuditState(params: {
  audit: AuditState;
  resolvedBriefLayout: BriefLayoutChoice;
}): ConsultantResumeDraftAuditBootstrap {
  const { audit } = params;
  const meta = audit.meta;
  const rawBrief = audit.brief;
  const nw = Boolean(meta.no_public_website);
  const responses: BriefResponses = rawBrief?.responses
    ? normalizeIntakeToResponses(rawBrief.responses as Record<string, unknown>)
    : {};

  const industrySpecify = unwrapBriefString(responses, 'intake_industry_specify') ?? '';

  const ep = meta.execution_plan;
  const coveragePackage: AuditCoveragePackage =
    ep?.coverage_package === 'starter' || ep?.coverage_package === 'pro' || ep?.coverage_package === 'complete'
      ? ep.coverage_package
      : 'complete';

  let selectedDomains: DomainKey[];
  if (coveragePackage === 'complete') {
    selectedDomains = [...NEW_AUDIT_ALL_COVERAGE_DOMAINS];
  } else if (ep?.selected_domains && ep.selected_domains.length > 0) {
    selectedDomains = [...ep.selected_domains];
  } else {
    selectedDomains = [...NEW_AUDIT_ALL_COVERAGE_DOMAINS];
  }

  const collectionMode = rawBrief?.collection_mode;
  const interviewMode = rawBrief?.collected_by === 'consultant';
  const answerSource = resolveResponseSource({ isClientSelfServe: false, interviewMode });

  const briefTailoredPhaseUnlocked =
    !nw && typeof collectionMode === 'string' && collectionMode !== 'pre_brief';

  const briefProductMode = INTAKE_BRIEF_SLA_PRODUCT_MODE as 'express' | 'full';
  const step0Basics = {
    url: meta.company_url ?? '',
    name: meta.company_name ?? '',
    industry: meta.industry ?? '',
    industrySpecify,
    answerSource,
  };

  const basics = validateNewAuditStep0Input({
    url: step0Basics.url,
    noPublicWebsite: nw,
    name: step0Basics.name,
    industry: step0Basics.industry,
    industrySpecify: step0Basics.industrySpecify,
    selectedDomains,
    coveragePackage,
  });

  let step: 0 | 1 | 2 | 3 = 0;
  let basicsSubStep: 0 | 1 = 0;

  if (!basics.step0Valid) {
    step = 0;
    basicsSubStep = 0;
  } else {
    const tailoredForProgress =
      briefTailoredPhaseUnlocked || !APP_FEATURE_FLAGS.newAuditIntelligenceSnapshotStepEnabled;
    const progress = computeNewAuditWizardProgress({
      responses,
      noPublicWebsite: nw,
      briefProductMode,
      step0Basics,
      isClientSelfServe: false,
      intakeVersionTuple: rawBrief?.intake_versions ?? null,
      tailoredPhaseUnlocked: tailoredForProgress,
    });
    step = progress.step2Complete ? 2 : 1;
  }

  return {
    draftAuditId: meta.id,
    url: step0Basics.url,
    noPublicWebsite: nw,
    name: step0Basics.name,
    industry: step0Basics.industry,
    industrySpecify,
    responses,
    draftIntakeVersions: rawBrief?.intake_versions ?? null,
    coveragePackage,
    selectedDomains,
    briefTailoredPhaseUnlocked,
    briefLayoutChoice: params.resolvedBriefLayout,
    interviewMode,
    step,
    basicsSubStep,
  };
}
