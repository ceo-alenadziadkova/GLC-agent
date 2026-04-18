export interface ControlObjectStatuses {
  confirmed_brief: number;
  confirmed_external: number;
  unverified: number;
  likely_hallucination: number;
  risky_promise: number;
  dependent_on_brief_assumption: number;
  strategic_inconsistency: number;
}

export interface ControlObjectCounts {
  total_claims: number;
  fact: number;
  strategic_hypothesis: number;
  opinion: number;
  assumption: number;
  statuses: ControlObjectStatuses;
}
