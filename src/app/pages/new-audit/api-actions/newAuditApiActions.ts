import { api, ApiError } from '../../../data/apiService';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { saveNewAuditBriefToServer } from '../newAuditExecution';
import type { BriefResponses } from '../../../data/briefQuestions';
import type { IntakeVersionTuple } from '../../../data/auditTypes';
import type { AuditBriefIntelligenceSnapshotResponse } from '../../../data/api/brief-profile-platform';

export async function saveBriefBeforeIntelligence(args: {
  draftAuditId: string;
  isClientSelfServe: boolean;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  responses: BriefResponses;
  briefLayoutChoice: 'unset' | 'classic' | 'wizard';
  preBriefToken: string | null;
  intakeTokenFromUrl: string;
  draftIntakeVersions: IntakeVersionTuple | null;
}): Promise<IntakeVersionTuple | null> {
  return saveNewAuditBriefToServer({
    auditId: args.draftAuditId,
    isClientSelfServe: args.isClientSelfServe,
    url: args.url,
    noPublicWebsite: args.noPublicWebsite,
    name: args.name,
    industry: args.industry,
    industrySpecify: args.industrySpecify,
    responses: args.responses,
    briefLayoutChoice: args.briefLayoutChoice,
    preBriefToken: args.preBriefToken,
    intakeTokenFromUrl: args.intakeTokenFromUrl,
    draftIntakeVersions: args.draftIntakeVersions,
  });
}

export async function runBriefIntelligenceSnapshotAction(args: {
  draftAuditId: string;
  earlyCapture?: boolean;
}): Promise<AuditBriefIntelligenceSnapshotResponse> {
  return api.postAuditsBriefIntelligenceSnapshot(args.draftAuditId, {
    ...(args.earlyCapture ? { early_capture: true } : {}),
  });
}

export async function runBriefIntelligenceWordingAction(draftAuditId: string) {
  return api.postAuditsBriefIntelligenceWording(draftAuditId);
}

export function getSnapshotGenericError(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : WORKSPACE_PAGE_COPY.newAudit.step1.intelligenceSnapshot.genericError;
}
