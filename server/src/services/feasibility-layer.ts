/**
 * Feasibility Layer — deterministic rule-based assessment of recommendation realisability.
 *
 * NOT AI scoring. Each domain has a set of heuristic templates that fire when
 * recommendations conflict with brief constraints (team size, timelines, resource limits).
 *
 * Returns a FeasibilityResult consumed by:
 *   - FactChecker.buildControlObject() → populates co.feasibility + co.confidence.feasibility
 *   - DecisionLayer.decide()           → feasibility can force 'refine' regardless of confidence
 *
 * Version history:
 *   v1.7  — Phase 3: initial implementation (rule-based, 6 domains, no ML)
 */

import type { DomainKey } from '../types/audit.js';
import type { DomainResult } from '../types/audit.js';
import { logger } from './logger.js';

// ─── Result Shape ─────────────────────────────────────────────────────────────

export interface FeasibilityRisk {
  code: string;
  description: string;
  /** How badly this risk degrades feasibility score */
  severity: 'low' | 'medium' | 'high';
}

export interface FeasibilityResult {
  /**
   * 0.0–1.0. Starts at 1.0, decremented by risk severity:
   *   high   → −0.25
   *   medium → −0.15
   *   low    → −0.07
   * Floor: 0.1 (always some feasibility unless all checks fail).
   */
  score: number;
  risks: FeasibilityRisk[];
  /** Short notes surfaced in CONTROL_OBJECT.feasibility.notes */
  notes: string[];
}

// ─── Brief Snapshot ───────────────────────────────────────────────────────────

/**
 * Subset of brief fields used in feasibility assessment.
 * Populated by BaseAgent from AgentContext.brief; unknown values default to 0/false/null.
 */
export interface BriefSnapshot {
  team_size?: number;
  has_dedicated_dev_team?: boolean;
  has_audit_policy?: boolean;
  has_analytics?: boolean;
  has_crm?: boolean;
  monthly_budget_usd?: number;
  /** Number of active SaaS/third-party integrations */
  integration_count?: number;
  /** Self-reported tech maturity: 1 (low) – 5 (high) */
  tech_maturity?: number;
}

// ─── Severity Constants ───────────────────────────────────────────────────────

const PENALTY: Record<FeasibilityRisk['severity'], number> = {
  high: 0.25,
  medium: 0.15,
  low: 0.07,
};

// ─── Feasibility Layer ────────────────────────────────────────────────────────

export class FeasibilityLayer {
  /**
   * Assess feasibility of `result` recommendations given `brief` constraints.
   *
   * Non-throwing: returns full-score result on unexpected errors.
   */
  assess(
    domainKey: DomainKey,
    result: DomainResult,
    brief: BriefSnapshot
  ): FeasibilityResult {
    try {
      return this._assess(domainKey, result, brief);
    } catch (err) {
      logger.warn('feasibility_layer.assess_failed', {
        component: 'feasibility_layer',
        domain: domainKey,
        error: err instanceof Error ? err.message : String(err),
      });
      return { score: 1.0, risks: [], notes: [] };
    }
  }

  private _assess(
    domainKey: DomainKey,
    result: DomainResult,
    brief: BriefSnapshot
  ): FeasibilityResult {
    const risks: FeasibilityRisk[] = [];

    switch (domainKey) {
      case 'tech_infrastructure':
        this.assessTechInfra(result, brief, risks);
        break;
      case 'security_compliance':
        this.assessSecurity(result, brief, risks);
        break;
      case 'seo_digital':
        this.assessSeo(result, brief, risks);
        break;
      case 'ux_conversion':
        this.assessUx(result, brief, risks);
        break;
      case 'marketing_utp':
        this.assessMarketing(result, brief, risks);
        break;
      case 'automation_processes':
        this.assessAutomation(result, brief, risks);
        break;
    }

    // Universal check: budget constraints
    this.assessBudget(result, brief, risks);

    const score = this.computeScore(risks);
    const notes = risks.map(r => `[${r.severity.toUpperCase()}] ${r.description}`);

    return { score, risks, notes };
  }

  // ─── Domain Assessors ────────────────────────────────────────────────────────

  private assessTechInfra(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    const recs = result.recommendations ?? [];

    // Small team attempting core architecture overhaul
    const hasArchRec = recs.some(r =>
      /\b(re-architect|microservice|migrate|overhaul|rebuild|refactor core)\b/i.test(r.description)
    );
    if (hasArchRec && (brief.team_size ?? 0) < 3) {
      risks.push({
        code: 'infra_arch_overhaul_small_team',
        description: 'Core architecture change recommended but team size < 3 — high integration risk.',
        severity: 'high',
      });
    }

    // Short timeline + many systems affected (inferred from issue count)
    const highIssueCount = (result.issues ?? []).filter(i => i.severity === 'critical' || i.severity === 'high').length;
    if (highIssueCount > 5 && (brief.tech_maturity ?? 3) < 2) {
      risks.push({
        code: 'infra_high_issue_count_low_maturity',
        description: `${highIssueCount} high/critical infra issues but tech maturity is low — remediation timeline likely underestimated.`,
        severity: 'medium',
      });
    }

    // No dedicated dev team but heavy infra recommendations
    if (!brief.has_dedicated_dev_team && recs.length > 3) {
      risks.push({
        code: 'infra_no_dev_team',
        description: 'Multiple infrastructure improvements recommended but no dedicated dev team reported.',
        severity: 'medium',
      });
    }
  }

  private assessSecurity(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    const recs = result.recommendations ?? [];

    // Compliance recommendations but no audit policy
    const hasComplianceRec = recs.some(r =>
      /\b(gdpr|soc2|iso27001|compliance|audit trail|data protection)\b/i.test(r.description)
    );
    if (hasComplianceRec && !brief.has_audit_policy) {
      risks.push({
        code: 'security_compliance_no_policy_foundation',
        description: 'Compliance recommendations present but no existing audit policy — prerequisite work needed first.',
        severity: 'high',
      });
    }

    // Many critical security issues + small team
    const criticalIssues = (result.issues ?? []).filter(i => i.severity === 'critical').length;
    if (criticalIssues >= 3 && (brief.team_size ?? 0) < 2) {
      risks.push({
        code: 'security_critical_issues_insufficient_team',
        description: `${criticalIssues} critical security issues but team size < 2 — resolution timeline at risk.`,
        severity: 'high',
      });
    }

    // Score is critically low — organisation may not be ready for advanced recommendations
    if ((result.score ?? 5) <= 2 && recs.length > 4) {
      risks.push({
        code: 'security_low_score_many_recs',
        description: 'Security score critical (≤2) with many recommendations — foundational fixes must precede advanced items.',
        severity: 'medium',
      });
    }
  }

  private assessSeo(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    const recs = result.recommendations ?? [];

    // Technical SEO recs but no dev capacity
    const hasTechSeoRec = recs.some(r =>
      /\b(core web vitals|structured data|schema markup|site speed|crawl|canonicalization)\b/i.test(r.description)
    );
    if (hasTechSeoRec && !brief.has_dedicated_dev_team) {
      risks.push({
        code: 'seo_tech_recs_no_dev_capacity',
        description: 'Technical SEO improvements recommended but no dedicated dev team — implementation dependency risk.',
        severity: 'medium',
      });
    }

    // No analytics = SEO measurement impossible
    if (!brief.has_analytics) {
      risks.push({
        code: 'seo_missing_analytics',
        description: 'No analytics platform detected — SEO performance measurement and iteration will be blind.',
        severity: 'medium',
      });
    }
  }

  private assessUx(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    const recs = result.recommendations ?? [];

    // A/B testing recommendations but no analytics
    const hasAbRec = recs.some(r =>
      /\b(a\/b test|split test|experiment|multivariate)\b/i.test(r.description)
    );
    if (hasAbRec && !brief.has_analytics) {
      risks.push({
        code: 'ux_ab_test_no_analytics',
        description: 'A/B testing recommended but no analytics platform in place — testing infrastructure prerequisite missing.',
        severity: 'high',
      });
    }

    // Design overhaul + small team
    const hasDesignOverhaulRec = recs.some(r =>
      /\b(redesign|design system|full redesign|overhaul|rebrand)\b/i.test(r.description)
    );
    if (hasDesignOverhaulRec && (brief.team_size ?? 0) < 2) {
      risks.push({
        code: 'ux_design_overhaul_small_team',
        description: 'Full UX redesign recommended but very small team — scope reduction may be needed.',
        severity: 'medium',
      });
    }
  }

  private assessMarketing(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    const recs = result.recommendations ?? [];

    // Multi-channel campaign recs without CRM
    const hasMultiChannelRec = recs.some(r =>
      /\b(omnichannel|multi-channel|crm integration|lead nurture|marketing automation)\b/i.test(r.description)
    );
    if (hasMultiChannelRec && !brief.has_crm) {
      risks.push({
        code: 'marketing_multichannel_no_crm',
        description: 'Multi-channel or CRM-dependent marketing recommendations without a CRM in place.',
        severity: 'high',
      });
    }

    // Paid acquisition recommendations without budget clarity
    const hasPaidRec = recs.some(r =>
      /\b(paid ads|google ads|meta ads|ppc|paid search|paid social)\b/i.test(r.description)
    );
    if (hasPaidRec && (brief.monthly_budget_usd ?? 0) < 500) {
      risks.push({
        code: 'marketing_paid_recs_low_budget',
        description: 'Paid acquisition recommendations but reported monthly budget < $500 — minimum viable spend may not be achievable.',
        severity: 'medium',
      });
    }
  }

  private assessAutomation(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    const recs = result.recommendations ?? [];

    // Complex automation with many existing integrations to connect
    const hasComplexAutomation = recs.some(r =>
      /\b(integrate|bi-directional sync|real-time sync|webhook|api integration)\b/i.test(r.description)
    );
    if (hasComplexAutomation && (brief.integration_count ?? 0) > 8) {
      risks.push({
        code: 'automation_integration_sprawl',
        description: 'Complex automation recommended on top of high integration count (>8 tools) — orchestration complexity risk.',
        severity: 'medium',
      });
    }

    // Low tech maturity + advanced automation
    const hasAdvancedRec = recs.some(r =>
      /\b(machine learning|predictive|ai-powered|nlp|intelligent automation)\b/i.test(r.description)
    );
    if (hasAdvancedRec && (brief.tech_maturity ?? 3) < 2) {
      risks.push({
        code: 'automation_advanced_recs_low_maturity',
        description: 'Advanced automation recommendations (ML, AI-powered) but tech maturity is low — foundational automation should come first.',
        severity: 'high',
      });
    }

    // No dev team for automation that requires custom code
    const hasCustomCodeRec = recs.some(r =>
      /\b(custom script|api endpoint|custom integration|build a|develop a)\b/i.test(r.description)
    );
    if (hasCustomCodeRec && !brief.has_dedicated_dev_team) {
      risks.push({
        code: 'automation_custom_code_no_dev_team',
        description: 'Custom-coded automation recommended without a dedicated dev team.',
        severity: 'medium',
      });
    }
  }

  private assessBudget(
    result: DomainResult,
    brief: BriefSnapshot,
    risks: FeasibilityRisk[]
  ): void {
    // If result score is very low AND many recommendations AND budget is tight → high effort signal
    const recCount = (result.recommendations ?? []).length;
    const criticalCount = (result.issues ?? []).filter(i => i.severity === 'critical').length;

    if (
      criticalCount >= 3 &&
      recCount >= 5 &&
      (brief.monthly_budget_usd ?? Infinity) < 1000
    ) {
      risks.push({
        code: 'universal_high_effort_low_budget',
        description: `${criticalCount} critical issues + ${recCount} recommendations with budget < $1000/mo — prioritisation essential.`,
        severity: 'medium',
      });
    }
  }

  // ─── Score Computation ────────────────────────────────────────────────────────

  private computeScore(risks: FeasibilityRisk[]): number {
    const totalPenalty = risks.reduce((sum, r) => sum + PENALTY[r.severity], 0);
    return Math.max(0.1, parseFloat((1.0 - totalPenalty).toFixed(2)));
  }
}

export const feasibilityLayer = new FeasibilityLayer();
