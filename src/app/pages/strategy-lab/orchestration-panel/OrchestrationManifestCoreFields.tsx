import type { ReactNode } from 'react';

import { Input } from '../../../../design-system/ui';
import {
  ORCHESTRATION_CHANGE_SCENARIOS,
  ORCHESTRATION_SEASON_PRESETS,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../../../config/orchestration-roadmap-manifest';
import {
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
} from '../../../config/orchestration-roadmap-ui-copy.en';

export type OrchestrationManifestCoreFieldsProps = {
  domainLabels: ReactNode;
  scenario: OrchestrationChangeScenario;
  season: OrchestrationSeasonPreset;
  planHorizonStart: string;
  planHorizonEnd: string;
  onScenarioChange: (scenario: OrchestrationChangeScenario) => void;
  onSeasonChange: (season: OrchestrationSeasonPreset) => void;
  onPlanHorizonStartChange: (value: string) => void;
  onPlanHorizonEndChange: (value: string) => void;
};

/**
 * Always-visible orchestration scenario / horizon inputs (Strategy Lab roadmap manifest block).
 */
export function OrchestrationManifestCoreFields({
  domainLabels,
  scenario,
  season,
  planHorizonStart,
  planHorizonEnd,
  onScenarioChange,
  onSeasonChange,
  onPlanHorizonStartChange,
  onPlanHorizonEndChange,
}: OrchestrationManifestCoreFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.coverageLabel}</span>
        <p className="text-foreground mt-1 text-sm max-w-prose">{domainLabels}</p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.scenarioLabel}</span>
        <select
          className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as OrchestrationChangeScenario)}
        >
          {ORCHESTRATION_CHANGE_SCENARIOS.map((s) => (
            <option key={s} value={s}>
              {ORCHESTRATION_SCENARIO_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.seasonLabel}</span>
        <select
          className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
          value={season}
          onChange={(e) => onSeasonChange(e.target.value as OrchestrationSeasonPreset)}
        >
          {ORCHESTRATION_SEASON_PRESETS.map((s) => (
            <option key={s} value={s}>
              {ORCHESTRATION_SEASON_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2">
        <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.planHorizonLabel}</span>
        <p className="text-muted-foreground max-w-prose text-[length:var(--text-2xs)] leading-relaxed">{ORCHESTRATION_UI_COPY.planHorizonHint}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted-foreground text-[length:var(--text-2xs)]">{ORCHESTRATION_UI_COPY.planHorizonStartLabel}</span>
            <Input
              type="date"
              className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
              value={planHorizonStart}
              onChange={(e) => onPlanHorizonStartChange(e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted-foreground text-[length:var(--text-2xs)]">{ORCHESTRATION_UI_COPY.planHorizonEndLabel}</span>
            <Input
              type="date"
              className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
              value={planHorizonEnd}
              onChange={(e) => onPlanHorizonEndChange(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
