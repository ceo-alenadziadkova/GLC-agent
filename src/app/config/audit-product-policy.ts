import type { AuditCoveragePackage, ProductMode } from '../data/audit/contracts/core/audit-meta.types';

export const FREE_SNAPSHOT_PRODUCT_MODE: ProductMode = 'free_snapshot';
export const EXPRESS_PRODUCT_MODE: ProductMode = 'express';
export const FULL_PRODUCT_MODE: ProductMode = 'full';

/**
 * `buildIntakePlan` / brief SLA axis for paid audits — always full questionnaire requiredness.
 * Coverage package (Starter / Pro / Complete) affects pipeline phases only.
 */
export const INTAKE_BRIEF_SLA_PRODUCT_MODE: ProductMode = FULL_PRODUCT_MODE;

export const STARTER_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'starter';
export const PRO_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'pro';
export const COMPLETE_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'complete';

export const AUDIT_COVERAGE_PACKAGES: AuditCoveragePackage[] = ['starter', 'pro', 'complete'];
export const DEFAULT_AUDIT_COVERAGE_PACKAGE: AuditCoveragePackage = 'complete';
