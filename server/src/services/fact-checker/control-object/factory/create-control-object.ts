import {
  CONTROL_OBJECT_DEFAULT_CONFIDENCE,
  CONTROL_OBJECT_DEFAULT_COUNTS,
  CONTROL_OBJECT_DEFAULT_DECISION_HINT,
  CONTROL_OBJECT_DEFAULT_ERRORS,
  CONTROL_OBJECT_DEFAULT_HUMAN_ATTENTION,
} from '../../../../config/control-object-defaults.js';
import {
  CONTROL_OBJECT_VERSIONS,
  type ControlObjectV1,
  type ExecutionMode,
  type PhaseId,
} from '../../../../schemas/control-object/index.js';

function cloneDefaultCounts() {
  return {
    ...CONTROL_OBJECT_DEFAULT_COUNTS,
    statuses: { ...CONTROL_OBJECT_DEFAULT_COUNTS.statuses },
  };
}

function cloneDefaultErrors() {
  return {
    fixable: [...CONTROL_OBJECT_DEFAULT_ERRORS.fixable],
    structural: [...CONTROL_OBJECT_DEFAULT_ERRORS.structural],
    data_gaps: [...CONTROL_OBJECT_DEFAULT_ERRORS.data_gaps],
  };
}

function cloneDefaultHumanAttention() {
  return {
    ...CONTROL_OBJECT_DEFAULT_HUMAN_ATTENTION,
    reasons: [...CONTROL_OBJECT_DEFAULT_HUMAN_ATTENTION.reasons],
  };
}

export function createControlObjectV1(
  auditId: string,
  phaseId: PhaseId,
  executionMode: ExecutionMode = 'normal',
  truthProfileId: string | null = null,
): ControlObjectV1 {
  return {
    versions: { ...CONTROL_OBJECT_VERSIONS },
    context: {
      audit_id: auditId,
      phase_id: phaseId,
      execution_mode: executionMode,
      truth_profile_id: truthProfileId,
      risk_profile: null,
    },
    confidence: { ...CONTROL_OBJECT_DEFAULT_CONFIDENCE },
    confidence_weights: null,
    counts: cloneDefaultCounts(),
    errors: cloneDefaultErrors(),
    assumptions: [],
    trace: {
      claim_sources: [],
      causal_chain: [],
    },
    feasibility: null,
    cost_control: null,
    agent_performance: null,
    evaluation_link: null,
    decision_hint: CONTROL_OBJECT_DEFAULT_DECISION_HINT,
    human_attention_required: cloneDefaultHumanAttention(),
  };
}
