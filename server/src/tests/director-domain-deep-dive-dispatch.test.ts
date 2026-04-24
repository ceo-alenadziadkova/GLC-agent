import { describe, expect, it } from 'vitest';
import { resolveDirectorDeepDiveHandler } from '../config/director-domain-deep-dive-dispatch.js';

describe('resolveDirectorDeepDiveHandler', () => {
  it('routes marketing to CMO', () => {
    expect(resolveDirectorDeepDiveHandler('marketing_utp')).toBe('cmo');
  });

  it('routes UX conversion to CDO stub path (aligned with DOMAIN_KEYS / ADR)', () => {
    expect(resolveDirectorDeepDiveHandler('ux_conversion')).toBe('cdo_stub');
    expect(resolveDirectorDeepDiveHandler('ux_conversion', { cdoDeepDiveLlmEnabled: true })).toBe('cdo');
  });

  it('routes tech and SEO domains to CTO/SEO stub handlers', () => {
    expect(resolveDirectorDeepDiveHandler('tech_infrastructure')).toBe('cto_stub');
    expect(resolveDirectorDeepDiveHandler('seo_digital')).toBe('seo_stub');
  });

  it('routes automation to CAO stub or LLM handler', () => {
    expect(resolveDirectorDeepDiveHandler('automation_processes')).toBe('cao_stub');
    expect(resolveDirectorDeepDiveHandler('automation_processes', { caoDeepDiveLlmEnabled: true })).toBe('cao');
  });

  it('routes security to CSO stub or LLM handler', () => {
    expect(resolveDirectorDeepDiveHandler('security_compliance')).toBe('cso_stub');
    expect(resolveDirectorDeepDiveHandler('security_compliance', { csoDeepDiveLlmEnabled: true })).toBe('cso');
  });

  it('uses single fallback for unknown domain keys', () => {
    expect(resolveDirectorDeepDiveHandler('strategy')).toBe('single_fallback');
  });
});
