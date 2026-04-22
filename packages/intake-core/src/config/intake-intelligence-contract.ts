import criticalSignalsPilot from '../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };
import type {
  DecisionImpact,
  DiagnosticSpineCategory,
  FollowupPolicy,
  SignalContribution,
  StopCondition,
} from '../audit-contract.js';
import { QUESTION_BANK_V1_IDS, getQuestionBankSchemaMeta } from '../question-bank.js';

type CriticalSignalsArtifact = {
  signals?: Record<string, { bankIds?: string[] }>;
};

export type IntakeIntelligenceOwnerDomain =
  | 'product'
  | 'recon'
  | 'tech_infrastructure'
  | 'security_compliance'
  | 'seo_digital'
  | 'ux_conversion'
  | 'marketing_utp'
  | 'automation_processes'
  | 'strategy';

export interface IntakeIntelligenceTodo {
  ownerDomain: IntakeIntelligenceOwnerDomain;
  reviewByIsoDate: string;
  todoReason: string;
}

export const INTAKE_INTELLIGENCE_REQUIRED_NOW_FIELDS = [
  'whyAsked',
  'semanticDomain',
  'decisionImpact',
] as const;

export const INTAKE_INTELLIGENCE_OPTIONAL_WITH_TODO_FIELDS = [
  'signalContribution',
  'followupPolicy',
  'stopCondition',
] as const;

export type IntakeIntelligenceRequiredNowField =
  (typeof INTAKE_INTELLIGENCE_REQUIRED_NOW_FIELDS)[number];
export type IntakeIntelligenceOptionalWithTodoField =
  (typeof INTAKE_INTELLIGENCE_OPTIONAL_WITH_TODO_FIELDS)[number];

export interface IntakeIntelligenceContract {
  whyAsked?: string;
  decisionImpact?: DecisionImpact[];
  signalContribution?: SignalContribution[];
  followupPolicy?: FollowupPolicy;
  stopCondition?: StopCondition;
  semanticDomain?: DiagnosticSpineCategory;
  antiPatternExemptions?: string[];
  todo?: IntakeIntelligenceTodo;
}

const DEFAULT_TODO: IntakeIntelligenceTodo = {
  ownerDomain: 'product',
  reviewByIsoDate: '2026-07-31',
  todoReason: 'Sprint 1 scope: full metadata enrichment is deferred, fallback remains enabled.',
};

const P0_METADATA: Record<string, IntakeIntelligenceContract> = {
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
  },
  f9: {
    whyAsked: 'Additional context captures exceptions that materially change recommendation validity.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'strategy.exception_handling',
        weight: 'medium',
        effectDescription: 'Adds explicit caveats that prevent invalid assumptions.',
      },
    ],
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
    todo: DEFAULT_TODO,
  },
  e3: {
    whyAsked: 'Adoption and usage truth separates product issues from GTM issues when triaging bottlenecks.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'ux_conversion.activation_narrative',
        weight: 'high',
        effectDescription: 'Shifts focus between product UX work and marketing/packaging if adoption is the gap.',
      },
    ],
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
  },
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
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
    todo: DEFAULT_TODO,
  },
  c5: {
    whyAsked: 'Revenue model clarity avoids mixed messaging, pricing page drift, and wrong KPI dashboards.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.unit_economics',
        weight: 'high',
        effectDescription: 'Connects CAC, ARPA, and expansion assumptions to a single view.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c6: {
    whyAsked: 'Gross margin bounds what channels, SLAs, and support depth the business can fund.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.margin_floor',
        weight: 'high',
        effectDescription: 'Informs whether paid scale or product-led growth is structurally allowed.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c7: {
    whyAsked: 'Runway and burn inform aggressiveness of experiments and hiring in the delivery path.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'strategy.risk_register',
        weight: 'high',
        effectDescription: 'Sets time-boxes for roadmap bets and default stall policies.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d1: {
    whyAsked: 'Stack snapshot reveals integration risk, analytics reliability, and security blast radius.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'tech_infrastructure.dependency_footprint',
        weight: 'high',
        effectDescription: 'Guides which connectors, migrations, and observability to prioritize.',
      },
    ],
    todo: DEFAULT_TODO,
  },
};

function collectCriticalSignalBankIds(): Set<string> {
  const artifact = criticalSignalsPilot as CriticalSignalsArtifact;
  const ids = new Set<string>();
  for (const signal of Object.values(artifact.signals ?? {})) {
    for (const bankId of signal.bankIds ?? []) ids.add(bankId);
  }
  return ids;
}

function collectSectionFIds(): Set<string> {
  const ids = new Set<string>();
  for (const questionId of QUESTION_BANK_V1_IDS) {
    const meta = getQuestionBankSchemaMeta(questionId);
    if (meta?.section === 'F') ids.add(questionId);
  }
  return ids;
}

export const INTAKE_INTELLIGENCE_P0_IDS = (() => {
  const critical = collectCriticalSignalBankIds();
  const goals = collectSectionFIds();
  const merged = new Set<string>([...critical, ...goals]);
  return [...merged].sort((a, b) => a.localeCompare(b));
})();

export function isValidIntakeIntelligenceTodo(todo: IntakeIntelligenceTodo | undefined): boolean {
  if (!todo) return false;
  if (!todo.ownerDomain || !todo.todoReason) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(todo.reviewByIsoDate);
}

export function getIntakeIntelligenceContract(questionId: string): IntakeIntelligenceContract {
  const row = P0_METADATA[questionId];
  if (row) return row;
  if (QUESTION_BANK_V1_IDS.has(questionId)) {
    return { todo: DEFAULT_TODO };
  }
  return {};
}

export function hasIntakeIntelligenceRequiredNow(
  contract: IntakeIntelligenceContract | undefined,
): boolean {
  if (!contract) return false;
  if (!contract.whyAsked || contract.whyAsked.trim().length === 0) return false;
  if (!contract.semanticDomain) return false;
  if (!Array.isArray(contract.decisionImpact) || contract.decisionImpact.length === 0) return false;
  return true;
}

export function projectIntakeIntelligenceRequiredNow(
  contract: IntakeIntelligenceContract | undefined,
): Pick<IntakeIntelligenceContract, 'whyAsked' | 'semanticDomain' | 'decisionImpact'> | undefined {
  if (!contract || !hasIntakeIntelligenceRequiredNow(contract)) return undefined;
  return {
    whyAsked: contract.whyAsked,
    semanticDomain: contract.semanticDomain,
    decisionImpact: contract.decisionImpact,
  };
}

export function hasIntakeIntelligenceOptionalWithTodo(
  contract: IntakeIntelligenceContract | undefined,
): boolean {
  if (!contract) return false;
  const hasOptionalField =
    Array.isArray(contract.signalContribution) ||
    !!contract.followupPolicy ||
    !!contract.stopCondition;
  if (!hasOptionalField) return false;
  return isValidIntakeIntelligenceTodo(contract.todo);
}

export function isIntakeIntelligenceP0Question(questionId: string): boolean {
  return INTAKE_INTELLIGENCE_P0_IDS.includes(questionId);
}

export function getIntakeIntelligenceCoverageSummary(): {
  totalQuestions: number;
  p0Questions: number;
  fullyCoveredQuestions: number;
  fullyCoveredP0Questions: number;
  coverageRatio: number;
  p0CoverageRatio: number;
} {
  const totalQuestions = QUESTION_BANK_V1_IDS.size;
  const p0Questions = INTAKE_INTELLIGENCE_P0_IDS.length;
  let fullyCoveredQuestions = 0;
  let fullyCoveredP0Questions = 0;
  for (const id of QUESTION_BANK_V1_IDS) {
    const complete = hasIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract(id));
    if (complete) {
      fullyCoveredQuestions += 1;
      if (INTAKE_INTELLIGENCE_P0_IDS.includes(id)) fullyCoveredP0Questions += 1;
    }
  }
  return {
    totalQuestions,
    p0Questions,
    fullyCoveredQuestions,
    fullyCoveredP0Questions,
    coverageRatio: totalQuestions > 0 ? fullyCoveredQuestions / totalQuestions : 0,
    p0CoverageRatio: p0Questions > 0 ? fullyCoveredP0Questions / p0Questions : 0,
  };
}
