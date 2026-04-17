/**
 * A single finding raised by the consistency checker.
 * Stored in pipeline_events (event_type: PIPELINE_EVENT_TYPES.qualityGate) as part of QualityGateReport.
 */
export interface QualityFlag {
  id: string;
  /** 'warning' — must acknowledge before approving; 'info' — informational only */
  severity: 'warning' | 'info';
  domain_key: string | null;
  rule: string;
  message: string;
}

export interface QualityGateReport {
  /** True when there are no 'warning'-level flags */
  passed: boolean;
  flags: QualityFlag[];
  checked_at: string;
}
