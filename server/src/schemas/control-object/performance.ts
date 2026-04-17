export interface ControlObjectEvaluationLink {
  evaluation_id: string;
  dataset_version: string;
}

export interface ControlObjectAutoRemediation {
  applied: Array<{
    error_type: string;
    remediation_type: 'tone' | 'content';
  }>;
}

export interface ControlObjectCostControl {
  estimated_cost_usd: number | null;
  total_rerun_cost_usd: number | null;
  rerun_count: number;
  cost_guardrail_triggered: boolean;
}

export interface ControlObjectAgentPerformance {
  agent_number: number;
  hallucination_rate: number;
  risky_promise_rate: number;
  unverified_rate: number;
  inconsistency_rate: number;
  agent_score: number;
  score_reliable: boolean;
}
