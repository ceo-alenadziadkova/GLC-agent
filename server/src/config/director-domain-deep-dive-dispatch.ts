import type { DomainKey } from '@glc/intake-core';

/**
 * Map initiative domains to non-CMO on-demand deep-dive handlers. CMO uses `runCmoSubAgentOrchestrator`
 * and remains gated by `DIRECTOR_SUB_AGENTS_ENABLED_DOMAINS` + `isDirectorSubAgentsEnabled()`.
 * Stubs (CDO/CAO/CSO) are policy-only bundles until dedicated sub-agent stacks ship.
 *
 * CDO (UX & conversion) primary domain is `ux_conversion` per `DOMAIN_KEYS` / ADR-CTO-DIRECTOR;
 * `tech_infrastructure` and `seo_digital` keep stub routing until CTO/SEO deep-dive lanes ship.
 */
export const CDO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['ux_conversion', 'tech_infrastructure', 'seo_digital'];
export const CAO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['automation_processes'];
export const CSO_DEEP_DIVE_DOMAINS: readonly DomainKey[] = ['security_compliance'];

export type DirectorDeepDiveHandlerKind = 'cmo' | 'cdo_stub' | 'cao_stub' | 'cso_stub' | 'single_fallback';

export function resolveDirectorDeepDiveHandler(domainKey: string): DirectorDeepDiveHandlerKind {
  if (domainKey === 'marketing_utp') {
    return 'cmo';
  }
  if ((CDO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    return 'cdo_stub';
  }
  if ((CAO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    return 'cao_stub';
  }
  if ((CSO_DEEP_DIVE_DOMAINS as readonly string[]).includes(domainKey)) {
    return 'cso_stub';
  }
  return 'single_fallback';
}
