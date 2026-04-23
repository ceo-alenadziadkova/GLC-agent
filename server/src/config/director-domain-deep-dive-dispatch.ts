import type { DomainKey } from '@glc/intake-core';

/**
 * Map initiative domains to non-CMO on-demand deep-dive handlers. CMO uses `runCmoSubAgentOrchestrator`
 * and remains gated by `DIRECTOR_SUB_AGENTS_ENABLED_DOMAINS` + `isDirectorSubAgentsEnabled()`.
 * Stubs (CDO/CAO/CSO) are policy-only bundles unless LLM flags enable domain-specific orchestrators.
 *
 * CDO primary domain is `ux_conversion`. `tech_infrastructure` / `seo_digital` use CTO/SEO deterministic stubs
 * (same product gate as legacy CDO stub env until dedicated infra/SEO LLM stacks ship).
 */
export const CDO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['ux_conversion'];
export const CTO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['tech_infrastructure'];
export const SEO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['seo_digital'];
export const CAO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['automation_processes'];
export const CSO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['security_compliance'];

export type DirectorDeepDiveHandlerKind =
  | 'cmo'
  | 'cdo'
  | 'cdo_stub'
  | 'cto_stub'
  | 'seo_stub'
  | 'cao'
  | 'cao_stub'
  | 'cso'
  | 'cso_stub'
  | 'single_fallback';

export function resolveDirectorDeepDiveHandler(
  domainKey: string,
  opts?: { cdoDeepDiveLlmEnabled?: boolean; caoDeepDiveLlmEnabled?: boolean; csoDeepDiveLlmEnabled?: boolean },
): DirectorDeepDiveHandlerKind {
  if (domainKey === 'marketing_utp') {
    return 'cmo';
  }
  if ((CDO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    if (domainKey === 'ux_conversion' && opts?.cdoDeepDiveLlmEnabled) return 'cdo';
    return 'cdo_stub';
  }
  if ((CTO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    return 'cto_stub';
  }
  if ((SEO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    return 'seo_stub';
  }
  if ((CAO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    if (domainKey === 'automation_processes' && opts?.caoDeepDiveLlmEnabled) return 'cao';
    return 'cao_stub';
  }
  if ((CSO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    if (domainKey === 'security_compliance' && opts?.csoDeepDiveLlmEnabled) return 'cso';
    return 'cso_stub';
  }
  return 'single_fallback';
}
