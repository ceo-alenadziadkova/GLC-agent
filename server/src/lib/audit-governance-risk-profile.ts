import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';

export type GovernanceRiskProfile = 'low' | 'medium' | 'high' | 'enterprise';

/**
 * Resolves CONTROL_OBJECT.context.risk_profile for an audit.
 * Uses `audits.governance_risk_profile` when set; otherwise maps `product_mode`.
 */
export async function fetchAuditGovernanceRiskProfile(
  auditId: string
): Promise<GovernanceRiskProfile | null> {
  try {
    const { data, error } = await supabase
      .from('audits')
      .select('governance_risk_profile, product_mode')
      .eq('id', auditId)
      .maybeSingle();

    if (error) {
      logger.warn('audit.governance_risk_profile_fetch_failed', {
        component: 'audit_governance_risk_profile',
        audit_id: auditId,
        message: error.message,
      });
      return null;
    }

    const row = data as {
      governance_risk_profile?: string | null;
      product_mode?: string | null;
    } | null;

    const explicit = row?.governance_risk_profile;
    if (
      explicit === 'low' ||
      explicit === 'medium' ||
      explicit === 'high' ||
      explicit === 'enterprise'
    ) {
      return explicit;
    }

    const mode = row?.product_mode ?? 'full';
    if (mode === 'full') return 'medium';
    return 'low';
  } catch (err) {
    logger.warn('audit.governance_risk_profile_fetch_exception', {
      component: 'audit_governance_risk_profile',
      audit_id: auditId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
