import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowsClockwise,
  CaretRight,
  Check,
  CircleNotch,
  Clock,
  Info,
  Play,
  Terminal,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { ReconReviewSummary } from '../../../components/glc/ReconReviewSummary';
import { ScoreBadge } from '../../../components/glc/ScoreBadge';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { StatusPill } from '../../../components/glc/StatusPill';
import { Callout } from '../../../../design-system/ui';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { PIPELINE_RETRY_COMMENT_MAX_LENGTH } from '../../../config/api-paths';
import { ANALYTIC_WING_IDS, AUTO_WING_IDS } from '../../../lib/pipeline-monitor-helpers';
import {
  buildPortalReportPath,
  buildPortalStrategyLabPath,
  getPhaseResultViewPath,
  getWorkspacePath,
} from '../utils/pipeline-monitor-format';
import type { PipelineErrorExtras } from '../../../hooks/usePipeline';
import { PIPELINE_API_ERROR_CODES } from '../../../config/pipeline-api-error-codes';
import { api } from '../../../data/apiService';
import { bankIdToBriefQuestion } from '../../../data/bankQuestionUiCatalog';
import { intakeReadinessMissingBankIdsFromEnvelopeDetails } from '../../../lib/pipeline-intake-readiness-block-ui';
import { hasVisiblyRunningUpstreamPhase, isPipelineAuditActiveStatus } from '../../../lib/pipeline-monitor-helpers';
import { STRATEGY_PHASE_ID } from '../phase-meta';
import { ParallelWingBanner } from '../PipelineMonitorPhaseUi';
import { AdminTokenBudgetTopupBanner } from './AdminTokenBudgetTopupBanner';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import type { ReconData } from '../../../data/auditTypes';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import type { AuditIssue, QuickWin, Recommendation } from '../../../data/audit/contracts/report/report-domain.types';
import type { PhaseView } from '../types';
import type { PipelineStateLite } from '../types-pipeline-state';
import { PipelineSummaryFooter } from './PipelineSummaryFooter';
import { cn } from '../../../components/ui/utils';
import { Button } from '../../../components/ui/button';

const PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD = Math.floor(PIPELINE_RETRY_COMMENT_MAX_LENGTH * 0.9);

function intakeReadinessTriageCodesFromDetails(details: unknown): string[] | null {
  if (details == null || typeof details !== 'object') return null;
  const triage = (details as Record<string, unknown>).triage_blocking_trace_codes;
  if (!Array.isArray(triage)) return null;
  const out = triage.filter((c): c is string => typeof c === 'string');
  return out.length > 0 ? out : null;
}

function PipelineIntakeReadinessMissingQuestions(props: {
  missingFieldsTitle: string;
  envelopeDetails: unknown;
}) {
  const ids = intakeReadinessMissingBankIdsFromEnvelopeDetails(props.envelopeDetails);
  if (ids.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[var(--text-secondary)] mb-1 text-xs font-semibold">{props.missingFieldsTitle}</p>
      <ul className="text-[var(--text-secondary)] list-inside list-disc space-y-1 pl-1 text-xs leading-snug">
        {ids.map((id) => {
          const q = bankIdToBriefQuestion(id, 'required');
          return (
            <li key={id}>
              <span className="text-[var(--text-primary)]">{q.question}</span>{' '}
              <span className="font-mono text-[10px] opacity-70">({id})</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function toEditableIssues(input: AuditIssue[] | undefined): Array<{ id: string; title: string; description: string; impact: string }> {
  return (input ?? []).map((row) => ({
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    impact: row.impact ?? '',
  }));
}

function toEditableQuickWins(input: QuickWin[] | undefined): Array<{ id: string; title: string; description: string; timeframe: string }> {
  return (input ?? []).map((row) => ({
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    timeframe: row.timeframe ?? '',
  }));
}

function toEditableRecommendations(input: Recommendation[] | undefined): Array<{ id: string; title: string; description: string; impact: string }> {
  return (input ?? []).map((row) => ({
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    impact: row.impact ?? '',
  }));
}

export function PhaseDetailPanel(props: {
  selectedPhase: PhaseView;
  phases: PhaseView[];
  /** Phases included in `execution_plan` coverage; null = show all (legacy). */
  plannedExecutionPhaseIds?: ReadonlySet<number> | null;
  pipelineState: PipelineStateLite | null;
  pipeError: string | null;
  pipelineErrorExtras: PipelineErrorExtras | null;
  isCreated: boolean;
  isClient: boolean;
  isExpress: boolean;
  recon: ReconData | null;
  showReconCrawlerTruncationWarning: boolean;
  auditId: string | undefined;
  governance: {
    controlObject: {
      decision_hint?: string;
      auto_remediation_applied_count?: number;
      confidence: { overall: number };
      counts: {
        total_claims: number;
        statuses: { likely_hallucination: number; risky_promise: number };
      };
      human_attention_required: { required: boolean; reasons: string[] };
    } | null;
    refine: { reasoning: string } | null;
  };
  auditStatus: string;
  canManagePlatformSettings: boolean;
  canStopPipeline: boolean;
  isStopping: boolean;
  resumeCancelledBusy: boolean;
  resumeCancelledError: string | null;
  resumeAutoNextBlockedNotice: PipelineErrorExtras | null;
  onOpenStopDialog: () => void;
  onResumeCancelledPlatform: () => void | Promise<void>;
  onStartPipeline: () => void;
  onRunNextPhase: () => void;
  /** True while Continue → POST /pipeline/next is in flight. */
  runNextPhaseBusy: boolean;
  onRetryPhase: (phase: number, opts?: { retry_comment?: string }) => void | Promise<void>;
  audit: AuditState | null;
  onRefreshAfterPhaseEdit: () => Promise<void>;
  /** Reload pipeline + audit state after platform admin tops up the token budget. */
  onTokenBudgetTopupSuccess: () => Promise<void>;
}) {
  const {
    selectedPhase,
    phases,
    plannedExecutionPhaseIds = null,
    pipelineState,
    pipeError,
    pipelineErrorExtras,
    isCreated,
    isClient,
    isExpress,
    recon,
    showReconCrawlerTruncationWarning,
    auditId,
    governance,
    auditStatus,
    canManagePlatformSettings,
    canStopPipeline,
    isStopping,
    resumeCancelledBusy,
    resumeCancelledError,
    resumeAutoNextBlockedNotice,
    onOpenStopDialog,
    onResumeCancelledPlatform,
    onStartPipeline,
    onRunNextPhase,
    runNextPhaseBusy,
    onRetryPhase,
    audit,
    onRefreshAfterPhaseEdit,
    onTokenBudgetTopupSuccess,
  } = props;
  const [editJsonOpen, setEditJsonOpen] = useState(false);
  const [editLabelDraft, setEditLabelDraft] = useState('');
  const [editSummaryDraft, setEditSummaryDraft] = useState('');
  const [editStrengthsDraft, setEditStrengthsDraft] = useState('');
  const [editWeaknessesDraft, setEditWeaknessesDraft] = useState('');
  const [editExecutiveSummaryDraft, setEditExecutiveSummaryDraft] = useState('');
  const [editIssuesDraft, setEditIssuesDraft] = useState<Array<{ id: string; title: string; description: string; impact: string }>>([]);
  const [editQuickWinsDraft, setEditQuickWinsDraft] = useState<Array<{ id: string; title: string; description: string; timeframe: string }>>([]);
  const [editRecommendationsDraft, setEditRecommendationsDraft] = useState<Array<{ id: string; title: string; description: string; impact: string }>>([]);
  const [editJsonBusy, setEditJsonBusy] = useState(false);
  const [editJsonError, setEditJsonError] = useState<string | null>(null);
  const [rerunCommentDraft, setRerunCommentDraft] = useState('');
  const rerunCommentLength = rerunCommentDraft.length;
  const rerunCommentCounterClassName =
    rerunCommentLength >= PIPELINE_RETRY_COMMENT_MAX_LENGTH
      ? 'text-destructive'
      : rerunCommentLength >= PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD
        ? 'text-warning'
        : 'text-muted-foreground';
  const [phaseStallTickMs, setPhaseStallTickMs] = useState(() => Date.now());

  const detailCopy = useMemo(
    () => (isClient ? { ...PM.detail, ...PM.clientPortal.detail } : PM.detail),
    [isClient],
  );

  const currentPhase = pipelineState?.current_phase ?? -1;

  const blockingPendingReview = useMemo(() => {
    const revs = pipelineState?.reviews;
    if (!revs?.length || selectedPhase.skipped) return null;
    return revs.find(r => {
      if (r.status !== 'pending') return false;
      if (r.after_phase >= selectedPhase.id) return false;
      if (
        plannedExecutionPhaseIds != null &&
        plannedExecutionPhaseIds.size > 0 &&
        !plannedExecutionPhaseIds.has(r.after_phase)
      ) {
        return false;
      }
      return true;
    });
  }, [plannedExecutionPhaseIds, pipelineState?.reviews, selectedPhase.id, selectedPhase.skipped]);

  const upstreamPhaseVisiblyRunning = hasVisiblyRunningUpstreamPhase(phases, selectedPhase.id);

  const upstreamOrchestratorBusy =
    !selectedPhase.skipped &&
    auditStatus !== PIPELINE_MONITOR_UI_POLICY.status.failed &&
    isPipelineAuditActiveStatus(auditStatus) &&
    currentPhase >= 0 &&
    currentPhase < selectedPhase.id &&
    !blockingPendingReview &&
    upstreamPhaseVisiblyRunning;

  /** Skipped rows from partial domain selection (`execution_plan`). */
  const isSkippedForCoveragePlan =
    selectedPhase.skipped &&
    plannedExecutionPhaseIds != null &&
    plannedExecutionPhaseIds.size > 0 &&
    !plannedExecutionPhaseIds.has(selectedPhase.id);
  /** Mirrors server `fetchPendingReviewAfterPhase(auditId, current_phase)` — blocks Continue until this gate is approved. */
  const pendingReviewForCurrentPhase = pipelineState?.reviews?.find(
    r => r.after_phase === currentPhase && r.status === 'pending',
  );
  const isReviewBlockingContinue = Boolean(pendingReviewForCurrentPhase);
  /** Show from any selected phase so consultants on Strategy (7) still see Continue when `current_phase` is 6, etc. */
  const showContinuePipeline =
    !isClient &&
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.review &&
    !isReviewBlockingContinue;

  /** Agent finished this phase (`completed`), or pipeline paused at a review gate (`review`) — show outputs and workspace link. */
  const phaseHasAgentOutput =
    selectedPhase.status === 'completed' || selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.review;
  const canEditPhaseResult = !isClient && phaseHasAgentOutput && selectedPhase.id >= 1;

  function buildEditablePhaseResultPayload(): Record<string, unknown> | null {
    if (!audit) return null;
    if (selectedPhase.id === STRATEGY_PHASE_ID) {
      if (!audit.strategy) return null;
      return {
        executive_summary: audit.strategy.executive_summary,
        quick_wins: audit.strategy.quick_wins,
        medium_term: audit.strategy.medium_term,
        strategic: audit.strategy.strategic,
      };
    }
    const domain = Object.values(audit.domains).find((row) => row?.phase_number === selectedPhase.id) ?? null;
    if (!domain) return null;
    return {
      label: domain.label,
      summary: domain.summary,
      strengths: domain.strengths,
      weaknesses: domain.weaknesses,
      issues: domain.issues,
      quick_wins: domain.quick_wins,
      recommendations: domain.recommendations,
    };
  }

  function openPhaseResultEditor() {
    const payload = buildEditablePhaseResultPayload();
    if (!payload) return;
    setEditLabelDraft(typeof payload.label === 'string' ? payload.label : '');
    setEditSummaryDraft(typeof payload.summary === 'string' ? payload.summary : '');
    setEditStrengthsDraft(Array.isArray(payload.strengths) ? payload.strengths.filter((v): v is string => typeof v === 'string').join('\n') : '');
    setEditWeaknessesDraft(Array.isArray(payload.weaknesses) ? payload.weaknesses.filter((v): v is string => typeof v === 'string').join('\n') : '');
    setEditExecutiveSummaryDraft(typeof payload.executive_summary === 'string' ? payload.executive_summary : '');
    setEditIssuesDraft(toEditableIssues((payload.issues as AuditIssue[] | undefined) ?? []));
    setEditQuickWinsDraft(toEditableQuickWins((payload.quick_wins as QuickWin[] | undefined) ?? []));
    setEditRecommendationsDraft(toEditableRecommendations((payload.recommendations as Recommendation[] | undefined) ?? []));
    setEditJsonError(null);
    setEditJsonOpen(true);
  }

  async function savePhaseResultEditor() {
    if (!auditId || selectedPhase.id < 1 || selectedPhase.id > 7 || editJsonBusy) return;
    setEditJsonBusy(true);
    setEditJsonError(null);
    try {
      const normalizeMultiline = (raw: string): string[] =>
        raw
          .split('\n')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      const resultPatch =
        selectedPhase.id === STRATEGY_PHASE_ID
          ? {
              executive_summary: editExecutiveSummaryDraft.trim(),
            }
          : {
              label: editLabelDraft.trim(),
              summary: editSummaryDraft.trim(),
              strengths: normalizeMultiline(editStrengthsDraft),
              weaknesses: normalizeMultiline(editWeaknessesDraft),
              issues: editIssuesDraft.map((row) => ({
                id: row.id.trim(),
                title: row.title.trim(),
                description: row.description.trim(),
                impact: row.impact.trim(),
              })),
              quick_wins: editQuickWinsDraft.map((row) => ({
                id: row.id.trim(),
                title: row.title.trim(),
                description: row.description.trim(),
                timeframe: row.timeframe.trim(),
              })),
              recommendations: editRecommendationsDraft.map((row) => ({
                id: row.id.trim(),
                title: row.title.trim(),
                description: row.description.trim(),
                impact: row.impact.trim(),
              })),
            };
      if (selectedPhase.id === STRATEGY_PHASE_ID) {
        if ((resultPatch.executive_summary ?? '').trim().length === 0) {
          setEditJsonError('Executive summary is required.');
          return;
        }
      } else {
        if ((resultPatch.label ?? '').trim().length === 0) {
          setEditJsonError('Label is required.');
          return;
        }
        if ((resultPatch.summary ?? '').trim().length === 0) {
          setEditJsonError('Summary is required.');
          return;
        }
        const invalidIssue = resultPatch.issues.find(
          (row) =>
            row.id.length === 0 ||
            row.title.length === 0 ||
            row.description.length === 0 ||
            row.impact.length === 0,
        );
        if (invalidIssue) {
          setEditJsonError('Each issue must have id, title, description, and impact.');
          return;
        }
        const invalidQuickWin = resultPatch.quick_wins.find(
          (row) =>
            row.id.length === 0 ||
            row.title.length === 0 ||
            row.description.length === 0 ||
            row.timeframe.length === 0,
        );
        if (invalidQuickWin) {
          setEditJsonError('Each quick win must have id, title, description, and timeframe.');
          return;
        }
        const invalidRecommendation = resultPatch.recommendations.find(
          (row) =>
            row.id.length === 0 ||
            row.title.length === 0 ||
            row.description.length === 0 ||
            row.impact.length === 0,
        );
        if (invalidRecommendation) {
          setEditJsonError('Each recommendation must have id, title, description, and impact.');
          return;
        }
      }
      await api.patchPipelinePhaseResult(auditId, selectedPhase.id, { result: resultPatch });
      await onRefreshAfterPhaseEdit();
      setEditJsonOpen(false);
    } catch (err) {
      setEditJsonError(err instanceof Error ? err.message : 'Failed to save phase result');
    } finally {
      setEditJsonBusy(false);
    }
  }

  const canManualRerunPhase =
    !isClient &&
    !selectedPhase.skipped &&
    !isPipelineAuditActiveStatus(auditStatus) &&
    auditStatus !== PIPELINE_MONITOR_UI_POLICY.status.cancelled &&
    auditStatus !== PIPELINE_MONITOR_UI_POLICY.status.created &&
    (selectedPhase.status === 'completed' ||
      selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.review ||
      selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed);

  const phaseResultPath = getPhaseResultViewPath({
    phaseId: selectedPhase.id,
    auditId,
    isClient,
    auditStatus,
  });
  const phaseResultLinkLabel =
    selectedPhase.id === STRATEGY_PHASE_ID
      ? detailCopy.viewStrategyRoadmap
      : isClient && auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed
        ? detailCopy.viewReport
      : detailCopy.viewInWorkspace;

  /** Portal clients: no consultant-style workspace shortcut; keep Strategy Lab + finished report only. */
  const showPhaseResultLink =
    !isClient ||
    selectedPhase.id === STRATEGY_PHASE_ID ||
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed;

  const Icon = selectedPhase.icon;
  const qualityRunningAuto = phases.some(phase => AUTO_WING_IDS.includes(phase.id) && phase.status === 'running');
  const qualityRunningAnalytic = phases.some(
    phase => ANALYTIC_WING_IDS.includes(phase.id) && phase.status === 'running',
  );
  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhaseStallTickMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedPhaseLatestEventAtMs = useMemo(() => {
    const event = (pipelineState?.events ?? []).find((row) => row.phase === selectedPhase.id);
    if (!event) return null;
    const ts = Date.parse(event.created_at);
    return Number.isFinite(ts) ? ts : null;
  }, [pipelineState?.events, selectedPhase.id]);

  const selectedPhaseTimedOutWithoutActivity = useMemo(() => {
    if (selectedPhase.status !== 'running' || selectedPhaseLatestEventAtMs == null) return false;
    const timeoutMs = PIPELINE_MONITOR_UI_POLICY.resilience.stalledPhaseWarningTimeoutMin * 60_000;
    return phaseStallTickMs - selectedPhaseLatestEventAtMs >= timeoutMs;
  }, [phaseStallTickMs, selectedPhase.status, selectedPhaseLatestEventAtMs]);

  const selectedPhaseStalled = useMemo(() => {
    const events = pipelineState?.events ?? [];
    const latestLifecycleSignal = events.find(event => {
      if (event.phase !== selectedPhase.id) return false;
      return (
        event.event_type === 'phase_stalled' ||
        event.event_type === 'completed' ||
        event.event_type === 'error' ||
        event.event_type === 'started'
      );
    });
    return selectedPhase.status === 'running' && latestLifecycleSignal?.event_type === 'phase_stalled';
  }, [pipelineState?.events, selectedPhase.id, selectedPhase.status]);

  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="max-w-2xl mx-auto ds-pattern-page-shell-body">
        {isCreated && (
          <div className="glc-card mb-6 rounded-xl p-8 text-center">
            <Play className="text-info mx-auto mb-3 h-10 w-10" />
            <h3 className="text-foreground mb-2 text-lg font-semibold">
              {WORKSPACE_PAGE_COPY.pipelineMonitor.startReadyTitle}
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {isExpress
                ? WORKSPACE_PAGE_COPY.pipelineMonitor.startExpressDescription
                : WORKSPACE_PAGE_COPY.pipelineMonitor.startFullDescription}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartPipeline}
              className="mx-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Play className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.pipelineMonitor.startPipelineButton}
            </motion.button>
          </div>
        )}

        <AdminTokenBudgetTopupBanner
          auditId={auditId}
          pipelineState={pipelineState}
          pipelineErrorExtras={pipelineErrorExtras}
          canManagePlatformSettings={canManagePlatformSettings}
          isClient={isClient}
          onTopupSuccess={onTokenBudgetTopupSuccess}
        />

        {pipeError && (
          <Callout intent="danger" className="mb-4 p-4">
            <div>
              <p className="text-sm font-medium text-[var(--score-1)]">
                {isClient ? PM.clientPortal.detail.loadErrorPrefix : PM.errorPrefix} {pipeError}
              </p>
              {auditId &&
                pipelineErrorExtras?.code === PIPELINE_API_ERROR_CODES.INTAKE_READINESS_BLOCKED && (
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
                          <pre className="bg-[var(--bg-inset)] text-[var(--text-secondary)] max-h-32 overflow-auto rounded-md border border-[var(--border-subtle)] p-2 font-mono text-[10px] leading-snug whitespace-pre-wrap">
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
                  <h3 className="text-foreground text-base font-semibold tracking-tight">
                    {PM.clientPortal.completed.bannerTitle}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {PM.clientPortal.completed.bannerBody}
                  </p>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resumeCancelledBusy}
              onClick={() => void onResumeCancelledPlatform()}
            >
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
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {detailCopy.intakeReadinessBlockedResumeAutoNextBody}
                  </p>
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
                        <pre className="bg-[var(--bg-inset)] text-[var(--text-secondary)] max-h-32 overflow-auto rounded-md border border-[var(--border-subtle)] p-2 font-mono text-[10px] leading-snug whitespace-pre-wrap">
                          {triage.join(', ')}
                        </pre>
                      </div>
                    ) : null;
                  })()}
                </>
              ) : resumeAutoNextBlockedNotice.code === PIPELINE_API_ERROR_CODES.REVIEW_PENDING ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {detailCopy.waitingBlockedByReviewSubtitle}
                </p>
              ) : (
                <p className="text-muted-foreground font-mono text-xs">
                  {detailCopy.resumeAutoNextBlockedCodeLabel}: {resumeAutoNextBlockedNotice.code ?? '—'}
                </p>
              )}
            </>
          </Callout>
        )}

        <AnimatePresence>
          {qualityRunningAuto && (
            <ParallelWingBanner
              phases={phases.filter(phase => AUTO_WING_IDS.includes(phase.id))}
              wingName={isClient ? PM.clientPortal.parallelWing.autoName : PM.parallelWing.autoName}
              runningSuffix={isClient ? PM.clientPortal.parallelWing.runningSuffix : undefined}
            />
          )}
          {qualityRunningAnalytic && (
            <ParallelWingBanner
              phases={phases.filter(phase => ANALYTIC_WING_IDS.includes(phase.id))}
              wingName={isClient ? PM.clientPortal.parallelWing.analyticName : PM.parallelWing.analyticName}
              runningSuffix={isClient ? PM.clientPortal.parallelWing.runningSuffix : undefined}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPhase.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.panelTransitionDurationSec, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
                  selectedPhase.status === 'completed'
                    ? 'bg-[var(--gradient-success)] shadow-[var(--glow-green)]'
                    : selectedPhase.status === 'running'
                      ? 'bg-[var(--gradient-brand)] shadow-[var(--glow-blue-sm)]'
                      : 'bg-muted',
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6',
                    selectedPhase.status === 'pending'
                      ? 'text-muted-foreground'
                      : selectedPhase.status === 'completed'
                        ? 'text-[var(--on-gradient-success-fg)]'
                        : selectedPhase.status === 'running'
                          ? 'text-[var(--on-gradient-brand-fg)]'
                          : 'text-primary-foreground',
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-foreground text-xl font-bold tracking-tight">
                    {selectedPhase.label}: {selectedPhase.name}
                  </h2>
                  <StatusPill status={selectedPhase.status} pulse={selectedPhase.status === 'running'} />
                </div>
                <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
                  {selectedPhase.score !== null && <ScoreBadge score={selectedPhase.score} showLabel size="md" />}
                </div>
              </div>
            </div>

            {selectedPhase.id === 0 && !isClient && !isCreated ? (
              <div className="space-y-3">
                <SectionLabel>{detailCopy.reconPreviewSectionTitle}</SectionLabel>
                <ReconReviewSummary
                  recon={recon}
                  showCrawlerTruncationWarning={showReconCrawlerTruncationWarning}
                  copy={{
                    ...PM.reviewModal.recon,
                    introTitle: detailCopy.reconPreviewIntroTitle,
                    introBody: detailCopy.reconPreviewIntroBody,
                  }}
                />
              </div>
            ) : null}

            {selectedPhase.status === 'running' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-info/10 border-info/30 rounded-xl border p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowsClockwise className="text-info h-4 w-4 animate-spin" />
                  <span className="text-info text-sm font-semibold">
                    {detailCopy.agentRunning}
                  </span>
                </div>
                <div className="bg-info/20 h-1 overflow-hidden rounded-full">
                  <motion.div
                    className="h-full rounded-full bg-[var(--gradient-brand)] shadow-[var(--glow-blue-sm)]"
                    initial={{ width: '20%' }}
                    animate={{ width: '75%' }}
                    transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.runningBarDurationSec, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
                  />
                </div>
              </motion.div>
            )}
            {(selectedPhaseStalled || selectedPhaseTimedOutWithoutActivity) && !isClient && (
              <Callout intent="warning" className="p-4" title={detailCopy.phaseStalledTitle}>
                <>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {selectedPhaseStalled
                      ? detailCopy.phaseStalledBody
                      : detailCopy.phaseStalledBodyTimeoutFallback.replace(
                          '{minutes}',
                          String(PIPELINE_MONITOR_UI_POLICY.resilience.stalledPhaseWarningTimeoutMin),
                        )}
                  </p>
                  <div className="mt-3 space-y-1">
                    <label className="text-muted-foreground block text-xs" htmlFor="phase-rerun-comment">
                      {detailCopy.retryCommentLabel}
                    </label>
                    <textarea
                      id="phase-rerun-comment"
                      className="w-full min-h-[4.5rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-xs"
                      value={rerunCommentDraft}
                      maxLength={PIPELINE_RETRY_COMMENT_MAX_LENGTH}
                      onChange={(event) => setRerunCommentDraft(event.target.value)}
                      placeholder={detailCopy.retryCommentPlaceholder}
                    />
                    <p className={cn('text-right text-[11px]', rerunCommentCounterClassName)} aria-live="polite">
                      {rerunCommentLength}/{PIPELINE_RETRY_COMMENT_MAX_LENGTH}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canStopPipeline || isStopping}
                      onClick={onOpenStopDialog}
                    >
                      {isStopping ? (
                        <>
                          <ArrowsClockwise className="w-4 h-4 animate-spin" /> {detailCopy.stopPipelineStopping}
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" /> {detailCopy.stopPipeline}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canManualRerunPhase}
                      title={!canManualRerunPhase ? detailCopy.rerunPhaseManualHint : undefined}
                      onClick={() =>
                        void onRetryPhase(selectedPhase.id, {
                          retry_comment: rerunCommentDraft.trim() || undefined,
                        })
                      }
                    >
                      <ArrowsClockwise className="w-4 h-4" /> {detailCopy.retryFailedPhase}
                    </Button>
                  </div>
                </>
              </Callout>
            )}

            {selectedPhase.status === 'skipped' && (
              <div className="glc-card rounded-xl border-dashed p-10 text-center">
                <Info className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">
                  {isSkippedForCoveragePlan
                    ? detailCopy.phaseSkippedCoverageTitle
                    : detailCopy.phaseSkippedBundleTitle}
                </p>
                <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                  {isSkippedForCoveragePlan
                    ? detailCopy.phaseSkippedCoverageSubtitle
                    : detailCopy.phaseSkippedBundleSubtitle}
                </p>
              </div>
            )}

            {selectedPhase.status === 'pending' && (
              <div className="glc-card rounded-xl border-dashed p-10 text-center">
                {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed ? (
                  <>
                    <WarningCircle className="text-destructive mx-auto mb-3 h-8 w-8" />
                    <p className="text-foreground text-sm font-medium">
                      {detailCopy.pipelineFailedPendingTitle}
                    </p>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                      {detailCopy.pipelineFailedPendingSubtitle}
                    </p>
                    {!isClient && pipelineState != null && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => void onRetryPhase(pipelineState.current_phase)}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                      >
                        <ArrowsClockwise className="w-4 h-4" /> {PM.header.retryFailedPipeline}
                      </motion.button>
                    )}
                  </>
                ) : blockingPendingReview ? (
                  <>
                    <Clock className="text-warning mx-auto mb-3 h-8 w-8" />
                    <p className="text-foreground text-sm font-medium">
                      {detailCopy.waitingBlockedByReviewTitle}
                    </p>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                      {detailCopy.waitingBlockedByReviewSubtitle}
                    </p>
                  </>
                ) : upstreamOrchestratorBusy ? (
                  <>
                    <ArrowsClockwise className="text-info mx-auto mb-3 h-8 w-8 animate-spin" />
                    <p className="text-foreground text-sm font-medium">
                      {detailCopy.waitingUpstreamActiveTitle}
                    </p>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                      {detailCopy.waitingUpstreamActiveSubtitle}
                    </p>
                  </>
                ) : (
                  <>
                    <Clock className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                    <p className="text-muted-foreground text-sm font-medium">
                      {detailCopy.waitingTitle}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {detailCopy.waitingSubtitle}
                    </p>
                  </>
                )}
              </div>
            )}

            {selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed && (
              <Callout intent="danger" className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <WarningCircle className="text-destructive h-4 w-4 flex-shrink-0" />
                  <span className="text-destructive text-sm font-semibold">
                    {PM.detail.domainUnavailableTitle}
                  </span>
                </div>
                <p className="text-muted-foreground ml-6 text-xs">
                  {PM.detail.domainUnavailableBody}
                </p>
              </Callout>
            )}

            {!isClient && phaseHasAgentOutput && governance.refine && (
              <div className="bg-warning/10 border-warning/40 rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <WarningCircle className="text-warning h-4 w-4 flex-shrink-0" />
                  <span className="text-foreground text-sm font-semibold">
                    {detailCopy.governanceRefineTitle}
                  </span>
                </div>
                <p className="text-muted-foreground ml-6 mb-2 text-xs">
                  {detailCopy.governanceRefineBody}
                </p>
                <p className="text-muted-foreground ml-6 text-xs leading-relaxed">
                  {governance.refine.reasoning}
                </p>
              </div>
            )}

            {!isClient && phaseHasAgentOutput && !governance.refine && governance.controlObject?.decision_hint === 'accept_with_warnings' && (
              <div className="bg-info/10 border-info/40 rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="text-info h-4 w-4 flex-shrink-0" />
                  <span className="text-foreground text-sm font-semibold">
                    {PM.detail.governanceWarningsTitle}
                  </span>
                </div>
                <p className="text-muted-foreground ml-6 text-xs">
                  {PM.detail.governanceWarningsBody}
                </p>
              </div>
            )}

            {!isClient && phaseHasAgentOutput && governance.controlObject && (
              <div className="glc-card rounded-xl p-4">
                <SectionLabel className="mb-2">{detailCopy.governanceSummaryTitle}</SectionLabel>
                {(governance.controlObject.auto_remediation_applied_count ?? 0) > 0 && (
                  <div
                    className="text-success mb-3 inline-block rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    {detailCopy.governanceAutoRemediationBadge.replace(
                      '{count}',
                      String(governance.controlObject.auto_remediation_applied_count),
                    )}
                  </div>
                )}
                <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <dt>{detailCopy.governanceConfidence}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.confidence.overall}</dd>
                  <dt>{detailCopy.governanceClaims}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.total_claims}</dd>
                  <dt>{detailCopy.governanceHallucination}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.statuses.likely_hallucination}</dd>
                  <dt>{detailCopy.governanceRiskyPromise}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.statuses.risky_promise}</dd>
                </dl>
                {governance.controlObject.human_attention_required.required && (
                  <p className="text-warning-foreground mt-3 text-xs">
                    {detailCopy.governanceHumanAttention}
                    {governance.controlObject.human_attention_required.reasons.length > 0
                      ? `: ${governance.controlObject.human_attention_required.reasons.join(', ')}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            {/* Terminal-style activity log is intentional product UX — see docs/PIPELINE.md (Pipeline Monitor — terminal activity panel). */}
            {selectedPhase.log.length > 0 && (
              <div className="overflow-hidden rounded-xl border shadow-md">
                <div className="border-b border-[var(--overlay-white-20)] bg-[var(--ui-code-surface)] flex flex-col gap-1 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-destructive h-2.5 w-2.5 rounded-full" />
                      <span className="bg-warning h-2.5 w-2.5 rounded-full" />
                      <span className="bg-success h-2.5 w-2.5 rounded-full" />
                    </div>
                    <Terminal className="ml-2 h-3.5 w-3.5 text-[var(--overlay-white-35)]" />
                    <span className="text-[var(--overlay-white-30)] text-xs font-bold ds-pipeline-log-header-tracking uppercase">
                      {detailCopy.agentLogPrefix} {selectedPhase.name}
                    </span>
                  </div>
                  {isClient ? (
                    <p className="text-[var(--overlay-white-30)] text-xs font-normal normal-case leading-snug tracking-normal">
                      {PM.clientPortal.detail.activityLogClientHint}
                    </p>
                  ) : null}
                </div>
                <div className="bg-[var(--glc-ink)] font-mono space-y-2 p-4 text-xs">
                  {selectedPhase.log.map((entry, index) => {
                    const isOk = entry.eventType === 'completed' || entry.eventType === 'fact_check';
                    const isErr = entry.eventType === 'error';
                    return (
                      <motion.div
                        key={`${entry.text}-${index}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: index * PIPELINE_MONITOR_UI_POLICY.animation.logEntryDelayStepSec,
                          duration: PIPELINE_MONITOR_UI_POLICY.animation.logEntryDurationSec,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={cn(
                          'flex items-start gap-1.5 leading-relaxed',
                          isOk ? 'text-emerald-300' : isErr ? 'text-rose-300' : 'text-slate-400',
                        )}
                      >
                        {isOk ? (
                          <Check size={11} weight="bold" className="ds-pipeline-log-icon-mt shrink-0" />
                        ) : isErr ? (
                          <X size={11} weight="bold" className="ds-pipeline-log-icon-mt shrink-0" />
                        ) : (
                          <CircleNotch size={11} className="ds-pipeline-log-icon-mt shrink-0" />
                        )}
                        <span>{entry.text}</span>
                      </motion.div>
                    );
                  })}
                  {selectedPhase.status === 'running' && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.cursorBlinkDurationSec, repeat: Infinity }}
                      className="text-info inline-block"
                      aria-hidden
                    >
                      ▌
                    </motion.span>
                  )}
                </div>
              </div>
            )}

            {phaseHasAgentOutput && selectedPhase.score !== null && (
              <div className="glc-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionLabel>{detailCopy.domainScore}</SectionLabel>
                  <ScoreBadge score={selectedPhase.score} showLabel size="lg" />
                </div>
              </div>
            )}

            {!isClient &&
              (selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed || canManualRerunPhase) && (
                <div className="space-y-1">
                  <label className="text-muted-foreground block text-xs" htmlFor="phase-rerun-comment-inline">
                    {detailCopy.retryCommentLabel}
                  </label>
                  <textarea
                    id="phase-rerun-comment-inline"
                    className="w-full min-h-[4.5rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-xs"
                    value={rerunCommentDraft}
                    maxLength={PIPELINE_RETRY_COMMENT_MAX_LENGTH}
                    onChange={(event) => setRerunCommentDraft(event.target.value)}
                    placeholder={detailCopy.retryCommentPlaceholder}
                  />
                  <p className={cn('text-right text-[11px]', rerunCommentCounterClassName)} aria-live="polite">
                    {rerunCommentLength}/{PIPELINE_RETRY_COMMENT_MAX_LENGTH}
                  </p>
                </div>
              )}

            <div className="flex items-center gap-3">
              {canEditPhaseResult && (
                <Button type="button" variant="outline" size="sm" onClick={openPhaseResultEditor}>
                  Edit phase result text
                </Button>
              )}
              {phaseHasAgentOutput && showPhaseResultLink && (
                <Button asChild variant="outline" size="sm" className="no-underline">
                  <Link to={phaseResultPath}>
                    {phaseResultLinkLabel} <CaretRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              {selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed && !isClient && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    void onRetryPhase(selectedPhase.id, {
                      retry_comment: rerunCommentDraft.trim() || undefined,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                >
                  <ArrowsClockwise className="w-4 h-4" /> {detailCopy.retryFailedPhase}
                </motion.button>
              )}
              {selectedPhase.status !== PIPELINE_MONITOR_UI_POLICY.status.failed && canManualRerunPhase && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resumeCancelledBusy || runNextPhaseBusy}
                  title={detailCopy.rerunPhaseManualHint}
                  onClick={() =>
                    void onRetryPhase(selectedPhase.id, {
                      retry_comment: rerunCommentDraft.trim() || undefined,
                    })
                  }
                >
                  <ArrowsClockwise className="mr-2 h-4 w-4" aria-hidden />
                  {detailCopy.rerunPhaseManual}
                </Button>
              )}
              {showContinuePipeline && (
                <motion.button
                  type="button"
                  whileHover={runNextPhaseBusy ? undefined : { scale: 1.02 }}
                  whileTap={runNextPhaseBusy ? undefined : { scale: 0.98 }}
                  disabled={runNextPhaseBusy || resumeCancelledBusy}
                  aria-busy={runNextPhaseBusy}
                  onClick={() => void onRunNextPhase()}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90',
                    (runNextPhaseBusy || resumeCancelledBusy) && 'pointer-events-none opacity-70',
                  )}
                >
                  {runNextPhaseBusy ? (
                    <>
                      <CircleNotch className="h-4 w-4 animate-spin" aria-hidden />
                      {detailCopy.continuePipelineBusy}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" aria-hidden />
                      {detailCopy.continuePipeline}
                    </>
                  )}
                </motion.button>
              )}
            </div>
            {editJsonOpen ? (
              <div className="glc-card rounded-xl p-4 space-y-3">
                <SectionLabel>Phase result editor</SectionLabel>
                {selectedPhase.id === STRATEGY_PHASE_ID ? (
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-xs">Executive summary</label>
                    <textarea
                      className="w-full min-h-[10rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                      value={editExecutiveSummaryDraft}
                      onChange={(event) => setEditExecutiveSummaryDraft(event.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-muted-foreground text-xs">Label</label>
                      <input
                        className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                        value={editLabelDraft}
                        onChange={(event) => setEditLabelDraft(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-muted-foreground text-xs">Summary</label>
                      <textarea
                        className="w-full min-h-[8rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                        value={editSummaryDraft}
                        onChange={(event) => setEditSummaryDraft(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-muted-foreground text-xs">Strengths (one per line)</label>
                        <textarea
                          className="w-full min-h-[8rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                          value={editStrengthsDraft}
                          onChange={(event) => setEditStrengthsDraft(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-muted-foreground text-xs">Weaknesses (one per line)</label>
                        <textarea
                          className="w-full min-h-[8rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                          value={editWeaknessesDraft}
                          onChange={(event) => setEditWeaknessesDraft(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-muted-foreground text-xs">Issues</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditIssuesDraft((prev) => [
                              ...prev,
                              { id: `issue_${prev.length + 1}`, title: '', description: '', impact: '' },
                            ])
                          }
                        >
                          Add issue
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {editIssuesDraft.map((row, index) => (
                          <div key={`issue-${index}`} className="rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                                value={row.id}
                                onChange={(event) =>
                                  setEditIssuesDraft((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, id: event.target.value } : item)),
                                  )
                                }
                                placeholder="id"
                              />
                              <input
                                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                                value={row.title}
                                onChange={(event) =>
                                  setEditIssuesDraft((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                                  )
                                }
                                placeholder="title"
                              />
                            </div>
                            <textarea
                              className="w-full min-h-[5rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                              value={row.description}
                              onChange={(event) =>
                                setEditIssuesDraft((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                                )
                              }
                              placeholder="description"
                            />
                            <input
                              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                              value={row.impact}
                              onChange={(event) =>
                                setEditIssuesDraft((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, impact: event.target.value } : item)),
                                )
                              }
                              placeholder="impact"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditIssuesDraft((prev) => prev.filter((_, i) => i !== index))}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-muted-foreground text-xs">Quick wins</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditQuickWinsDraft((prev) => [
                              ...prev,
                              { id: `quick_win_${prev.length + 1}`, title: '', description: '', timeframe: '' },
                            ])
                          }
                        >
                          Add quick win
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {editQuickWinsDraft.map((row, index) => (
                          <div key={`quick-win-${index}`} className="rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                                value={row.id}
                                onChange={(event) =>
                                  setEditQuickWinsDraft((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, id: event.target.value } : item)),
                                  )
                                }
                                placeholder="id"
                              />
                              <input
                                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                                value={row.title}
                                onChange={(event) =>
                                  setEditQuickWinsDraft((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                                  )
                                }
                                placeholder="title"
                              />
                            </div>
                            <textarea
                              className="w-full min-h-[5rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                              value={row.description}
                              onChange={(event) =>
                                setEditQuickWinsDraft((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                                )
                              }
                              placeholder="description"
                            />
                            <input
                              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                              value={row.timeframe}
                              onChange={(event) =>
                                setEditQuickWinsDraft((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, timeframe: event.target.value } : item)),
                                )
                              }
                              placeholder="timeframe"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditQuickWinsDraft((prev) => prev.filter((_, i) => i !== index))}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-muted-foreground text-xs">Recommendations</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditRecommendationsDraft((prev) => [
                              ...prev,
                              { id: `recommendation_${prev.length + 1}`, title: '', description: '', impact: '' },
                            ])
                          }
                        >
                          Add recommendation
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {editRecommendationsDraft.map((row, index) => (
                          <div key={`recommendation-${index}`} className="rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                                value={row.id}
                                onChange={(event) =>
                                  setEditRecommendationsDraft((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, id: event.target.value } : item)),
                                  )
                                }
                                placeholder="id"
                              />
                              <input
                                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                                value={row.title}
                                onChange={(event) =>
                                  setEditRecommendationsDraft((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                                  )
                                }
                                placeholder="title"
                              />
                            </div>
                            <textarea
                              className="w-full min-h-[5rem] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                              value={row.description}
                              onChange={(event) =>
                                setEditRecommendationsDraft((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                                )
                              }
                              placeholder="description"
                            />
                            <input
                              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                              value={row.impact}
                              onChange={(event) =>
                                setEditRecommendationsDraft((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, impact: event.target.value } : item)),
                                )
                              }
                              placeholder="impact"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditRecommendationsDraft((prev) => prev.filter((_, i) => i !== index))}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {editJsonError ? <p className="text-[var(--score-1)] text-xs">{editJsonError}</p> : null}
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" onClick={() => void savePhaseResultEditor()} disabled={editJsonBusy}>
                    {editJsonBusy ? 'Saving...' : 'Save result'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditJsonOpen(false)} disabled={editJsonBusy}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <PipelineSummaryFooter pipelineState={pipelineState} isClient={isClient} />
      </div>
    </div>
  );
}
