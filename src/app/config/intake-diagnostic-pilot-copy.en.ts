/**
 * Copy for New Audit brief step — diagnostic intake panel (server-driven readiness / remediation).
 */
export const INTAKE_DIAGNOSTIC_PILOT_COPY_EN = {
  executionReadinessSyncing: 'Refreshing execution readiness from the server…',
  executionReadinessTitle: 'Execution readiness',
  executionReadinessBlockedLead:
    'Before we proceed, we need 1–2 clarifications. The audit can still be saved, but starting the pipeline may be blocked until the items below are addressed.',
  executionReadinessCaveatsLead:
    'You can continue. Starting the pipeline may still be allowed, but review the notes below so the audit runs with full context.',
  remediationTitle: 'Suggested next answers',
  remediationCheckpointLead: 'Before we proceed, we need 1-2 clarifications.',
  whyAskedExpandLabel: 'Why this matters',
  whyAskedCollapseLabel: 'Hide',
  suggestedNextSectionTitle: 'Suggested next',
  schemaLoadError: 'Could not refresh execution readiness from the server. You can continue editing the brief.',
} as const;
