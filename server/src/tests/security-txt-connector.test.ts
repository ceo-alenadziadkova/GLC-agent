import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  SecurityTxtWellKnownConnector,
  clearSecurityTxtConnectorCacheForTests,
} from '../connectors/security-txt-connector.js';

describe('SecurityTxtWellKnownConnector', () => {
  const originalEnv = process.env.CONNECTOR_SECURITY_TXT_ENABLED;

  afterEach(() => {
    clearSecurityTxtConnectorCacheForTests();
    vi.unstubAllGlobals();
    if (originalEnv === undefined) {
      delete process.env.CONNECTOR_SECURITY_TXT_ENABLED;
    } else {
      process.env.CONNECTOR_SECURITY_TXT_ENABLED = originalEnv;
    }
  });

  it('returns null when CONNECTOR_SECURITY_TXT_ENABLED=false', async () => {
    process.env.CONNECTOR_SECURITY_TXT_ENABLED = 'false';
    const c = new SecurityTxtWellKnownConnector();
    const out = await c.fetch({
      phase_id: 'security_compliance',
      high_risk_fact_types: [],
      company_url: 'https://example.com',
    });
    expect(out).toBeNull();
  });

  it('returns compliance_status when security.txt contains Contact', async () => {
    delete process.env.CONNECTOR_SECURITY_TXT_ENABLED;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/.well-known/security.txt')) {
          return {
            ok: true,
            text: async () => 'Contact: mailto:security@example.com\n',
          };
        }
        return { ok: false, text: async () => '' };
      }),
    );

    const c = new SecurityTxtWellKnownConnector();
    const out = await c.fetch({
      phase_id: 'security_compliance',
      high_risk_fact_types: ['compliance_status'],
      company_url: 'https://example.com/path',
    });

    expect(out).not.toBeNull();
    expect(out?.confirmed_fact_types).toContain('compliance_status');
    expect(out?.evidence_notes[0]).toContain('security.txt');
  });

  it('returns null on fetch failure (never throws)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network');
      }),
    );

    const c = new SecurityTxtWellKnownConnector();
    const out = await c.fetch({
      phase_id: 'security_compliance',
      high_risk_fact_types: [],
      company_url: 'https://example.com',
    });
    expect(out).toBeNull();
  });

  it('uses in-memory cache for repeated calls to same host', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/.well-known/security.txt')) {
        return {
          ok: true,
          text: async () => 'Contact: mailto:security@example.com\n',
        };
      }
      return { ok: false, text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);

    const c = new SecurityTxtWellKnownConnector();
    const input = {
      phase_id: 'security_compliance' as const,
      high_risk_fact_types: ['compliance_status'],
      company_url: 'https://example.com',
    };

    const first = await c.fetch(input);
    const second = await c.fetch(input);

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
