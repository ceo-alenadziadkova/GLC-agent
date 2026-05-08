import { Link } from 'react-router';
import { ArrowsClockwise, CaretRight, Check, Play } from '@phosphor-icons/react';
import { Callout } from '../../../../../design-system/ui';
import { Button } from '../../../../components/ui/button';
import { PIPELINE_MONITOR_COPY as PM } from '../../../../config/pipeline-monitor-copy';
import { PIPELINE_API_ERROR_CODES } from '../../../../config/pipeline-api-error-codes';
import type { PipelineErrorExtras } from '../../../../hooks/usePipeline';
import {
  buildPortalReportPath,
  buildPortalStrategyLabPath,
  getWorkspacePath,
} from '../../utils/pipeline-monitor-format';
import { PIPELINE_MONITOR_UI_POLICY } from '../../config/pipeline-monitor-ui-policy';
import { intakeReadinessTriageCodesFromDetails, PipelineIntakeReadinessMissingQuestions } from './phase-detail-helpers';
import type { PhaseDetailCopy } from './phase-detail-types';

type Props = {
  isCreated: boolean;
  isClient: boolean;
  pipeError: string | null;
  pipelineErrorExtras: PipelineErrorExtras | null;
  auditId: string | undefined;
  auditStatus: string;
  canManagePlatformSettings: boolean;
  resumeCancelledBusy: boolean;
  resumeCancelledError: string | null;
  resumeAutoNextBlockedNotice: PipelineErrorExtras | null;
  onResumeCancelledPlatform: () => void | Promise<void>;
  detailCopy: PhaseDetailCopy;
};

export function PhaseDetailBanners(props: Props) {
  const {
    isCreated,
    isClient,
    pipeError,
    pipelineErrorExtras,
    auditId,
    auditStatus,
    canManagePlatformSettings,
    resumeCancelledBusy,
    resumeCancelledError,
    resumeAutoNextBlockedNotice,
    onResumeCancelledPlatform,
    detailCopy,
  } = props;

  return (
    <>
      {pipeError && (
        <Callout intent="danger" className="mb-4 p-4">
          <div>
            <p className="text-sm font-medium text-[var(--score-1)]">
              {isClient ? PM.clientPortal.detail.loadErrorPrefix : PM.errorPrefix} {pipeError}
            </p>
            {auditId && pipelineErrorExtras?.code === PIPELINE_API_ERROR_CODES.INTAKE_READINESS_BLOCKED && (
              <div className="mt-3 space-y-2">
                <Button asChild variant="outline" size="sm" className="no-underline">
                  <Link to={getWorkspacePath(auditId, isClient)}>
                    {detailCopy.intakeReadinessBlockedWorkspaceCta}{' '}
                    <CaretRight className="inline h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
                <PipelineIntakeReadinessMissingQuestions
                  missingFieldsTitle={detailCopy.intakeReadinessBlockedMissingFieldsTitle}
                  envelopeDetails={pipelineErrorExtras.details}
                />
                {(() => {
                  const triage = intakeReadinessTriageCodesFromDetails(pipelineErrorExtras.details);
                  return triage ? (
                    <div>
                      <p className="text-[var(--text-secondary)] mb-1 text-xs font-semibold">
                        {detailCopy.intakeReadinessBlockedTriageCodesLabel}
                      </p>
                      <pre className="bg-[var(--bg-inset)] text-[var(--text-secondary)] max-h-32 overflow-auto rounded-md border border-[var(--border-subtle)] p-2 font-mono text-[length:var(--text-2xs)] leading-snug whitespace-pre-wrap">
                        {triage.join(', ')}
                      </pre>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </Callout>
      )}

      {isClient &&
        auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed &&
        !isCreated &&
        auditId && (
          <div className="mb-5 rounded-xl border border-success/35 bg-success/10 p-4">
            <div className="flex gap-3">
              <Check className="text-success mt-0.5 h-5 w-5 shrink-0" weight="bold" aria-hidden />
              <div className="min-w-0">
                <h3 className="text-foreground text-base font-semibold tracking-tight">{PM.clientPortal.completed.bannerTitle}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{PM.clientPortal.completed.bannerBody}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" className="no-underline">
                    <Link to={buildPortalReportPath(auditId)}>
                      {PM.clientPortal.completed.primaryCta} <CaretRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="no-underline">
                    <Link to={buildPortalStrategyLabPath(auditId)}>
                      {PM.clientPortal.completed.secondaryCta} <CaretRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {isClient && auditStatus === PIPELINE_MONITOR_UI_POLICY.status.review && (
        <Callout intent="info" className="mb-4 p-4" title={detailCopy.clientReviewGateTitle}>
          {detailCopy.clientReviewGateBody}
        </Callout>
      )}

      {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.cancelled && !canManagePlatformSettings && !isClient && (
        <Callout intent="warning" className="mb-4 p-4">
          <p className="text-foreground text-sm font-medium">{detailCopy.pipelineCancelledConsultantTitle}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{detailCopy.pipelineCancelledConsultantBody}</p>
        </Callout>
      )}

      {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.cancelled && canManagePlatformSettings && !isClient && (
        <Callout intent="warning" className="mb-4 p-4">
          <p className="text-foreground mb-2 text-sm font-medium">{detailCopy.resumeCancelledPlatform}</p>
          <p className="text-muted-foreground mb-3 text-xs">{detailCopy.resumeCancelledPlatformHint}</p>
          <Button type="button" variant="outline" size="sm" disabled={resumeCancelledBusy} onClick={() => void onResumeCancelledPlatform()}>
            {resumeCancelledBusy ? (
              <>
                <ArrowsClockwise className="w-4 h-4 animate-spin" /> {detailCopy.resumeCancelledPlatformBusy}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> {detailCopy.resumeCancelledPlatform}
              </>
            )}
          </Button>
          {resumeCancelledError && (
            <p className="text-[var(--score-1)] mt-2 text-xs font-medium">
              {PM.errorPrefix} {resumeCancelledError}
            </p>
          )}
        </Callout>
      )}

      {resumeAutoNextBlockedNotice && canManagePlatformSettings && !isClient && auditId && (
        <Callout intent="warning" className="mb-4 p-4" title={detailCopy.intakeReadinessBlockedResumeAutoNextTitle}>
          <>
            {resumeAutoNextBlockedNotice.code === PIPELINE_API_ERROR_CODES.INTAKE_READINESS_BLOCKED ? (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">{detailCopy.intakeReadinessBlockedResumeAutoNextBody}</p>
                <Button asChild variant="outline" size="sm" className="mt-3 no-underline">
                  <Link to={getWorkspacePath(auditId, isClient)}>
                    {detailCopy.intakeReadinessBlockedWorkspaceCta}{' '}
                    <CaretRight className="inline h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
                <PipelineIntakeReadinessMissingQuestions
                  missingFieldsTitle={detailCopy.intakeReadinessBlockedMissingFieldsTitle}
                  envelopeDetails={resumeAutoNextBlockedNotice.details}
                />
                {(() => {
                  const triage = intakeReadinessTriageCodesFromDetails(resumeAutoNextBlockedNotice.details);
                  return triage ? (
                    <div className="mt-3">
                      <p className="text-[var(--text-secondary)] mb-1 text-xs font-semibold">
                        {detailCopy.intakeReadinessBlockedTriageCodesLabel}
                      </p>
                      <pre className="bg-[var(--bg-inset)] text-[var(--text-secondary)] max-h-32 overflow-auto rounded-md border border-[var(--border-subtle)] p-2 font-mono text-[length:var(--text-2xs)] leading-snug whitespace-pre-wrap">
                        {triage.join(', ')}
                      </pre>
                    </div>
                  ) : null;
                })()}
              </>
            ) : resumeAutoNextBlockedNotice.code === PIPELINE_API_ERROR_CODES.REVIEW_PENDING ? (
              <p className="text-muted-foreground text-sm leading-relaxed">{detailCopy.waitingBlockedByReviewSubtitle}</p>
            ) : (
              <p className="text-muted-foreground font-mono text-xs">
                {detailCopy.resumeAutoNextBlockedCodeLabel}: {resumeAutoNextBlockedNotice.code ?? '—'}
              </p>
            )}
          </>
        </Callout>
      )}
    </>
  );
}
