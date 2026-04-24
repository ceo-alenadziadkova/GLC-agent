import type { IntakeCriticalSignalConfidence } from '../audit-contract.js';
import type { IntakeIntelligenceOwnerDomain } from '../config/intake-intelligence-types.js';

export type CasePatternBankPrecondition = {
  kind: 'bank';
  bankId: string;
} & (
  | { equals: string }
  | { inSet: string[] }
  | { isAnswered: true }
);

export type CasePatternSignalPrecondition = {
  kind: 'signal';
  signalKey: string;
  confidenceAtLeast: IntakeCriticalSignalConfidence;
};

export type CasePatternPrecondition = CasePatternBankPrecondition | CasePatternSignalPrecondition;

export type CasePatternStopConditionV1 = {
  signalKeysWithConfidenceAtLeast: {
    min: 'low' | 'medium' | 'high';
    keys: string[];
  };
};

export type IntakeCasePatternV1 = {
  caseKey: string;
  title: string;
  preconditions: CasePatternPrecondition[];
  overlayQuestionIds: string[];
  minOverlayAnswered: number;
  stopCondition: CasePatternStopConditionV1;
  ownerDomain: IntakeIntelligenceOwnerDomain;
  reviewByIsoDate: string;
};

export type IntakeCasePatternCatalogV1 = {
  version: string;
  cases: IntakeCasePatternV1[];
};
