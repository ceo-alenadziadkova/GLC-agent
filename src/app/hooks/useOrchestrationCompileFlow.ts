import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { api } from '../data/apiService';
import { ApiError } from '../data/api-error';
import { useCompilePlanMutation } from './useCompilePlanMutation';
import { ORCHESTRATION_MANIFEST_SCHEMA_VERSION, parseOptionalOrchestrationPlanHorizon } from '../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { extractPlanGovernanceFromPackApiError, formatOrchestrationPackRunErrorMessage } from '../lib/orchestration-pack-api-error';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';
import type { QueryClient } from '../lib/tanstack-react-query';
import type {
  OrchestrationPlanGovernanceDto,
  RoadmapManifestRequestBody,
  RoadmapManifestSnapshotListItem,
} from '../data/api/orchestration-types';
import type { DomainKey } from '../data/auditTypes';
import type { OrchestrationChangeScenario, OrchestrationSeasonPreset } from '../config/orchestration-roadmap-manifest';
import type { GlcOrchestrationPackRevisionDiffView } from '../data/audit/contracts/report/orchestration-pack.types';

type UseOrchestrationCompileFlowOptions = {
  auditId: string;
  selectedDomains: DomainKey[];
  scenario: OrchestrationChangeScenario;
  season: OrchestrationSeasonPreset;
  planHorizonStart: string;
  planHorizonEnd: string;
  queryClient: Pick<QueryClient, 'invalidateQueries'>;
  invalidateBoardDraftHints: boolean;
  setManifestSaveWorking: (value: boolean) => void;
  appendOrReplaceManifestSnapshot: (row: RoadmapManifestSnapshotListItem) => void;
  markDraftAsSavedBaseline: () => void;
  setLastPostRevision: (value: { roadmap_version: number; diff: GlcOrchestrationPackRevisionDiffView | null }) => void;
  setPlanGovernance: (value: OrchestrationPlanGovernanceDto) => void;
  onReload: () => void;
};

export function useOrchestrationCompileFlow({
  auditId,
  selectedDomains,
  scenario,
  season,
  planHorizonStart,
  planHorizonEnd,
  queryClient,
  invalidateBoardDraftHints,
  setManifestSaveWorking,
  appendOrReplaceManifestSnapshot,
  markDraftAsSavedBaseline,
  setLastPostRevision,
  setPlanGovernance,
  onReload,
}: UseOrchestrationCompileFlowOptions) {
  const [compileStatusLine, setCompileStatusLine] = useState<string | null>(null);
  const compileMutation = useCompilePlanMutation({ auditId, onSettled: onReload });

  const handleSaveManifest = useCallback(async () => {
    setManifestSaveWorking(true);
    try {
      const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
      const res = await api.postRoadmapManifestSnapshot(auditId, {
        schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
        selected_domains: selectedDomains,
        change_scenario: scenario,
        season_preset: season,
        ...(planHorizon ? { plan_horizon: planHorizon } : {}),
      });
      appendOrReplaceManifestSnapshot({
        id: res.id,
        created_at: new Date().toISOString(),
        payload: {
          schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
          selected_domains: selectedDomains,
          change_scenario: scenario,
          season_preset: season,
          ...(planHorizon ? { plan_horizon: planHorizon } : {}),
        },
      });
      markDraftAsSavedBaseline();
      if (invalidateBoardDraftHints) {
        await invalidatePlanWorkspaceQueries(queryClient, auditId);
      }
      toast.success(ORCHESTRATION_UI_COPY.manifestSaved);
    } catch (e) {
      const detail =
        e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
          ? String((e.details as { detail?: unknown }).detail ?? '')
          : '';
      toast.error(detail ? `${ORCHESTRATION_UI_COPY.manifestSaveFailed} (${detail})` : ORCHESTRATION_UI_COPY.manifestSaveFailed);
    } finally {
      setManifestSaveWorking(false);
    }
  }, [
    appendOrReplaceManifestSnapshot,
    auditId,
    invalidateBoardDraftHints,
    markDraftAsSavedBaseline,
    planHorizonEnd,
    planHorizonStart,
    queryClient,
    scenario,
    season,
    selectedDomains,
    setManifestSaveWorking,
  ]);

  const handleCompilePlan = useCallback(async () => {
    const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
    const body: RoadmapManifestRequestBody = {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: selectedDomains,
      change_scenario: scenario,
      season_preset: season,
      ...(planHorizon ? { plan_horizon: planHorizon } : {}),
    };
    try {
      const res = await compileMutation.mutateAsync(body);
      appendOrReplaceManifestSnapshot({
        id: res.manifest_snapshot_id,
        created_at: new Date().toISOString(),
        payload: {
          schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
          selected_domains: selectedDomains,
          change_scenario: scenario,
          season_preset: season,
          ...(planHorizon ? { plan_horizon: planHorizon } : {}),
        },
      });
      markDraftAsSavedBaseline();
      setLastPostRevision({ roadmap_version: res.roadmap_version, diff: res.last_revision_diff });
      setPlanGovernance(res.plan_governance);
      setCompileStatusLine(ORCHESTRATION_UI_COPY.compilePlanStatusDone.replace('{version}', String(res.orchestration_pack_version)));
      toast.success(ORCHESTRATION_UI_COPY.packBuilt);
    } catch (e) {
      const pg = extractPlanGovernanceFromPackApiError(e);
      if (pg) setPlanGovernance(pg);
      const { message, description } = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
      toast.error(message, description ? { description, duration: 14_000 } : { duration: 6_000 });
    }
  }, [
    appendOrReplaceManifestSnapshot,
    compileMutation,
    markDraftAsSavedBaseline,
    planHorizonEnd,
    planHorizonStart,
    scenario,
    season,
    selectedDomains,
    setLastPostRevision,
    setPlanGovernance,
  ]);

  return {
    compileStatusLine,
    compileMutation,
    handleSaveManifest,
    handleCompilePlan,
  };
}
