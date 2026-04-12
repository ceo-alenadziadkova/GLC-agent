/**
 * User-visible copy for SecurityCollector (reports / collected_data).
 * Keep recommendations aligned with product messaging; i18n can map these later.
 */

export const SECURITY_COLLECTOR_COPY = {
  mixedContentNoPublicWebsite: 'No public website — security headers not assessed against a live URL',
  mixedContentUrlNotAllowed: 'Target URL is not allowed for outbound requests',
  headerRecommendations: {
    hsts: 'Add HSTS header with max-age >= 31536000 and includeSubDomains',
    csp: 'Implement CSP to prevent XSS and data injection attacks',
    xContentTypeOptions: 'Set X-Content-Type-Options: nosniff',
    xFrameOptions: 'Set X-Frame-Options: DENY or SAMEORIGIN',
    xXssProtection: 'Set X-XSS-Protection: 1; mode=block',
    referrerPolicy: 'Set Referrer-Policy: strict-origin-when-cross-origin',
    permissionsPolicy: 'Define Permissions-Policy to control browser features',
    xPoweredBy: 'Remove X-Powered-By header to avoid exposing server technology',
    server: 'Minimize Server header information',
  },
} as const;
