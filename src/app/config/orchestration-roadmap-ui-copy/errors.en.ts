export const ORCHESTRATION_ERRORS_UI_COPY = {
  previewFailed: 'Preview failed. Check manifest values and try again.',
  manifestSaveFailed: 'Could not save manifest',
  packBuildFailed: 'Could not build orchestration pack',
  timelineLoadFailed: 'Could not load execution timeline',
  planRoadmapErrorSubtitle: 'Plan data unavailable',
  planRoadmapLoadErrorBody: 'Could not load timeline data for this audit. Check your connection or return to Strategy Lab.',
  planRoadmapTimelineQueryFailedBody:
    'The timeline request failed before we could render the schedule. Retry from Strategy Lab after checking your connection.',
  executionPackFromTimelineFailed: 'Could not generate detail pack',
  executionPackFromTimelineErrorDisabled:
    'Detail packs are turned off in this environment. Open your report or ask your consultant.',
  executionPackFromTimelineErrorNotReady:
    'Strategy is still finishing for this audit. Try again when the report is complete.',
  executionPackFromTimelineErrorPayloadInvalid: 'This detail pack request could not be accepted.',
  executionPackFromTimelineErrorNotFound: 'This audit was not found or you no longer have access.',
  executionPackFromTimelineErrorFailedGeneric: 'Could not generate the detail pack.',
  executionPackFromTimelineErrorRateLimited: 'Too many AI requests right now. Wait a moment and try again.',
  sprintExportCsvError: 'Could not download the sprint plan.',
  consultantCockpitLoadError: 'Could not load orchestration data.',
  roadmapGanttIcalExportError: 'Could not build calendar file.',
} as const;
