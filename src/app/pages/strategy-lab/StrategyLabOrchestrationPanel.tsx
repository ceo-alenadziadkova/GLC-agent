import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarBlank, Path } from '@phosphor-icons/react';

import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';
import type { StrategyRoadmap } from '../../data/audit/contracts/report/report-domain.types';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { api } from '../../data/apiService';
import { ApiError } from '../../data/api-error';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  ORCHESTRATION_CHANGE_SCENARIOS,
  ORCHESTRATION_SEASON_PRESETS,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
} from '../../config/orchestration-roadmap-ui-copy.en';
import {
  orchestrationNodeTitleMap,
  projectCriticalPathToTimelineBuckets,
} from '../../lib/orchestration-timeline-projection';

type ExecutionPlan = NonNullable<AuditMeta['execution_plan']>;

interface StrategyLabOrchestrationPanelProps {
  auditId: string;
  executionPlan: ExecutionPlan;
  strategy: StrategyRoadmap;
  onReload: () => void;
}

function isGlcPack(raw: unknown): raw is GlcOrchestrationPackView {
  return Boolean(raw && typeof raw === 'object' && 'version' in raw && 'critical_path' in raw && 'graph' in raw);
}

export function StrategyLabOrchestrationPanel({
  auditId,
  executionPlan,
  strategy,
  onReload,
}: StrategyLabOrchestrationPanelProps) {
  const pack = isGlcPack(strategy.glc_orchestration_pack) ? strategy.glc_orchestration_pack : null;

  const [scenario, setScenario] = useState<OrchestrationChangeScenario>('hybrid');
  const [season, setSeason] = useState<OrchestrationSeasonPreset>('rolling_90d');
  const [manifestSnapshotId, setManifestSnapshotId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const p = isGlcPack(strategy.glc_orchestration_pack) ? strategy.glc_orchestration_pack : null;
    if (p?.manifest_snapshot_id) {
      setManifestSnapshotId(prev => prev ?? p.manifest_snapshot_id);
    }
  }, [strategy.glc_orchestration_pack]);

  useEffect(() => {
    let cancelled = false;
    if (manifestSnapshotId) return;
    if (isGlcPack(strategy.glc_orchestration_pack)) return;
    void (async () => {
      try {
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, { limit: 1 });
        const row = snapshots[0];
        if (cancelled || !row) return;
        setManifestSnapshotId(row.id);
        setScenario(row.payload.change_scenario);
        setSeason(row.payload.season_preset);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditId, manifestSnapshotId, strategy.glc_orchestration_pack]);

  const domainLabels = useMemo(
    () =>
      [...executionPlan.selected_domains]
        .sort()
        .map(d => DOMAIN_LABELS[d] ?? d)
        .join(', '),
    [executionPlan.selected_domains],
  );

  const bucketTitles = useMemo(
    () => ({
      near: ORCHESTRATION_UI_COPY.bucketNear,
      mid: ORCHESTRATION_UI_COPY.bucketMid,
      far: ORCHESTRATION_UI_COPY.bucketFar,
    }),
    [],
  );

  const timelineBuckets = useMemo(() => {
    if (!pack) return [];
    return projectCriticalPathToTimelineBuckets(pack, bucketTitles);
  }, [pack, bucketTitles]);

  const titleById = useMemo(() => (pack ? orchestrationNodeTitleMap(pack) : new Map<string, string>()), [pack]);

  const synthesisConflicts = useMemo(() => {
    if (!pack?.conflicts_resolved?.length) return [];
    return pack.conflicts_resolved.filter(
      row => row.resolution === 'synthesis_applied' || row.resolution === 'synthesis_pending',
    );
  }, [pack]);

  const handleSaveManifest = useCallback(async () => {
    setWorking(true);
    try {
      const res = await api.postRoadmapManifestSnapshot(auditId, {
        selected_domains: executionPlan.selected_domains,
        change_scenario: scenario,
        season_preset: season,
      });
      setManifestSnapshotId(res.id);
      toast.success(ORCHESTRATION_UI_COPY.manifestSaved);
    } catch (e) {
      const detail =
        e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
          ? String((e.details as { detail?: unknown }).detail ?? '')
          : '';
      toast.error(detail ? `${ORCHESTRATION_UI_COPY.manifestSaveFailed} (${detail})` : ORCHESTRATION_UI_COPY.manifestSaveFailed);
    } finally {
      setWorking(false);
    }
  }, [auditId, executionPlan.selected_domains, scenario, season]);

  const handleBuildPack = useCallback(async () => {
    if (!manifestSnapshotId) return;
    setWorking(true);
    try {
      await api.postOrchestrationPack(auditId, { manifest_snapshot_id: manifestSnapshotId });
      toast.success(ORCHESTRATION_UI_COPY.packBuilt);
      onReload();
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.packBuildFailed);
    } finally {
      setWorking(false);
    }
  }, [auditId, manifestSnapshotId, onReload]);

  return (
    <div className="bg-card space-y-4 border-b p-4">
      <div className="flex items-center gap-2">
        <Path className="text-info h-4 w-4" />
        <span className="text-foreground text-sm font-semibold">{ORCHESTRATION_UI_COPY.sectionTitle}</span>
      </div>
      <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.sectionHint}</p>

      <div className="space-y-3">
        <div>
          <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.coverageLabel}</span>
          <p className="text-foreground mt-1 text-sm">{domainLabels}</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.scenarioLabel}</span>
          <select
            className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
            value={scenario}
            onChange={e => setScenario(e.target.value as OrchestrationChangeScenario)}
          >
            {ORCHESTRATION_CHANGE_SCENARIOS.map(s => (
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
            onChange={e => setSeason(e.target.value as OrchestrationSeasonPreset)}
          >
            {ORCHESTRATION_SEASON_PRESETS.map(s => (
              <option key={s} value={s}>
                {ORCHESTRATION_SEASON_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-background space-y-2 rounded-lg border p-3">
        <div className="text-muted-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.previewTitle}</div>
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
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={working} onClick={() => void handleSaveManifest()}>
          {ORCHESTRATION_UI_COPY.confirmSaveManifest}
        </Button>
        <Button type="button" variant="default" disabled={working || !manifestSnapshotId} onClick={() => void handleBuildPack()}>
          {ORCHESTRATION_UI_COPY.buildPack}
        </Button>
      </div>

      {typeof strategy.orchestration_pack_version === 'number' && strategy.orchestration_pack_version > 0 && (
        <p className="text-muted-foreground text-xs">
          {ORCHESTRATION_UI_COPY.versionLabel}: {strategy.orchestration_pack_version}
        </p>
      )}

      {pack ? (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <CalendarBlank className="text-info h-4 w-4" />
            <span className="text-foreground text-sm font-semibold">{ORCHESTRATION_UI_COPY.timelineTitle}</span>
          </div>
          <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.timelineHint}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {timelineBuckets.map(bucket => (
              <div key={bucket.id} className="bg-background rounded-lg border p-3">
                <div className="text-foreground mb-2 text-xs font-semibold">{bucket.title}</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {bucket.nodeIds.length === 0 && <li>—</li>}
                  {bucket.nodeIds.map(id => (
                    <li key={id}>{titleById.get(id) ?? id}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <div className="text-foreground mb-2 text-xs font-semibold">{ORCHESTRATION_UI_COPY.lanesTitle}</div>
            <div className="space-y-2">
              {(Object.keys(ORCHESTRATION_LANE_LABELS) as Array<keyof typeof ORCHESTRATION_LANE_LABELS>).map(laneKey => {
                const ids = pack.lanes[laneKey] ?? [];
                if (ids.length === 0) return null;
                return (
                  <div key={laneKey} className="bg-background rounded-md border px-3 py-2 text-xs">
                    <span className="text-foreground font-medium">{ORCHESTRATION_LANE_LABELS[laneKey]}</span>
                    <ul className="text-muted-foreground mt-1 list-inside list-disc">
                      {ids.map(id => (
                        <li key={id}>{titleById.get(id) ?? id}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          {synthesisConflicts.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-foreground mb-1 text-xs font-semibold">{ORCHESTRATION_UI_COPY.synthesisSectionTitle}</div>
              <p className="text-muted-foreground mb-2 text-xs">{ORCHESTRATION_UI_COPY.synthesisSectionHint}</p>
              <ul className="text-foreground space-y-2 text-xs">
                {synthesisConflicts.map(row => (
                  <li key={row.id} className="bg-background rounded-md border px-3 py-2">
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
    </div>
  );
}
