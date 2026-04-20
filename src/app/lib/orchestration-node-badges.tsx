import { Badge } from '../components/ui/badge';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';

function findOrchestrationNode(pack: GlcOrchestrationPackView, nodeId: string) {
  return pack.graph.nodes.find(n => n.id === nodeId);
}

export type OrchestrationNodeProvenance = {
  source?: 'strategy' | 'director';
  analysis_depth?: 'baseline' | 'deep';
};

/**
 * Provenance badges for timeline / portal lists (labels from `ORCHESTRATION_UI_COPY`).
 */
export function OrchestrationTimelineProvenanceBadges({
  source,
  analysis_depth,
}: OrchestrationNodeProvenance) {
  if (!source && !analysis_depth) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {analysis_depth === 'baseline' ? (
        <Badge variant="secondary" className="text-[length:var(--text-2xs)] font-normal">
          {ORCHESTRATION_UI_COPY.nodeBadgeBaseline}
        </Badge>
      ) : null}
      {analysis_depth === 'deep' ? (
        <Badge variant="default" className="text-[length:var(--text-2xs)] font-normal">
          {ORCHESTRATION_UI_COPY.nodeBadgeDeep}
        </Badge>
      ) : null}
      {source === 'director' ? (
        <Badge variant="outline" className="text-[length:var(--text-2xs)] font-normal">
          {ORCHESTRATION_UI_COPY.nodeBadgeDirector}
        </Badge>
      ) : null}
      {source === 'strategy' ? (
        <Badge variant="outline" className="text-[length:var(--text-2xs)] font-normal">
          {ORCHESTRATION_UI_COPY.nodeBadgeStrategy}
        </Badge>
      ) : null}
    </span>
  );
}

/**
 * Data-driven badges for director baseline/deep actions (ADR client unified roadmap).
 */
export function OrchestrationNodeBadgesInline({
  pack,
  nodeId,
}: {
  pack: GlcOrchestrationPackView;
  nodeId: string;
}) {
  const node = findOrchestrationNode(pack, nodeId);
  if (!node || node.source !== 'director') return null;
  return <OrchestrationTimelineProvenanceBadges source="director" analysis_depth={node.analysis_depth} />;
}
