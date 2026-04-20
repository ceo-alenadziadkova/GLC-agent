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
  writeClientPortalNewAuditDraft,
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

export type SaveClientDraftParams = {
  isClientSelfServe: boolean;
  step0Valid: boolean;
  step: 0 | 1 | 2;

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

export async function saveClientDraft(params: SaveClientDraftParams): Promise<void> {
  if (!params.isClientSelfServe) return;

  params.setDraftError(null);
  params.setDraftNotice(null);
  params.setDraftSaving(true);

  try {
    writeClientPortalNewAuditDraft({
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
    });

    if (!params.step0Valid) {
      params.setDraftNotice(WORKSPACE_PAGE_COPY.newAudit.draftNoticeIncomplete);
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

    const basicsSource: BriefResponseSource = 'client';
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

    writeClientPortalNewAuditDraft({
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
      draftAuditId: auditId,
      draftIntakeVersions: savePayload.brief.intake_versions ?? null,
      ...(params.coveragePackage != null
        ? { coveragePackage: params.coveragePackage, selectedDomains: params.selectedDomains }
        : {}),
    });

    params.setDraftNotice(WORKSPACE_PAGE_COPY.newAudit.draftSavedAccountAndBrowser);
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

    // 1. Create audit (or reuse client draft saved earlier)
    let auditId: string;
    if (params.isClientSelfServe && params.draftAuditId) {
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

    // 2. Link any pre-brief tokens (modal link or ?intake= URL) so client answers merge into intake_brief
    const tokenCandidates = params.isClientSelfServe
      ? ([] as string[])
      : ([...new Set([params.preBriefToken, params.intakeTokenFromUrl].filter(Boolean))] as string[]);

    for (const t of tokenCandidates) {
      try {
        await api.linkIntakeTokenToAudit(t, auditId);
      } catch (linkErr) {
        logger.warn('[NewAudit] linkIntakeTokenToAudit failed (non-fatal)', {
          error: linkErr instanceof Error ? linkErr.message : String(linkErr),
        });
      }
    }

    let mergedForSave = localWithBasics;
    let intakeVersionsForSave: IntakeVersionTuple | undefined;

    if (tokenCandidates.length > 0) {
      try {
        const { brief } = await api.getBrief(auditId);
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
      await api.saveBrief(auditId, mergedForSave, {
        collection_mode:
          params.noPublicWebsite && params.briefLayoutChoice === 'wizard' ? 'discovery' : undefined,
        intake_versions: intakeVersionsForSave,
      });
    } catch (briefErr) {
      logger.warn('[NewAudit] Brief save failed (non-fatal)', {
        error: briefErr instanceof Error ? briefErr.message : String(briefErr),
      });
    }

    await api.startPipeline(auditId);

    const qc = getGlcQueryClient();
    invalidateAuditRelatedQueries(qc, auditId);
    invalidateAuditsListsAndDashboard(qc);
    params.setPreBriefToken(null);

    if (params.isClientSelfServe) {
      clearClientPortalNewAuditDraft();
      params.setDraftIntakeVersions(null);
    }

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

