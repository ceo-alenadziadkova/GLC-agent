/**
 * Non-class collectors may write to `collected_data` with these keys (see new-audit Lighthouse bootstrap).
 */
export const COLLECTOR_KEY_LIGHTHOUSE_BOOTSTRAP = 'lighthouse_bootstrap' as const;

/** Deterministic site scan (same engine as free snapshot) before full pipeline — raw + unmapped retained for agents. */
export const COLLECTOR_KEY_NEW_AUDIT_SITE_RECON = 'new_audit_site_recon' as const;
