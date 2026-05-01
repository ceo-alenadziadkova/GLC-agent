import type { AuditCoveragePackage, DomainKey, PipelineEvent } from '../../../data/auditTypes';
import { isExpressLikeAudit, plannedExecutionPhaseIdSet } from '../../../lib/audit-execution-plan';
import {
  EXPRESS_MAX_PHASE,
  getPhaseStatus,
  type PhSt,
} from '../../../lib/pipeline-monitor-helpers';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { PHASE_META } from '../phase-meta';
import type { PhaseView } from '../types';
import type { PipelineReview, PipelineStateLite } from '../types-pipeline-state';
import { mapPhaseEventsToClientPortalLogEntries, mapPhaseEventsToLogEntries } from '../mappers/pipeline-events.mapper';

type AuditLite = {
  meta?: {
    status?: string;
    execution_plan?: {
      coverage_package?: AuditCoveragePackage;
      include_strategy?: boolean;
      selected_domains?: DomainKey[];
    } | null;
  };
  domains?: Record<string, { status: string; score: number } | null>;
} | null;

export function selectIsExpressAudit(audit: AuditLite): boolean {
  return audit?.meta ? isExpressLikeAudit(audit.meta) : false;
}

export function selectPhaseViews(args: {
  pipelineState: PipelineStateLite | null;
  audit: AuditLite;
  isExpress: boolean;
  isClientPortal?: boolean;
}): PhaseView[] {
  const { pipelineState, audit, isExpress, isClientPortal = false } = args;
  if (!pipelineState || !audit) {
    return PHASE_META.map(meta => ({
      id: meta.id,
      name: meta.name,
      label: `${PM.phasePrefix} ${meta.id}`,
      icon: meta.icon,
      status: (isExpress && meta.id > EXPRESS_MAX_PHASE ? 'skipped' : 'pending') as PhSt,
      score: null,
      wing: meta.wing,
      log: [],
      skipped: isExpress && meta.id > EXPRESS_MAX_PHASE,
    }));
  }

  const reviews = pipelineState.reviews || [];
  const events = pipelineState.events || [];
  const plannedPhaseIds =
    audit?.meta?.execution_plan && (audit.meta.execution_plan.selected_domains?.length ?? 0) > 0
      ? plannedExecutionPhaseIdSet(audit.meta)
      : null;

  return PHASE_META.map(meta => {
    const domainData = meta.domainKey
      ? (audit.domains as Record<string, { status: string; score: number } | null>)[meta.domainKey]
      : null;
    const domainStatus = domainData?.status ?? null;
    const status = getPhaseStatus(
      meta.id,
      pipelineState.current_phase,
      pipelineState.status,
      reviews,
      isExpress,
      domainStatus,
      plannedPhaseIds,
    );
    const phaseEvents = events.filter((event: PipelineEvent) => event.phase === meta.id);
    const log = isClientPortal
      ? mapPhaseEventsToClientPortalLogEntries(phaseEvents)
      : mapPhaseEventsToLogEntries(phaseEvents);

    return {
      id: meta.id,
      name: meta.name,
      label: `${PM.phasePrefix} ${meta.id}`,
      icon: meta.icon,
      status,
      score: domainData?.score ?? null,
      wing: meta.wing,
      log,
      skipped: status === 'skipped',
    };
  });
}

export function selectReviewForPhase(reviews: PipelineReview[], afterPhase: number): PipelineReview {
  return (
    reviews.find(review => review.after_phase === afterPhase) ?? {
      after_phase: afterPhase,
      status: 'pending',
      consultant_notes: null,
      interview_notes: null,
    }
  );
}

export function selectPipelineProgressPct(phases: PhaseView[]): number {
  const activePhases = phases.filter(phase => !phase.skipped);
  if (activePhases.length === 0) return 0;
  const completedCount = activePhases.filter(phase => phase.status === 'completed').length;
  return Math.round((completedCount / activePhases.length) * 100);
}
