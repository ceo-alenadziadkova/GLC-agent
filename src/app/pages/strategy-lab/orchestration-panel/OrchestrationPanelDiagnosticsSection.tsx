import type { Dispatch, SetStateAction } from 'react';
import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';
import type {
  GlcOrchestrationPackRevisionDiffView,
  OrchestrationPackRevisionHistoryItemDto,
  OrchestrationPlanGovernanceDto,
} from '../../../data/api/orchestration-types';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_UI_LIMITS } from '../../../config/orchestration-ui-limits';
import { Button } from '../../../components/ui/button';
import { OrchestrationPlanGovernanceCard } from './OrchestrationPlanGovernanceCard';
import { RevisionHistoryPanel } from '../RevisionHistoryPanel';

export type OrchestrationPanelDiagnosticsSectionProps = {
  /** When nested under Advanced, drop the top border spacing. */
  embeddedInAdvanced?: boolean;
  planGovernance: OrchestrationPlanGovernanceDto | null;
  governanceHints: ReadonlyArray<string>;
  pack: GlcOrchestrationPackView | null;
  showRevisionHistorySubsection: boolean;
  revisionHistory: OrchestrationPackRevisionHistoryItemDto[];
  selectedRevisionDiff: GlcOrchestrationPackRevisionDiffView | null;
  roadmapVersionToShow: number;
  revisionDiffCandidates: ReadonlyArray<{ key: string; from_version: number; to_version: number }>;
  selectedRevisionDiffKey: string | null;
  setSelectedRevisionDiffKey: Dispatch<SetStateAction<string | null>>;
  titleById: Map<string, string>;
  analysisDepthFilter: 'all' | 'baseline' | 'deep';
  setAnalysisDepthFilter: Dispatch<SetStateAction<'all' | 'baseline' | 'deep'>>;
  depthFilteredNodes: ReadonlyArray<{
    id: string;
    title: string;
    analysis_depth: 'baseline' | 'deep';
  }>;
  synthesisConflicts: ReadonlyArray<{
    id: string;
    resolution: string;
    summary: string;
  }>;
};

/**
 * Strategy Lab orchestration “Plan quality and history”: governance, revisions, pack inspection.
 * Extracted from {@link StrategyLabOrchestrationPanel} to keep the parent focused on manifest / pack actions.
 */
export function OrchestrationPanelDiagnosticsSection({
  embeddedInAdvanced,
  planGovernance,
  governanceHints,
  pack,
  showRevisionHistorySubsection,
  revisionHistory,
  selectedRevisionDiff,
  roadmapVersionToShow,
  revisionDiffCandidates,
  selectedRevisionDiffKey,
  setSelectedRevisionDiffKey,
  titleById,
  analysisDepthFilter,
  setAnalysisDepthFilter,
  depthFilteredNodes,
  synthesisConflicts,
}: OrchestrationPanelDiagnosticsSectionProps) {
  return (
    <section
      aria-labelledby="strategy-lab-orch-diagnostics-heading"
      className={
        embeddedInAdvanced
          ? 'space-y-4'
          : 'space-y-4 border-t border-border pt-4'
      }
    >
      <div className="space-y-1">
        <h3 id="strategy-lab-orch-diagnostics-heading" className="text-foreground text-sm font-semibold">
          {STRATEGY_LAB_COPY.orchestrationDisclosure.diagnosticsGroupTitle}
        </h3>
        <p className="text-muted-foreground text-xs max-w-prose">
          {STRATEGY_LAB_COPY.orchestrationDisclosure.diagnosticsGroupHint}
        </p>
      </div>

      {planGovernance ? (
        <OrchestrationPlanGovernanceCard
          planGovernance={planGovernance}
          governanceHints={governanceHints}
          packInputQuality={pack?.input_quality}
        />
      ) : null}

      {showRevisionHistorySubsection ? (
        <div className="bg-background space-y-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-semibold">
            {STRATEGY_LAB_COPY.orchestrationDisclosure.versionHistorySummary}
          </div>
          {APP_FEATURE_FLAGS.revisionHistoryPanelEnabled && revisionHistory.length > 0 ? (
            <RevisionHistoryPanel items={revisionHistory} />
          ) : null}
          {selectedRevisionDiff && roadmapVersionToShow > 1 ? (
            <div className="space-y-3">
              <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.revisionDiffTitle}</div>
              {revisionDiffCandidates.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    {ORCHESTRATION_UI_COPY.revisionCompareLabel}
                  </span>
                  <select
                    className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                    value={selectedRevisionDiffKey ?? revisionDiffCandidates[0]?.key ?? ''}
                    onChange={e => setSelectedRevisionDiffKey(e.target.value)}
                  >
                    {revisionDiffCandidates.map(item => (
                      <option key={item.key} value={item.key}>
                        v{item.from_version} → v{item.to_version}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="text-muted-foreground text-xs">
                v{selectedRevisionDiff.from_version} → v{selectedRevisionDiff.to_version}
              </p>
              <ul className="text-foreground space-y-1 text-xs">
                {selectedRevisionDiff.nodes_added.length > 0 && (
                  <li>
                    <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.revisionNodesAdded}: </span>
                    {selectedRevisionDiff.nodes_added.join(', ')}
                  </li>
                )}
                {selectedRevisionDiff.nodes_removed.length > 0 && (
                  <li>
                    <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.revisionNodesRemoved}: </span>
                    {selectedRevisionDiff.nodes_removed.join(', ')}
                  </li>
                )}
                <li>
                  {selectedRevisionDiff.critical_path_changed
                    ? ORCHESTRATION_UI_COPY.revisionCriticalPathChanged
                    : ORCHESTRATION_UI_COPY.revisionCriticalPathUnchanged}
                </li>
                <li>
                  <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.revisionConflictsResolvedCounts}: </span>
                  {selectedRevisionDiff.conflicts_resolved_before} → {selectedRevisionDiff.conflicts_resolved_after}
                </li>
              </ul>
              {selectedRevisionDiff.nodes_lane_changed.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">
                    {ORCHESTRATION_UI_COPY.revisionLaneChanges}
                  </div>
                  <ul className="text-foreground list-inside list-disc space-y-1 text-xs max-w-prose">
                    {selectedRevisionDiff.nodes_lane_changed
                      .slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffLaneChangesDisplayed)
                      .map(row => {
                        const fromL =
                          row.from_lane in ORCHESTRATION_LANE_LABELS
                            ? ORCHESTRATION_LANE_LABELS[row.from_lane as OrchestrationLaneId]
                            : row.from_lane;
                        const toL =
                          row.to_lane in ORCHESTRATION_LANE_LABELS
                            ? ORCHESTRATION_LANE_LABELS[row.to_lane as OrchestrationLaneId]
                            : row.to_lane;
                        return (
                          <li key={row.id}>
                            {titleById.get(row.id) ?? row.id}{' '}
                            <span className="text-muted-foreground">
                              ({ORCHESTRATION_UI_COPY.revisionLaneChangeRow}: {fromL} → {toL})
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                  {selectedRevisionDiff.nodes_lane_changed.length >
                    ORCHESTRATION_UI_LIMITS.maxRevisionDiffLaneChangesDisplayed && (
                    <p className="text-muted-foreground mt-1 text-xs">{ORCHESTRATION_UI_COPY.revisionDiffTruncated}</p>
                  )}
                </div>
              )}
              {(selectedRevisionDiff.edges_added.length > 0 || selectedRevisionDiff.edges_removed.length > 0) && (
                <div className="space-y-2 border-t border-border pt-2">
                  {selectedRevisionDiff.edges_added.length > 0 && (
                    <div>
                      <div className="text-muted-foreground mb-1 text-xs font-medium">
                        {ORCHESTRATION_UI_COPY.revisionEdgesAdded}
                      </div>
                      <ul className="text-foreground list-inside list-disc space-y-1 text-xs max-w-prose">
                        {selectedRevisionDiff.edges_added
                          .slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed)
                          .map((e, i) => (
                            <li key={`a-${e.from}-${e.to}-${i}`}>
                              {titleById.get(e.from) ?? e.from}
                              <span className="text-muted-foreground"> → </span>
                              {titleById.get(e.to) ?? e.to}
                            </li>
                          ))}
                      </ul>
                      {selectedRevisionDiff.edges_added.length > ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed && (
                        <p className="text-muted-foreground mt-1 text-xs">{ORCHESTRATION_UI_COPY.revisionDiffTruncated}</p>
                      )}
                    </div>
                  )}
                  {selectedRevisionDiff.edges_removed.length > 0 && (
                    <div>
                      <div className="text-muted-foreground mb-1 text-xs font-medium">
                        {ORCHESTRATION_UI_COPY.revisionEdgesRemoved}
                      </div>
                      <ul className="text-foreground list-inside list-disc space-y-1 text-xs max-w-prose">
                        {selectedRevisionDiff.edges_removed
                          .slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed)
                          .map((e, i) => (
                            <li key={`r-${e.from}-${e.to}-${i}`}>
                              {titleById.get(e.from) ?? e.from}
                              <span className="text-muted-foreground"> → </span>
                              {titleById.get(e.to) ?? e.to}
                            </li>
                          ))}
                      </ul>
                      {selectedRevisionDiff.edges_removed.length > ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed && (
                        <p className="text-muted-foreground mt-1 text-xs">{ORCHESTRATION_UI_COPY.revisionDiffTruncated}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {pack ? (
        <div className="bg-background space-y-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-semibold">
            {STRATEGY_LAB_COPY.orchestrationDisclosure.packInspectionSummary}
          </div>
          <div className="space-y-2">
            <div className="text-foreground text-xs font-semibold">{STRATEGY_LAB_COPY.orchestratorTabs.analysisDepth}</div>
            <p className="text-muted-foreground text-[length:var(--text-2xs)] max-w-prose">{STRATEGY_LAB_COPY.depthFilter.hint}</p>
            <div className="flex flex-wrap gap-2">
              {(['all', 'baseline', 'deep'] as const).map(mode => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={analysisDepthFilter === mode ? 'default' : 'outline'}
                  onClick={() => setAnalysisDepthFilter(mode)}
                >
                  {mode === 'all'
                    ? STRATEGY_LAB_COPY.depthFilter.all
                    : mode === 'baseline'
                      ? STRATEGY_LAB_COPY.depthFilter.baseline
                      : STRATEGY_LAB_COPY.depthFilter.deep}
                </Button>
              ))}
            </div>
            <ul className="text-muted-foreground list-inside list-disc text-xs max-w-prose">
              {depthFilteredNodes.length === 0 && <li>—</li>}
              {depthFilteredNodes.map(n => (
                <li key={n.id}>
                  {n.title}{' '}
                  <span className="text-[length:var(--text-2xs)]">
                    ({n.analysis_depth === 'deep' ? ORCHESTRATION_UI_COPY.nodeBadgeDeep : ORCHESTRATION_UI_COPY.nodeBadgeBaseline})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.labDetailLayerHint}</p>
          {synthesisConflicts.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-foreground mb-1 text-xs font-semibold">{ORCHESTRATION_UI_COPY.synthesisSectionTitle}</div>
              <p className="text-muted-foreground mb-2 text-xs max-w-prose">{ORCHESTRATION_UI_COPY.synthesisSectionHint}</p>
              <ul className="text-foreground space-y-2 text-xs">
                {synthesisConflicts.map(row => (
                  <li key={row.id} className="bg-card rounded-md border px-3 py-2 max-w-prose">
                    <span className="text-muted-foreground font-medium">
                      {row.resolution === 'synthesis_applied'
                        ? ORCHESTRATION_UI_COPY.synthesisResolutionApplied
                        : ORCHESTRATION_UI_COPY.synthesisResolutionPending}
                      {': '}
                    </span>
                    {row.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.noPackYet}</p>
      )}
    </section>
  );
}
