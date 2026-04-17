import type {
  ControlObjectCounts,
  ControlObjectErrors,
  ControlObjectHumanAttention,
} from '../schemas/control-object/index.js';
import type { DecisionHint } from '../schemas/control-object/primitives.js';

export const CONTROL_OBJECT_DEFAULT_CONFIDENCE = {
  overall: 100,
  factual: 100,
  strategic: 100,
  consistency: 100,
  feasibility: null,
} as const;

export const CONTROL_OBJECT_DEFAULT_COUNTS: ControlObjectCounts = {
  total_claims: 0,
  fact: 0,
  strategic_hypothesis: 0,
  opinion: 0,
  assumption: 0,
  statuses: {
    confirmed_brief: 0,
    confirmed_external: 0,
    unverified: 0,
    likely_hallucination: 0,
    risky_promise: 0,
    dependent_on_brief_assumption: 0,
    strategic_inconsistency: 0,
  },
};

export const CONTROL_OBJECT_DEFAULT_ERRORS: ControlObjectErrors = {
  fixable: [],
  structural: [],
  data_gaps: [],
};

export const CONTROL_OBJECT_DEFAULT_DECISION_HINT: DecisionHint = 'accept';

export const CONTROL_OBJECT_DEFAULT_HUMAN_ATTENTION: ControlObjectHumanAttention = {
  required: false,
  reasons: [],
  requirements_met: null,
};
