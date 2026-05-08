import { ORCHESTRATION_LANE_LABELS } from '../../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationLaneId } from '../../../config/orchestration-roadmap-ui-copy.en';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';
import type {
  OrchestrationRoadmapNodeProjection,
  OrchestrationTimelineTimeBucket,
} from '../../../lib/orchestration-timeline-projection';

const BUCKET_ORDER: OrchestrationTimelineTimeBucket[] = ['now', 'next', 'later'];

function bucketHeading(id: OrchestrationTimelineTimeBucket): string {
  if (id === 'now') return PLAN_BOARD_COPY.bucketNowColumnTitle;
  if (id === 'next') return PLAN_BOARD_COPY.bucketNextColumnTitle;
  return PLAN_BOARD_COPY.bucketLaterColumnTitle;
}

export function BoardHorizonBucketsSection(props: {
  byBucket: Record<OrchestrationTimelineTimeBucket, OrchestrationRoadmapNodeProjection[]>;
  titles: Map<string, string>;
  nodeById: Map<string, GlcOrchestrationPackView['graph']['nodes'][number]>;
}) {
  const { byBucket, titles, nodeById } = props;

  return (
    <section aria-labelledby="plan-board-horizon-heading" className="space-y-3">
      <div>
        <h2 id="plan-board-horizon-heading" className="text-foreground text-lg font-semibold tracking-tight">
          {PLAN_BOARD_COPY.horizonSectionTitle}
        </h2>
        <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.horizonSectionSubtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {BUCKET_ORDER.map((bucket) => (
          <div
            key={bucket}
            aria-label={bucketHeading(bucket)}
            className="bg-card border-border flex min-h-[length:var(--portal-plan-horizon-min-height)] flex-col rounded-lg border"
          >
            <header className="border-border border-b px-3 py-2">
              <div className="text-foreground text-sm font-semibold">{bucketHeading(bucket)}</div>
            </header>
            <ul className="flex flex-col gap-2 p-3">
              {byBucket[bucket].length === 0 ? (
                <li className="text-muted-foreground text-xs">—</li>
              ) : (
                byBucket[bucket].map((row) => {
                  const node = nodeById.get(row.node_id);
                  const lane = node?.lane as OrchestrationLaneId | undefined;
                  const laneLabel = lane ? ORCHESTRATION_LANE_LABELS[lane] : null;
                  return (
                    <li key={row.node_id} className="bg-muted/40 border-border rounded-md border px-3 py-2">
                      <div className="text-foreground text-sm font-medium leading-snug">{titles.get(row.node_id) ?? row.node_id}</div>
                      {laneLabel ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {PLAN_BOARD_COPY.laneLabelPrefix}: {laneLabel}
                        </div>
                      ) : null}
                      <div className="text-muted-foreground mt-1 text-[length:var(--text-2xs)]">{PLAN_BOARD_COPY.criticalPathBadge}</div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
