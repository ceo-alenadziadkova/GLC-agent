import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';

export function EvidenceDrilldownPanel({
  pack,
  nodeId,
}: {
  pack: GlcOrchestrationPackView;
  nodeId: string;
}) {
  const node = pack.graph.nodes.find(n => n.id === nodeId);
  if (!node?.evidence_taxonomy) return null;
  const t = node.evidence_taxonomy;
  const refs = node.evidence_refs ?? [];
  return (
    <div
      className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] p-3"
      role="region"
      aria-label={ORCHESTRATION_UI_COPY.evidenceTaxonomyGroupAriaLabel}
    >
      <div className="text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.evidenceDrilldownTitle}</div>
      <ul className="mt-2 space-y-2 text-xs ds-text-secondary">
        <li>
          <span className="font-medium ds-text-primary">{ORCHESTRATION_UI_COPY.evidenceTaxonomyObservedTitle}</span>: {t.observed}
        </li>
        <li>
          <span className="font-medium ds-text-primary">{ORCHESTRATION_UI_COPY.evidenceTaxonomyDerivedTitle}</span>: {t.derived}
        </li>
        <li>
          <span className="font-medium ds-text-primary">{ORCHESTRATION_UI_COPY.evidenceTaxonomyAssumedTitle}</span>: {t.assumed}
        </li>
        <li>
          <span className="font-medium ds-text-primary">{ORCHESTRATION_UI_COPY.evidenceTaxonomyMissingTitle}</span>: {t.missing}
        </li>
      </ul>
      {refs.length > 0 ? (
        <div className="mt-3">
          <div className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide ds-text-tertiary">
            {ORCHESTRATION_UI_COPY.evidenceRefsLabel}
          </div>
          <ul className="mt-1 list-inside list-disc space-y-1 text-[length:var(--text-2xs)] ds-text-secondary">
            {refs.slice(0, 12).map((r) => (
              <li key={r} className="font-mono">
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-[length:var(--text-2xs)] ds-text-tertiary">{ORCHESTRATION_UI_COPY.evidenceRefsEmpty}</p>
      )}
    </div>
  );
}
