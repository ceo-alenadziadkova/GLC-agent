import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { api } from '../data/apiService';
import { buildIcalFromProjection, icsFilenameForAudit } from '../lib/roadmap-gantt-ical';
import type { RoadmapGanttProjection, RoadmapGanttTask } from '../lib/roadmap-gantt-mapper';
import {
  PRESET_BLOCKED_PATCH,
  PRESET_CRITICAL_PATH_PATCH,
  PRESET_EXECUTION_PATCH,
  RESET_VIEW_PATCH,
  applyPresetPatch,
  type RoadmapGanttPresetSetters,
} from '../lib/roadmap-gantt-view-model';

/**
 * Optional `Blob` URL helpers. Supplied by the orchestrator so this hook stays free of
 * direct DOM access in tests; defaults below use the browser globals when running in app.
 */
type BlobUrlHelpers = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  triggerDownload: (url: string, filename: string) => void;
};

function defaultBlobUrlHelpers(): BlobUrlHelpers {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    triggerDownload: (url, filename) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    },
  };
}

export type UseRoadmapGanttActionsArgs = {
  auditId: string;
  projection: RoadmapGanttProjection;
  /** First-task lookup is used by `resetView` to focus the first timeline task after reset. */
  timelineTasks: ReadonlyArray<RoadmapGanttTask>;
  /** Setters for the export busy flags; reused by the toolbar buttons. */
  exportBusySetters: {
    setSprintExportBusy: (value: boolean) => void;
    setIcalExportBusy: (value: boolean) => void;
  };
  /** Setters consumed by `applyPresetPatch` for `resetView` and `applyPreset*` actions. */
  presetSetters: RoadmapGanttPresetSetters;
  /** Test seam — overrideable in unit tests to avoid touching `document`/`URL.createObjectURL`. */
  blobUrlHelpers?: BlobUrlHelpers;
};

export type UseRoadmapGanttActionsResult = {
  downloadSprintPlanCsv: () => Promise<void>;
  downloadIcal: () => void;
  resetView: () => void;
  applyPresetBlocked: () => void;
  applyPresetExecution: () => void;
  applyPresetCriticalPath: () => void;
};

/**
 * Global view commands for the Roadmap Gantt: CSV/iCal exports and view-reset/presets.
 *
 * Internal: not exported from `useRoadmapGanttView` and not used outside of it.
 */
export function useRoadmapGanttActions(args: UseRoadmapGanttActionsArgs): UseRoadmapGanttActionsResult {
  const {
    auditId,
    projection,
    timelineTasks,
    exportBusySetters,
    presetSetters,
    blobUrlHelpers,
  } = args;

  const helpers = useMemo(() => blobUrlHelpers ?? defaultBlobUrlHelpers(), [blobUrlHelpers]);

  const downloadSprintPlanCsv = useCallback(async () => {
    exportBusySetters.setSprintExportBusy(true);
    try {
      const csv = await api.downloadOrchestrationSprintExportCsv(auditId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = helpers.createObjectURL(blob);
      helpers.triggerDownload(url, `sprint-plan-${auditId.slice(0, 8)}.csv`);
      helpers.revokeObjectURL(url);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.sprintExportCsvError);
    } finally {
      exportBusySetters.setSprintExportBusy(false);
    }
  }, [auditId, exportBusySetters, helpers]);

  const downloadIcal = useCallback(() => {
    exportBusySetters.setIcalExportBusy(true);
    try {
      const body = buildIcalFromProjection(projection, { auditId });
      const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
      const url = helpers.createObjectURL(blob);
      helpers.triggerDownload(url, icsFilenameForAudit(auditId));
      helpers.revokeObjectURL(url);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.roadmapGanttIcalExportError);
    } finally {
      exportBusySetters.setIcalExportBusy(false);
    }
  }, [auditId, projection, exportBusySetters, helpers]);

  const resetView = useCallback(() => {
    applyPresetPatch(RESET_VIEW_PATCH, presetSetters, timelineTasks[0]?.id ?? null);
  }, [presetSetters, timelineTasks]);

  const applyPresetBlocked = useCallback(() => {
    applyPresetPatch(PRESET_BLOCKED_PATCH, presetSetters);
  }, [presetSetters]);

  const applyPresetExecution = useCallback(() => {
    applyPresetPatch(PRESET_EXECUTION_PATCH, presetSetters);
  }, [presetSetters]);

  const applyPresetCriticalPath = useCallback(() => {
    applyPresetPatch(PRESET_CRITICAL_PATH_PATCH, presetSetters);
  }, [presetSetters]);

  return {
    downloadSprintPlanCsv,
    downloadIcal,
    resetView,
    applyPresetBlocked,
    applyPresetExecution,
    applyPresetCriticalPath,
  };
}
