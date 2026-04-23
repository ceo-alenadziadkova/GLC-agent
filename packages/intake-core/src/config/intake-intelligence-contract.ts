import criticalSignalsPilot from '../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };
import { QUESTION_BANK_V1_IDS, getQuestionBankSchemaMeta } from '../question-bank.js';
import { INTAKE_INTELLIGENCE_GATE_METADATA } from './intake-intelligence-gate-metadata.js';
import {
  getIntakeIntelligenceSprint2CoverageSummary as computeIntakeIntelligenceSprint2CoverageSummary,
  isIntakeIntelligenceSprint2Complete as isIntakeIntelligenceSprint2ContractComplete,
} from './intake-intelligence-sprint2.js';
import type {
  IntakeIntelligenceContract,
  IntakeIntelligenceOwnerDomain,
  IntakeIntelligenceTodo,
} from './intake-intelligence-types.js';

export type {
  IntakeIntelligenceContract,
  IntakeIntelligenceOwnerDomain,
  IntakeIntelligenceStewardship,
  IntakeIntelligenceTodo,
} from './intake-intelligence-types.js';

export {
  INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE,
  INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS,
  getIntakeIntelligenceBankIdsOutsideSprint2Gate,
} from './intake-intelligence-sprint2.js';

type CriticalSignalsArtifact = {
  signals?: Record<string, { bankIds?: string[] }>;
};

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

const DEFAULT_TODO: IntakeIntelligenceTodo = {
  ownerDomain: 'product',
  reviewByIsoDate: '2026-07-31',
  todoReason: 'Sprint 1 scope: full metadata enrichment is deferred, fallback remains enabled.',
};

const P0_METADATA_OUT_OF_GATE: Record<string, IntakeIntelligenceContract> = {
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
  c8: {
    whyAsked: 'Attribution confidence determines how aggressively to scale paid and outbound vs nurture investments.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'marketing_utp.measurement_maturity',
        weight: 'high',
        effectDescription: 'Gates whether experiments require baseline instrumentation before scale.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c9: {
    whyAsked: 'Data hygiene for funnel metrics affects dashboard trust, experiment readouts, and director slice quality.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'automation_processes.data_readiness',
        weight: 'medium',
        effectDescription: 'Flags cleanup work before automations or advanced routing ship.',
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
  d3: {
    whyAsked: 'Manual hours quantify automation ROI and where throughput work will pay back first.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.throughput_priority',
        weight: 'high',
        effectDescription: 'Prioritizes process-map depth vs automation candidates when hours are concentrated.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d4: {
    whyAsked: 'Onboarding knowledge location affects ramp time, quality risk, and whether playbooks can scale.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.knowledge_transfer',
        weight: 'medium',
        effectDescription: 'Influences documentation and training initiatives before heavy automation.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  e1: {
    whyAsked: 'Payment acceptance scope drives PCI exposure, checkout UX requirements, and fraud controls.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'security_compliance.payment_scope',
        weight: 'high',
        effectDescription: 'Determines whether threat-model and compliance-map depth should emphasize payments.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  e2: {
    whyAsked: 'EU footprint triggers GDPR-style obligations, subprocessors, and data residency decisions.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'security_compliance.data_residency',
        weight: 'high',
        effectDescription: 'Shapes compliance-map emphasis and incident-response assumptions.',
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
  c_nosite_1: {
    whyAsked: 'No-site lead source indicates where trust and acquisition must start before web-dependent recommendations.',
    semanticDomain: 'market',
    decisionImpact: [
      {
        target: 'strategy.nosite_acquisition_entry',
        weight: 'medium',
        effectDescription: 'Prioritizes channel experiments that do not require a full website stack.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c_nosite_2: {
    whyAsked: 'Current messaging clarity without a site determines whether offer positioning must be rebuilt first.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'marketing_utp.message_foundation',
        weight: 'medium',
        effectDescription: 'Shifts effort toward value proposition and proof assets before paid scale.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c_nosite_3: {
    whyAsked: 'Lead follow-up process quality controls conversion even when traffic generation is healthy.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.follow_up_sequence',
        weight: 'high',
        effectDescription: 'Guides automation and SLA recommendations for response consistency.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c_nosite_4: {
    whyAsked: 'Social or marketplace profile depth acts as a proxy trust layer when a canonical site is absent.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'ux_conversion.trust_ladder',
        weight: 'medium',
        effectDescription: 'Informs whether trust interventions should focus on profile completeness and proof.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c_nosite_5: {
    whyAsked: 'Primary conversion handoff mechanism without a site determines instrumentation and attribution options.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'tech_infrastructure.attribution_minimum',
        weight: 'medium',
        effectDescription: 'Sets the minimum event tracking path before optimization experiments.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  c_nosite_reviews: {
    whyAsked: 'Public review signal strength influences trust recovery urgency and conversion friction assumptions.',
    semanticDomain: 'value',
    decisionImpact: [
      {
        target: 'marketing_utp.social_proof_recovery',
        weight: 'high',
        effectDescription: 'Prioritizes reputation and testimonial workstreams when proof is weak.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d1a: {
    whyAsked: 'CRM data structure maturity determines whether pipeline automation can be safely introduced.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'automation_processes.crm_readiness',
        weight: 'high',
        effectDescription: 'Gates sequence of cleanup vs workflow automation.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d1b: {
    whyAsked: 'Contact and account ownership clarity reduces duplicate follow-up and routing failures.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.routing_integrity',
        weight: 'medium',
        effectDescription: 'Determines whether ownership normalization precedes orchestration changes.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_response_time: {
    whyAsked: 'Response-time variance directly impacts win-rate and should shape SLA-first interventions.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.sla_design',
        weight: 'high',
        effectDescription: 'Prioritizes queueing, alerting, and staffing recommendations.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_billing_flow: {
    whyAsked: 'Billing handoff complexity is a frequent conversion leak that changes checkout and operations priorities.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'ux_conversion.checkout_handoff',
        weight: 'high',
        effectDescription: 'Focuses roadmap on billing simplification when payment step loss is material.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_automation_attempt: {
    whyAsked: 'Prior automation attempts reveal adoption constraints and prevent repeating failed implementation patterns.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.change_adoption',
        weight: 'medium',
        effectDescription: 'Adjusts automation scope to team readiness and historical blockers.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d4a: {
    whyAsked: 'Internal documentation depth determines whether process scaling can happen without quality regression.',
    semanticDomain: 'resources',
    decisionImpact: [
      {
        target: 'automation_processes.playbook_quality',
        weight: 'medium',
        effectDescription: 'Prioritizes documentation remediation before advanced automation rollout.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d4b: {
    whyAsked: 'Training consistency affects throughput predictability and onboarding ramp in multi-role teams.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.ramp_time_reduction',
        weight: 'medium',
        effectDescription: 'Guides whether training assets or process redesign should come first.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d5: {
    whyAsked: 'Current reporting cadence defines decision latency and where operating reviews need tightening.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'strategy.operating_rhythm',
        weight: 'medium',
        effectDescription: 'Shapes recommendation cadence for weekly and monthly decision loops.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d6: {
    whyAsked: 'Data ownership ambiguity increases execution risk when multiple teams touch the same workflow.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'security_compliance.data_accountability',
        weight: 'medium',
        effectDescription: 'Determines governance controls required before scaling process automations.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_hotel_1: {
    whyAsked: 'Hotel operations bottlenecks change whether recommendations should prioritize occupancy or service consistency.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'strategy.vertical_path',
        weight: 'medium',
        effectDescription: 'Keeps hospitality interventions aligned with frontline operational constraints.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_hotel_2: {
    whyAsked: 'Seasonality handling maturity affects staffing and channel pacing recommendations for hospitality.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'strategy.seasonality_plan',
        weight: 'medium',
        effectDescription: 'Reorders roadmap timing around demand volatility windows.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_realestate_1: {
    whyAsked: 'Real-estate lead qualification rigor determines whether automation or conversion copy should be prioritized.',
    semanticDomain: 'operations',
    decisionImpact: [
      {
        target: 'automation_processes.lead_qualification',
        weight: 'medium',
        effectDescription: 'Sets sequence for triage automation and nurture logic.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  d_restaurant_1: {
    whyAsked: 'Restaurant demand and reservation flow reliability drive near-term staffing and revenue protection decisions.',
    semanticDomain: 'economics',
    decisionImpact: [
      {
        target: 'ux_conversion.reservation_reliability',
        weight: 'medium',
        effectDescription: 'Prioritizes booking funnel stability and no-show mitigation actions.',
      },
    ],
    todo: DEFAULT_TODO,
  },
  e4: {
    whyAsked: 'Security incident response readiness determines downside risk and required control urgency.',
    semanticDomain: 'risks',
    decisionImpact: [
      {
        target: 'security_compliance.incident_response',
        weight: 'high',
        effectDescription: 'Elevates response playbooks and control priorities before aggressive growth bets.',
      },
    ],
    todo: DEFAULT_TODO,
  },
};

const P0_METADATA: Record<string, IntakeIntelligenceContract> = {
  ...INTAKE_INTELLIGENCE_GATE_METADATA,
  ...P0_METADATA_OUT_OF_GATE,
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
  if (isIntakeIntelligenceSprint2ContractComplete(contract, hasIntakeIntelligenceRequiredNow)) return true;
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

export function getIntakeIntelligenceSprint2CoverageSummary() {
  return computeIntakeIntelligenceSprint2CoverageSummary({
    getContract: getIntakeIntelligenceContract,
    hasRequiredNow: hasIntakeIntelligenceRequiredNow,
  });
}

export function isIntakeIntelligenceSprint2GateSatisfied(questionId: string): boolean {
  return isIntakeIntelligenceSprint2ContractComplete(
    getIntakeIntelligenceContract(questionId),
    hasIntakeIntelligenceRequiredNow,
  );
}
