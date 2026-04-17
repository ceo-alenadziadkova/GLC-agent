/**
 * RemediationService — Phase 9 auto-remediation of fixable tone issues on cleaned domain output.
 *
 * CO-CONSUMER: update when CONTROL_OBJECT or RuleEngineEntry remediation fields change.
 * Tunables and copy: `SYSTEM_DEFAULTS.autoRemediation` in `server/src/config/system-defaults.ts`.
 * Confidence gate: `DECISION_LAYER_THRESHOLDS` in `decision-layer.ts` (single source for min overall).
 * See docs/adrs/ADR-AUTO-REMEDIATION.md
 */

import type { ControlObjectV1 } from '../schemas/control-object/index.js';
import {
  CONTROL_OBJECT_VERSIONS_REMEDIATION,
  HUMAN_ATTENTION_CONTENT_REMEDIATION_BLOCKED,
  type ControlObjectAutoRemediation,
} from '../schemas/control-object/index.js';
import type { DomainKey, DomainResult } from '../types/audit.js';
import { DOMAIN_KEYS } from '../types/audit.js';
import { getRulesForErrorType, type RuleEngineEntry } from '../config/rule-engine.js';
import { getExtendedPhaseProfile } from '../config/phase-profiles.js';
import { isAutoRemediationEnabled } from '../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { DECISION_LAYER_THRESHOLDS } from './decision-layer.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';

const AR = SYSTEM_DEFAULTS.autoRemediation;
const AR_ABS = AR.absoluteSoftening;

function escapeRegexToken(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAbsolutePattern(): RegExp {
  const inner = AR_ABS.phraseAlternation.map(escapeRegexToken).join('|');
  return new RegExp(`\\b(${inner})\\b|${AR_ABS.percentPatternSource}`, 'gi');
}

/** Built once — `SYSTEM_DEFAULTS` is static for the process lifetime. */
const ABSOLUTE_PATTERN = buildAbsolutePattern();

function replacementForAbsoluteMatch(match: string): string {
  const t = match.trim().toLowerCase();
  for (const rule of AR_ABS.rules) {
    if (rule.type === 'starts_with' && t.startsWith(rule.prefix.toLowerCase())) {
      return rule.replacement;
    }
    if (rule.type === 'exact' && rule.phrases.some(p => p.toLowerCase() === t)) {
      return rule.replacement;
    }
  }
  return AR_ABS.defaultReplacement;
}

function isGlcDomainPhaseKey(phaseId: string): phaseId is DomainKey {
  return (DOMAIN_KEYS as readonly string[]).includes(phaseId);
}

export function canAutoRemediate(co: ControlObjectV1): boolean {
  return (
    co.errors.structural.length === 0 &&
    co.confidence.overall >= DECISION_LAYER_THRESHOLDS.accept_with_warnings.min_overall_confidence &&
    !co.human_attention_required.required
  );
}

function isRemediationAllowed(entry: RuleEngineEntry, scope: 'tone_only' | 'tone_and_content'): boolean {
  const t = entry.remediation_type ?? 'tone';
  if (t === 'tone') return true;
  if (t === 'content') return scope === 'tone_and_content';
  return false;
}

function excerptFromResult(result: DomainResult): string {
  const maxLen = AR.excerptMaxChars;
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
  return mapStringsInResult(result, s => s.replace(ABSOLUTE_PATTERN, m => replacementForAbsoluteMatch(m)));
}

function appendDisclaimerToResult(result: DomainResult): boolean {
  if (result.summary.includes(AR.outcomeDisclaimerSkipIfContains)) return false;
  result.summary = `${result.summary.trimEnd()}${AR.outcomeDisclaimerAppend}`;
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
  const max = AR.auditLogFieldMaxChars;
  const { error } = await supabase.from('audit_remediations').insert({
    audit_id: input.auditId,
    phase_id: input.phaseId,
    error_type: input.errorType,
    remediation_type: input.remediationType,
    original_excerpt: input.originalExcerpt.slice(0, max),
    applied_fix: input.appliedFix.slice(0, max),
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

function decisionHintAllowsRemediation(hint: ControlObjectV1['decision_hint']): boolean {
  return (AR.allowedDecisionHints as readonly string[]).includes(hint);
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

  if (!decisionHintAllowsRemediation(controlObject.decision_hint)) return 0;

  if (!canAutoRemediate(controlObject)) return 0;

  const phaseId = controlObject.context.phase_id;
  if (!isGlcDomainPhaseKey(phaseId)) return 0;

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
      if (!controlObject.human_attention_required.reasons.includes(HUMAN_ATTENTION_CONTENT_REMEDIATION_BLOCKED)) {
        controlObject.human_attention_required.reasons.push(HUMAN_ATTENTION_CONTENT_REMEDIATION_BLOCKED);
      }
      continue;
    }

    const excerptBefore = excerptFromResult(cleanedOutput);
    const changed = applyRemediationAction(cleanedOutput, rule.remediation_action);
    if (!changed) continue;

    const fixLabel =
      rule.remediation_action === 'soften_absolutes'
        ? AR.appliedFixDescription.softenAbsolutes
        : AR.appliedFixDescription.appendOutcomeDisclaimer;

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
