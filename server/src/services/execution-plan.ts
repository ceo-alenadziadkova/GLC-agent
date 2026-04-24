import {
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  DOMAIN_KEYS,
  EXPRESS_DOMAIN_KEYS,
  type AuditCoveragePackage,
  type AuditDepth,
  type AuditExecutionPlan,
  type DomainKey,
  type ProductMode,
  uniqueDomainKeys,
} from '../types/audit.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const ALL_DOMAINS = [...DOMAIN_KEYS] as DomainKey[];
const EP = SYSTEM_DEFAULTS.executionPlan;
const PRO_MAX_DOMAINS = EP.proMaxDomains;
const PRO_MIN_DOMAINS = EP.proMinDomains;
const DEFAULT_STARTER_DOMAIN: DomainKey = EP.defaultStarterDomain;
const DEFAULT_PRO_DOMAINS: DomainKey[] = [...EP.defaultProDomains];

function defaultDepthForPackage(pkg?: AuditCoveragePackage): AuditDepth {
  if (pkg === 'starter') return 'light';
  if (pkg === 'pro') return 'standard';
  return 'deep';
}

function defaultIncludeStrategyForPackage(pkg?: AuditCoveragePackage): boolean {
  return pkg !== 'starter';
}

export function defaultExecutionPlanForPackage(
  pkg: AuditCoveragePackage = DEFAULT_AUDIT_COVERAGE_PACKAGE,
): AuditExecutionPlan {
  if (pkg === 'starter') {
    return {
      selected_domains: ['ux_conversion'],
      depth: 'light',
      source: 'system_default',
      coverage_package: 'starter',
      include_strategy: false,
    };
  }
  if (pkg === 'pro') {
    return {
      selected_domains: [...EXPRESS_DOMAIN_KEYS],
      depth: 'standard',
      source: 'system_default',
      coverage_package: 'pro',
      include_strategy: true,
    };
  }
  return {
    selected_domains: [...ALL_DOMAINS],
    depth: 'deep',
    source: 'system_default',
    coverage_package: 'complete',
    include_strategy: true,
  };
}

function normalizeFallbackPackage(
  fallback: AuditCoveragePackage | ProductMode | undefined,
): AuditCoveragePackage {
  if (fallback === 'starter' || fallback === 'pro' || fallback === 'complete') return fallback;
  if (fallback === 'free_snapshot') return 'starter';
  if (fallback === 'express') return 'pro';
  return DEFAULT_AUDIT_COVERAGE_PACKAGE;
}

export function normalizeExecutionPlan(
  incoming: Partial<AuditExecutionPlan> | null | undefined,
  fallbackPackage: AuditCoveragePackage | ProductMode = DEFAULT_AUDIT_COVERAGE_PACKAGE,
): AuditExecutionPlan {
  const resolvedFallbackPackage = normalizeFallbackPackage(fallbackPackage);
  if (!incoming) {
    return defaultExecutionPlanForPackage(resolvedFallbackPackage);
  }

  const packageCandidate = incoming.coverage_package;
  const selectedDomains = uniqueDomainKeys(incoming.selected_domains ?? []);
  const fallbackPlan = defaultExecutionPlanForPackage(resolvedFallbackPackage);

  const domainsFromPackage = (() => {
    if (packageCandidate === 'starter') {
      return selectedDomains.length > 0 ? selectedDomains.slice(0, 1) : [DEFAULT_STARTER_DOMAIN];
    }
    if (packageCandidate === 'pro') {
      const bounded = selectedDomains.slice(0, PRO_MAX_DOMAINS);
      return bounded.length >= PRO_MIN_DOMAINS ? bounded : [...DEFAULT_PRO_DOMAINS];
    }
    if (packageCandidate === 'complete') {
      return [...ALL_DOMAINS];
    }
    return selectedDomains;
  })();

  const normalizedSelected = domainsFromPackage.length > 0
    ? domainsFromPackage
    : fallbackPlan.selected_domains;

  const normalizedDepth = incoming.depth ?? defaultDepthForPackage(packageCandidate);
  const normalizedSource = incoming.source ?? 'system_default';
  const includeStrategy =
    packageCandidate === 'starter'
      ? false
      : packageCandidate === 'complete'
        ? true
        : (incoming.include_strategy ?? defaultIncludeStrategyForPackage(packageCandidate));

  return {
    selected_domains: normalizedSelected,
    depth: normalizedDepth,
    source: normalizedSource,
    coverage_package: packageCandidate,
    include_strategy: includeStrategy,
    recommended_domains: uniqueDomainKeys(incoming.recommended_domains ?? []),
  };
}
