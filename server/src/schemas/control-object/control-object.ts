import type {
  ControlObjectConfidence,
  ControlObjectConfidenceWeights,
  ControlObjectFeasibility,
} from './confidence.js';
import type { ControlObjectContext } from './context.js';
import type {
  ControlObjectErrors,
  ControlObjectHumanAttention,
} from './errors.js';
import type { DecisionHint } from './primitives.js';
import type {
  ControlObjectAgentPerformance,
  ControlObjectAutoRemediation,
  ControlObjectCostControl,
  ControlObjectEvaluationLink,
} from './performance.js';
import type { ControlObjectAssumption } from './assumptions.js';
import type { ControlObjectTrace } from './trace.js';
import type { ControlObjectVersions } from './versions.js';
import type { ControlObjectCounts } from './counts.js';

export interface ControlObjectV1 {
  versions: ControlObjectVersions;
  context: ControlObjectContext;
  confidence: ControlObjectConfidence;
  confidence_weights: ControlObjectConfidenceWeights | null;
  counts: ControlObjectCounts;
  errors: ControlObjectErrors;
  assumptions: ControlObjectAssumption[];
  trace: ControlObjectTrace;
  feasibility: ControlObjectFeasibility | null;
  cost_control: ControlObjectCostControl | null;
  agent_performance: ControlObjectAgentPerformance | null;
  evaluation_link: ControlObjectEvaluationLink | null;
  auto_remediation?: ControlObjectAutoRemediation | null;
  decision_hint: DecisionHint;
  human_attention_required: ControlObjectHumanAttention;
}
