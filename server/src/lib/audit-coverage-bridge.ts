/**
 * Bridges legacy `audits.product_mode` / `audit_requests.product_mode` to the canonical
 * `execution_plan.coverage_package` model.
 *
 * Prefer `execution_plan` everywhere new code is written; helpers here exist only where:
 * - Postgres columns or CHECK constraints still store legacy enums, or
 * - brief gates need a `ProductMode` axis (intake SLA is always **full**; starter/pro/complete differ only in `execution_plan`).
 */
import { normalizeExecutionPlan } from '../services/execution-plan.js';
import {
  COMPLETE_AUDIT_COVERAGE_PACKAGE,
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  DEFAULT_AUDIT_PRODUCT_MODE,
  EXPRESS_PRODUCT_MODE,
  FREE_SNAPSHOT_PRODUCT_MODE,
  FULL_PRODUCT_MODE,
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  PRO_AUDIT_COVERAGE_PACKAGE,
  STARTER_AUDIT_COVERAGE_PACKAGE,
  type AuditCoveragePackage,
  type AuditExecutionPlan,
  type DomainKey,
  type ProductMode,
} from '../types/audit.js';

const SNAPSHOT_STYLE_DOMAIN: DomainKey = 'ux_conversion';

/** `audit_requests.product_mode` is constrained to express|full — map to a coverage package. */
export function coveragePackageFromAuditRequestProductMode(mode: string | null | undefined): AuditCoveragePackage {
  return mode === FULL_PRODUCT_MODE ? COMPLETE_AUDIT_COVERAGE_PACKAGE : PRO_AUDIT_COVERAGE_PACKAGE;
}

/** Value persisted on `audits.product_mode` for rows that are not free snapshots. */
export function persistedProductModeForExecutionPlan(plan: AuditExecutionPlan): ProductMode {
  if (plan.coverage_package === COMPLETE_AUDIT_COVERAGE_PACKAGE) return DEFAULT_AUDIT_PRODUCT_MODE;
  return EXPRESS_PRODUCT_MODE;
}

/**
 * Intake brief SLA gates: **always full** questionnaire requiredness so every paid audit
 * collects the same context; `coverage_package` affects pipeline phases only.
 * Policy artifact still defines `modes.express` for pre-brief / tooling until removed.
 */
export function intakeBriefGateModeFromExecutionPlan(_plan: AuditExecutionPlan): typeof INTAKE_BRIEF_SLA_PRODUCT_MODE {
  void _plan;
  return INTAKE_BRIEF_SLA_PRODUCT_MODE;
}

export function intakeBriefGateModeFromPartialPlan(
  execution_plan: Partial<AuditExecutionPlan> | null | undefined,
): typeof INTAKE_BRIEF_SLA_PRODUCT_MODE {
  const plan = normalizeExecutionPlan(execution_plan ?? null, DEFAULT_AUDIT_COVERAGE_PACKAGE);
  return intakeBriefGateModeFromExecutionPlan(plan);
}

/**
 * Snapshot upgrade: allow legacy `free_snapshot` rows, or canonical starter UX-only plans with a token.
 */
export function isFreeSnapshotUpgradeEligibleAudit(row: {
  product_mode: string | null | undefined;
  snapshot_token: string | null | undefined;
  execution_plan: unknown;
}): boolean {
  if (row.product_mode === FREE_SNAPSHOT_PRODUCT_MODE) return true;
  const token = row.snapshot_token;
  if (token == null || String(token).trim() === '') return false;
  const plan = normalizeExecutionPlan(
    (row.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
    DEFAULT_AUDIT_COVERAGE_PACKAGE,
  );
  return (
    plan.coverage_package === STARTER_AUDIT_COVERAGE_PACKAGE &&
    plan.selected_domains.length === 1 &&
    plan.selected_domains[0] === SNAPSHOT_STYLE_DOMAIN &&
    plan.include_strategy !== true
  );
}
