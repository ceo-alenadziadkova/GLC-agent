import type { NotificationItem } from '../../../data/auditTypes';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';

type ResolveNotificationRouteArgs = {
  item: NotificationItem;
  isClient: boolean;
  isConsultant: boolean;
};

export function resolveNotificationRoute({
  item,
  isClient,
  isConsultant,
}: ResolveNotificationRouteArgs): string | null {
  const route = typeof item.payload?.route === 'string' ? item.payload.route : null;
  if (route) return route;

  const requestId = typeof item.payload?.request_id === 'string' ? item.payload.request_id : null;
  if (requestId) {
    return isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.adminRequests;
  }

  if (item.audit_id) {
    if (item.kind === 'pipeline' || item.kind === 'review') {
      return buildAppRoute.pipeline(item.audit_id);
    }
    return buildAppRoute.audit(item.audit_id);
  }

  if (item.kind === 'intake' && isConsultant) {
    return APP_ROUTE_PATHS.adminRequests;
  }

  return null;
}

