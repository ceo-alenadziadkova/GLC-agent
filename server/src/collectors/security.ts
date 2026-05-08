import { BaseCollector } from './base.js';
import { CRAWLER_USER_AGENT } from '../config/bot-identity.js';
import { COLLECTOR_FETCH_TIMEOUT_MS, COLLECTOR_HEADER_PREVIEW_MAX } from '../config/collector-http.js';
import { PublicUrlNotAllowedError, fetchPublicHttpUrl, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { auditSkipsPublicWebsiteFetches } from '@glc/intake-core';
import { SECURITY_COLLECTOR_COPY } from '../config/collector-copy-security.en.js';
import type { CollectorCollectContext } from './base.js';
import { auditDeepScanEnabled } from '../lib/audit-deep-scan-env.js';

interface SecurityHeaders {
  name: string;
  present: boolean;
  value: string | null;
  recommendation: string;
}

export class SecurityCollector extends BaseCollector {
  get key() { return 'security_headers'; }
  get phase() { return 2; }

  async collect(_auditId: string, companyUrl: string, ctx?: CollectorCollectContext) {
    if (auditSkipsPublicWebsiteFetches(ctx?.noPublicWebsite, companyUrl)) {
      return {
        ssl: {
          valid: false,
          redirects_to_https: false,
          status: 0,
          verification_status: 'not_assessed',
          tls_library_check: { ok: false, status: 0 },
          browser_warning_check: { checked: false, warning_present: null },
        },
        headers: [],
        cookies: [],
        mixed_content_hints: [SECURITY_COLLECTOR_COPY.mixedContentNoPublicWebsite],
        exposed_info: [],
      };
    }

    try {
      await validatePublicAuditUrl(companyUrl);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        return {
          ssl: {
            valid: false,
            redirects_to_https: false,
            status: 0,
            verification_status: 'not_assessed',
            tls_library_check: { ok: false, status: 0 },
            browser_warning_check: { checked: false, warning_present: null },
          },
          headers: [],
          cookies: [],
          mixed_content_hints: [SECURITY_COLLECTOR_COPY.mixedContentUrlNotAllowed],
          exposed_info: [],
        };
      }
      throw e;
    }

    const results = {
      ssl: await this.checkSSL(companyUrl),
      headers: await this.checkHeaders(companyUrl),
      cookies: await this.checkCookies(companyUrl),
      mixed_content_hints: [] as string[],
      exposed_info: [] as string[],
    };

    return results;
  }

  private async checkSSL(url: string) {
    const httpsUrl = url.replace(/^http:/, 'https:');
    const httpUrl = url.replace(/^https:/, 'http:');

    let httpsHeadOk = false;
    let httpRedirectsToHttps = false;
    let httpsStatus = 0;
    let httpStatus = 0;

    try {
      const response = await fetchPublicHttpUrl(httpsUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(COLLECTOR_FETCH_TIMEOUT_MS),
      }, 0);
      httpsHeadOk = response.ok || response.status === 301 || response.status === 302;
      httpsStatus = response.status;
    } catch {
      httpsHeadOk = false;
    }

    try {
      const response = await fetchPublicHttpUrl(httpUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(COLLECTOR_FETCH_TIMEOUT_MS),
      }, 0);
      httpStatus = response.status;
      const location = response.headers.get('location') ?? '';
      httpRedirectsToHttps = location.startsWith('https://');
    } catch {
      httpRedirectsToHttps = false;
    }

    const browserHttpsWarning = await this.checkHttpsBrowserWarning(httpsUrl);
    const browserCheckCompleted = browserHttpsWarning !== null;
    const verificationStatus: 'confirmed' | 'unverified' | 'not_assessed' =
      httpsHeadOk && browserHttpsWarning === false
        ? 'confirmed'
        : browserHttpsWarning === null
          ? 'unverified'
          : 'confirmed';
    const isValid = browserCheckCompleted ? httpsHeadOk && browserHttpsWarning === false : httpsHeadOk;

    return {
      valid: isValid,
      redirects_to_https: httpRedirectsToHttps,
      status: httpsStatus || httpStatus,
      method: 'multi_source',
      verification_status: verificationStatus,
      tls_library_check: {
        ok: httpsHeadOk,
        status: httpsStatus,
      },
      browser_warning_check: {
        checked: browserCheckCompleted,
        warning_present: browserHttpsWarning,
      },
      sources: {
        https_head_ok: httpsHeadOk,
        http_redirect_to_https: httpRedirectsToHttps,
        browser_https_warning_absent: browserHttpsWarning === false,
      },
    };
  }

  private async checkHttpsBrowserWarning(httpsUrl: string): Promise<boolean | null> {
    if (!auditDeepScanEnabled()) {
      return null;
    }
    let browser;
    try {
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.goto(httpsUrl, {
        waitUntil: 'domcontentloaded',
        timeout: COLLECTOR_FETCH_TIMEOUT_MS,
      });
      await page.close();
      await browser.close();
      return false;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const isCertificateError =
        message.includes('cert') ||
        message.includes('certificate') ||
        message.includes('net::err_cert') ||
        message.includes('ssl');
      return isCertificateError ? true : null;
    }
  }

  private async checkHeaders(url: string): Promise<SecurityHeaders[]> {
    try {
      const response = await fetchPublicHttpUrl(url, {
        headers: { 'User-Agent': CRAWLER_USER_AGENT },
        signal: AbortSignal.timeout(COLLECTOR_FETCH_TIMEOUT_MS),
      });

      const headers = response.headers;
      const rec = SECURITY_COLLECTOR_COPY.headerRecommendations;

      return [
        {
          name: 'Strict-Transport-Security (HSTS)',
          present: !!headers.get('strict-transport-security'),
          value: headers.get('strict-transport-security'),
          recommendation: rec.hsts,
        },
        {
          name: 'Content-Security-Policy (CSP)',
          present: !!headers.get('content-security-policy'),
          value:
            headers.get('content-security-policy')?.substring(0, COLLECTOR_HEADER_PREVIEW_MAX) ?? null,
          recommendation: rec.csp,
        },
        {
          name: 'X-Content-Type-Options',
          present: headers.get('x-content-type-options') === 'nosniff',
          value: headers.get('x-content-type-options'),
          recommendation: rec.xContentTypeOptions,
        },
        {
          name: 'X-Frame-Options',
          present: !!headers.get('x-frame-options'),
          value: headers.get('x-frame-options'),
          recommendation: rec.xFrameOptions,
        },
        {
          name: 'X-XSS-Protection',
          present: !!headers.get('x-xss-protection'),
          value: headers.get('x-xss-protection'),
          recommendation: rec.xXssProtection,
        },
        {
          name: 'Referrer-Policy',
          present: !!headers.get('referrer-policy'),
          value: headers.get('referrer-policy'),
          recommendation: rec.referrerPolicy,
        },
        {
          name: 'Permissions-Policy',
          present: !!headers.get('permissions-policy'),
          value:
            headers.get('permissions-policy')?.substring(0, COLLECTOR_HEADER_PREVIEW_MAX) ?? null,
          recommendation: rec.permissionsPolicy,
        },
        {
          name: 'X-Powered-By (should be absent)',
          present: !headers.get('x-powered-by'), // Inverted: present=good means header is absent
          value: headers.get('x-powered-by'),
          recommendation: rec.xPoweredBy,
        },
        {
          name: 'Server (should be minimal)',
          present: !headers.get('server') || headers.get('server') === 'cloudflare',
          value: headers.get('server'),
          recommendation: rec.server,
        },
      ];
    } catch {
      return [];
    }
  }

  private async checkCookies(url: string) {
    try {
      const response = await fetchPublicHttpUrl(url, {
        signal: AbortSignal.timeout(COLLECTOR_FETCH_TIMEOUT_MS),
      });
      const setCookieHeaders = response.headers.getSetCookie?.() ?? [];

      const cookies = setCookieHeaders.map(cookie => {
        const parts = cookie.split(';').map(p => p.trim());
        const [nameValue] = parts;
        const [name] = nameValue?.split('=') ?? [];

        return {
          name: name?.trim() ?? 'unknown',
          secure: parts.some(p => p.toLowerCase() === 'secure'),
          httpOnly: parts.some(p => p.toLowerCase() === 'httponly'),
          sameSite: parts.find(p => p.toLowerCase().startsWith('samesite'))?.split('=')?.[1]?.trim() ?? null,
          hasExpiry: parts.some(p => p.toLowerCase().startsWith('expires') || p.toLowerCase().startsWith('max-age')),
        };
      });

      return {
        total: cookies.length,
        cookies,
        issues: cookies.filter(c => !c.secure || !c.httpOnly).map(c => `Cookie "${c.name}" missing ${!c.secure ? 'Secure' : ''} ${!c.httpOnly ? 'HttpOnly' : ''} flag`.trim()),
      };
    } catch {
      return { total: 0, cookies: [], issues: [] };
    }
  }
}
