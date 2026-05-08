import type { IntakeSliceDomain } from '@glc/intake-core';
import type { ReconConflict, ReconData } from '../../types/audit.js';

export interface AgentContext {
  company_url: string;
  /** When true, treat as no public site (skip live URL context); legacy rows may rely on sentinel URL only. */
  no_public_website?: boolean;
  company_name: string | null;
  industry: string | null;
  recon: ReconData | null;
  collected_data: Record<string, Record<string, unknown>>;
  previous_domains: Array<{
    domain_key: string;
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  review_notes: Array<{ phase: number; consultant_notes: string | null; interview_notes: string | null }>;
  /** Retry intent notes provided by consultant/operator before re-running a phase. */
  retry_notes?: Array<{ phase: number; retry_comment: string; created_at: string }>;
  domain_weight: number;
  /** Answered brief responses relevant to this domain (empty object when no brief) */
  brief_responses: Record<string, string | string[] | number | boolean | null>;
  brief_response_sources: Record<string, string>;
  intake_data_quality_score: number;
  intake_readiness_badge: 'low' | 'medium' | 'high';
  /**
   * Question-bank v1 only: heuristic 0–100 (docs/QUESTION_BANK.md §8). Omitted when no bank ids in responses.
   */
  intake_ai_readiness_score?: number;
  /**
   * Canon `reportUse` tag → normalized answer from bank ids (full brief), for prompts that need semantic anchors.
   */
  intake_report_anchors?: Record<string, string>;
  /**
   * Bank v1: pipeline domains that still have unanswered SLA-visible primary-feed questions.
   * Omitted when gaps are closed or responses lack bank ids.
   */
  intake_missing_report_domains?: string[];
  /**
   * Post-KPI Phase-B/C: normalized intake context envelope for downstream agents.
   * Feature-flagged on the server (`FEATURE_PROJECT_CONTEXT_ENVELOPE`).
   */
  intake_project_context_envelope?: Record<string, unknown>;
  post_audit_questions: Array<Record<string, unknown>>;
  recon_prefills: Record<string, unknown>;
  recon_conflicts: ReconConflict[];
  /**
   * Domain keys that failed during a parallel wing run.
   * Passed to Strategy Agent so it can acknowledge gaps in its report.
   */
  failed_domains: string[];
  /** Agent receiving this context — used to group intake lines by primary vs secondary feeds. */
  slice_domain: IntakeSliceDomain;
  /** Coalition snapshot from Context Director (Phase 0.5). */
  client_situation_snapshot?: Record<string, unknown> | null;
  /** Coalition hypothesis drafts (Phase 1), usually visible to alignment/finalize phases. */
  coalition_hypothesis_drafts?: Array<Record<string, unknown>>;
  /** Coalition alignment responses (Phase 2), usually visible to finalize/conflict phases. */
  coalition_alignment_responses?: Array<Record<string, unknown>>;
  /** Coalition conflict resolution bundle (Phase 3), visible to finalize/strategy phases. */
  coalition_conflict_resolution?: Record<string, unknown> | null;
  instructions: string;
}
