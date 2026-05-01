import { ArrowsClockwise } from '@phosphor-icons/react';

import { Button } from '../../components/ui/button';
import type { AuditTimelineDto } from '../../data/api/audits-orchestration';
import { ApiError } from '../../data/api-error';
import {
  formatManifestStateForClient,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
} from '../../config/orchestration-roadmap-ui-copy.en';
import {
  OrchestrationEvidenceTaxonomyBadges,
  OrchestrationTimelineProvenanceBadges,
  type OrchestrationEvidenceTaxonomy,
} from '../../lib/orchestration-node-badges';

export type TimelineLaneItem = AuditTimelineDto['lanes'][number]['items'][number];

export function formatTimelineLoadError(err: unknown): string | null {
  if (err == null) return null;
  if (err instanceof ApiError) {
    const code = err.code ? ` (${err.code})` : '';
    return `${err.message}${code}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function degradedDataGapsFallbackLine(
  code: NonNullable<NonNullable<AuditTimelineDto['data_gaps']>['fallback_reason_code']>,
): string {
  if (code === 'director_slice_missing') return ORCHESTRATION_UI_COPY.timelineDegradedFallbackDirectorMissing;
  if (code === 'director_slice_partial') return ORCHESTRATION_UI_COPY.timelineDegradedFallbackDirectorPartial;
  return ORCHESTRATION_UI_COPY.timelineDegradedFallbackDirectorInvalid;
}

export function buildPlanSnapshotLines(timeline: AuditTimelineDto, isClient: boolean): string[] {
  const v = timeline.version;
  const parts: string[] = [];
  parts.push(`${ORCHESTRATION_UI_COPY.timelineRoadmapVersionPrefix.trim()}${v.roadmap_version}`);
  if (v.season_preset) {
    parts.push(ORCHESTRATION_SEASON_LABELS[v.season_preset]);
  }
  parts.push(
    isClient
      ? formatManifestStateForClient(v.manifest_state)
      : `${ORCHESTRATION_UI_COPY.timelineManifestStateLabel} ${v.manifest_state}`,
  );
  return parts;
}

export function collectMilestoneNodeRows(
  milestone: { unlocks: string[] },
  top7d: string[],
  top30d: string[],
): Array<{ id: string; bucket: '7d' | '30d' }> {
  const want = new Set(milestone.unlocks);
  const rows: Array<{ id: string; bucket: '7d' | '30d' }> = [];
  for (const x of top7d) {
    if (want.has(x)) rows.push({ id: x, bucket: '7d' });
  }
  for (const x of top30d) {
    if (want.has(x)) rows.push({ id: x, bucket: '30d' });
  }
  return rows;
}

export type TopActionItemRowProps = {
  nid: string;
  readNodeTitle: (id: string) => string;
  nodeById: Map<string, TimelineLaneItem>;
  nodeProvenanceById: Map<string, { source?: 'strategy' | 'director'; analysis_depth?: 'baseline' | 'deep' }>;
  evidenceTaxonomyByNodeId: Map<string, OrchestrationEvidenceTaxonomy | undefined>;
  clientTimelinePackOneClickCta: boolean;
  executionPackPendingNodeId: string | null;
  onRequestExecutionPack: (id: string) => void;
  canMarkInitiative: boolean;
  initiativeMarkPendingId: string | null;
  onMarkInitiative: (id: string) => void;
  markBadgeLabel: string;
  isMarkedNextStep: boolean;
  bucketForAria: string;
};

export function TopActionItemRow({
  nid,
  readNodeTitle,
  nodeById,
  nodeProvenanceById,
  evidenceTaxonomyByNodeId,
  clientTimelinePackOneClickCta,
  executionPackPendingNodeId,
  onRequestExecutionPack,
  canMarkInitiative,
  initiativeMarkPendingId,
  onMarkInitiative,
  markBadgeLabel,
  isMarkedNextStep,
  bucketForAria,
}: TopActionItemRowProps) {
  return (
    <li className="rounded-md border border-border px-2 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <span>{readNodeTitle(nid)}</span>
          {isMarkedNextStep ? (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[length:var(--text-2xs)] font-medium text-success">
              {markBadgeLabel}
            </span>
          ) : null}
          <OrchestrationTimelineProvenanceBadges {...(nodeProvenanceById.get(nid) ?? {})} />
          <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(nid)} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canMarkInitiative ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex shrink-0"
              disabled={initiativeMarkPendingId === nid}
              aria-busy={initiativeMarkPendingId === nid}
              onClick={() => void onMarkInitiative(nid)}
            >
              {initiativeMarkPendingId === nid ? (
                <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {initiativeMarkPendingId === nid
                ? ORCHESTRATION_UI_COPY.initiativeMarkNextStepBusy
                : ORCHESTRATION_UI_COPY.initiativeMarkNextStepCta}
            </Button>
          ) : null}
          {clientTimelinePackOneClickCta ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex shrink-0 items-center gap-1"
              disabled={executionPackPendingNodeId === nid}
              aria-busy={executionPackPendingNodeId === nid}
              onClick={() => void onRequestExecutionPack(nid)}
              aria-label={`${ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaAriaLabel} ${readNodeTitle(nid)} (${bucketForAria})`}
            >
              {executionPackPendingNodeId === nid ? (
                <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {executionPackPendingNodeId === nid
                ? ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaBusy
                : ORCHESTRATION_UI_COPY.executionPackFromTimelineCta}
            </Button>
          ) : null}
        </div>
      </div>
      {nodeById.get(nid)?.explain ? <TimelineDecisionCard explain={nodeById.get(nid)!.explain!} /> : null}
    </li>
  );
}

export function TimelineDecisionCard({
  explain,
}: {
  explain: NonNullable<NonNullable<AuditTimelineDto['lanes'][number]['items'][number]['explain']>>;
}) {
  const hasWhy = (explain.why?.length ?? 0) > 0;
  const hasHow = Boolean(explain.how?.description);
  const hasTime = Boolean(explain.time?.bucket || explain.time?.target_window_days || explain.time?.time_to_value);
  const hasImpact = Boolean(explain.impact?.score != null || explain.impact?.label);
  const hasRisks = (explain.risks?.length ?? 0) > 0;
  if (!hasWhy && !hasHow && !hasTime && !hasImpact && !hasRisks) return null;
  return (
    <details className="mt-2 rounded-md border border-border bg-card px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-foreground">{ORCHESTRATION_UI_COPY.timelineDecisionCardSummary}</summary>
      {explain.limited_context ? (
        <div className="mt-2 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide text-muted-foreground">
          {ORCHESTRATION_UI_COPY.timelineLimitedContextBadge}
        </div>
      ) : null}
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
        {hasWhy ? (
          <div>
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.timelineDecisionWhyLabel}</div>
            <ul className="mt-1 list-disc pl-4">
              {(explain.why ?? []).map((row, idx) => (
                <li key={`why-${idx}`}>{row}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasHow ? (
          <div>
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.timelineDecisionHowLabel}</div>
            <p>{explain.how?.description}</p>
            {explain.how?.path_type || explain.how?.time_estimate ? (
              <p className="text-muted-foreground">
                {[explain.how?.path_type, explain.how?.time_estimate].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        ) : null}
        {hasTime ? (
          <div>
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.timelineDecisionTimeLabel}</div>
            <p>
              {[explain.time?.bucket, explain.time?.target_window_days ? `${explain.time.target_window_days}d` : null, explain.time?.time_to_value]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ) : null}
        {hasImpact ? (
          <div>
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.timelineDecisionImpactLabel}</div>
            <p>{[explain.impact?.label, explain.impact?.score != null ? `score ${explain.impact.score}` : null].filter(Boolean).join(' · ')}</p>
          </div>
        ) : null}
        {hasRisks ? (
          <div>
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.timelineDecisionRisksLabel}</div>
            <ul className="mt-1 list-disc pl-4">
              {(explain.risks ?? []).map((row, idx) => (
                <li key={`risk-${idx}`}>{row}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
