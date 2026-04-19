import type { AuditCoveragePackage, PipelineEvent } from '../../../data/auditTypes';
import { isExpressLikeAudit } from '../../../lib/audit-execution-plan';
import {
  EXPRESS_MAX_PHASE,
  getPhaseStatus,
  type PhSt,
} from '../../../lib/pipeline-monitor-helpers';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { PHASE_META } from '../phase-meta';
import type { PhaseView } from '../types';
import type { PipelineReview, PipelineStateLite } from '../types-pipeline-state';
import { mapPhaseEventsToLogEntries } from '../mappers/pipeline-events.mapper';

type AuditLite = {
  meta?: {
    status?: string;
    execution_plan?: {
      coverage_package?: AuditCoveragePackage;
      include_strategy?: boolean;
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
}): PhaseView[] {
  const { pipelineState, audit, isExpress } = args;
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
    );
    const phaseEvents = events.filter((event: PipelineEvent) => event.phase === meta.id);

    return {
      id: meta.id,
      name: meta.name,
      label: `${PM.phasePrefix} ${meta.id}`,
      icon: meta.icon,
      status,
      score: domainData?.score ?? null,
      wing: meta.wing,
      log: mapPhaseEventsToLogEntries(phaseEvents),
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
