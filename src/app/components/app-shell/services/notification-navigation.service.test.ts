import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../../../data/auditTypes';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';
import { resolveNotificationRoute } from './notification-navigation.service';

function makeNotification(
  patch: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id: 'n1',
    user_id: 'u1',
    audit_id: null,
    kind: 'pipeline',
    title: 'Title',
    message: 'Message',
    payload: {},
    is_read: false,
    read_at: null,
    created_at: new Date(0).toISOString(),
    ...patch,
  };
}

describe('resolveNotificationRoute', () => {
  it('uses explicit payload route first', () => {
    const item = makeNotification({ payload: { route: '/portal/audit/abc' } });
    const route = resolveNotificationRoute({
      item,
      isClient: true,
      isConsultant: false,
    });
    expect(route).toBe('/portal/audit/abc');
  });

  it('routes request notifications to client portal for client users', () => {
    const item = makeNotification({ payload: { request_id: 'rq_1' } });
    const route = resolveNotificationRoute({
      item,
      isClient: true,
      isConsultant: false,
    });
    expect(route).toBe(APP_ROUTE_PATHS.portal);
  });

  it('routes request notifications to admin requests for consultant users', () => {
    const item = makeNotification({ payload: { request_id: 'rq_1' } });
    const route = resolveNotificationRoute({
      item,
      isClient: false,
      isConsultant: true,
    });
    expect(route).toBe(APP_ROUTE_PATHS.adminRequests);
  });

  it('routes pipeline and review notifications to pipeline page when audit is present', () => {
    const auditId = 'f4f072f3-56d7-4fdf-a7c8-439f95fdc8da';
    const pipelineItem = makeNotification({ audit_id: auditId, kind: 'pipeline' });
    const reviewItem = makeNotification({ audit_id: auditId, kind: 'review' });

    expect(resolveNotificationRoute({ item: pipelineItem, isClient: false, isConsultant: true }))
      .toBe(buildAppRoute.pipeline(auditId));
    expect(resolveNotificationRoute({ item: reviewItem, isClient: false, isConsultant: true }))
      .toBe(buildAppRoute.pipeline(auditId));
  });

  it('routes other audit notifications to audit workspace', () => {
    const auditId = 'f4f072f3-56d7-4fdf-a7c8-439f95fdc8da';
    const item = makeNotification({ audit_id: auditId, kind: 'pipeline' });

    const route = resolveNotificationRoute({
      item,
      isClient: false,
      isConsultant: true,
    });

    expect(route).toBe(buildAppRoute.audit(auditId));
  });

  it('routes intake notifications to admin requests only for consultants', () => {
    const item = makeNotification({ kind: 'intake' });

    expect(resolveNotificationRoute({ item, isClient: false, isConsultant: true }))
      .toBe(APP_ROUTE_PATHS.adminRequests);
    expect(resolveNotificationRoute({ item, isClient: true, isConsultant: false }))
      .toBeNull();
  });
});

