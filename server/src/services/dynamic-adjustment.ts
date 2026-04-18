/**
 * Dynamic Adjustment Service — generates per-agent instruction patches from CONTROL_OBJECT errors.
 *
 * Activated in Phase 5 when AUTO_LOOP_ENABLED=true.
 * Reads CONTROL_OBJECT.errors.* + Rule Engine config → returns instruction strings
 * keyed by agent phase number. These are appended to agent system prompts on rerun.
 *
 * Design:
 *   - Deterministic: same errors always produce same patches (no AI, no randomness)
 *   - Additive: patches are appended, never replace base instructions
 *   - Prioritised: higher-priority rules appear first in the appended text
 *   - Conservative: only fires for agents directly implicated by the error
 *
 * Version history:
 *   v2.0  — Phase 5: initial implementation (activated by AUTO_LOOP_ENABLED)
 */

import { RULE_ENGINE_MAPPING, type RuleEngineEntry } from '../config/rule-engine.js';
import { logger } from './logger.js';
import type { ControlObjectV1 } from '../schemas/control-object/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Map of agent phase number → instruction text to append on rerun */
export type AdjustmentMap = Map<number, string>;

export interface AdjustmentResult {
  /** Agent number → instruction patch */
  adjustments: AdjustmentMap;
  /** Error types that triggered at least one rule */
  matched_error_types: string[];
  /** Error types present in the CO but with no matching rule */
  unmatched_error_types: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DynamicAdjustmentService {
  /**
   * Generates instruction patches for all agents implicated by the CONTROL_OBJECT errors.
   *
   * Priority order: higher-priority rules are placed first in the appended text.
   * If multiple rules apply to the same agent, their instructions are newline-joined
   * in priority-descending order with a separator comment.
   */
  generateAdjustments(controlObject: ControlObjectV1): AdjustmentResult {
    try {
      return this._generateAdjustments(controlObject);
    } catch (err) {
      logger.warn('dynamic_adjustment.generate_failed', {
        component: 'dynamic_adjustment',
        audit_id: controlObject.context.audit_id,
        phase_id: controlObject.context.phase_id,
        error: err instanceof Error ? err.message : String(err),
      });
      return { adjustments: new Map(), matched_error_types: [], unmatched_error_types: [] };
    }
  }

  private _generateAdjustments(controlObject: ControlObjectV1): AdjustmentResult {
    // Collect all error types from the CONTROL_OBJECT
    const allErrorTypes = new Set<string>([
      ...controlObject.errors.fixable,
      ...controlObject.errors.structural,
      // data_gaps are informational — no instruction patch needed; they drive unknown_items
    ]);

    const matchedErrorTypes = new Set<string>();
    const unmatchedErrorTypes = new Set<string>();

    // Per-agent: sorted list of matching rules (priority descending)
    const agentRules = new Map<number, RuleEngineEntry[]>();

    for (const errorType of allErrorTypes) {
      const matchingRules = RULE_ENGINE_MAPPING
        .filter(r => r.error_type === errorType)
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      if (matchingRules.length === 0) {
        unmatchedErrorTypes.add(errorType);
        continue;
      }

      matchedErrorTypes.add(errorType);

      for (const rule of matchingRules) {
        for (const agentNum of rule.applies_to_agents) {
          const existing = agentRules.get(agentNum) ?? [];
          // Avoid duplicate rules for the same agent
          if (!existing.some(r => r.error_type === rule.error_type)) {
            existing.push(rule);
          }
          agentRules.set(agentNum, existing);
        }
      }
    }

    // Build final instruction strings per agent
    const adjustments: AdjustmentMap = new Map();

    for (const [agentNum, rules] of agentRules.entries()) {
      // Sort by priority descending before joining
      const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const text = sorted
        .map(r => `[Correction for ${r.error_type}]\n${r.instruction_append}`)
        .join('\n\n');
      adjustments.set(agentNum, text);
    }

    logger.info('dynamic_adjustment.adjustments_generated', {
      component: 'dynamic_adjustment',
      audit_id: controlObject.context.audit_id,
      phase_id: controlObject.context.phase_id,
      agent_count: adjustments.size,
      matched_count: matchedErrorTypes.size,
      unmatched_count: unmatchedErrorTypes.size,
    });

    return {
      adjustments,
      matched_error_types: [...matchedErrorTypes],
      unmatched_error_types: [...unmatchedErrorTypes],
    };
  }
}

export const dynamicAdjustmentService = new DynamicAdjustmentService();
