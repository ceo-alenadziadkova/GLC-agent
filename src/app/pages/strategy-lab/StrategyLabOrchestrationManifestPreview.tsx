import type { OrchestrationChangeScenario, OrchestrationSeasonPreset } from '../../config/orchestration-roadmap-manifest';
import {
  ORCHESTRATION_PREVIEW_COMPRESSION_LABELS,
  ORCHESTRATION_PREVIEW_DENSITY_LABELS,
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../config/orchestration-roadmap-ui-copy.en';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import type { RoadmapManifestPreviewDto } from '../../data/api/orchestration-types';

type PlanHorizonPreview = { start_date: string; end_date: string };

export function StrategyLabOrchestrationManifestPreview({
  previewLoading,
  manifestPreviewError,
  manifestPreview,
  domainLabels,
  scenario,
  season,
  previewPlanHorizon,
}: {
  previewLoading: boolean;
  manifestPreviewError: string | null;
  manifestPreview: RoadmapManifestPreviewDto | null;
  domainLabels: string;
  scenario: OrchestrationChangeScenario;
  season: OrchestrationSeasonPreset;
  previewPlanHorizon: PlanHorizonPreview | null;
}) {
  return (
    <div className="bg-background space-y-2 rounded-lg border p-3">
      <div className="text-muted-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.previewTitle}</div>
      {previewLoading && <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.previewLoading}</p>}
      {manifestPreviewError && <p className="text-danger text-xs max-w-prose">{manifestPreviewError}</p>}
      <ul className="text-foreground space-y-1 text-xs">
        <li>
          <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewDomains}: </span>
          {domainLabels}
        </li>
        <li>
          <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewScenario}: </span>
          {ORCHESTRATION_SCENARIO_LABELS[scenario]}
        </li>
        <li>
          <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewSeason}: </span>
          {ORCHESTRATION_SEASON_LABELS[season]}
        </li>
        {previewPlanHorizon ? (
          <li>
            <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.planHorizonLabel}: </span>
            {previewPlanHorizon.start_date} – {previewPlanHorizon.end_date}
          </li>
        ) : null}
        {manifestPreview ? (
          <>
            <li>
              <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewCompression}: </span>
              {ORCHESTRATION_PREVIEW_COMPRESSION_LABELS[manifestPreview.execution_compression_hint]}
            </li>
            <li>
              <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewDensity}: </span>
              {ORCHESTRATION_PREVIEW_DENSITY_LABELS[manifestPreview.lane_density_band]}
            </li>
          </>
        ) : null}
      </ul>
      {manifestPreview ? (
        <div className="border-border space-y-2 border-t pt-2">
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.previewLanesIncluded}</div>
            <ul className="text-foreground list-inside list-disc text-xs">
              {manifestPreview.lanes_included.map((lane) => (
                <li key={lane}>{ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId]}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.previewLanesCut}</div>
            <ul className="text-foreground list-inside list-disc text-xs">
              {manifestPreview.lanes_cut.length === 0 && <li>—</li>}
              {manifestPreview.lanes_cut.map((lane) => (
                <li key={lane}>{ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId]}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.previewWaitingList}</div>
            <ul className="text-foreground list-inside list-disc text-xs">
              {manifestPreview.waiting_list_domains.length === 0 && <li>—</li>}
              {manifestPreview.waiting_list_domains.map((d) => (
                <li key={d}>{DOMAIN_LABELS[d] ?? d}</li>
              ))}
            </ul>
          </div>
          {manifestPreview.confidence_callouts.length > 0 ? (
            <ul className="text-muted-foreground list-inside list-disc text-xs max-w-prose">
              {manifestPreview.confidence_callouts.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
