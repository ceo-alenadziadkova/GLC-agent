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
export type OrchestrationEvidenceTaxonomy = {
  observed: number;
  derived: number;
  assumed: number;
  missing: number;
};

/**
 * Director evidence taxonomy (Observed / Derived / Assumed / Missing) as compact count badges.
 */
export function OrchestrationEvidenceTaxonomyBadges({
  taxonomy,
}: {
  taxonomy?: OrchestrationEvidenceTaxonomy | null;
}) {
  if (!taxonomy) return null;
  const { observed, derived, assumed, missing } = taxonomy;
  if (observed + derived + assumed + missing === 0) return null;
  const C = ORCHESTRATION_UI_COPY;
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1 align-middle"
      aria-label={C.evidenceTaxonomyGroupAriaLabel}
    >
      {observed > 0 ? (
        <Badge
          variant="secondary"
          className="text-[length:var(--text-2xs)] font-normal"
          title={C.evidenceTaxonomyObservedTitle}
        >
          {observed} {C.evidenceTaxonomyObservedAbbr}
        </Badge>
      ) : null}
      {derived > 0 ? (
        <Badge
          variant="secondary"
          className="text-[length:var(--text-2xs)] font-normal"
          title={C.evidenceTaxonomyDerivedTitle}
        >
          {derived} {C.evidenceTaxonomyDerivedAbbr}
        </Badge>
      ) : null}
      {assumed > 0 ? (
        <Badge variant="outline" className="text-[length:var(--text-2xs)] font-normal" title={C.evidenceTaxonomyAssumedTitle}>
          {assumed} {C.evidenceTaxonomyAssumedAbbr}
        </Badge>
      ) : null}
      {missing > 0 ? (
        <Badge variant="outline" className="text-[length:var(--text-2xs)] font-normal" title={C.evidenceTaxonomyMissingTitle}>
          {missing} {C.evidenceTaxonomyMissingAbbr}
        </Badge>
      ) : null}
    </span>
  );
}

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

/** Evidence taxonomy from pack graph node (V6). */
export function OrchestrationEvidenceTaxonomyBadgesInline({
  pack,
  nodeId,
}: {
  pack: GlcOrchestrationPackView;
  nodeId: string;
}) {
  const node = findOrchestrationNode(pack, nodeId);
  return <OrchestrationEvidenceTaxonomyBadges taxonomy={node?.evidence_taxonomy} />;
}
