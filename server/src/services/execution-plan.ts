import {
  DOMAIN_KEYS,
  EXPRESS_DOMAIN_KEYS,
  type AuditCoveragePackage,
  type AuditDepth,
  type AuditExecutionPlan,
  type DomainKey,
  type ProductMode,
  uniqueDomainKeys,
} from '../types/audit.js';

const ALL_DOMAINS = [...DOMAIN_KEYS] as DomainKey[];
const PRO_MAX_DOMAINS = 3;
const PRO_MIN_DOMAINS = 2;
const DEFAULT_STARTER_DOMAIN: DomainKey = 'tech_infrastructure';
const DEFAULT_PRO_DOMAINS: DomainKey[] = ['tech_infrastructure', 'security_compliance'];

function defaultDepthForPackage(pkg?: AuditCoveragePackage): AuditDepth {
  if (pkg === 'starter') return 'light';
  if (pkg === 'pro') return 'standard';
  return 'deep';
}

function defaultIncludeStrategyForPackage(pkg?: AuditCoveragePackage): boolean {
  return pkg !== 'starter';
}

export function defaultExecutionPlanForMode(mode: ProductMode): AuditExecutionPlan {
  if (mode === 'free_snapshot') {
    return {
      selected_domains: ['ux_conversion'],
      depth: 'light',
      source: 'system_default',
      coverage_package: 'starter',
      include_strategy: false,
    };
  }
  if (mode === 'express') {
    return {
      selected_domains: [...EXPRESS_DOMAIN_KEYS],
      depth: 'standard',
      source: 'system_default',
      coverage_package: 'pro',
      include_strategy: false,
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

export function normalizeExecutionPlan(
  incoming: Partial<AuditExecutionPlan> | null | undefined,
  fallbackMode: ProductMode,
): AuditExecutionPlan {
  if (!incoming) {
    return defaultExecutionPlanForMode(fallbackMode);
  }

  const packageCandidate = incoming.coverage_package;
  const selectedDomains = uniqueDomainKeys(incoming.selected_domains ?? []);
  const fallbackPlan = defaultExecutionPlanForMode(fallbackMode);

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
