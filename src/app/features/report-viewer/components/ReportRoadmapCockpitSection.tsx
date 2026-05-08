import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Compass } from '@phosphor-icons/react';

import { Button } from '../../../components/ui/button';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import type { AuditState } from '../../../data/auditTypes';
import { REPORT_VIEWER_CONSTANTS } from '../config/report-viewer.constants';
import { REPORT_VIEWER_COPY, formatRoadmapCockpitCoverageLine } from '../config/report-viewer.copy.en';
import type { ReportPageViewModel } from '../domain/types';
import { isGlcOrchestrationPackView } from '../../../lib/orchestration-pack-guards';

type ReportRoadmapCockpitSectionProps = {
  audit: AuditState;
  reportVm: ReportPageViewModel;
  manifestHref: string;
  compareHref: string;
  hasOrchestrationPack: boolean;
  audience?: 'consultant' | 'portal';
};

export function ReportRoadmapCockpitSection({
  audit,
  reportVm,
  manifestHref,
  compareHref,
  hasOrchestrationPack,
  audience = 'consultant',
}: ReportRoadmapCockpitSectionProps) {
  const { pathname } = useLocation();
  const anchorIds = REPORT_VIEWER_CONSTANTS.roadmapCockpit.anchors;
  const maxDx = REPORT_VIEWER_CONSTANTS.roadmapCockpit.maxDiagnosisIssues;
  const primaryIssue = (reportVm.criticalIssues ?? []).slice(0, maxDx)[0];
  const diagnosis = primaryIssue?.title ?? null;

  const inContract =
    audit.meta.execution_plan?.selected_domains?.length ??
    reportVm.coverage?.plannedDomains?.length ??
    reportVm.coverage?.coveredDomains?.length ??
    0;
  const totalDomains = REPORT_VIEWER_CONSTANTS.totalDomainCount;
  const lastDiff = audit.strategy?.glc_orchestration_last_revision_diff ?? null;
  const changedNodesCount = (lastDiff?.nodes_added.length ?? 0) + (lastDiff?.nodes_removed.length ?? 0);
  const changedDependenciesCount = (lastDiff?.edges_added.length ?? 0) + (lastDiff?.edges_removed.length ?? 0);
  const pack = isGlcOrchestrationPackView(audit.strategy?.glc_orchestration_pack)
    ? audit.strategy.glc_orchestration_pack
    : null;
  const baselineNodesCount =
    pack?.graph.nodes.filter(node => node.source === 'director' && node.analysis_depth !== 'deep').length ?? 0;
  const deepNodesCount =
    pack?.graph.nodes.filter(node => node.source === 'director' && node.analysis_depth === 'deep').length ?? 0;
  const showFallbackQualityHint = pack?.input_quality?.degraded ?? false;

  const showAdvancedCtas = audience === 'consultant';

  return (
    <motion.div
      id={anchorIds.cockpit}
      initial={{ opacity: 0, y: REPORT_VIEWER_CONSTANTS.motion.cardEnterOffsetY }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: REPORT_VIEWER_CONSTANTS.motion.cardEnterDurationSec }}
      className="glc-card p-5 ds-radius-xl space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="text-info h-5 w-5" />
          <SectionLabel>{REPORT_VIEWER_COPY.roadmapCockpit.sectionTitle}</SectionLabel>
        </div>
      </div>
      <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">{REPORT_VIEWER_COPY.roadmapCockpit.sectionHint}</p>

      <div className="space-y-1 border-t border-[var(--border-default)] pt-4">
        <div className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
          {REPORT_VIEWER_COPY.roadmapCockpit.diagnosisLabel}
        </div>
        <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">
          {diagnosis ?? REPORT_VIEWER_COPY.roadmapCockpit.diagnosisFallback}
        </p>
      </div>

      <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
        {formatRoadmapCockpitCoverageLine(inContract, totalDomains)}
      </p>
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
        <div className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
          {REPORT_VIEWER_COPY.roadmapCockpit.latestPlanChangeLabel}
        </div>
        {lastDiff ? (
          <p className="mt-1 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
            v{lastDiff.from_version} {'->'} v{lastDiff.to_version} · {REPORT_VIEWER_COPY.roadmapCockpit.changedNodesLabel}:{' '}
            {changedNodesCount} · {REPORT_VIEWER_COPY.roadmapCockpit.changedDependenciesLabel}: {changedDependenciesCount} ·{' '}
            {REPORT_VIEWER_COPY.roadmapCockpit.changedCriticalPathLabel}:{' '}
            {lastDiff.critical_path_changed
              ? REPORT_VIEWER_COPY.roadmapCockpit.changedCriticalPathYes
              : REPORT_VIEWER_COPY.roadmapCockpit.changedCriticalPathNo}
          </p>
        ) : (
          <p className="mt-1 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
            {REPORT_VIEWER_COPY.roadmapCockpit.latestPlanChangeFallback}
          </p>
        )}
      </div>
      {pack && (
        <div className="space-y-1">
          <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
            {REPORT_VIEWER_COPY.roadmapCockpit.provenanceLabel}: {REPORT_VIEWER_COPY.roadmapCockpit.baselineLabel}{' '}
            {baselineNodesCount} · {REPORT_VIEWER_COPY.roadmapCockpit.deepLabel} {deepNodesCount}
          </p>
          {showFallbackQualityHint ? (
            <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
              {REPORT_VIEWER_COPY.roadmapCockpit.qualityFallbackLabel}. {REPORT_VIEWER_COPY.roadmapCockpit.qualityFallbackHint}
            </p>
          ) : null}
        </div>
      )}

      {!hasOrchestrationPack && (
        <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">{REPORT_VIEWER_COPY.roadmapCockpit.noPackCallout}</p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-[var(--border-default)] pt-4">
        <Button asChild variant="outline" size="sm" className="no-underline">
          <Link to={manifestHref}>{REPORT_VIEWER_COPY.roadmapCockpit.ctaManifest}</Link>
        </Button>
        {hasOrchestrationPack && showAdvancedCtas ? (
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={compareHref}>{REPORT_VIEWER_COPY.roadmapCockpit.ctaCompare}</Link>
          </Button>
        ) : null}
        {showAdvancedCtas ? (
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={`${pathname}#${anchorIds.domainScorecard}`}>{REPORT_VIEWER_COPY.roadmapCockpit.ctaScorecard}</Link>
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
