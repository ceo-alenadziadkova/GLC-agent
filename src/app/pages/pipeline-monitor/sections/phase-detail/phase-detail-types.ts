import type { PipelineMonitorCopy } from '../../../../config/pipeline-monitor-copy';

/** Merged consultant detail copy or consultant + client portal overrides for detail strings. */
export type PhaseDetailCopy =
  | PipelineMonitorCopy['detail']
  | (PipelineMonitorCopy['detail'] & Partial<PipelineMonitorCopy['clientPortal']['detail']>);

export type EditableIssueRow = { id: string; title: string; description: string; impact: string };

export type EditableQuickWinRow = { id: string; title: string; description: string; timeframe: string };

export type EditableRecommendationRow = { id: string; title: string; description: string; impact: string };
