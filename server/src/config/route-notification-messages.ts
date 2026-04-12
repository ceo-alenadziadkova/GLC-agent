/**
 * English copy for `emitStructuredNotification` / `notifyAuditParticipantsExcept` from HTTP routes.
 * Pipeline phase UX lives in `pipeline-events-copy.v1.json` and `pipeline-orchestrator-copy.v1.json`.
 */

import raw from './route-notification-messages.en.json' with { type: 'json' };

export const ROUTE_NOTIFICATION_MESSAGES_VERSION = raw.version as string;

export function interpolateRouteNotificationMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}

const ar = raw.auditRequest;

export const AUDIT_REQUEST_NOTIFICATION_CREATED_CONSULTANTS_TITLE = ar.createdConsultantsTitle;
export const AUDIT_REQUEST_NOTIFICATION_CREATED_CONSULTANTS_MESSAGE = ar.createdConsultantsMessage;
export const AUDIT_REQUEST_NOTIFICATION_SUBMITTED_CONSULTANTS_TITLE = ar.submittedConsultantsTitle;
export const AUDIT_REQUEST_NOTIFICATION_SUBMITTED_CONSULTANTS_MESSAGE = ar.submittedConsultantsMessage;
export const AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_TITLE = ar.approvedUserTitle;
export const AUDIT_REQUEST_NOTIFICATION_APPROVED_USER_MESSAGE = ar.approvedUserMessage;
export const AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_TITLE = ar.rejectedUserTitle;
export const AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_MESSAGE = ar.rejectedUserMessage;
export const AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_TITLE = ar.deliveredUserTitle;
export const AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_MESSAGE = ar.deliveredUserMessage;

const snap = raw.snapshot;

export const SNAPSHOT_CLAIMED_NOTIFICATION_TITLE_EN = snap.claimedTitle;
export const SNAPSHOT_CLAIMED_NOTIFICATION_MESSAGE_EN = snap.claimedMessage;
export const SNAPSHOT_STARTED_NOTIFICATION_TITLE = snap.startedTitle;

export function snapshotStartedNotificationMessage(url: string): string {
  return interpolateRouteNotificationMessage(snap.startedMessageTemplate, { url });
}

/** In-app route after claiming a guest snapshot (consultant-facing). */
export function snapshotClaimedInAppRoute(auditId: string): string {
  return `/audit/${auditId}?brief=1`;
}

const mb = raw.marketingBrief;

export const MARKETING_BRIEF_SUBMITTED_NOTIFICATION_TITLE = mb.submittedTitle;

export function marketingBriefSubmittedNotificationMessage(displayName: string, recommendedRoute: string): string {
  return interpolateRouteNotificationMessage(mb.submittedMessageTemplate, {
    displayName,
    recommendedRoute,
  });
}

const bh = raw.briefHelp;

export const BRIEF_HELP_REQUESTED_NOTIFICATION_TITLE = bh.requestedTitle;

export function briefHelpRequestedNotificationMessage(auditIdPrefix: string): string {
  return interpolateRouteNotificationMessage(bh.requestedMessageTemplate, { auditPrefix: auditIdPrefix });
}

const pl = raw.pipeline;

export const PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE = pl.retryStartedTitle;

export function pipelineRetryStartedNotificationMessage(phase: number): string {
  return interpolateRouteNotificationMessage(pl.retryStartedMessageTemplate, { phase });
}

export const PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE = pl.reviewApprovedTitle;

export function pipelineReviewApprovedMessage(phase: number): string {
  return interpolateRouteNotificationMessage(pl.reviewApprovedMessageTemplate, { phase });
}

const rp = raw.reports;

export const REPORTS_ARTIFACT_READY_NOTIFICATION_TITLE = rp.artifactReadyTitle;
export const REPORTS_PDF_READY_NOTIFICATION_MESSAGE = rp.pdfReadyMessage;
export const REPORTS_CSV_READY_NOTIFICATION_MESSAGE = rp.csvReadyMessage;

const int = raw.intake;

export const INTAKE_RESPONSES_UPDATED_NOTIFICATION_TITLE = int.responsesUpdatedTitle;
export const INTAKE_SUBMISSION_RECEIVED_NOTIFICATION_TITLE = int.submissionReceivedTitle;

export function intakePreBriefSubmittedNotificationMessage(fieldCount: number): string {
  return interpolateRouteNotificationMessage(int.preBriefSubmittedMessageTemplate, { count: fieldCount });
}
