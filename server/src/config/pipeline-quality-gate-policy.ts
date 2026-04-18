/**
 * Quality gate → review approval policy constants.
 * When the latest gate report is not passed and includes flags at this severity,
 * consultant_notes are required before approving the review point.
 */
export const PIPELINE_QUALITY_GATE_FLAG_SEVERITY_REQUIRING_NOTES = 'warning' as const;
