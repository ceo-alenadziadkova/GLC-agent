/**
 * Outbound identity for crawlers, snapshot fetchers, and Playwright contexts.
 * Override public site URL with GLC_PUBLIC_SITE_URL (https origin, no trailing slash).
 */

import { GLC_DEV_BRAND_ORIGIN } from '@glc/dev-brand-defaults';
import { ensureHttpsUrl } from '@glc/intake-core';
import {
  PLAYWRIGHT_CHROME_FULL_VERSION_FOR_UA,
  PLAYWRIGHT_CHROME_MAJOR_FOR_UA,
} from './playwright-user-agent.js';

function resolveGlcPublicSiteUrl(): string {
  const raw = process.env.GLC_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[server] GLC_PUBLIC_SITE_URL is required when NODE_ENV=production (https origin for crawler UA; no trailing slash)',
      );
    }
    return GLC_DEV_BRAND_ORIGIN;
  }
  const trimmedHost = raw.replace(/^\/+|\/+$/g, '');
  return ensureHttpsUrl(trimmedHost).replace(/\/+$/, '');
}

export const GLC_PUBLIC_SITE_URL = resolveGlcPublicSiteUrl();

export const CRAWLER_USER_AGENT = `GLC-AuditBot/1.0 (+${GLC_PUBLIC_SITE_URL})`;

export const SNAPSHOT_SCANNER_USER_AGENT = `GLC-SnapshotScanner/1.0 (+${GLC_PUBLIC_SITE_URL})`;

export const SNAPSHOT_HEAD_PROBE_BROWSER_UA =
  `Mozilla/5.0 (compatible; GLC-SnapshotHeadProbe/1.0; +${GLC_PUBLIC_SITE_URL}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${PLAYWRIGHT_CHROME_FULL_VERSION_FOR_UA} Safari/537.36`;

export const PLAYWRIGHT_SNAPSHOT_USER_AGENT =
  `Mozilla/5.0 (compatible; GLC-SnapshotScanner/1.0; +${GLC_PUBLIC_SITE_URL}) Chrome/${PLAYWRIGHT_CHROME_MAJOR_FOR_UA} Safari/537.36`;

export const PLAYWRIGHT_AUDITBOT_USER_AGENT =
  `Mozilla/5.0 (compatible; GLC-AuditBot/1.0; +${GLC_PUBLIC_SITE_URL}) Chrome/${PLAYWRIGHT_CHROME_MAJOR_FOR_UA} Safari/537.36`;

export const SNAPSHOT_COMPETITOR_USER_AGENT = `GLC-SnapshotCompetitor/1.0 (+${GLC_PUBLIC_SITE_URL})`;
