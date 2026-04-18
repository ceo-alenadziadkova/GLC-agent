import type { PipelineEvent } from '../../data/auditTypes';

export type PipelineReview = {
  after_phase: number;
  status: string;
  consultant_notes: string | null;
  interview_notes: string | null;
};

export type PipelineExecutionPlan = {
  selected_domains: string[];
  depth: string;
  source: string;
  coverage_package?: 'starter' | 'pro' | 'complete';
  include_strategy?: boolean;
} | null;

export type PipelineStateLite = {
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  execution_plan?: PipelineExecutionPlan;
  events: PipelineEvent[];
  reviews: PipelineReview[];
};
