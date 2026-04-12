/** Intake policy artifact v1 (see intake-policy.v1.json). */
export type AskStrategy = 'always' | 'if_needed' | 'progressive' | 'consultant_only';

export interface ModeRequirednessOverride {
  requiredAlways?: string[];
  requiredIfVisible?: string[];
  syntheticRequired?: string[];
}

export interface PolicyRichnessV1 {
  /** Optional mode-level override matrix (takes precedence over legacy fields when present). */
  requirednessByMode?: Partial<
    Record<'full' | 'express' | 'discovery' | 'pre_brief' | 'free_snapshot', ModeRequirednessOverride>
  >;
  /** Optional per-question ask strategy hints for resolver/layout explainability. */
  askStrategyById?: Record<string, AskStrategy>;
}

export interface FullModePolicyV1 extends PolicyRichnessV1 {
  participation: 'all_eligible';
  requiredness: 'from_canon';
  syntheticRequired: string[];
}

export interface ExpressModePolicyV1 extends PolicyRichnessV1 {
  participation: 'all_eligible';
  requiredAlways: string[];
  requiredIfVisible: string[];
}

export interface DiscoveryModePolicyV1 extends PolicyRichnessV1 {
  participation: 'explicit';
  /** Ordered bank ids for public Discovery UI fragment (before `included` filter). Omitted in frozen policy bundles → runtime uses default order. */
  publicWizardOrder?: string[];
  included: string[];
  requiredness: 'from_canon';
  syntheticRequired: string[];
}

export interface PreBriefModePolicyV1 extends PolicyRichnessV1 {
  participation: 'express_plus_identity';
  identityFieldIds: string[];
  identitySpecifyFieldId: string;
  identitySpecifyWhenIndustryEquals: string;
  inheritExpressRequired: true;
  /** Omitted in frozen policy bundles before 1.1.0 — resolver treats pre_brief as full bank visibility (legacy). */
  bankIncluded?: string[];
}

export interface FreeSnapshotModePolicyV1 extends PolicyRichnessV1 {
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
