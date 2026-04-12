/**
 * Feasibility layer policy: regex triggers, numeric thresholds, score penalties.
 * Consumed by `FeasibilityLayer` — keep tunables here, not in service code.
 */

export const FEASIBILITY_SCORE_PENALTIES = {
  high: 0.25,
  medium: 0.15,
  low: 0.07,
} as const;

/** Minimum feasibility score after penalties (0.0–1.0). */
export const FEASIBILITY_SCORE_FLOOR = 0.1;

/** Default tech_maturity when brief omits it (mid scale 1–5). */
export const FEASIBILITY_DEFAULT_TECH_MATURITY = 3;

/** Default domain result score when omitted (1–5 scale). */
export const FEASIBILITY_DEFAULT_DOMAIN_SCORE = 5;

export const FEASIBILITY_THRESHOLDS = {
  techInfra: {
    archOverhaulMaxTeamExclusive: 3,
    highSeverityIssueCountGt: 5,
    techMaturityLt: 2,
    recCountGtNoDevTeam: 3,
  },
  security: {
    criticalIssuesGte: 3,
    criticalTeamSizeLt: 2,
    lowScoreMaxInclusive: 2,
    recCountGtLowScore: 4,
  },
  marketing: {
    paidRecBudgetUsdLt: 500,
  },
  ux: {
    designOverhaulTeamLt: 2,
  },
  automation: {
    integrationCountGt: 8,
    techMaturityLt: 2,
  },
  universalBudget: {
    criticalIssuesGte: 3,
    recCountGte: 5,
    monthlyBudgetUsdLt: 1000,
  },
} as const;

export const FEASIBILITY_RECOMMENDATION_PATTERNS = {
  archOverhaul: /\b(re-architect|microservice|migrate|overhaul|rebuild|refactor core)\b/i,
  compliance: /\b(gdpr|soc2|iso27001|compliance|audit trail|data protection)\b/i,
  techSeo: /\b(core web vitals|structured data|schema markup|site speed|crawl|canonicalization)\b/i,
  abTest: /\b(a\/b test|split test|experiment|multivariate)\b/i,
  designOverhaul: /\b(redesign|design system|full redesign|overhaul|rebrand)\b/i,
  multiChannel: /\b(omnichannel|multi-channel|crm integration|lead nurture|marketing automation)\b/i,
  paidAcquisition: /\b(paid ads|google ads|meta ads|ppc|paid search|paid social)\b/i,
  complexAutomation: /\b(integrate|bi-directional sync|real-time sync|webhook|api integration)\b/i,
  advancedAutomation: /\b(machine learning|predictive|ai-powered|nlp|intelligent automation)\b/i,
  customCode: /\b(custom script|api endpoint|custom integration|build a|develop a)\b/i,
} as const;
