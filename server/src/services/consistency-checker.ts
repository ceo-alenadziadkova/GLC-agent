import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { insertPipelineEventRow } from './pipeline/events/insert-pipeline-event.js';
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
const HTTPS_PROPERLY_IMPLEMENTED_CUE = 'https properly implemented';
const INVALID_SSL_CUE = 'invalid ssl';
const GTM_CUE = 'tag manager';
const GA4_CUE = 'google analytics 4';
const VIEWPORT_MISSING_CUE = 'no viewport meta tag';
const RESPONSIVE_CUES = ['mobile-responsive', 'mobile responsive', 'responsive'];

function deriveIssueStatus(issue: {
  status?: string;
  confidence?: string;
  evidence_refs?: unknown[];
}): 'confirmed' | 'unverified' | 'not_assessed' {
  if (issue.status === 'confirmed' || issue.status === 'unverified' || issue.status === 'not_assessed') {
    return issue.status;
  }
  if (!Array.isArray(issue.evidence_refs) || issue.evidence_refs.length === 0) {
    return 'not_assessed';
  }
  if (issue.confidence === 'low') {
    return 'unverified';
  }
  return 'confirmed';
}

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
    const metrics = {
      issues_total: 0,
      issues_confirmed: 0,
      issues_unverified: 0,
      issues_not_assessed: 0,
      conflicts_total: 0,
      issues_without_evidence: 0,
      evidence_coverage_rate: 1,
      critical_precision_proxy: 1,
    };

    // Fetch all domain rows for this wing
    const { data: domains } = await supabase
      .from('audit_domains')
      .select('domain_key, status, score, strengths, issues, recommendations, confidence_distribution, unknown_items, phase_number')
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
        description?: string;
        status?: string;
        evidence_refs?: unknown[];
      }>;
      const strengths = (domain.strengths ?? []) as string[];
      const recommendations = (domain.recommendations ?? []) as Array<{ impact?: string }>;
      metrics.issues_total += issues.length;
      metrics.issues_confirmed += issues.filter(i => deriveIssueStatus(i) === 'confirmed').length;
      metrics.issues_unverified += issues.filter(i => deriveIssueStatus(i) === 'unverified').length;
      metrics.issues_not_assessed += issues.filter(i => deriveIssueStatus(i) === 'not_assessed').length;

      const issuesWithoutEvidence = issues.filter(i => !Array.isArray(i.evidence_refs) || i.evidence_refs.length === 0);
      if (issuesWithoutEvidence.length > 0) {
        metrics.issues_without_evidence += issuesWithoutEvidence.length;
        flags.push({
          id: `evidence-coverage:${key}`,
          severity: 'warning',
          domain_key: key,
          rule: 'evidence_coverage_gap',
          message: `[${key}] ${issuesWithoutEvidence.length} issues have no evidence_refs.`,
        });
      }

      const nonConfirmedSevere = issues.filter(
        i => (i.severity === 'critical' || i.severity === 'high') && deriveIssueStatus(i) !== 'confirmed',
      );
      if (nonConfirmedSevere.length > 0) {
        flags.push({
          id: `status-severity:${key}`,
          severity: 'warning',
          domain_key: key,
          rule: 'status_severity_mismatch',
          message: `[${key}] Non-confirmed findings must not be critical/high.`,
        });
      }

      const strengthsText = strengths.join(' ').toLowerCase();
      const issuesText = issues.map((issue) => `${issue.title} ${issue.description ?? ''}`.toLowerCase());
      const contradictionRules: Array<{ rule: string; message: string; hit: boolean }> = [
        {
          rule: 'https_strength_vs_invalid_ssl',
          message: `[${key}] HTTPS strength conflicts with invalid SSL issue.`,
          hit:
            strengthsText.includes(HTTPS_PROPERLY_IMPLEMENTED_CUE) &&
            issuesText.some((text) => text.includes(INVALID_SSL_CUE)),
        },
        {
          rule: 'ga4_detected_vs_gtm_not_observed',
          message: `[${key}] GA4 strength conflicts with GTM finding without explicit GTM evidence.`,
          hit:
            strengthsText.includes(GA4_CUE) &&
            issuesText.some((text) => text.includes(GTM_CUE)) &&
            !strengthsText.includes(GTM_CUE),
        },
        {
          rule: 'responsive_signals_vs_missing_viewport',
          message: `[${key}] Responsive claim conflicts with missing viewport issue.`,
          hit:
            (strengthsText.includes(RESPONSIVE_CUES[0]) ||
              strengthsText.includes(RESPONSIVE_CUES[1]) ||
              strengthsText.includes(RESPONSIVE_CUES[2])) &&
            issuesText.some((text) => text.includes(VIEWPORT_MISSING_CUE)),
        },
      ];
      for (const contradictionRule of contradictionRules) {
        if (!contradictionRule.hit) continue;
        metrics.conflicts_total += 1;
        flags.push({
          id: `${contradictionRule.rule}:${key}`,
          severity: 'warning',
          blocking: true,
          domain_key: key,
          rule: contradictionRule.rule,
          message: contradictionRule.message,
        });
      }

      const contradictionHits = issues.filter((issue) => {
        const title = issue.title.toLowerCase();
        const desc = (issue.description ?? '').toLowerCase();
        const issueText = `${title} ${desc}`;
        const sslConflict = issueText.includes(INVALID_SSL_CUE) && strengthsText.includes(HTTPS_PROPERLY_IMPLEMENTED_CUE);
        const gtmConflict = issueText.includes(GTM_CUE) && strengthsText.includes(GA4_CUE) && !strengthsText.includes(GTM_CUE);
        return sslConflict || gtmConflict;
      });
      if (contradictionHits.length > 0) {
        flags.push({
          id: `internal-conflict:${key}`,
          severity: 'warning',
          blocking: true,
          domain_key: key,
          rule: 'internal_conflict',
          message: `[${key}] Potential contradiction detected inside issue text.`,
        });
      }

      const unsourcedNumericImpacts = recommendations.filter((r) => {
        const impact = (r.impact ?? '').toLowerCase();
        const hasPercent = /\b\d{1,3}\s*-\s*\d{1,3}%|\b\d{1,3}%/.test(impact);
        const hasSourceCue = /benchmark|source|industry/.test(impact);
        return hasPercent && !hasSourceCue;
      });
      if (unsourcedNumericImpacts.length > 0) {
        flags.push({
          id: `unsourced-impact:${key}`,
          severity: 'warning',
          blocking: true,
          domain_key: key,
          rule: 'unsourced_numeric_impact',
          message: `[${key}] Numeric impact claims require benchmark/source annotation.`,
        });
      }

      const nonConfirmedCategorical = issues.filter((issue) => {
        const status = deriveIssueStatus(issue);
        if (status === 'confirmed') return false;
        const text = `${issue.title} ${issue.description ?? ''}`.toLowerCase();
        return (
          text.includes('missing') ||
          text.includes('absent') ||
          text.includes('not detected') ||
          text.includes('no ')
        );
      });
      if (nonConfirmedCategorical.length > 0) {
        flags.push({
          id: `categorical-unverified:${key}`,
          severity: 'warning',
          blocking: true,
          domain_key: key,
          rule: 'categorical_claim_without_confirmation',
          message: `[${key}] Categorical “missing/absent/no” wording found on unverified findings.`,
        });
      }

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
    if (metrics.issues_total > 0) {
      const withEvidence = metrics.issues_total - metrics.issues_without_evidence;
      metrics.evidence_coverage_rate = Math.max(0, Math.min(1, withEvidence / metrics.issues_total));
      const severeTotal = metrics.issues_total;
      if (severeTotal > 0) {
        metrics.critical_precision_proxy = metrics.issues_confirmed / severeTotal;
      }
    }

    const report: QualityGateReport = {
      passed,
      flags,
      checked_at: new Date().toISOString(),
      metrics,
    };

    await insertPipelineEventRow({
      auditId,
      phase: gatePhase,
      eventType: PIPELINE_EVENT_TYPES.qualityGate,
      message: passed ? qualityGateEventMessagePassed() : qualityGateEventMessageWarnings(warningCount),
      data: report as unknown as Record<string, unknown>,
      mergeObservabilityContext: false,
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

    logger.info('quality_gate.metrics', {
      component: 'consistency_checker',
      audit_id: auditId,
      gate_phase: gatePhase,
      metrics,
      passed,
    });

    return report;
  }
}

export const consistencyChecker = new ConsistencyChecker();
