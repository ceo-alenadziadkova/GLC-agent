import { BaseCollector } from './base.js';
import { PublicUrlNotAllowedError, fetchPublicHttpUrl, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { isNoPublicWebsiteUrl } from '../config/no-public-website.js';

interface SecurityHeaders {
  name: string;
  present: boolean;
  value: string | null;
  recommendation: string;
}

export class SecurityCollector extends BaseCollector {
  get key() { return 'security_headers'; }
  get phase() { return 2; }

  async collect(_auditId: string, companyUrl: string) {
    if (isNoPublicWebsiteUrl(companyUrl)) {
      return {
        ssl: { valid: false, redirects_to_https: false, status: 0 },
        headers: [],
        cookies: [],
        mixed_content_hints: ['No public website — security headers not assessed against a live URL'],
        exposed_info: [],
      };
    }

    try {
      await validatePublicAuditUrl(companyUrl);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        return {
          ssl: { valid: false, redirects_to_https: false, status: 0 },
          headers: [],
          cookies: [],
          mixed_content_hints: ['Target URL is not allowed for outbound requests'],
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
    try {
      const httpsUrl = url.replace(/^http:/, 'https:');
      const response = await fetchPublicHttpUrl(httpsUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      }, 0);

      return {
        valid: response.ok || response.status === 301 || response.status === 302,
        redirects_to_https: response.headers.get('location')?.startsWith('https://') ?? false,
        status: response.status,
      };
    } catch {
      return { valid: false, redirects_to_https: false, status: 0 };
    }
  }

  private async checkHeaders(url: string): Promise<SecurityHeaders[]> {
    try {
      const response = await fetchPublicHttpUrl(url, {
        headers: { 'User-Agent': 'GLC-AuditBot/1.0' },
        signal: AbortSignal.timeout(10_000),
      });

      const headers = response.headers;

      return [
        {
          name: 'Strict-Transport-Security (HSTS)',
          present: !!headers.get('strict-transport-security'),
          value: headers.get('strict-transport-security'),
          recommendation: 'Add HSTS header with max-age >= 31536000 and includeSubDomains',
        },
        {
          name: 'Content-Security-Policy (CSP)',
          present: !!headers.get('content-security-policy'),
          value: headers.get('content-security-policy')?.substring(0, 200) ?? null,
          recommendation: 'Implement CSP to prevent XSS and data injection attacks',
        },
        {
          name: 'X-Content-Type-Options',
          present: headers.get('x-content-type-options') === 'nosniff',
          value: headers.get('x-content-type-options'),
          recommendation: 'Set X-Content-Type-Options: nosniff',
        },
        {
          name: 'X-Frame-Options',
          present: !!headers.get('x-frame-options'),
          value: headers.get('x-frame-options'),
          recommendation: 'Set X-Frame-Options: DENY or SAMEORIGIN',
        },
        {
          name: 'X-XSS-Protection',
          present: !!headers.get('x-xss-protection'),
          value: headers.get('x-xss-protection'),
          recommendation: 'Set X-XSS-Protection: 1; mode=block',
        },
        {
          name: 'Referrer-Policy',
          present: !!headers.get('referrer-policy'),
          value: headers.get('referrer-policy'),
          recommendation: 'Set Referrer-Policy: strict-origin-when-cross-origin',
        },
        {
          name: 'Permissions-Policy',
          present: !!headers.get('permissions-policy'),
          value: headers.get('permissions-policy')?.substring(0, 200) ?? null,
          recommendation: 'Define Permissions-Policy to control browser features',
        },
        {
          name: 'X-Powered-By (should be absent)',
          present: !headers.get('x-powered-by'), // Inverted: present=good means header is absent
          value: headers.get('x-powered-by'),
          recommendation: 'Remove X-Powered-By header to avoid exposing server technology',
        },
        {
          name: 'Server (should be minimal)',
          present: !headers.get('server') || headers.get('server') === 'cloudflare',
          value: headers.get('server'),
          recommendation: 'Minimize Server header information',
        },
      ];
    } catch {
      return [];
    }
  }

  private async checkCookies(url: string) {
    try {
      const response = await fetchPublicHttpUrl(url, { signal: AbortSignal.timeout(10_000) });
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
