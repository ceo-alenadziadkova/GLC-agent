/**
 * Rule Engine Config — error_type → agent instruction patches.
 *
 * Phase 4: Config-only. Inert — no service reads this at runtime yet.
 * Phase 5: DynamicAdjustmentService will read this to patch agent prompts on refine.
 *
 * Each rule maps an error code (from CONTROL_OBJECT.errors.*) to:
 *   - which agents are affected (by phase number)
 *   - what instruction text to append to their prompt on rerun
 *
 * Agent numbers align with PHASE_DOMAIN_MAP in audit.ts:
 *   1 = tech_infrastructure
 *   2 = security_compliance
 *   3 = seo_digital
 *   4 = ux_conversion
 *   5 = marketing_utp
 *   6 = automation_processes
 *
 * Version history:
 *   v1.8  — Phase 4: initial rule set (inert, no runtime consumer yet)
 *   v2.0  — Phase 5: DynamicAdjustmentService activates this config
 *   v2.4  — Phase 9: optional auto_remediate + remediation_action for RemediationService
 */

// ─── Rule Shape ───────────────────────────────────────────────────────────────

/** How RemediationService mutates cleaned output when auto_remediate is true. */
export type RemediationAction = 'soften_absolutes' | 'append_outcome_disclaimer';

export interface RuleEngineEntry {
  /** Error code matching CONTROL_OBJECT.errors.fixable[], structural[], or data_gaps[] */
  error_type: string;
  /** Phase agent numbers this rule applies to (1–6) */
  applies_to_agents: number[];
  /** Instruction text appended to the agent's system prompt on rerun */
  instruction_append: string;
  /**
   * Priority: higher number = applied first when multiple rules match.
   * Default: 0. Use to ensure safety-critical instructions come before style fixes.
   */
  priority?: number;
  /**
   * Phase 9: when true and FEATURE_AUTO_REMEDIATION, RemediationService may patch cleaned output
   * without a full agent rerun (tone/content gated by phase profile).
   */
  auto_remediate?: boolean;
  remediation_type?: 'tone' | 'content';
  /** Required when auto_remediate is true — deterministic transform applied to text fields */
  remediation_action?: RemediationAction;
}

// ─── Rule Mapping ─────────────────────────────────────────────────────────────

export const RULE_ENGINE_MAPPING: RuleEngineEntry[] = [
  // ── Hallucination / Fabrication ──────────────────────────────────────────
  {
    error_type: 'score_evidence_mismatch',
    applies_to_agents: [1, 2, 3, 4, 5, 6],
    instruction_append:
      'Your score must be directly supported by evidence in the collected data. ' +
      'Do not assign a score higher than the evidence warrants. ' +
      'If evidence is insufficient, lower the score and note the gap in unknown_items.',
    priority: 10,
  },
  {
    error_type: 'infra_unverified_capacity',
    applies_to_agents: [1],
    instruction_append:
      'Do not state capacity or performance figures unless they appear in the collected metrics. ' +
      'Use qualitative language ("capacity appears limited", "no benchmark data available") when figures are absent.',
    priority: 8,
  },
  {
    error_type: 'security_overclaim',
    applies_to_agents: [2],
    instruction_append:
      'Do not assert compliance status (GDPR, SOC2, ISO27001, etc.) without explicit evidence. ' +
      'Use "appears to" or "no evidence of" rather than definitive statements about security posture.',
    priority: 10,
  },
  {
    error_type: 'compliance_unverified',
    applies_to_agents: [2],
    instruction_append:
      'Compliance claims require traceable evidence. If no policy documents or audit records ' +
      'were collected, mark the finding as unverified and add it to unknown_items.',
    priority: 9,
  },
  {
    error_type: 'seo_unverified_traffic_figure',
    applies_to_agents: [3],
    instruction_append:
      'Do not state specific traffic numbers unless they appear in the collected analytics data. ' +
      'Where no data was collected, use ranges or qualitative estimates with a confidence note.',
    priority: 8,
  },
  {
    error_type: 'ux_conversion_figure_unverified',
    applies_to_agents: [4],
    instruction_append:
      'Conversion rate figures must be sourced from collected analytics. ' +
      'If no analytics data is available, do not state numeric conversion rates — use qualitative assessment instead.',
    priority: 8,
  },
  {
    error_type: 'marketing_market_size_unverified',
    applies_to_agents: [5],
    instruction_append:
      'Market size and TAM figures require a cited source. ' +
      'If no data was collected, present as an estimate with a range and label it as a hypothesis.',
    priority: 7,
  },
  {
    error_type: 'automation_time_saving_speculative',
    applies_to_agents: [6],
    instruction_append:
      'Time-saving estimates for automation must be grounded in the current process data from the brief. ' +
      'Without baseline time data, state "estimated savings TBD pending time study" rather than specific hours.',
    priority: 8,
  },

  // ── Risky Promises / Tone ─────────────────────────────────────────────────
  {
    error_type: 'risky_promise_language',
    applies_to_agents: [1, 2, 3, 4, 5, 6],
    instruction_append:
      'Avoid deterministic outcome language in recommendations. ' +
      'Replace "will increase", "will reduce", "guaranteed" with ' +
      '"is expected to", "may improve", "evidence suggests". ' +
      'Frame forward-looking claims as hypotheses.',
    priority: 9,
    auto_remediate: true,
    remediation_type: 'tone',
    remediation_action: 'append_outcome_disclaimer',
  },
  {
    error_type: 'forbidden_absolutes',
    applies_to_agents: [1, 2, 3, 4, 5, 6],
    instruction_append:
      'Remove absolute language: "guarantee", "certainly", "always", "never", "100%", "risk-free". ' +
      'Replace with hedged equivalents: "typically", "in most cases", "reduces risk of", "tends to".',
    priority: 9,
    auto_remediate: true,
    remediation_type: 'tone',
    remediation_action: 'soften_absolutes',
  },
  {
    error_type: 'missing_hypothesis_labels',
    applies_to_agents: [3, 4, 5, 6],
    instruction_append:
      'Strategic recommendations that are not backed by hard data must be explicitly labelled as hypotheses. ' +
      'Use phrases like "Hypothesis:", "We expect that...", or "Based on patterns observed, likely...".',
    priority: 7,
  },

  // ── Data Gaps ────────────────────────────────────────────────────────────
  {
    error_type: 'score_consistency_flag',
    applies_to_agents: [1, 2, 3, 4, 5, 6],
    instruction_append:
      'Re-evaluate your score against the severity distribution of the issues you identified. ' +
      'If you have more than two critical issues, the score should not exceed 3/5. ' +
      'Ensure the score reflects the worst-case finding, not an average.',
    priority: 6,
  },
  {
    error_type: 'infra_missing_monitoring_evidence',
    applies_to_agents: [1],
    instruction_append:
      'If no monitoring/alerting data was collected, explicitly note this as an unknown_item ' +
      'and do not recommend changes to monitoring configuration without acknowledging the evidence gap.',
    priority: 5,
  },
  {
    error_type: 'seo_missing_crawl_evidence',
    applies_to_agents: [3],
    instruction_append:
      'If crawl data was unavailable, limit technical SEO findings to what can be inferred from ' +
      'the page structure and headers only. Flag crawl-dependent conclusions as unverified.',
    priority: 5,
  },

  // ── Structural ────────────────────────────────────────────────────────────
  {
    error_type: 'infra_unrealistic_timeline',
    applies_to_agents: [1],
    instruction_append:
      'Review your timeline recommendations against the team size and known system complexity. ' +
      'Ensure implementation timelines are conservative and account for testing, rollback, and review cycles.',
    priority: 7,
  },
  {
    error_type: 'automation_integration_complexity_underestimated',
    applies_to_agents: [6],
    instruction_append:
      'Account for integration complexity when recommending automation. ' +
      'Each additional tool integration adds testing, maintenance, and failure-mode risk. ' +
      'Recommend phased integration rather than all-at-once automation deployment.',
    priority: 7,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns all rules matching a given error_type, sorted by priority descending.
 * Used by DynamicAdjustmentService in Phase 5.
 */
export function getRulesForErrorType(errorType: string): RuleEngineEntry[] {
  return RULE_ENGINE_MAPPING
    .filter(r => r.error_type === errorType)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Returns all rules that apply to a given agent number, sorted by priority descending.
 */
export function getRulesForAgent(agentNumber: number): RuleEngineEntry[] {
  return RULE_ENGINE_MAPPING
    .filter(r => r.applies_to_agents.includes(agentNumber))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
