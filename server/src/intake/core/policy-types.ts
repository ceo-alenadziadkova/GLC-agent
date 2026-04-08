/** Intake policy artifact v1 (see intake-policy.v1.json). */

export interface FullModePolicyV1 {
  participation: 'all_eligible';
  requiredness: 'from_canon';
  syntheticRequired: string[];
}

export interface ExpressModePolicyV1 {
  participation: 'all_eligible';
  requiredAlways: string[];
  requiredIfVisible: string[];
}

export interface DiscoveryModePolicyV1 {
  participation: 'explicit';
  included: string[];
  requiredness: 'from_canon';
  syntheticRequired: string[];
}

export interface PreBriefModePolicyV1 {
  participation: 'express_plus_identity';
  identityFieldIds: string[];
  identitySpecifyFieldId: string;
  identitySpecifyWhenIndustryEquals: string;
  inheritExpressRequired: true;
}

export interface FreeSnapshotModePolicyV1 {
  participation: 'all_eligible';
  requiredness: 'none';
}

export interface IntakePolicyV1 {
  version: string;
  modes: {
    full: FullModePolicyV1;
    express: ExpressModePolicyV1;
    discovery: DiscoveryModePolicyV1;
    pre_brief: PreBriefModePolicyV1;
    free_snapshot: FreeSnapshotModePolicyV1;
  };
}
