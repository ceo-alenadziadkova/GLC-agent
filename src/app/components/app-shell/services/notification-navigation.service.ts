import type { NotificationItem } from '../../../data/auditTypes';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';

type ResolveNotificationRouteArgs = {
  item: NotificationItem;
  isClient: boolean;
  isConsultant: boolean;
};

function remapConsultantPipelineRouteForPortalUser(route: string, isClient: boolean): string {
  if (!isClient) return route;
  const match = /^\/pipeline\/([^/?#]+)/.exec(route);
  return match?.[1] ? buildAppRoute.portalPipeline(match[1]) : route;
}

export function resolveNotificationRoute({
  item,
  isClient,
  isConsultant,
}: ResolveNotificationRouteArgs): string | null {
  const routeRaw = typeof item.payload?.route === 'string' ? item.payload.route : null;
  if (routeRaw) return remapConsultantPipelineRouteForPortalUser(routeRaw, isClient);

  const requestId = typeof item.payload?.request_id === 'string' ? item.payload.request_id : null;
  if (requestId) {
    return isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.adminRequests;
  }

  if (item.audit_id) {
    if (item.kind === 'pipeline' || item.kind === 'review') {
      return isClient ? buildAppRoute.portalPipeline(item.audit_id) : buildAppRoute.pipeline(item.audit_id);
    }
    return isClient ? buildAppRoute.portalAudit(item.audit_id) : buildAppRoute.audit(item.audit_id);
  }

  if (item.kind === 'intake' && isConsultant) {
    return APP_ROUTE_PATHS.adminRequests;
  }

  return null;
}

