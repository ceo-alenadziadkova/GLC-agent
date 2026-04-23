/**
 * Sprint 2 gate — full intelligence metadata (generated; do not hand-edit without updating gate ids).
 */
import type { DiagnosticSpineCategory, DecisionImpact } from '../audit-contract.js';
import type { IntakeIntelligenceContract } from './intake-intelligence-types.js';
import { buildIntakeIntelligenceSprint2Tail } from './intake-intelligence-sprint2.js';

import type { IntakeIntelligenceOwnerDomain } from './intake-intelligence-types.js';

function s2(
  signalKey: string,
  expectedInfoGainBits: number,
  ownerDomain: IntakeIntelligenceOwnerDomain,
  reviewByIsoDate: string,
) {
  const ownerAlias = `owner-${ownerDomain.replace(/_/g, '-')}`;
  return buildIntakeIntelligenceSprint2Tail({
    signalKey,
    expectedInfoGainBits,
    ownerDomain,
    ownerAlias,
    reviewByIsoDate,
  });
}

export const INTAKE_INTELLIGENCE_GATE_METADATA: Record<string, IntakeIntelligenceContract> = {
  a1: {
    whyAsked: 'A crisp company one-liner calibrates recon prompts and sets default narrative for downstream strategy synthesis.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'strategy.macro_positioning',
        weight: 'medium',
        effectDescription: 'Influences how initiative titles and problem framing are phrased for the client.',
      },
    ],
    
    ...s2("audit_focus", 0.35, "strategy", "2026-05-15"),
  },
  a10: {
    whyAsked: 'Monetization model sets unit economics, payback windows, and which growth loops are structurally available.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.unit_economics',
        weight: 'high',
        effectDescription: 'Calibrates CAC tolerance, LTV models, and which channels are viable at scale.',
      },
    ],
    
    ...s2("primary_problem", 0.37, "marketing_utp", "2026-05-22"),
  },
  a11: {
    whyAsked: 'Primary revenue source concentration determines diversification vs doubling-down in the execution plan.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.revenue_diversification',
        weight: 'high',
        effectDescription: 'Influences risk of single-channel dependency in roadmap and experiments.',
      },
    ],
    
    ...s2("primary_problem", 0.38, "ux_conversion", "2026-05-29"),
  },
  a12: {
    whyAsked: 'Revenue range bands scope feasible tooling, headcount, and marketing investment without fantasy scenarios.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.spend_guardrails',
        weight: 'medium',
        effectDescription: 'Bounds recommended initiative cost and expected proof thresholds.',
      },
    ],
    
    ...s2("primary_problem", 0.39, "recon", "2026-06-05"),
  },
  a2: {
    whyAsked: 'Industry context changes risk posture and recommendation path from the very first sequencing step.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'strategy.vertical_path',
        weight: 'high',
        effectDescription: 'Activates vertical-specific hypotheses and affects required evidence order.',
      },
    ],
    ...s2("industry", 0.41, "tech_infrastructure", "2026-06-12"),
  },
  a3: {
    whyAsked: 'Geography and operating footprint affect compliance, localization, and channel reality for the roadmap.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'recon.operating_context',
        weight: 'medium',
        effectDescription: 'Tightens region-specific constraints and go-to-market assumptions.',
      },
    ],
    
    ...s2("audit_focus", 0.43, "automation_processes", "2026-06-19"),
  },
  a4: {
    whyAsked: 'Headcount range bounds parallel initiative capacity and the feasible pace of execution.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'automation_processes.throughput_ceiling',
        weight: 'high',
        effectDescription: 'Scales the number and complexity of recommended concurrent workstreams.',
      },
    ],
    
    ...s2("operations_bottleneck", 0.44, "seo_digital", "2026-06-26"),
  },
  a5: {
    whyAsked: 'Website presence determines whether diagnostics should prioritize digital surface or operations-first discovery.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'strategy.intake_path',
        weight: 'high',
        effectDescription: 'Switches between website and no-site decision graph branches.',
      },
    ],
    ...s2("website_presence", 0.45, "security_compliance", "2026-05-15"),
  },
  a6: {
    whyAsked: 'Current payment-surface scope determines whether e-commerce, billing, and trust UX are in play.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'ux_conversion.trust_ladder',
        weight: 'high',
        effectDescription: 'Gates how aggressively payment and conversion experiments can be recommended.',
      },
    ],
    
    ...s2("delivery_shape_baseline", 0.47, "strategy", "2026-05-22"),
  },
  a7: {
    whyAsked: 'Business stage calibrates risk appetite, time horizon, and the balance of quick wins vs foundation work.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.execution_pacing',
        weight: 'high',
        effectDescription: 'Reorders the roadmap to match launch vs growth vs optimization phases.',
      },
    ],
    
    ...s2("primary_problem", 0.49, "marketing_utp", "2026-05-29"),
  },
  a8: {
    whyAsked: 'Order volume situates the business on a scale curve so recommendations stay proportionate to operating load.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.capacity_assumptions',
        weight: 'medium',
        effectDescription: 'Influences whether automation, outsourcing, or manual processes are the default play.',
      },
    ],
    
    ...s2("operations_bottleneck", 0.5, "ux_conversion", "2026-06-05"),
  },
  a9: {
    whyAsked: 'Customer language footprint affects copy, support depth, and localized acquisition surfaces.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'marketing_utp.localisation_scope',
        weight: 'medium',
        effectDescription: 'Turns on or off multi-locale GTM, SEO, and creative variants.',
      },
    ],
    
    ...s2("audit_focus", 0.51, "recon", "2026-06-12"),
  },
  b_growth_attempts: {
    whyAsked: "Recent growth attempts reveal what already failed, avoiding repeated recommendations and calibrating channel realism.",
    semanticDomain: "operations" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'marketing_utp.acquisition_guardrails', weight: 'high', effectDescription: 'Steers the roadmap away from channels that already exhausted marginal returns.' }] as DecisionImpact[],
    ...s2("audit_focus", 0.35, "tech_infrastructure", "2026-06-19"),
  },
  b_health_1: {
    whyAsked: "Online appointment behavior drives trust, compliance-sensitive UX, and operational load.",
    semanticDomain: "resources" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'ux_conversion.trust_ladder', weight: 'high', effectDescription: 'Determines how aggressively self-serve booking can be recommended.' }] as DecisionImpact[],
    ...s2("delivery_shape_baseline", 0.37, "automation_processes", "2026-06-26"),
  },
  b_hotel_1: {
    whyAsked: "Booking channel mix sets whether acquisition work should prioritize direct conversion vs OTA dependency.",
    semanticDomain: "market" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'ux_conversion.funnel_interventions', weight: 'high', effectDescription: 'Routes recommendations toward direct booking surfaces or distribution partnerships.' }] as DecisionImpact[],
    ...s2("delivery_shape_baseline", 0.38, "seo_digital", "2026-05-15"),
  },
  b_hotel_2: {
    whyAsked: "Direct vs OTA balance affects margin, CRM ownership, and which experiments can move the needle.",
    semanticDomain: "economics" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'strategy.unit_economics', weight: 'high', effectDescription: 'Calibrates acceptable acquisition spend against net contribution after commissions.' }] as DecisionImpact[],
    ...s2("delivery_shape_baseline", 0.39, "security_compliance", "2026-05-22"),
  },
  b_marine_1: {
    whyAsked: "Charter platform mix affects lead quality, seasonality handling, and partner-channel strategy.",
    semanticDomain: "market" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'strategy.vertical_path', weight: 'medium', effectDescription: 'Keeps marine-specific acquisition guidance aligned with actual demand sources.' }] as DecisionImpact[],
    ...s2("audit_focus", 0.41, "strategy", "2026-05-29"),
  },
  b_realestate_1: {
    whyAsked: "Portal dependency shapes lead routing, follow-up SLAs, and where SEO or paid should concentrate.",
    semanticDomain: "market" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'marketing_utp.targeting_model', weight: 'medium', effectDescription: 'Aligns listing and nurture strategy with how buyers actually discover inventory.' }] as DecisionImpact[],
    ...s2("audit_focus", 0.43, "marketing_utp", "2026-06-05"),
  },
  b_restaurant_1: {
    whyAsked: "Reservation tooling affects no-show risk, staffing forecasts, and conversion from discovery to visit.",
    semanticDomain: "operations" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'ux_conversion.funnel_interventions', weight: 'high', effectDescription: 'Prioritizes booking UX, deposits, and reminder automations where appropriate.' }] as DecisionImpact[],
    ...s2("delivery_shape_baseline", 0.44, "ux_conversion", "2026-06-12"),
  },
  b_services_1: {
    whyAsked: "Service booking flow is often the primary conversion surface for professional services firms.",
    semanticDomain: "operations" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'ux_conversion.funnel_interventions', weight: 'high', effectDescription: 'Focuses recommendations on scheduling friction and qualification steps.' }] as DecisionImpact[],
    ...s2("delivery_shape_baseline", 0.45, "recon", "2026-06-19"),
  },
  b1: {
    whyAsked: 'Ideal customer definition narrows ICP, channel choice, and pricing tolerance before tactical plans.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'marketing_utp.targeting_model',
        weight: 'high',
        effectDescription: 'Drives message-market fit, offer shape, and organic vs paid mix.',
      },
    ],
    
    ...s2("primary_problem", 0.47, "tech_infrastructure", "2026-06-26"),
  },
  b10: {
    whyAsked: 'Referral and word-of-mouth mix affects proof strategy, creative hooks, and incentive design.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'marketing_utp.amplification',
        weight: 'medium',
        effectDescription: 'Allocates social proof and community touches vs paid acquisition work.',
      },
    ],
    
    ...s2("audit_focus", 0.49, "automation_processes", "2026-05-15"),
  },
  b2: {
    whyAsked: 'Buying triggers determine timing, creative angles, and which proof assets to prepare first.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'strategy.demand_window',
        weight: 'medium',
        effectDescription: 'Aligns GTM waves and follow-up SLAs to real purchase events.',
      },
    ],
    
    ...s2("audit_focus", 0.5, "seo_digital", "2026-05-22"),
  },
  b3: {
    whyAsked: 'Objection patterns shape landing narrative, risk-reversal, and success metrics in trials.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'ux_conversion.friction_map',
        weight: 'high',
        effectDescription: 'Links copy and UX fixes to the highest-frequency drop-off reasons.',
      },
    ],
    
    ...s2("primary_problem", 0.51, "security_compliance", "2026-05-29"),
  },
  b4: {
    whyAsked: 'Proof inventory determines credibility depth on site, ads, and sales collateral.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'marketing_utp.proof_layer',
        weight: 'high',
        effectDescription: 'Selects which evidence to lift into hero, retargeting, and case studies.',
      },
    ],
    
    ...s2("audit_focus", 0.35, "strategy", "2026-06-05"),
  },
  b5: {
    whyAsked: 'Team and operating capacity bounds what can be executed in parallel in the 30–90 day plan.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.throughput_ceiling',
        weight: 'medium',
        effectDescription: 'Scales or caps initiative counts and parallel workstreams to realistic headcount.',
      },
    ],
    
    ...s2("operations_bottleneck", 0.37, "marketing_utp", "2026-06-12"),
  },
  b6: {
    whyAsked: "Guarantee posture affects refund risk, pricing power, and how aggressively funnel recommendations can remove friction.",
    semanticDomain: "risks" as DiagnosticSpineCategory,
    decisionImpact: [{ target: 'marketing_utp.proof_layer', weight: 'medium', effectDescription: 'Determines whether promises must be backed by instrumentation before scaling acquisition.' }] as DecisionImpact[],
    ...s2("audit_focus", 0.38, "ux_conversion", "2026-06-19"),
  },
  b7: {
    whyAsked: 'Repeat purchase rate drives retention program priority, CAC payback, and LTV-based channel choices.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'marketing_utp.retention_posture',
        weight: 'high',
        effectDescription: 'Chooses whether acquisition vs lifecycle messaging gets top roadmap slots.',
      },
    ],
    
    ...s2("primary_problem", 0.39, "recon", "2026-06-26"),
  },
  c1: {
    whyAsked: 'Channel efficiency caps set realistic CAC/ROAS plans and where to reallocate when limits hit.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'marketing_utp.acquisition_guardrails',
        weight: 'high',
        effectDescription: 'Prevents over-spend before measurement loops are trusted.',
      },
    ],
    
    ...s2("audit_focus", 0.41, "tech_infrastructure", "2026-05-15"),
  },
  c2: {
    whyAsked: 'Revenue and pipeline shape determine whether to prioritize growth, retention, or unit economics in the first roadmap wave.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.revenue_reality',
        weight: 'high',
        effectDescription: 'Tightens ICP, pricing, and channel advice to the actual revenue motion.',
      },
    ],
    
    ...s2("audit_focus", 0.43, "automation_processes", "2026-05-22"),
  },
  c3: {
    whyAsked: 'Funnel shape exposes whether to fix top-of-funnel, mid-funnel nurture, or closing.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'strategy.pipeline_diagnosis',
        weight: 'high',
        effectDescription: 'Sequencing of experiments and content against the true bottleneck stage.',
      },
    ],
    
    ...s2("primary_problem", 0.44, "seo_digital", "2026-05-29"),
  },
  c4: {
    whyAsked: 'Cycle length sets forecast realism, sales capacity planning, and nurture depth.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.sales_cadence',
        weight: 'medium',
        effectDescription: 'Drives handoff design between marketing, SDR, and account teams.',
      },
    ],
    
    ...s2("audit_focus", 0.45, "security_compliance", "2026-06-05"),
  },
  d_closing_flow: {
    whyAsked: 'Closing-flow steps expose friction between first contact and payment, which drives conversion and efficiency recommendations.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'ux_conversion.funnel_interventions',
        weight: 'high',
        effectDescription: 'Defines whether recommendations should remove, simplify, or automate pre-payment steps.',
      },
    ],
    ...s2("delivery_shape_baseline", 0.47, "strategy", "2026-06-12"),
  },
  d2: {
    whyAsked: 'Primary bottleneck identifies where process change can produce the largest near-term operational impact.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'strategy.automation_quick_wins',
        weight: 'high',
        effectDescription: 'Prioritizes automation opportunities around the highest-friction workflow.',
      },
    ],
    ...s2("operations_bottleneck", 0.49, "marketing_utp", "2026-06-19"),
  },
  f_idea_1: {
    whyAsked: 'Problem evidence level indicates whether to prioritize validation experiments or scaling actions.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'strategy.validation_priority',
        weight: 'high',
        effectDescription: 'Determines validation-first versus execution-first recommendation mode.',
      },
    ],
    ...s2("primary_problem", 0.5, "ux_conversion", "2026-06-26"),
  },
  f_idea_2: {
    whyAsked: 'ICP clarity determines how precise channel and offer recommendations can be.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'marketing_utp.targeting_precision',
        weight: 'high',
        effectDescription: 'Controls specificity of go-to-market channel recommendations.',
      },
    ],
    ...s2("audit_focus", 0.51, "recon", "2026-05-15"),
  },
  f_idea_3: {
    whyAsked: 'GTM test readiness identifies what evidence can be collected quickly with realistic effort.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'strategy.experiment_sequence',
        weight: 'medium',
        effectDescription: 'Orders practical launch experiments by feasibility.',
      },
    ],
    ...s2("primary_problem", 0.35, "tech_infrastructure", "2026-05-22"),
  },
  f_idea_4: {
    whyAsked: 'Primary launch blocker reveals the dominant constraint that should be addressed first.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'strategy.constraint_resolution',
        weight: 'high',
        effectDescription: 'Defines first unblock action in launch roadmap.',
      },
    ],
    ...s2("audit_focus", 0.37, "automation_processes", "2026-05-29"),
  },
  f1: {
    whyAsked: 'The primary business problem anchors which outcomes are optimized first in the final strategy.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'strategy.primary_problem',
        weight: 'high',
        effectDescription: 'Determines top-level roadmap objective and triage order.',
      },
    ],
    ...s2("primary_problem", 0.38, "seo_digital", "2026-06-05"),
  },
  f2: {
    whyAsked: 'Audit focus areas constrain the decision space to what is relevant for this client and this audit.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'strategy.focus_package',
        weight: 'high',
        effectDescription: 'Controls domain depth allocation in recommendations.',
      },
    ],
    ...s2("audit_focus", 0.39, "security_compliance", "2026-06-12"),
  },
  f3: {
    whyAsked: 'Self-rating calibrates advisory tone and expected implementation complexity.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'strategy.change_tone',
        weight: 'medium',
        effectDescription: 'Adjusts roadmap framing from stabilization to acceleration language.',
      },
    ],
    ...s2("primary_problem", 0.41, "strategy", "2026-06-19"),
  },
  f4: {
    whyAsked: 'Change readiness indicates whether to prioritize low-friction wins or longer systemic changes.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'strategy.execution_pacing',
        weight: 'high',
        effectDescription: 'Changes sequencing and implementation horizon assumptions.',
      },
    ],
    ...s2("audit_focus", 0.43, "marketing_utp", "2026-06-26"),
  },
  f5: {
    whyAsked: 'Budget range prevents infeasible recommendations and aligns scope with financial constraints.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.investment_envelope',
        weight: 'medium',
        effectDescription: 'Filters recommendation set by feasible spend range.',
      },
    ],
    ...s2("primary_problem", 0.44, "ux_conversion", "2026-05-15"),
  },
  f6: {
    whyAsked: 'Explicit constraints protect trust by excluding recommendations that conflict with hard business boundaries.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'strategy.constraint_guardrails',
        weight: 'medium',
        effectDescription: 'Blocks disallowed recommendation patterns from downstream synthesis.',
      },
    ],
    ...s2("audit_focus", 0.45, "recon", "2026-05-22"),
  },
  f7: {
    whyAsked: 'Approval ownership predicts execution friction and helps sequence implementable actions first.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'strategy.decision_latency',
        weight: 'medium',
        effectDescription: 'Reorders roadmap by expected approval cycle speed.',
      },
    ],
    ...s2("primary_problem", 0.47, "tech_infrastructure", "2026-05-29"),
  },
  f8: {
    whyAsked: 'Deadline context determines urgency and whether to favor immediate impact over longer discovery.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.timeline_pressure',
        weight: 'high',
        effectDescription: 'Prioritizes near-term delivery sequence under time constraints.',
      },
    ],
    ...s2("audit_focus", 0.49, "automation_processes", "2026-06-05"),
  },
  f9: {
    whyAsked: 'Additional context captures exceptions that materially change recommendation validity.',
    semanticDomain: 'risks',
    antiPatternExemptions: ['INTELLIGENCE_ANTIPATTERN_GENERIC'],
    decisionImpact: [
      {
        target: 'strategy.exception_handling',
        weight: 'medium',
        effectDescription: 'Adds explicit caveats that prevent invalid assumptions.',
      },
    ],
    ...s2("primary_problem", 0.5, "seo_digital", "2026-06-12"),
  },
};
