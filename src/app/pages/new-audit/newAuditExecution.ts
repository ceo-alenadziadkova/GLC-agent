import type { FormEvent } from 'react';
import { api, ApiError } from '../../data/apiService';
import { mergeBriefResponsesPreferFilled, type BriefResponses } from '../../data/briefQuestions';
import { normalizeIntakeToResponses } from '../../data/intakeBriefMap';
import type {
  BriefResponseSource,
  AuditDepth,
  AuditCoveragePackage,
  DomainKey,
  IntakeVersionTuple,
} from '../../data/auditTypes';
import { WORKSPACE_PAGE_COPY } from '../../config/workspace-page-copy';
import { buildStep0IntakePatch, isSelfServeOwnerConfigApiError } from '../../lib/new-audit-helpers';
import { logger } from '../../lib/logger';
import { getGlcQueryClient } from '../../lib/glc-query-client';
import { invalidateAuditRelatedQueries, invalidateAuditsListsAndDashboard } from '../../lib/glc-invalidate-queries';
import {
  clearClientPortalNewAuditDraft,
  clearConsultantNewAuditDraft,
  type NewAuditDraftV1,
  writeClientPortalNewAuditDraft,
  writeConsultantNewAuditDraft,
} from '../../lib/client-portal-new-audit-draft';

export type NewAuditExecutionPlan = {
  selected_domains: DomainKey[];
  depth: AuditDepth;
  source?: 'user_selected' | 'system_default';
  recommended_domains?: DomainKey[];
  coverage_package?: AuditCoveragePackage;
  include_strategy?: boolean;
};

export type NewAuditBriefLayoutChoice = 'unset' | 'classic' | 'wizard';

export type SaveNewAuditBriefToServerParams = {
  auditId: string;
  isClientSelfServe: boolean;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  responses: BriefResponses;
  briefLayoutChoice: NewAuditBriefLayoutChoice;
  preBriefToken: string | null;
  intakeTokenFromUrl: string;
  /** When the token merge path does not run, use wizard draft versions. */
  draftIntakeVersions: IntakeVersionTuple | null;
};

/**
 * Persists merged step-0 + bank responses for New Audit (consultant and portal), including optional token link merge.
 * Call before `POST /brief/intelligence-snapshot` so the server reads a fresh `intake_brief` row.
 */
export async function saveNewAuditBriefToServer(
  params: SaveNewAuditBriefToServerParams,
): Promise<IntakeVersionTuple | null> {
  const basicsSource: BriefResponseSource = params.isClientSelfServe ? 'client' : 'consultant';
  const localWithBasics: BriefResponses = {
    ...params.responses,
    ...buildStep0IntakePatch(
      params.name,
      params.industry,
      params.industrySpecify,
      params.url,
      params.noPublicWebsite,
      basicsSource,
    ),
  };
  if (params.industry !== 'Other') {
    delete localWithBasics.intake_industry_specify;
  }
  const tokenCandidates = params.isClientSelfServe
    ? ([] as string[])
    : ([...new Set([params.preBriefToken, params.intakeTokenFromUrl].filter(Boolean))] as string[]);

  for (const t of tokenCandidates) {
    try {
      await api.linkIntakeTokenToAudit(t, params.auditId);
    } catch (linkErr) {
      logger.warn('[NewAudit] linkIntakeTokenToAudit failed (non-fatal)', {
        error: linkErr instanceof Error ? linkErr.message : String(linkErr),
      });
    }
  }

  let mergedForSave = localWithBasics;
  let intakeVersionsForSave: IntakeVersionTuple | undefined = params.draftIntakeVersions ?? undefined;
  if (tokenCandidates.length > 0) {
    try {
      const { brief } = await api.getBrief(params.auditId);
      const fromServer = normalizeIntakeToResponses(
        (brief?.responses as Record<string, unknown>) ?? {},
      );
      mergedForSave = mergeBriefResponsesPreferFilled(fromServer, localWithBasics);
      intakeVersionsForSave = brief?.intake_versions ?? undefined;
    } catch (mergeErr) {
      logger.warn('[NewAudit] getBrief merge failed (non-fatal)', {
        error: mergeErr instanceof Error ? mergeErr.message : String(mergeErr),
      });
    }
  }

  try {
    const savePayload = await api.saveBrief(params.auditId, mergedForSave, {
      collection_mode:
        params.noPublicWebsite && params.briefLayoutChoice === 'wizard' ? 'discovery' : undefined,
      intake_versions: intakeVersionsForSave,
    });
    return savePayload.brief.intake_versions ?? null;
  } catch (briefErr) {
    logger.warn('[NewAudit] Brief save failed (non-fatal)', {
      error: briefErr instanceof Error ? briefErr.message : String(briefErr),
    });
  }
  return null;
}

export type SaveClientDraftParams = {
  isClientSelfServe: boolean;
  step0Valid: boolean;
  step: 0 | 1 | 2 | 3;

  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  productMode: 'express' | 'full';

  responses: BriefResponses;
  briefLayoutChoice: NewAuditBriefLayoutChoice;

  coveragePackage: AuditCoveragePackage | null;
  selectedDomains: DomainKey[];
  executionPlan: NewAuditExecutionPlan | null;
  draftAuditId: string | null;
  draftIntakeVersions: IntakeVersionTuple | null | undefined;

  setDraftAuditId: (id: string | null) => void;
  setDraftIntakeVersions: (v: IntakeVersionTuple | null) => void;
  setDraftNotice: (v: string | null) => void;
  setDraftError: (v: string | null) => void;
  setDraftSaving: (v: boolean) => void;
};

function newAuditDraftPayloadFromSaveParams(
  params: Pick<
    SaveClientDraftParams,
    | 'step'
    | 'url'
    | 'noPublicWebsite'
    | 'name'
    | 'industry'
    | 'industrySpecify'
    | 'productMode'
    | 'responses'
    | 'briefLayoutChoice'
    | 'draftAuditId'
    | 'draftIntakeVersions'
    | 'coveragePackage'
    | 'selectedDomains'
  >,
): NewAuditDraftV1 {
  return {
    v: 1,
    step: params.step,
    url: params.url,
    noPublicWebsite: params.noPublicWebsite,
    name: params.name,
    industry: params.industry,
    industrySpecify: params.industrySpecify,
    productMode: params.productMode,
    responses: params.responses,
    briefLayoutChoice: params.briefLayoutChoice,
    draftAuditId: params.draftAuditId,
    draftIntakeVersions: params.draftIntakeVersions,
    ...(params.coveragePackage != null
      ? { coveragePackage: params.coveragePackage, selectedDomains: params.selectedDomains }
      : {}),
  };
}

export async function saveClientDraft(params: SaveClientDraftParams): Promise<void> {
  params.setDraftError(null);
  params.setDraftNotice(null);
  params.setDraftSaving(true);

  try {
    const persistLocalDraft = newAuditDraftPayloadFromSaveParams(params);
    if (params.isClientSelfServe) {
      writeClientPortalNewAuditDraft(persistLocalDraft);
    } else {
      writeConsultantNewAuditDraft(persistLocalDraft);
    }

    if (!params.step0Valid) {
      params.setDraftNotice(
        params.isClientSelfServe
          ? WORKSPACE_PAGE_COPY.newAudit.draftNoticeIncomplete
          : WORKSPACE_PAGE_COPY.newAudit.draftNoticeIncompleteConsultant,
      );
      return;
    }

    let auditId = params.draftAuditId;
    if (!auditId) {
      const plan = params.executionPlan;
      if (!plan) {
        params.setDraftError(WORKSPACE_PAGE_COPY.newAudit.draftNeedsCoveragePackage);
        return;
      }
      const created = await api.createAudit(
        params.url,
        params.name || undefined,
        params.industry || undefined,
        params.productMode,
        {
          noPublicWebsite: params.noPublicWebsite,
          executionPlan: plan,
        },
      );
      auditId = created.id;
      params.setDraftAuditId(auditId);
    }

    const basicsSource: BriefResponseSource = params.isClientSelfServe ? 'client' : 'consultant';
    const localWithBasics: BriefResponses = {
      ...params.responses,
      ...buildStep0IntakePatch(
        params.name,
        params.industry,
        params.industrySpecify,
        params.url,
        params.noPublicWebsite,
        basicsSource,
      ),
    };

    if (params.industry !== 'Other') {
      delete localWithBasics.intake_industry_specify;
    }

    const savePayload = await api.saveBrief(auditId, localWithBasics, {
      collection_mode:
        params.noPublicWebsite && params.briefLayoutChoice === 'wizard' ? 'discovery' : undefined,
    });

    params.setDraftIntakeVersions(savePayload.brief.intake_versions ?? null);

    const afterServerPayload = newAuditDraftPayloadFromSaveParams({
      ...params,
      draftAuditId: auditId,
      draftIntakeVersions: savePayload.brief.intake_versions ?? null,
    });
    if (params.isClientSelfServe) {
      writeClientPortalNewAuditDraft(afterServerPayload);
    } else {
      writeConsultantNewAuditDraft(afterServerPayload);
    }

    params.setDraftNotice(
      params.isClientSelfServe
        ? WORKSPACE_PAGE_COPY.newAudit.draftSavedAccountAndBrowser
        : WORKSPACE_PAGE_COPY.newAudit.draftSavedAccountAndBrowserConsultant,
    );
  } catch (err) {
    if (isSelfServeOwnerConfigApiError(err)) {
      params.setDraftNotice(WORKSPACE_PAGE_COPY.newAudit.draftSavedLocalSyncFailed);
    } else {
      params.setDraftError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  } finally {
    params.setDraftSaving(false);
  }
}

export type LaunchNewAuditParams = {
  isClientSelfServe: boolean;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  productMode: 'express' | 'full';

  responses: BriefResponses;
  briefLayoutChoice: NewAuditBriefLayoutChoice;

  executionPlan: NewAuditExecutionPlan;
  draftAuditId: string | null;

  preBriefToken: string | null;
  intakeTokenFromUrl: string;

  setError: (v: string | null) => void;
  setLoading: (v: boolean) => void;
  navigate: (path: string) => void;
  setPreBriefToken: (v: string | null) => void;
  setDraftIntakeVersions: (v: IntakeVersionTuple | null) => void;
};

export async function launchNewAudit(e: FormEvent, params: LaunchNewAuditParams): Promise<void> {
  e.preventDefault();
  params.setError(null);
  params.setLoading(true);

  try {
    // 1. Create audit (or reuse draft from New Audit step 0 / client portal)
    let auditId: string;
    if (params.draftAuditId) {
      auditId = params.draftAuditId;
    } else {
      const audit = await api.createAudit(
        params.url,
        params.name || undefined,
        params.industry || undefined,
        params.productMode,
        {
          noPublicWebsite: params.noPublicWebsite,
          executionPlan: params.executionPlan,
        },
      );
      auditId = audit.id;
    }

    await saveNewAuditBriefToServer({
      auditId,
      isClientSelfServe: params.isClientSelfServe,
      url: params.url,
      noPublicWebsite: params.noPublicWebsite,
      name: params.name,
      industry: params.industry,
      industrySpecify: params.industrySpecify,
      responses: params.responses,
      briefLayoutChoice: params.briefLayoutChoice,
      preBriefToken: params.preBriefToken,
      intakeTokenFromUrl: params.intakeTokenFromUrl,
      draftIntakeVersions: null,
    });

    await api.startPipeline(auditId);

    const qc = getGlcQueryClient();
    invalidateAuditRelatedQueries(qc, auditId);
    invalidateAuditsListsAndDashboard(qc);
    params.setPreBriefToken(null);

    if (params.isClientSelfServe) {
      clearClientPortalNewAuditDraft();
    } else {
      clearConsultantNewAuditDraft();
    }
    params.setDraftIntakeVersions(null);

    params.navigate(params.isClientSelfServe ? `/portal/pipeline/${auditId}` : `/pipeline/${auditId}`);
  } catch (err) {
    if (params.isClientSelfServe && isSelfServeOwnerConfigApiError(err)) {
      params.setError(WORKSPACE_PAGE_COPY.newAudit.startAuditFailed);
    } else {
      params.setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
    params.setLoading(false);
  }
}

