import { Link } from 'react-router';
import { motion } from 'motion/react';
import { CalendarBlank, GitBranch, Path } from '@phosphor-icons/react';

import { SectionLabel } from '../../../components/glc/SectionLabel';
import { Button } from '../../../components/ui/button';
import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';
import { OrchestrationNodeBadgesInline } from '../../../lib/orchestration-node-badges';
import {
  orchestrationNodeTitleMap,
  prioritizeCrossLaneEdges,
  projectCriticalPathToTimelineBuckets,
} from '../../../lib/orchestration-timeline-projection';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import { visibleOrchestrationLanesForPack } from '../../../config/orchestration-client-roadmap-lanes';
import type { DomainKey } from '@glc/intake-core';

export type OrchestrationRoadmapPresentationalCopy = {
  sectionTitle: string;
  sectionHint: string;
  versionLabel: string;
  openStrategyLab: string;
  dependencyTitle: string;
  dependencyHint: string;
};

export type OrchestrationRoadmapPresentationalProps = {
  pack: GlcOrchestrationPackView;
  packVersion?: number | null;
  strategyLabHref: string;
  /** Ordered lane ids to consider; empty lanes are skipped. */
  laneOrder: readonly OrchestrationLaneId[];
  selectedDomains?: readonly DomainKey[] | null;
  maxDependencyLinks: number;
  showOpenLabButton: boolean;
  copy: OrchestrationRoadmapPresentationalCopy;
  motionCardEnterOffsetY: number;
  motionCardEnterDurationSec: number;
  /** Anchor for in-page links from Lab / cockpit. */
  domId?: string;
};

export function OrchestrationRoadmapPresentational({
  pack,
  packVersion,
  strategyLabHref,
  laneOrder,
  selectedDomains,
  maxDependencyLinks,
  showOpenLabButton,
  copy,
  motionCardEnterOffsetY,
  motionCardEnterDurationSec,
  domId,
}: OrchestrationRoadmapPresentationalProps) {
  const nodeLink = (nodeId: string) => `${strategyLabHref}?node=${encodeURIComponent(nodeId)}`;
  const bucketTitles = {
    near: ORCHESTRATION_UI_COPY.bucketNear,
    mid: ORCHESTRATION_UI_COPY.bucketMid,
    far: ORCHESTRATION_UI_COPY.bucketFar,
  };
  const timelineBuckets = projectCriticalPathToTimelineBuckets(pack, bucketTitles);
  const titleById = orchestrationNodeTitleMap(pack);
  const edgeRows = prioritizeCrossLaneEdges(pack).slice(0, maxDependencyLinks);
  const lanesToShow = visibleOrchestrationLanesForPack(pack.lanes, laneOrder, selectedDomains);
  const selectedScopeCount = selectedDomains?.length ?? 0;
  const danglingDataGaps = pack.conflicts_resolved.filter(row => row.id.startsWith('orphan-dep:')).length;
  const targetWindowDays =
    pack.graph.nodes.find(node => typeof node.target_window_days === 'number')?.target_window_days ?? null;

  return (
    <motion.div
      id={domId}
      initial={{ opacity: 0, y: motionCardEnterOffsetY }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionCardEnterDurationSec }}
      className="glc-card p-5 ds-radius-xl space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Path className="text-info h-5 w-5" />
          <SectionLabel>{copy.sectionTitle}</SectionLabel>
        </div>
        {showOpenLabButton ? (
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={strategyLabHref}>{copy.openStrategyLab}</Link>
          </Button>
        ) : null}
      </div>
      <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">{copy.sectionHint}</p>
      {selectedScopeCount > 0 ? (
        <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          Scope: {selectedScopeCount} selected domain{selectedScopeCount > 1 ? 's' : ''}
        </p>
      ) : null}
      {typeof packVersion === 'number' && packVersion > 0 && (
        <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          {copy.versionLabel}: {packVersion}
        </p>
      )}
      {pack.input_quality?.degraded ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
          <div className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
            {ORCHESTRATION_UI_COPY.dataGapsTitle}
          </div>
          <p className="mt-1 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
            {ORCHESTRATION_UI_COPY.dataGapFallback}
            {pack.input_quality.fallback_reason_code === 'director_slice_partial'
              ? ` ${ORCHESTRATION_UI_COPY.dataGapDirectorPartial}`
              : ` ${ORCHESTRATION_UI_COPY.dataGapDirectorMissing}`}
          </p>
          {danglingDataGaps > 0 ? (
            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
              Dangling dependencies detected: {danglingDataGaps}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-[var(--border-default)] pt-4">
        <CalendarBlank className="text-info h-4 w-4" />
        <span className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)]">
          {ORCHESTRATION_UI_COPY.timelineTitle}
        </span>
      </div>
      <p className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">{ORCHESTRATION_UI_COPY.timelineHint}</p>
      {targetWindowDays ? (
        <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          Planning window: {targetWindowDays} days
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {timelineBuckets.map(bucket => (
          <div key={bucket.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
            <div className="mb-2 text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">{bucket.title}</div>
            <ul className="space-y-1 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">
              {bucket.nodeIds.length === 0 && <li>—</li>}
              {bucket.nodeIds.map(id => (
                <li key={id} className="flex flex-wrap items-center gap-1">
                  <span>{titleById.get(id) ?? id}</span>
                  <OrchestrationNodeBadgesInline pack={pack} nodeId={id} />
                  <Link className="text-info underline-offset-2 hover:underline" to={nodeLink(id)}>
                    {ORCHESTRATION_UI_COPY.openNodeInLab}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
          {ORCHESTRATION_UI_COPY.lanesTitle}
        </div>
        <div className="space-y-2">
          {lanesToShow.map(laneKey => {
            const ids = pack.lanes[laneKey] ?? [];
            return (
              <div
                key={laneKey}
                className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-[length:var(--text-xs)]"
              >
                <span className="font-medium text-[var(--text-primary)]">{ORCHESTRATION_LANE_LABELS[laneKey]}</span>
                <ul className="mt-1 list-inside list-disc text-[var(--text-tertiary)]">
                  {ids.map(id => (
                    <li key={id} className="flex flex-wrap items-center gap-1">
                      <span>{titleById.get(id) ?? id}</span>
                      <OrchestrationNodeBadgesInline pack={pack} nodeId={id} />
                      <Link className="text-info underline-offset-2 hover:underline" to={nodeLink(id)}>
                        {ORCHESTRATION_UI_COPY.openNodeInLab}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {edgeRows.length > 0 && (
        <div className="border-t border-[var(--border-default)] pt-4">
          <div className="mb-1 flex items-center gap-2">
            <GitBranch className="text-info h-4 w-4" />
            <span className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
              {copy.dependencyTitle}
            </span>
          </div>
          <p className="mb-2 text-[length:var(--text-xs)] text-[var(--text-tertiary)]">{copy.dependencyHint}</p>
          <ul className="space-y-1 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
            {edgeRows.map((e, i) => (
              <li key={`${e.from}-${e.to}-${i}`}>
                {titleById.get(e.from) ?? e.from}
                <span className="text-[var(--text-tertiary)]"> → </span>
                {titleById.get(e.to) ?? e.to}
                {e.relation ? (
                  <span className="text-[var(--text-tertiary)]"> ({e.relation})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
