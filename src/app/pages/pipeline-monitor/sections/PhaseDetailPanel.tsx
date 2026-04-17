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
import { ScoreBadge } from '../../../components/glc/ScoreBadge';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { StatusPill } from '../../../components/glc/StatusPill';
import { Callout } from '../../../components/ui/callout';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { UI_SEMANTIC_COLORS } from '../../../config/ui-semantic-colors';
import { ANALYTIC_WING_IDS, AUTO_WING_IDS } from '../../../lib/pipeline-monitor-helpers';
import { ParallelWingBanner } from '../PipelineMonitorPhaseUi';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import type { PhaseView } from '../types';
import type { PipelineStateLite } from '../types-pipeline-state';
import { PipelineSummaryFooter } from './PipelineSummaryFooter';

export function PhaseDetailPanel(props: {
  selectedPhase: PhaseView;
  phases: PhaseView[];
  pipelineState: PipelineStateLite | null;
  pipeError: string | null;
  isCreated: boolean;
  isClient: boolean;
  isExpress: boolean;
  workspacePath: string;
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
  onStartPipeline: () => void;
  onRunNextPhase: () => void;
}) {
  const {
    selectedPhase,
    phases,
    pipelineState,
    pipeError,
    isCreated,
    isClient,
    isExpress,
    workspacePath,
    governance,
    onStartPipeline,
    onRunNextPhase,
  } = props;
  const Icon = selectedPhase.icon;
  const qualityRunningAuto = phases.some(phase => AUTO_WING_IDS.includes(phase.id) && phase.status === 'running');
  const qualityRunningAnalytic = phases.some(
    phase => ANALYTIC_WING_IDS.includes(phase.id) && phase.status === 'running',
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="max-w-2xl mx-auto px-7 py-6">
        {isCreated && (
          <div className="glc-card p-8 text-center mb-6" style={{ borderRadius: 'var(--radius-xl)' }}>
            <Play className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--glc-blue)' }} />
            <h3
              className="font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}
            >
              {WORKSPACE_PAGE_COPY.pipelineMonitor.startReadyTitle}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
              {isExpress
                ? WORKSPACE_PAGE_COPY.pipelineMonitor.startExpressDescription
                : WORKSPACE_PAGE_COPY.pipelineMonitor.startFullDescription}
            </p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onStartPipeline} className="glc-btn-primary mx-auto">
              <Play className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.pipelineMonitor.startPipelineButton}
            </motion.button>
          </div>
        )}

        {pipeError && (
          <Callout intent="danger" className="mb-4 p-4">
            <p className="text-sm font-medium text-[var(--score-1)]">
              {PM.errorPrefix} {pipeError}
            </p>
          </Callout>
        )}

        <AnimatePresence>
          {qualityRunningAuto && (
            <ParallelWingBanner phases={phases.filter(phase => AUTO_WING_IDS.includes(phase.id))} wingName={PM.parallelWing.autoName} />
          )}
          {qualityRunningAnalytic && (
            <ParallelWingBanner
              phases={phases.filter(phase => ANALYTIC_WING_IDS.includes(phase.id))}
              wingName={PM.parallelWing.analyticName}
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
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    selectedPhase.status === 'completed'
                      ? 'var(--gradient-success)'
                      : selectedPhase.status === 'running'
                        ? 'var(--gradient-brand)'
                        : 'var(--bg-muted)',
                  boxShadow:
                    selectedPhase.status === 'running'
                      ? '0 4px 16px rgba(28,189,255,0.30)'
                      : selectedPhase.status === 'completed'
                        ? '0 4px 16px rgba(14,207,130,0.25)'
                        : 'none',
                }}
              >
                <Icon className="w-6 h-6" style={{ color: selectedPhase.status === 'pending' ? 'var(--text-tertiary)' : 'var(--primary-foreground)' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      letterSpacing: 'var(--tracking-tight)',
                    }}
                  >
                    {selectedPhase.label}: {selectedPhase.name}
                  </h2>
                  <StatusPill status={selectedPhase.status} pulse={selectedPhase.status === 'running'} />
                </div>
                <div className="flex items-center gap-3 mt-1.5" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                  {selectedPhase.score !== null && <ScoreBadge score={selectedPhase.score} showLabel size="md" />}
                </div>
              </div>
            </div>

            {selectedPhase.status === 'running' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--glc-blue-xlight)', border: '1px solid rgba(28,189,255,0.20)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowsClockwise className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--glc-blue-deeper)', fontFamily: 'var(--font-display)' }}>
                    {PM.detail.agentRunning}
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'rgba(28,189,255,0.15)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 0 8px rgba(28,189,255,0.40)' }}
                    initial={{ width: '20%' }}
                    animate={{ width: '75%' }}
                    transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.runningBarDurationSec, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
                  />
                </div>
              </motion.div>
            )}

            {selectedPhase.status === 'pending' && (
              <div className="glc-card p-10 text-center" style={{ borderStyle: 'dashed', borderRadius: 'var(--radius-xl)' }}>
                <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {PM.detail.waitingTitle}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>
                  {PM.detail.waitingSubtitle}
                </p>
              </div>
            )}

            {selectedPhase.status === 'failed' && (
              <Callout intent="danger" className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <WarningCircle className="w-4 h-4 flex-shrink-0" style={{ color: UI_SEMANTIC_COLORS.danger }} />
                  <span className="text-sm font-semibold" style={{ color: UI_SEMANTIC_COLORS.danger, fontFamily: 'var(--font-display)' }}>
                    {PM.detail.domainUnavailableTitle}
                  </span>
                </div>
                <p className="text-xs ml-6" style={{ color: 'var(--text-secondary)' }}>
                  {PM.detail.domainUnavailableBody}
                </p>
              </Callout>
            )}

            {selectedPhase.status === 'completed' && governance.refine && (
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <WarningCircle className="w-4 h-4 flex-shrink-0" style={{ color: UI_SEMANTIC_COLORS.warningAmber }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {PM.detail.governanceRefineTitle}
                  </span>
                </div>
                <p className="text-xs ml-6 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {PM.detail.governanceRefineBody}
                </p>
                <p className="text-xs ml-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {governance.refine.reasoning}
                </p>
              </div>
            )}

            {selectedPhase.status === 'completed' && !governance.refine && governance.controlObject?.decision_hint === 'accept_with_warnings' && (
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--glc-blue-xlight)', border: '1px solid rgba(28,189,255,0.25)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {PM.detail.governanceWarningsTitle}
                  </span>
                </div>
                <p className="text-xs ml-6" style={{ color: 'var(--text-secondary)' }}>
                  {PM.detail.governanceWarningsBody}
                </p>
              </div>
            )}

            {selectedPhase.status === 'completed' && governance.controlObject && (
              <div className="glc-card p-4" style={{ borderRadius: 'var(--radius-xl)' }}>
                <SectionLabel className="mb-2">{PM.detail.governanceSummaryTitle}</SectionLabel>
                {(governance.controlObject.auto_remediation_applied_count ?? 0) > 0 && (
                  <div
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg mb-3 inline-block"
                    style={{
                      backgroundColor: 'rgba(14,207,130,0.12)',
                      color: 'var(--glc-green-dark)',
                      border: '1px solid rgba(14,207,130,0.28)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {PM.detail.governanceAutoRemediationBadge.replace(
                      '{count}',
                      String(governance.controlObject.auto_remediation_applied_count),
                    )}
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <dt>{PM.detail.governanceConfidence}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.confidence.overall}</dd>
                  <dt>{PM.detail.governanceClaims}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.total_claims}</dd>
                  <dt>{PM.detail.governanceHallucination}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.statuses.likely_hallucination}</dd>
                  <dt>{PM.detail.governanceRiskyPromise}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.statuses.risky_promise}</dd>
                </dl>
                {governance.controlObject.human_attention_required.required && (
                  <p className="text-xs mt-3" style={{ color: 'var(--callout-warning-fg)' }}>
                    {PM.detail.governanceHumanAttention}
                    {governance.controlObject.human_attention_required.reasons.length > 0
                      ? `: ${governance.controlObject.human_attention_required.reasons.join(', ')}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            {selectedPhase.log.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--gradient-ink)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: UI_SEMANTIC_COLORS.danger }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--callout-warning-icon)' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--glc-green)' }} />
                  </div>
                  <Terminal className="w-3.5 h-3.5 ml-2" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <span className="glc-label" style={{ color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em' }}>
                    {PM.detail.agentLogPrefix} {selectedPhase.name}
                  </span>
                </div>
                <div className="p-4 space-y-2" style={{ backgroundColor: UI_SEMANTIC_COLORS.codeSurface, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
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
                        className="flex items-start gap-1.5"
                        style={{
                          color: isOk
                            ? UI_SEMANTIC_COLORS.successLight
                            : isErr
                              ? UI_SEMANTIC_COLORS.dangerLight
                              : UI_SEMANTIC_COLORS.slateMuted,
                          lineHeight: 1.6,
                        }}
                      >
                        {isOk ? (
                          <Check size={11} weight="bold" style={{ marginTop: 3, flexShrink: 0 }} />
                        ) : isErr ? (
                          <X size={11} weight="bold" style={{ marginTop: 3, flexShrink: 0 }} />
                        ) : (
                          <CircleNotch size={11} style={{ marginTop: 3, flexShrink: 0 }} />
                        )}
                        <span>{entry.text}</span>
                      </motion.div>
                    );
                  })}
                  {selectedPhase.status === 'running' && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.cursorBlinkDurationSec, repeat: Infinity }}
                      style={{ color: 'var(--glc-blue)', display: 'inline-block' }}
                    >
                      ▌
                    </motion.span>
                  )}
                </div>
              </div>
            )}

            {selectedPhase.status === 'completed' && selectedPhase.score !== null && (
              <div className="glc-card p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                <div className="flex items-center justify-between mb-4">
                  <SectionLabel>{PM.detail.domainScore}</SectionLabel>
                  <ScoreBadge score={selectedPhase.score} showLabel size="lg" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {selectedPhase.status === 'completed' && (
                <Link to={workspacePath} className="glc-btn-secondary" style={{ textDecoration: 'none' }}>
                  {PM.detail.viewInWorkspace} <CaretRight className="w-4 h-4" />
                </Link>
              )}
              {selectedPhase.status === 'review' && !isClient && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onRunNextPhase} className="glc-btn-primary">
                  <Play className="w-4 h-4" /> {PM.detail.continuePipeline}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <PipelineSummaryFooter pipelineState={pipelineState} />
      </div>
    </div>
  );
}
