import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  RoadmapManifestRequestBody,
  RoadmapManifestSnapshotListItem,
} from '../data/api/orchestration-types';
import type {
  OrchestrationChangeScenario,
  OrchestrationSeasonPreset,
} from '../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_UI_LIMITS } from '../config/orchestration-ui-limits';
import { api } from '../data/apiService';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { toast } from 'sonner';

type UseOrchestrationManifestSnapshotsOptions = {
  auditId: string;
  strategyPack: unknown;
  applySignatureFromManifestPayload: (payload: RoadmapManifestRequestBody) => void;
  setScenario: (value: OrchestrationChangeScenario) => void;
  setSeason: (value: OrchestrationSeasonPreset) => void;
  setPlanHorizonStart: (value: string) => void;
  setPlanHorizonEnd: (value: string) => void;
};

export function useOrchestrationManifestSnapshots({
  auditId,
  strategyPack,
  applySignatureFromManifestPayload,
  setScenario,
  setSeason,
  setPlanHorizonStart,
  setPlanHorizonEnd,
}: UseOrchestrationManifestSnapshotsOptions) {
  const [manifestSnapshotId, setManifestSnapshotId] = useState<string | null>(null);
  const [manifestSnapshots, setManifestSnapshots] = useState<RoadmapManifestSnapshotListItem[]>([]);
  const [manifestSaveWorking, setManifestSaveWorking] = useState(false);
  const hydratedManifestSnapshotId = useRef<string | null>(null);

  useEffect(() => {
    const pack = isGlcOrchestrationPackView(strategyPack) ? strategyPack : null;
    if (pack?.manifest_snapshot_id) {
      hydratedManifestSnapshotId.current = null;
      setManifestSnapshotId(prev => prev ?? pack.manifest_snapshot_id);
    }
  }, [strategyPack]);

  useEffect(() => {
    if (isGlcOrchestrationPackView(strategyPack)) return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      try {
        const latest = await api.getRoadmapManifestSnapshotLatest(auditId, { signal });
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems,
          signal,
        });
        if (signal.aborted) return;
        setManifestSnapshots(snapshots);
        if (manifestSnapshotId) return;
        const row = latest.snapshot ?? snapshots[0] ?? null;
        if (!row) return;
        hydratedManifestSnapshotId.current = null;
        setManifestSnapshotId(row.id);
        toast.success(ORCHESTRATION_UI_COPY.snapshotAutoSelected);
      } catch {
        if (signal.aborted) return;
        setManifestSnapshots([]);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [auditId, manifestSnapshotId, strategyPack]);

  useEffect(() => {
    if (!isGlcOrchestrationPackView(strategyPack)) return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      try {
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems,
          signal,
        });
        if (signal.aborted) return;
        setManifestSnapshots(snapshots);
      } catch {
        if (signal.aborted) return;
        setManifestSnapshots([]);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [auditId, strategyPack]);

  useEffect(() => {
    if (!manifestSnapshotId || manifestSnapshots.length === 0) return;
    if (hydratedManifestSnapshotId.current === manifestSnapshotId) return;
    const row = manifestSnapshots.find(s => s.id === manifestSnapshotId);
    if (!row) return;
    hydratedManifestSnapshotId.current = manifestSnapshotId;
    setScenario(row.payload.change_scenario);
    setSeason(row.payload.season_preset);
    setPlanHorizonStart(row.payload.plan_horizon?.start_date ?? '');
    setPlanHorizonEnd(row.payload.plan_horizon?.end_date ?? '');
    applySignatureFromManifestPayload(row.payload);
  }, [
    manifestSnapshotId,
    manifestSnapshots,
    applySignatureFromManifestPayload,
    setScenario,
    setSeason,
    setPlanHorizonStart,
    setPlanHorizonEnd,
  ]);

  const appendOrReplaceManifestSnapshot = useCallback((row: RoadmapManifestSnapshotListItem) => {
    setManifestSnapshotId(row.id);
    hydratedManifestSnapshotId.current = row.id;
    setManifestSnapshots(prev =>
      [row, ...prev.filter(item => item.id !== row.id)].slice(0, ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems),
    );
  }, []);

  return {
    manifestSnapshotId,
    setManifestSnapshotId,
    manifestSnapshots,
    hydratedManifestSnapshotId,
    appendOrReplaceManifestSnapshot,
    manifestSaveWorking,
    setManifestSaveWorking,
  };
}
