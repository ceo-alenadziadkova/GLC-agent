/**
 * Public security.txt fetcher (RFC 9116) — no API key.
 * Non-blocking: returns null on any failure; never throws.
 */

import type { DomainKey } from '../types/audit.js';
import type { ExternalConnector, ConnectorFetchInput, ConnectorFetchOutput } from '../config/external-connectors.js';
import { isSecurityTxtConnectorEnabled } from '../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const st = SYSTEM_DEFAULTS.connectors.securityTxt;
const CONTACT_FIELD_LINE = new RegExp(st.contactFieldLinePatternSource, 'i');

async function fetchText(url: string, budgetMs: number, maxChars: number): Promise<string | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), budgetMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ac.signal,
      headers: { Accept: 'text/plain,*/*' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeSecurityTxt(body: string): boolean {
  return body.split(/\r?\n/).some(line => CONTACT_FIELD_LINE.test(line));
}

/**
 * When a well-formed security.txt is reachable, we can externally corroborate
 * that the organisation publishes a security contact channel — mapped to
 * `compliance_status` for claim-title matching in FactChecker.buildControlObject.
 */
export class SecurityTxtWellKnownConnector implements ExternalConnector {
  readonly id = 'security-txt-well-known';
  readonly name = 'Public security.txt (RFC 9116)';
  readonly timeout_ms = st.fetchBudgetMs;
  readonly applicable_phases: DomainKey[] = ['security_compliance'];

  async fetch(input: ConnectorFetchInput): Promise<ConnectorFetchOutput | null> {
    if (!isSecurityTxtConnectorEnabled()) {
      return null;
    }
    try {
      const host = new URL(input.company_url).hostname;
      for (const suffix of st.pathSuffixes) {
        const url = `https://${host}${suffix}`;
        const body = await fetchText(url, st.fetchBudgetMs, st.maxBodyChars);
        if (body && looksLikeSecurityTxt(body)) {
          return {
            confirmed_fact_types: [...st.confirmedFactTypes],
            evidence_notes: [`security.txt present with Contact (${url})`],
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}
