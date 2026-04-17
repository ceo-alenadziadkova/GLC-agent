import type { PipelineEvent, QualityGateReport } from '../../../data/auditTypes';

export function createQualityGateByPhaseMap(events: PipelineEvent[]): Map<number, QualityGateReport> {
  const map = new Map<number, QualityGateReport>();
  for (const event of events) {
    if (event.event_type !== 'quality_gate') continue;
    map.set(event.phase, event.data as unknown as QualityGateReport);
  }
  return map;
}

export function hasQualityWarnings(qualityGate: QualityGateReport | null | undefined): boolean {
  if (!qualityGate || qualityGate.passed) return false;
  return qualityGate.flags.some(flag => flag.severity === 'warning');
}
