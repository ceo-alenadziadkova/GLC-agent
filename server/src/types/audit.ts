// ─── Product, domains, execution plan ──────────────────────
export * from './audit/product.js';
export * from './audit/domain-keys.js';
export * from './audit/execution-plan.js';
export * from './audit/phase-status.js';
export * from './audit/origin.js';

// ─── Pipeline phase maps & caps (config; re-exported for stable imports) ──
export {
  DOMAIN_PHASES,
  EXPRESS_DOMAIN_KEYS,
  EXPRESS_MAX_PHASE,
  EXPRESS_REVIEW_AFTER_PHASES,
  FREE_SNAPSHOT_MAX_PHASE,
  PHASE_DOMAIN_MAP,
  REVIEW_AFTER_PHASES,
} from '../config/audit-phase-constants.js';

export {
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  maxPhaseForMode,
  reviewPhasesForExecutionPlan,
  reviewPhasesForMode,
  uniqueDomainKeys,
} from '../lib/audit-phase-policy.js';

// ─── Score system (single source: @glc/intake-core) ───────
export { SCORE_COLORS, SCORE_LABELS } from '@glc/intake-core';

// ─── Entities & API shapes ─────────────────────────────────
export * from './audit/entities-meta.js';
export * from './audit/entities-recon.js';
export * from './audit/entities-domain.js';
export * from './audit/entities-strategy.js';
export * from './audit/entities-pipeline.js';
export * from './audit/entities-brief.js';
export * from './audit/client-project-context.js';
export * from './audit/snapshot-public.js';
export * from './audit/quality-gate.js';
export * from './audit/entities-state.js';
