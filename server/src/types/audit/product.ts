export type { ProductMode } from '@glc/intake-core';

import type { ProductMode } from '@glc/intake-core';

export type AuditCoveragePackage = 'starter' | 'pro' | 'complete';
export type AuditDepth = 'light' | 'standard' | 'deep';

export const PRODUCT_MODES: ProductMode[] = ['free_snapshot', 'express', 'full'];
export const AUDIT_COVERAGE_PACKAGES: AuditCoveragePackage[] = ['starter', 'pro', 'complete'];

/** Legacy DB / intake corridor values (canonical coverage is `execution_plan.coverage_package`). */
export const FREE_SNAPSHOT_PRODUCT_MODE: ProductMode = 'free_snapshot';
export const EXPRESS_PRODUCT_MODE: ProductMode = 'express';
export const FULL_PRODUCT_MODE: ProductMode = 'full';

export const STARTER_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'starter';
export const PRO_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'pro';
export const COMPLETE_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'complete';

/** Default `audits.product_mode` when absent in DB or API input (not to be confused with report `profile`). */
export const DEFAULT_AUDIT_PRODUCT_MODE: ProductMode = 'full';

/**
 * `buildIntakePlan` / brief SLA axis for paid audits — always full questionnaire requiredness.
 * `execution_plan.coverage_package` selects pipeline domains only (Starter / Pro / Complete).
 */
export const INTAKE_BRIEF_SLA_PRODUCT_MODE: ProductMode = DEFAULT_AUDIT_PRODUCT_MODE;

export const DEFAULT_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'complete';
