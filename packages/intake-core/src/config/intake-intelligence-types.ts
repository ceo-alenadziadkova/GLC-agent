import type {
  DecisionImpact,
  DiagnosticSpineCategory,
  FollowupPolicy,
  SignalContribution,
  StopCondition,
} from '../audit-contract.js';

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

export interface IntakeIntelligenceStewardship {
  ownerDomain: IntakeIntelligenceOwnerDomain;
  ownerAlias?: string;
  reviewByIsoDate: string;
}

export interface IntakeIntelligenceTodo {
  ownerDomain: IntakeIntelligenceOwnerDomain;
  ownerAlias?: string;
  reviewByIsoDate: string;
  todoReason: string;
}

export interface IntakeIntelligenceContract {
  whyAsked?: string;
  decisionImpact?: DecisionImpact[];
  signalContribution?: SignalContribution[];
  followupPolicy?: FollowupPolicy;
  stopCondition?: StopCondition;
  semanticDomain?: DiagnosticSpineCategory;
  antiPatternExemptions?: string[];
  todo?: IntakeIntelligenceTodo;
  stewardship?: IntakeIntelligenceStewardship;
}
