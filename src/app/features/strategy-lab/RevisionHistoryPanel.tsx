import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import type { OrchestrationPackRevisionHistoryItemDto } from '../../data/api/audits-orchestration';

export function RevisionHistoryPanel({
  items,
}: {
  items: OrchestrationPackRevisionHistoryItemDto[];
}) {
  const visible = items.slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffHistoryItems);
  if (visible.length === 0) return null;
  return (
    <div className="bg-background space-y-2 rounded-lg border p-3">
      <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.revisionHistoryTitle}</div>
      <ul className="text-muted-foreground space-y-2 text-xs">
        {visible.map((row) => (
          <li
            key={`${row.from_version}-${row.to_version}`}
            className="border-border flex flex-col gap-1 rounded-md border px-2 py-1"
          >
            <span className="text-foreground font-mono text-[11px]">
              v{row.from_version} → v{row.to_version}
            </span>
            <span>
              Nodes +{row.diff.nodes_added.length} / −{row.diff.nodes_removed.length} · Edges +{row.diff.edges_added.length} / −
              {row.diff.edges_removed.length}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
