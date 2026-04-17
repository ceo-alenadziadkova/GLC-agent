import {
  COMPLETE_AUDIT_COVERAGE_PACKAGE,
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  EXPRESS_PRODUCT_MODE,
  FREE_SNAPSHOT_PRODUCT_MODE,
  PRO_AUDIT_COVERAGE_PACKAGE,
  STARTER_AUDIT_COVERAGE_PACKAGE,
  type AuditDepth,
  type AuditCoveragePackage,
  type AuditMeta,
  type DomainKey,
} from '../data/auditTypes';

const DOMAIN_PHASE_MAP: Record<DomainKey, number> = {
  tech_infrastructure: 1,
  security_compliance: 2,
  seo_digital: 3,
  ux_conversion: 4,
  marketing_utp: 5,
  automation_processes: 6,
};

const SNAPSHOT_STYLE_DOMAIN: DomainKey = 'ux_conversion';
const SNAPSHOT_STYLE_DOMAIN_COUNT = 1;
const SNAPSHOT_STYLE_COVERAGE_PACKAGE: AuditCoveragePackage = STARTER_AUDIT_COVERAGE_PACKAGE;
const EXPRESS_LIKE_MAX_PHASE = 4;

const COVERAGE_PACKAGE_LABELS: Record<AuditCoveragePackage, { title: string; audit: string }> = {
  starter: { title: 'Starter', audit: 'Starter audit' },
  pro: { title: 'Pro', audit: 'Pro audit' },
  complete: { title: 'Complete', audit: 'Complete audit' },
};

const LEGACY_PRODUCT_MODE_FALLBACK_PACKAGE: Partial<Record<AuditMeta['product_mode'], AuditCoveragePackage>> = {
  [EXPRESS_PRODUCT_MODE]: PRO_AUDIT_COVERAGE_PACKAGE,
};

type ExecutionPlanLike = {
  coverage_package?: AuditCoveragePackage;
  selected_domains?: DomainKey[];
  include_strategy?: boolean;
  depth?: AuditDepth;
  source?: 'user_selected' | 'system_default';
};
type SnapshotStyleMeta = {
  snapshot_token?: AuditMeta['snapshot_token'];
  execution_plan?: ExecutionPlanLike;
  product_mode?: AuditMeta['product_mode'];
};
type PackageLabelStyle = 'title' | 'audit';

export function coveragePackageFromMeta(meta: { execution_plan?: ExecutionPlanLike }): AuditCoveragePackage {
  return meta.execution_plan?.coverage_package ?? DEFAULT_AUDIT_COVERAGE_PACKAGE;
}

export function isSnapshotStyleAudit(meta: SnapshotStyleMeta): boolean {
  const selected = meta.execution_plan?.selected_domains ?? [];
  if (!meta.execution_plan && meta.product_mode === FREE_SNAPSHOT_PRODUCT_MODE) return true;
  return (
    meta.snapshot_token != null &&
    coveragePackageFromMeta(meta) === SNAPSHOT_STYLE_COVERAGE_PACKAGE &&
    selected.length === SNAPSHOT_STYLE_DOMAIN_COUNT &&
    selected[0] === SNAPSHOT_STYLE_DOMAIN &&
    meta.execution_plan?.include_strategy !== true
  );
}

export function phaseIdsFromMetaPlan(meta: { execution_plan?: ExecutionPlanLike | null }): number[] {
  const selected = meta.execution_plan?.selected_domains ?? [];
  const domainPhases = selected
    .map((domain) => DOMAIN_PHASE_MAP[domain])
    .filter((phase): phase is number => typeof phase === 'number')
    .sort((a, b) => a - b);
  const includeStrategy = meta.execution_plan?.include_strategy === true;
  return [0, ...domainPhases, ...(includeStrategy ? [7] : [])];
}

/**
 * Pro-like / express-like execution: only recon + auto wing phases (0-4), no strategy.
 * Used by UI copy and phase visibility, independent of legacy `product_mode`.
 */
export function isExpressLikeAudit(meta: { execution_plan?: ExecutionPlanLike | null }): boolean {
  const phases = phaseIdsFromMetaPlan(meta);
  return phases.length > 0 && phases.every((phase) => phase <= EXPRESS_LIKE_MAX_PHASE);
}

export function coveragePackageLabel(
  pkg: AuditCoveragePackage,
  style: PackageLabelStyle = 'title',
): string {
  return COVERAGE_PACKAGE_LABELS[pkg][style];
}

export function auditPackageLabel(
  meta: SnapshotStyleMeta,
  options?: { style?: PackageLabelStyle; snapshotLabel?: string },
): string {
  const labelStyle = options?.style ?? 'title';
  const snapshotLabel = options?.snapshotLabel ?? 'Free snapshot';
  if (isSnapshotStyleAudit(meta)) return snapshotLabel;
  if (!meta.execution_plan?.coverage_package) {
    if (meta.product_mode === FREE_SNAPSHOT_PRODUCT_MODE) return snapshotLabel;
    const fallbackPkg = meta.product_mode ? LEGACY_PRODUCT_MODE_FALLBACK_PACKAGE[meta.product_mode] : undefined;
    if (fallbackPkg) return coveragePackageLabel(fallbackPkg, labelStyle);
  }
  return coveragePackageLabel(coveragePackageFromMeta(meta), labelStyle);
}
