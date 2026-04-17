import { PIPELINE_QUALITY_GATE_FLAG_SEVERITY_REQUIRING_NOTES } from '../../config/pipeline-quality-gate-policy.js';

export type QualityGateReportForNotesPolicy = {
  passed: boolean;
  flags: Array<{ severity: string }>;
};

export function qualityGateRequiresConsultantNotes(
  report: QualityGateReportForNotesPolicy,
  requiredSeverity: string = PIPELINE_QUALITY_GATE_FLAG_SEVERITY_REQUIRING_NOTES,
): boolean {
  return !report.passed && report.flags.some((f) => f.severity === requiredSeverity);
}
