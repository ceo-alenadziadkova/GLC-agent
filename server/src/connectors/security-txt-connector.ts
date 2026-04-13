/**
 * Public security.txt fetcher (RFC 9116) — no API key.
 * Non-blocking: returns null on any failure; never throws.
 */

import type { DomainKey } from '../types/audit.js';
import type { ExternalConnector, ConnectorFetchInput, ConnectorFetchOutput } from '../config/external-connectors.js';
import { isSecurityTxtConnectorEnabled } from '../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { logger } from '../services/logger.js';

const st = SYSTEM_DEFAULTS.connectors.securityTxt;
const CONTACT_FIELD_LINE = new RegExp(st.contactFieldLinePatternSource, 'i');
type SecurityTxtCacheValue = ConnectorFetchOutput | null;
interface SecurityTxtCacheEntry {
  expiresAtMs: number;
  value: SecurityTxtCacheValue;
}
const securityTxtCache = new Map<string, SecurityTxtCacheEntry>();

function readCache(host: string): SecurityTxtCacheValue | undefined {
  const hit = securityTxtCache.get(host);
  if (!hit) return undefined;
  if (hit.expiresAtMs <= Date.now()) {
    securityTxtCache.delete(host);
    return undefined;
  }
  return hit.value;
}

function writeCache(host: string, value: SecurityTxtCacheValue): void {
  securityTxtCache.set(host, {
    expiresAtMs: Date.now() + st.cacheTtlMs,
    value,
  });
}

export function clearSecurityTxtConnectorCacheForTests(): void {
  securityTxtCache.clear();
}

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
    let host: string;
    try {
      host = new URL(input.company_url).hostname;
      const cached = readCache(host);
      if (cached !== undefined) {
        logger.info('connector.security_txt_cache_hit', {
          component: 'connector',
          connector_id: 'security-txt-well-known',
          host,
          cache_hit: true,
        });
        return cached;
      }
      logger.info('connector.security_txt_cache_miss', {
        component: 'connector',
        connector_id: 'security-txt-well-known',
        host,
        cache_hit: false,
      });

      for (const suffix of st.pathSuffixes) {
        const url = `https://${host}${suffix}`;
        const body = await fetchText(url, st.fetchBudgetMs, st.maxBodyChars);
        if (body && looksLikeSecurityTxt(body)) {
          const found: ConnectorFetchOutput = {
            confirmed_fact_types: [...st.confirmedFactTypes],
            evidence_notes: [`security.txt present with Contact (${url})`],
          };
          writeCache(host, found);
          logger.info('connector.security_txt_cache_store', {
            component: 'connector',
            connector_id: 'security-txt-well-known',
            host,
            cached_result: 'found',
            ttl_ms: st.cacheTtlMs,
          });
          return found;
        }
      }
    } catch {
      return null;
    }
    writeCache(host, null);
    logger.info('connector.security_txt_cache_store', {
      component: 'connector',
      connector_id: 'security-txt-well-known',
      host,
      cached_result: 'not_found',
      ttl_ms: st.cacheTtlMs,
    });
    return null;
  }
}
