/**
 * Route templates used inside notification payloads.
 *
 * These are UI navigation paths (consumed by frontend when handling notifications).
 * Keep them centralized to avoid string drift across backend modules.
 */

export function buildPipelineUiRoute(auditId: string): string {
  return `/pipeline/${auditId}`;
}

export const ROUTE_NOTIFICATION_PATHS = {
  adminRequests: '/admin/requests',
  portalHome: '/portal',
} as const;

export function buildPortalAuditRoute(auditId: string): string {
  return `/portal/audit/${auditId}`;
}

