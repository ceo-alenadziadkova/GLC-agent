/**
 * Static dependency hints: which response keys each BRANCH_RULES predicate may read.
 * Used for docs, future incremental recompute (ADR Phase C2), and linting.
 */
export const BRANCH_RULE_RESPONSE_KEYS: Readonly<Record<string, readonly string[]>> = {
  has_website: ['a5'],
  no_website: ['a5'],
  nosite_social: ['a5', 'c_nosite_1'],
  is_hospitality: ['a2', 'intake_industry'],
  is_real_estate: ['a2', 'intake_industry'],
  is_restaurant: ['a2', 'intake_industry'],
  is_services: ['a2', 'intake_industry'],
  is_healthcare: ['a2', 'intake_industry'],
  is_marine: ['a2', 'intake_industry'],
  has_crm: ['d1'],
  no_crm: ['d1'],
  handles_payments: ['a6'],
  not_solo: ['a4'],
  spain_based: ['a3'],
};

export function listBranchRuleResponseKeys(ruleKey: string): readonly string[] {
  return BRANCH_RULE_RESPONSE_KEYS[ruleKey] ?? [];
}
