import dayjs from 'dayjs';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ROADMAP_GANTT_MILESTONE_LANE_ID,
  type RoadmapGanttProjection,
  type RoadmapGanttTask,
} from '../../lib/roadmap-gantt-mapper';

const downloadCsvMock = vi.fn();
const buildIcalMock = vi.fn();
const icsFilenameMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    downloadOrchestrationSprintExportCsv: (...args: unknown[]) => downloadCsvMock(...args),
  },
}));

vi.mock('../../lib/roadmap-gantt-ical', () => ({
  buildIcalFromProjection: (...args: unknown[]) => buildIcalMock(...args),
  icsFilenameForAudit: (...args: unknown[]) => icsFilenameMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import { useRoadmapGanttActions } from '../useRoadmapGanttActions';

function buildTask(overrides: Partial<RoadmapGanttTask> & Pick<RoadmapGanttTask, 'id'>): RoadmapGanttTask {
  return {
    id: overrides.id,
    group: overrides.group ?? 'tech_delivery',
    title: overrides.title ?? overrides.id,
    start_time: overrides.start_time ?? dayjs('2026-01-01').valueOf(),
    end_time: overrides.end_time ?? dayjs('2026-01-10').valueOf(),
    owner: overrides.owner ?? '',
    description: overrides.description ?? '',
    impact: overrides.impact ?? '',
    status: overrides.status ?? 'planned',
    deliverables: overrides.deliverables ?? [],
    dependencyIds: overrides.dependencyIds ?? [],
    isEstimated: overrides.isEstimated ?? false,
    kind: overrides.kind ?? 'task',
    onCriticalPath: overrides.onCriticalPath ?? false,
    isOverdue: overrides.isOverdue ?? false,
    topPriorityBucket: overrides.topPriorityBucket ?? null,
    confidence: overrides.confidence ?? null,
    earlyStartMs: overrides.earlyStartMs ?? null,
    earlyFinishMs: overrides.earlyFinishMs ?? null,
    lateStartMs: overrides.lateStartMs ?? null,
    lateFinishMs: overrides.lateFinishMs ?? null,
    totalFloatMs: overrides.totalFloatMs ?? null,
    freeFloatMs: overrides.freeFloatMs ?? null,
  };
}

const PROJECTION: RoadmapGanttProjection = {
  lanes: [
    { id: 'tech_delivery', title: 'Tech delivery' },
    { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Milestones' },
  ],
  tasks: [buildTask({ id: 'a' })],
  dependencies: [],
  defaultTimeStart: dayjs('2026-01-01').valueOf(),
  defaultTimeEnd: dayjs('2026-12-31').valueOf(),
  milestones: [],
  upstreamByTask: new Map(),
  downstreamByTask: new Map(),
};

const TIMELINE_TASKS = [buildTask({ id: 'first-task' }), buildTask({ id: 'second' })];

function makePresetSetters() {
  return {
    setTimeScale: vi.fn(),
    setDayRangeDays: vi.fn(),
    setDependencyTypeFilter: vi.fn(),
    setOwnerFilter: vi.fn(),
    setStatusFilter: vi.fn(),
    setLaneFilter: vi.fn(),
    setBlockedOnly: vi.fn(),
    setDependencyView: vi.fn(),
    setCriticalPathOnly: vi.fn(),
    setHighlightDependencyChain: vi.fn(),
    setTitleQuery: vi.fn(),
    setShowSlack: vi.fn(),
    setShowScheduleProgress: vi.fn(),
    setDependencySort: vi.fn(),
    setSelectedTaskId: vi.fn(),
    setFocusedTaskId: vi.fn(),
    setActivePanel: vi.fn(),
    setDependenciesTab: vi.fn(),
    setShowAdvancedControls: vi.fn(),
    setShowRestoredViewNotice: vi.fn(),
  };
}

function makeBlobUrlHelpers() {
  return {
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
    triggerDownload: vi.fn(),
  };
}

beforeEach(() => {
  downloadCsvMock.mockReset();
  buildIcalMock.mockReset();
  icsFilenameMock.mockReset();
  toastErrorMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderActions(overrides: {
  setSprintExportBusy?: ReturnType<typeof vi.fn>;
  setIcalExportBusy?: ReturnType<typeof vi.fn>;
  presetSetters?: ReturnType<typeof makePresetSetters>;
  blobUrlHelpers?: ReturnType<typeof makeBlobUrlHelpers>;
  timelineTasks?: ReadonlyArray<RoadmapGanttTask>;
} = {}) {
  const exportBusySetters = {
    setSprintExportBusy: overrides.setSprintExportBusy ?? vi.fn(),
    setIcalExportBusy: overrides.setIcalExportBusy ?? vi.fn(),
  };
  const presetSetters = overrides.presetSetters ?? makePresetSetters();
  const blobUrlHelpers = overrides.blobUrlHelpers ?? makeBlobUrlHelpers();
  const result = renderHook(() =>
    useRoadmapGanttActions({
      auditId: 'audit-12345678',
      projection: PROJECTION,
      timelineTasks: overrides.timelineTasks ?? TIMELINE_TASKS,
      exportBusySetters: exportBusySetters as unknown as {
        setSprintExportBusy: (value: boolean) => void;
        setIcalExportBusy: (value: boolean) => void;
      },
      presetSetters,
      blobUrlHelpers,
    }),
  );
  return { ...result, exportBusySetters, presetSetters, blobUrlHelpers };
}

describe('useRoadmapGanttActions', () => {
  it('downloadSprintPlanCsv toggles busy flag and triggers a download', async () => {
    downloadCsvMock.mockResolvedValueOnce('id,title\n1,foo');
    const { result, exportBusySetters, blobUrlHelpers } = renderActions();

    await act(async () => {
      await result.current.downloadSprintPlanCsv();
    });

    expect(exportBusySetters.setSprintExportBusy).toHaveBeenNthCalledWith(1, true);
    expect(exportBusySetters.setSprintExportBusy).toHaveBeenLastCalledWith(false);
    expect(blobUrlHelpers.createObjectURL).toHaveBeenCalledOnce();
    expect(blobUrlHelpers.triggerDownload).toHaveBeenCalledWith('blob:fake', 'sprint-plan-audit-12.csv');
    expect(blobUrlHelpers.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('downloadSprintPlanCsv reports error when API rejects', async () => {
    downloadCsvMock.mockRejectedValueOnce(new Error('boom'));
    const { result, exportBusySetters } = renderActions();

    await act(async () => {
      await result.current.downloadSprintPlanCsv();
    });

    expect(toastErrorMock).toHaveBeenCalledOnce();
    expect(exportBusySetters.setSprintExportBusy).toHaveBeenLastCalledWith(false);
  });

  it('downloadIcal builds body and triggers a download', () => {
    buildIcalMock.mockReturnValueOnce('BEGIN:VCALENDAR');
    icsFilenameMock.mockReturnValueOnce('audit-roadmap.ics');
    const { result, exportBusySetters, blobUrlHelpers } = renderActions();

    act(() => {
      result.current.downloadIcal();
    });

    expect(buildIcalMock).toHaveBeenCalledWith(PROJECTION, { auditId: 'audit-12345678' });
    expect(blobUrlHelpers.triggerDownload).toHaveBeenCalledWith('blob:fake', 'audit-roadmap.ics');
    expect(exportBusySetters.setIcalExportBusy).toHaveBeenLastCalledWith(false);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('downloadIcal reports error when builder throws', () => {
    buildIcalMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { result, exportBusySetters } = renderActions();

    act(() => {
      result.current.downloadIcal();
    });

    expect(toastErrorMock).toHaveBeenCalledOnce();
    expect(exportBusySetters.setIcalExportBusy).toHaveBeenLastCalledWith(false);
  });

  it('resetView applies the reset patch and focuses the first timeline task', () => {
    const { result, presetSetters } = renderActions();
    act(() => {
      result.current.resetView();
    });
    expect(presetSetters.setDependencyTypeFilter).toHaveBeenCalledWith('all');
    expect(presetSetters.setSelectedTaskId).toHaveBeenCalledWith(null);
    expect(presetSetters.setFocusedTaskId).toHaveBeenCalledWith('first-task');
    expect(presetSetters.setShowAdvancedControls).toHaveBeenCalledWith(false);
    expect(presetSetters.setShowRestoredViewNotice).toHaveBeenCalledWith(false);
    expect(presetSetters.setHighlightDependencyChain).toHaveBeenCalledWith(true);
  });

  it('resetView focuses null when timelineTasks is empty', () => {
    const { result, presetSetters } = renderActions({ timelineTasks: [] });
    act(() => {
      result.current.resetView();
    });
    expect(presetSetters.setFocusedTaskId).toHaveBeenCalledWith(null);
  });

  it('applyPresetBlocked switches to day/30 with blocked-only and hide-weak', () => {
    const { result, presetSetters } = renderActions();
    act(() => {
      result.current.applyPresetBlocked();
    });
    expect(presetSetters.setTimeScale).toHaveBeenCalledWith('day');
    expect(presetSetters.setDayRangeDays).toHaveBeenCalledWith(30);
    expect(presetSetters.setBlockedOnly).toHaveBeenCalledWith(true);
    expect(presetSetters.setDependencyView).toHaveBeenCalledWith('hide-weak');
    expect(presetSetters.setShowAdvancedControls).toHaveBeenCalledWith(true);
    expect(presetSetters.setSelectedTaskId).not.toHaveBeenCalled();
    expect(presetSetters.setFocusedTaskId).not.toHaveBeenCalled();
  });

  it('applyPresetExecution switches to day/60 with FS dependency type and in-progress status', () => {
    const { result, presetSetters } = renderActions();
    act(() => {
      result.current.applyPresetExecution();
    });
    expect(presetSetters.setTimeScale).toHaveBeenCalledWith('day');
    expect(presetSetters.setDayRangeDays).toHaveBeenCalledWith(60);
    expect(presetSetters.setDependencyTypeFilter).toHaveBeenCalledWith('FS');
    expect(presetSetters.setStatusFilter).toHaveBeenCalledWith('in-progress');
    expect(presetSetters.setShowAdvancedControls).toHaveBeenCalledWith(true);
  });

  it('applyPresetCriticalPath switches to month and enables critical-path-only', () => {
    const { result, presetSetters } = renderActions();
    act(() => {
      result.current.applyPresetCriticalPath();
    });
    expect(presetSetters.setTimeScale).toHaveBeenCalledWith('month');
    expect(presetSetters.setCriticalPathOnly).toHaveBeenCalledWith(true);
    expect(presetSetters.setBlockedOnly).toHaveBeenCalledWith(false);
    expect(presetSetters.setShowAdvancedControls).toHaveBeenCalledWith(true);
  });

  it('keeps export handlers stable across rerender when dependencies do not change', () => {
    const { result, rerender } = renderActions();
    const firstCsv = result.current.downloadSprintPlanCsv;
    const firstIcal = result.current.downloadIcal;
    rerender();
    expect(result.current.downloadSprintPlanCsv).toBe(firstCsv);
    expect(result.current.downloadIcal).toBe(firstIcal);
  });
});
