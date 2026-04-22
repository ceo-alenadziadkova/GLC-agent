import { describe, expect, it } from 'vitest';
import { resolveDirectorDeepDiveHandler } from '../config/director-domain-deep-dive-dispatch.js';

describe('resolveDirectorDeepDiveHandler', () => {
  it('routes marketing to CMO', () => {
    expect(resolveDirectorDeepDiveHandler('marketing_utp')).toBe('cmo');
  });

  it('routes UX conversion to CDO stub path (aligned with DOMAIN_KEYS / ADR)', () => {
    expect(resolveDirectorDeepDiveHandler('ux_conversion')).toBe('cdo_stub');
  });

  it('routes automation to CAO stub', () => {
    expect(resolveDirectorDeepDiveHandler('automation_processes')).toBe('cao_stub');
  });

  it('routes security to CSO stub', () => {
    expect(resolveDirectorDeepDiveHandler('security_compliance')).toBe('cso_stub');
  });

  it('uses single fallback for unknown domain keys', () => {
    expect(resolveDirectorDeepDiveHandler('strategy')).toBe('single_fallback');
  });
});
