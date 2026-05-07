/**
 * A single finding raised by the consistency checker.
 * Stored in pipeline_events (event_type: PIPELINE_EVENT_TYPES.qualityGate) as part of QualityGateReport.
 */
export interface QualityFlag {
  id: string;
  /** 'warning' — must acknowledge before approving; 'info' — informational only */
  severity: 'warning' | 'info';
  /** When true, gate should block client-facing publication until resolved. */
  blocking?: boolean;
  domain_key: string | null;
  rule: string;
  message: string;
}

export interface QualityGateReport {
  /** True when there are no 'warning'-level flags */
  passed: boolean;
  flags: QualityFlag[];
  checked_at: string;
  metrics?: {
    issues_total: number;
    issues_confirmed: number;
    issues_unverified: number;
    issues_not_assessed: number;
    conflicts_total: number;
    issues_without_evidence: number;
    evidence_coverage_rate: number;
    critical_precision_proxy: number;
  };
}
