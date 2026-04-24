import type { OrchestrationLaneId } from './orchestration-lanes.js';
import { ORCHESTRATION_LANE_IDS } from './orchestration-lanes.js';

const LANE_DRI_SUGGESTION: Record<OrchestrationLaneId, string> = {
  product_change: 'Product / UX',
  tech_delivery: 'Engineering',
  marketing_narrative: 'Marketing',
  gtm_sales: 'RevOps / Sales',
  seo: 'SEO / Growth',
  research: 'Research / PM',
  processes_automation: 'Operations',
  risk_compliance: 'Security / Compliance',
};

/**
 * Suggested default owner label for CSV/tracker import when the pack graph has no per-node DRI.
 * Orgs may overwrite in Jira/Linear; values are role hints, not authenticated identities.
 */
export function suggestedDriLabelForLane(lane: string): string {
  if ((ORCHESTRATION_LANE_IDS as readonly string[]).includes(lane)) {
    return LANE_DRI_SUGGESTION[lane as OrchestrationLaneId];
  }
  return '';
}
