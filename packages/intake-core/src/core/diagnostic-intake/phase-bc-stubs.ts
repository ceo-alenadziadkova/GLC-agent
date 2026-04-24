/**
 * Phase 4–5 placeholders (ADR Diagnostic Adaptive Intake). Implement when pilot metrics trigger expansion.
 * Keeps a single import surface for downstream wiring without hiding logic in UI.
 */

export const PHASE_BC_EXPANSION_ORDER = [
  'execution_plan_readiness',
  'signal_registry_metadata',
  'caveat_taxonomy',
  'context_envelope',
  'bridge_lifecycle_governance',
] as const;

export type PhaseBcExpansionStep = (typeof PHASE_BC_EXPANSION_ORDER)[number];

export interface ExecutionPlanReadinessPolicy {
  starter: 'baseline_only' | 'scope_aware';
  pro: 'baseline_only' | 'scope_aware';
  complete: 'baseline_only' | 'scope_aware';
}

/** Execution-plan-aware readiness floors (Starter / Pro / Complete) — Phase B/C. */
export type ExecutionPlanReadinessStub = ExecutionPlanReadinessPolicy;

export type ExecutionCoveragePackage = 'starter' | 'pro' | 'complete';

export interface ExecutionPlanReadinessInput {
  packageName: ExecutionCoveragePackage;
  baselineReady: boolean;
  outOfScopeMissingSignals: string[];
  inScopeMissingSignals: string[];
  policy: ExecutionPlanReadinessPolicy;
}

export interface ExecutionPlanReadinessResult {
  ready: boolean;
  blockedBy: 'baseline' | 'in_scope_gaps' | null;
}

/**
 * Phase B/C helper: package-aware readiness must ignore out-of-scope gaps when policy is `scope_aware`.
 */
export function evaluateExecutionPlanScopeReadiness(input: ExecutionPlanReadinessInput): ExecutionPlanReadinessResult {
  if (!input.baselineReady) {
    return { ready: false, blockedBy: 'baseline' };
  }
  const mode = input.policy[input.packageName];
  if (mode === 'baseline_only') {
    return { ready: true, blockedBy: null };
  }
  if (input.inScopeMissingSignals.length > 0) {
    return { ready: false, blockedBy: 'in_scope_gaps' };
  }
  return { ready: true, blockedBy: null };
}

/** Normalized agent context envelope — Phase 5; ContextBuilder integration stays out of Phase 1. */
export interface ProjectContextEnvelopeStub {
  identityContext: {
    industry: string | null;
    websitePresence: string | null;
  };
  problemContext: {
    primaryProblem: unknown;
    auditFocus: unknown;
  };
  operationsContext: {
    bottleneck: string | null;
    deliveryShape: unknown;
  };
  readinessContext: {
    flowReadinessStatus: 'flow_ready' | 'blocked';
    auditReadinessStatus: 'audit_ready' | 'blocked' | 'ready_with_caveats';
    criticalMissingKeys: string[];
  };
  evidenceContext: {
    explicitKeys: string[];
    unknownKeys: string[];
  };
  executionPlan: 'starter' | 'pro' | 'complete';
}

export interface BuildProjectContextEnvelopeInput {
  responses: Record<string, unknown>;
  flowReadinessStatus: 'flow_ready' | 'blocked';
  auditReadinessStatus: 'audit_ready' | 'blocked' | 'ready_with_caveats';
  criticalMissingKeys: string[];
  executionPlan: 'starter' | 'pro' | 'complete';
}

function isUnknownValue(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) && (value as { source?: string }).source === 'unknown';
}

export function buildProjectContextEnvelope(input: BuildProjectContextEnvelopeInput): ProjectContextEnvelopeStub {
  const explicitKeys: string[] = [];
  const unknownKeys: string[] = [];
  for (const [key, value] of Object.entries(input.responses)) {
    if (isUnknownValue(value)) {
      unknownKeys.push(key);
    } else if (value !== null && value !== undefined && value !== '') {
      explicitKeys.push(key);
    }
  }

  return {
    identityContext: {
      industry: (input.responses.a2 as string | null) ?? null,
      websitePresence: (input.responses.a5 as string | null) ?? null,
    },
    problemContext: {
      primaryProblem: input.responses.f1 ?? null,
      auditFocus: input.responses.f2 ?? null,
    },
    operationsContext: {
      bottleneck: (input.responses.d2 as string | null) ?? null,
      deliveryShape: input.responses.d_closing_flow ?? null,
    },
    readinessContext: {
      flowReadinessStatus: input.flowReadinessStatus,
      auditReadinessStatus: input.auditReadinessStatus,
      criticalMissingKeys: [...input.criticalMissingKeys],
    },
    evidenceContext: {
      explicitKeys,
      unknownKeys,
    },
    executionPlan: input.executionPlan,
  };
}

/**
 * Enforces ADR expansion order to avoid skipping governance steps.
 * Returns `false` for any out-of-order list.
 */
export function isPhaseBcExpansionOrderValid(steps: readonly PhaseBcExpansionStep[]): boolean {
  let cursor = 0;
  for (const step of steps) {
    const index = PHASE_BC_EXPANSION_ORDER.indexOf(step);
    if (index < cursor) {
      return false;
    }
    cursor = index;
  }
  return true;
}
