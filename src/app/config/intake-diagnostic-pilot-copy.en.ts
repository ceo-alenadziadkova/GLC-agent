/**
 * Copy for New Audit brief step — diagnostic intake panel (server-driven readiness / remediation).
 */
export const INTAKE_DIAGNOSTIC_PILOT_COPY_EN = {
  executionReadinessSyncing: 'Refreshing execution readiness from the server…',
  executionReadinessTitle: 'Execution readiness',
  executionReadinessBlockedLead:
    'The audit can still be saved, but starting the pipeline may be blocked until the items below are addressed.',
  remediationTitle: 'Suggested next answers',
  whyAskedTitle: 'Why this matters',
  schemaLoadError: 'Could not refresh execution readiness from the server. You can continue editing the brief.',
} as const;
