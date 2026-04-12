/**
 * RemediationService — Phase 9 auto-remediation of fixable tone issues on cleaned domain output.
 *
 * CO-CONSUMER: update when CONTROL_OBJECT or RuleEngineEntry remediation fields change.
 * See docs/adrs/ADR-AUTO-REMEDIATION.md
 */

import type { ControlObjectV1 } from '../schemas/control-object.js';
import {
  CONTROL_OBJECT_VERSIONS_REMEDIATION,
  type ControlObjectAutoRemediation,
} from '../schemas/control-object.js';
import type { DomainKey, DomainResult } from '../types/audit.js';
import { getRulesForErrorType, type RuleEngineEntry } from '../config/rule-engine.js';
import { getExtendedPhaseProfile } from '../config/phase-profiles.js';
import { isAutoRemediationEnabled } from '../config/feature-flags.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';

const DISCLAIMER =
  '\n\n[Note: Forward-looking statements above are hypotheses pending verification with data.]';

/** Absolute and over-strong phrasing → hedged wording (regex-based, deterministic). */
const ABSOLUTE_PATTERN =
  /\b(guaranteed|guarantee|always|never fails|zero risk|no risk|risk-free|certainly|definitely will|will never fail)\b|100\s*%/gi;

export function canAutoRemediate(co: ControlObjectV1): boolean {
  return (
    co.errors.structural.length === 0 &&
    co.confidence.overall >= 70 &&
    !co.human_attention_required.required
  );
}

function isRemediationAllowed(entry: RuleEngineEntry, scope: 'tone_only' | 'tone_and_content'): boolean {
  const t = entry.remediation_type ?? 'tone';
  if (t === 'tone') return true;
  if (t === 'content') return scope === 'tone_and_content';
  return false;
}

function excerptFromResult(result: DomainResult, maxLen = 500): string {
  const base = (result.summary ?? '').trim() || JSON.stringify(result.strengths?.slice(0, 2) ?? []);
  return base.length <= maxLen ? base : `${base.slice(0, maxLen - 1)}…`;
}

function mapStringsInResult(result: DomainResult, map: (s: string) => string): boolean {
  let changed = false;
  const next = map(result.summary);
  if (next !== result.summary) {
    result.summary = next;
    changed = true;
  }
  for (let i = 0; i < result.strengths.length; i++) {
    const n = map(result.strengths[i]!);
    if (n !== result.strengths[i]) {
      result.strengths[i] = n;
      changed = true;
    }
  }
  for (let i = 0; i < result.weaknesses.length; i++) {
    const n = map(result.weaknesses[i]!);
    if (n !== result.weaknesses[i]) {
      result.weaknesses[i] = n;
      changed = true;
    }
  }
  for (const issue of result.issues ?? []) {
    for (const field of ['title', 'description', 'impact'] as const) {
      const v = issue[field];
      const n = map(v);
      if (n !== v) {
        (issue as { title: string; description: string; impact: string })[field] = n;
        changed = true;
      }
    }
  }
  for (const qw of result.quick_wins ?? []) {
    for (const field of ['title', 'description'] as const) {
      const v = qw[field];
      const n = map(v);
      if (n !== v) {
        (qw as { title: string; description: string })[field] = n;
        changed = true;
      }
    }
  }
  for (const rec of result.recommendations ?? []) {
    for (const field of ['title', 'description', 'impact'] as const) {
      const v = rec[field];
      const n = map(v);
      if (n !== v) {
        (rec as { title: string; description: string; impact: string })[field] = n;
        changed = true;
      }
    }
  }
  for (let i = 0; i < (result.unknown_items?.length ?? 0); i++) {
    const n = map(result.unknown_items[i]!);
    if (n !== result.unknown_items[i]) {
      result.unknown_items[i] = n;
      changed = true;
    }
  }
  return changed;
}

/** Exported for unit tests — applies absolute-language softening across all text fields. */
export function softenAbsolutesInResult(result: DomainResult): boolean {
  return mapStringsInResult(result, s =>
    s.replace(ABSOLUTE_PATTERN, m => {
      const t = m.trim().toLowerCase();
      if (t.startsWith('100')) return 'a large share';
      if (t === 'always') return 'often';
      if (t === 'never fails' || t === 'will never fail') return 'may still fail';
      if (t === 'guaranteed' || t === 'guarantee') return 'expected';
      if (t === 'zero risk' || t === 'no risk' || t === 'risk-free') return 'residual risk';
      if (t === 'certainly') return 'likely';
      if (t === 'definitely will') return 'may';
      return 'may';
    }),
  );
}

function appendDisclaimerToResult(result: DomainResult): boolean {
  if (result.summary.includes('[Note: Forward-looking statements')) return false;
  result.summary = `${result.summary.trimEnd()}${DISCLAIMER}`;
  return true;
}

function applyRemediationAction(result: DomainResult, action: RuleEngineEntry['remediation_action']): boolean {
  if (action === 'soften_absolutes') return softenAbsolutesInResult(result);
  if (action === 'append_outcome_disclaimer') return appendDisclaimerToResult(result);
  return false;
}

async function logRemediationRow(input: {
  auditId: string;
  phaseId: string;
  errorType: string;
  remediationType: 'tone' | 'content';
  originalExcerpt: string;
  appliedFix: string;
  preconditionsSnapshot: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('audit_remediations').insert({
    audit_id: input.auditId,
    phase_id: input.phaseId,
    error_type: input.errorType,
    remediation_type: input.remediationType,
    original_excerpt: input.originalExcerpt.slice(0, 500),
    applied_fix: input.appliedFix.slice(0, 500),
    preconditions_snapshot: input.preconditionsSnapshot,
  });
  if (error) {
    logger.warn('remediation.audit_log_failed', {
      component: 'remediation',
      audit_id: input.auditId,
      phase_id: input.phaseId,
      error: error.message,
    });
  }
}

export interface ApplyAutoRemediationParams {
  auditId: string;
  controlObject: ControlObjectV1;
  cleanedOutput: DomainResult;
  phaseNumber: number;
  /** When true, skip all remediation for this orchestrator run. */
  disableAutoRemediate?: boolean;
}

/**
 * Applies deterministic text fixes for matching fixable errors when preconditions hold
 * and Decision Layer already chose accept / accept_with_warnings.
 *
 * Mutates `cleanedOutput` and `controlObject` in place.
 * @returns number of remediation actions applied
 */
export async function applyAutoRemediation(params: ApplyAutoRemediationParams): Promise<number> {
  const { auditId, controlObject, cleanedOutput, phaseNumber, disableAutoRemediate } = params;

  if (disableAutoRemediate || !isAutoRemediationEnabled()) return 0;

  const hint = controlObject.decision_hint;
  if (hint !== 'accept' && hint !== 'accept_with_warnings') return 0;

  if (!canAutoRemediate(controlObject)) return 0;

  const phaseId = controlObject.context.phase_id;
  if (phaseId === 'recon' || phaseId === 'strategy') return 0;

  const profile = getExtendedPhaseProfile(phaseId);
  const scope = profile.auto_remediation_scope;

  const appliedEntries: ControlObjectAutoRemediation['applied'] = [];
  const fixableSnapshot = [...controlObject.errors.fixable];

  for (const errorType of fixableSnapshot) {
    if (controlObject.human_attention_required.required) break;

    const rules = getRulesForErrorType(errorType).filter(
      r =>
        r.auto_remediate === true &&
        r.applies_to_agents.includes(phaseNumber) &&
        r.remediation_action !== undefined &&
        r.remediation_type !== undefined,
    );
    const rule = rules[0];
    if (!rule) continue;

    if (!isRemediationAllowed(rule, scope)) {
      controlObject.human_attention_required.required = true;
      if (!controlObject.human_attention_required.reasons.includes('content_remediation_blocked_by_phase_profile')) {
        controlObject.human_attention_required.reasons.push('content_remediation_blocked_by_phase_profile');
      }
      continue;
    }

    const excerptBefore = excerptFromResult(cleanedOutput);
    const changed = applyRemediationAction(cleanedOutput, rule.remediation_action);
    if (!changed) continue;

    const fixLabel =
      rule.remediation_action === 'soften_absolutes'
        ? 'Softened absolute or over-strong phrasing in domain text fields.'
        : 'Appended forward-looking disclaimer to summary.';

    await logRemediationRow({
      auditId,
      phaseId,
      errorType,
      remediationType: rule.remediation_type!,
      originalExcerpt: excerptBefore,
      appliedFix: fixLabel,
      preconditionsSnapshot: {
        confidence_overall: controlObject.confidence.overall,
        errors_structural: [...controlObject.errors.structural],
        errors_fixable_before: fixableSnapshot,
        human_attention_required: controlObject.human_attention_required.required,
      },
    });

    appliedEntries.push({
      error_type: errorType,
      remediation_type: rule.remediation_type!,
    });

    const idx = controlObject.errors.fixable.indexOf(errorType);
    if (idx >= 0) controlObject.errors.fixable.splice(idx, 1);
  }

  if (appliedEntries.length > 0) {
    controlObject.auto_remediation = { applied: appliedEntries };
    controlObject.versions = {
      ...controlObject.versions,
      ...CONTROL_OBJECT_VERSIONS_REMEDIATION,
    };

    logger.info('remediation.applied', {
      component: 'remediation',
      audit_id: auditId,
      phase_id: phaseId,
      count: appliedEntries.length,
      error_types: appliedEntries.map(e => e.error_type),
    });
  }

  return appliedEntries.length;
}
