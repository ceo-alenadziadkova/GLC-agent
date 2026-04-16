import { supabase } from './supabase.js';
import { logger } from './logger.js';
import type { QualityFlag, QualityGateReport } from '../types/audit.js';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  qualityGateEventMessagePassed,
  qualityGateEventMessageWarnings,
  qualityGateExcessiveDataGapsMessage,
  qualityGateFailedDomainMessage,
  qualityGateLowConfidenceCriticalMessage,
  qualityGateLowConfidenceMajorityMessage,
  qualityGateScoreHighWithCriticalMessage,
  qualityGateScoreLowWithoutCriticalHighMessage,
} from '../config/quality-gate-messages.en.js';

const QG = SYSTEM_DEFAULTS.qualityGate;

/**
 * ConsistencyChecker — Sprint 16
 *
 * Rule-based quality checks run automatically after each parallel wing completes.
 * Results are stored in pipeline_events (event_type: PIPELINE_EVENT_TYPES.qualityGate) and surfaced
 * to the consultant in ReviewPointModal before they approve the review gate.
 *
 * Checks performed:
 *   1. score_severity_mismatch  — thresholds controlled by `SYSTEM_DEFAULTS.qualityGate`
 *   2. low_confidence_majority  — low-confidence share > SYSTEM_DEFAULTS.qualityGate.lowConfidenceRatioWarn
 *   3. excessive_data_gaps      — unknown_items.length > SYSTEM_DEFAULTS.qualityGate.maxUnknownItemsForInfo
 *   4. failed_domain            — domain.status === 'failed' in this wing
 *   5. low_confidence_critical  — any issue with confidence: low AND severity: critical
 */
export class ConsistencyChecker {
  /**
   * Run all consistency checks for the domain phases that just completed.
   * Persists the result to pipeline_events and returns the report.
   *
   * @param auditId     Audit being checked
   * @param gatePhase   The review-gate phase number (e.g., 4 for Gate #2, 7 for Gate #3)
   * @param wingPhases  Phase numbers that belong to the wing that just ran (e.g., [1,2,3,4])
   */
  async run(auditId: string, gatePhase: number, wingPhases: number[]): Promise<QualityGateReport> {
    const flags: QualityFlag[] = [];

    // Fetch all domain rows for this wing
    const { data: domains } = await supabase
      .from('audit_domains')
      .select('domain_key, status, score, issues, confidence_distribution, unknown_items, phase_number')
      .eq('audit_id', auditId)
      .in('phase_number', wingPhases);

    for (const domain of domains ?? []) {
      const key = domain.domain_key as string;

      // ── Rule 4: failed domain ────────────────────────────────────────
      if (domain.status === 'failed') {
        flags.push({
          id: `failed:${key}`,
          severity: 'warning',
          domain_key: key,
          rule: 'failed_domain',
          message: qualityGateFailedDomainMessage(key),
        });
        continue; // no further checks on failed domain
      }

      const score: number = domain.score ?? 0;
      const issues = (domain.issues ?? []) as Array<{
        severity: string;
        confidence: string;
        title: string;
      }>;
      const unknownItems = (domain.unknown_items ?? []) as string[];
      const confDist = domain.confidence_distribution as { high: number; medium: number; low: number } | null;

      // ── Rule 1: score ↔ severity mismatch ───────────────────────────
      const hasCritical = issues.some(i => i.severity === 'critical');
      const hasCriticalOrHigh = issues.some(i => i.severity === 'critical' || i.severity === 'high');

      if (score >= QG.scoreSeverityMismatchCriticalMinScore && hasCritical) {
        flags.push({
          id: `score-severity:${key}`,
          severity: 'warning',
          domain_key: key,
          rule: 'score_severity_mismatch',
          message: qualityGateScoreHighWithCriticalMessage(key, score),
        });
      }

      if (score <= QG.scoreSeverityMismatchLowMaxScore && issues.length > 0 && !hasCriticalOrHigh) {
        flags.push({
          id: `low-score-no-critical:${key}`,
          severity: 'info',
          domain_key: key,
          rule: 'score_severity_mismatch',
          message: qualityGateScoreLowWithoutCriticalHighMessage(key, score),
        });
      }

      // ── Rule 2: low-confidence majority ─────────────────────────────
      if (confDist && issues.length > 0) {
        const lowRatio = confDist.low / issues.length;
        if (lowRatio > QG.lowConfidenceRatioWarn) {
          flags.push({
            id: `low-conf-majority:${key}`,
            severity: 'warning',
            domain_key: key,
            rule: 'low_confidence_majority',
            message: qualityGateLowConfidenceMajorityMessage({
              domainKey: key,
              lowCount: confDist.low,
              issueCount: issues.length,
              lowRatio,
            }),
          });
        }
      }

      // ── Rule 3: excessive data gaps ─────────────────────────────────
      if (unknownItems.length > QG.maxUnknownItemsForInfo) {
        flags.push({
          id: `data-gaps:${key}`,
          severity: 'info',
          domain_key: key,
          rule: 'excessive_data_gaps',
          message: qualityGateExcessiveDataGapsMessage(key, unknownItems.length),
        });
      }

      // ── Rule 5: low-confidence critical finding ──────────────────────
      const lowConfCritical = issues.filter(i => i.confidence === 'low' && i.severity === 'critical');
      if (lowConfCritical.length > 0) {
        flags.push({
          id: `low-conf-critical:${key}`,
          severity: 'warning',
          domain_key: key,
          rule: 'low_confidence_critical',
          message: qualityGateLowConfidenceCriticalMessage(key, lowConfCritical.length, lowConfCritical[0].title),
        });
      }
    }

    const passed = !flags.some(f => f.severity === 'warning');
    const warningCount = flags.filter(f => f.severity === 'warning').length;
    const report: QualityGateReport = {
      passed,
      flags,
      checked_at: new Date().toISOString(),
    };

    // Persist to pipeline_events — frontend reads this for the ReviewPointModal
    await supabase.from('pipeline_events').insert({
      audit_id: auditId,
      phase: gatePhase,
      event_type: PIPELINE_EVENT_TYPES.qualityGate,
      message: passed ? qualityGateEventMessagePassed() : qualityGateEventMessageWarnings(warningCount),
      data: report,
    });

    if (!passed) {
      const warnings = flags.filter(f => f.severity === 'warning');
      logger.warn('quality_gate.warnings', {
        component: 'consistency_checker',
        audit_id: auditId,
        gate_phase: gatePhase,
        warning_count: warnings.length,
        messages: warnings.map(f => f.message),
      });
    }

    return report;
  }
}

export const consistencyChecker = new ConsistencyChecker();
