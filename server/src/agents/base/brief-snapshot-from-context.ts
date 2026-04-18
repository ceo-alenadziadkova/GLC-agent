/**
 * Map `AgentContext.brief_responses` into a typed BriefSnapshot for feasibility / CONTROL_OBJECT.
 */

import type { AgentContext } from '../../services/context-builder.js';
import type { BriefSnapshot } from '../../services/feasibility-layer.js';

/**
 * Extract a BriefSnapshot from AgentContext.brief_responses for FeasibilityLayer.
 * Maps canonical brief_responses keys to the typed BriefSnapshot fields.
 * Unknown/absent keys default to undefined (FeasibilityLayer handles missing fields gracefully).
 */
export function briefSnapshotFromAgentContext(context: AgentContext): BriefSnapshot {
  const r = context.brief_responses ?? {};
  const num = (key: string): number | undefined => {
    const v = r[key];
    return typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) || undefined : undefined;
  };
  const bool = (key: string): boolean | undefined => {
    const v = r[key];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'yes' || v === 'true';
    return undefined;
  };

  return {
    team_size: num('team_size') ?? num('company_size'),
    has_dedicated_dev_team: bool('has_dedicated_dev_team') ?? bool('dedicated_dev_team'),
    has_audit_policy: bool('has_audit_policy') ?? bool('compliance_policy'),
    has_analytics: bool('has_analytics') ?? bool('uses_analytics'),
    has_crm: bool('has_crm') ?? bool('uses_crm'),
    monthly_budget_usd: num('monthly_budget_usd') ?? num('monthly_budget') ?? num('marketing_budget'),
    integration_count: num('integration_count') ?? num('tool_count'),
    tech_maturity: num('tech_maturity'),
  };
}
