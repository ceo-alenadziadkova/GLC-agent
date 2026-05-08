import { describe, expect, it } from 'vitest';

import { computeConsultantBoardPlanHref } from '../roadmap-gantt-consultant-plan-href';

describe('computeConsultantBoardPlanHref', () => {
  it('returns null for client users', () => {
    expect(
      computeConsultantBoardPlanHref({
        auditId: 'audit-1',
        isClient: true,
        pathname: '/portal/plan/audit-1/board',
        search: '',
      }),
    ).toBeNull();
  });

  it('returns null when auditId is empty', () => {
    expect(
      computeConsultantBoardPlanHref({
        auditId: '',
        isClient: false,
        pathname: '/plan/audit-1/board',
        search: '',
      }),
    ).toBeNull();
  });

  it('builds a portal-plan deep link when the pathname is portal-scoped', () => {
    const href = computeConsultantBoardPlanHref({
      auditId: 'audit-1',
      isClient: false,
      pathname: '/portal/plan/audit-1/roadmap',
      search: '?focus=node-1',
    });
    expect(href).toContain('/portal/plan/audit-1/board');
    expect(href).toContain('focus=node-1');
  });

  it('builds a workspace-plan deep link otherwise', () => {
    const href = computeConsultantBoardPlanHref({
      auditId: 'audit-1',
      isClient: false,
      pathname: '/plan/audit-1/roadmap',
      search: '?focus=node-1',
    });
    expect(href).toContain('/plan/audit-1/board');
    expect(href).not.toContain('/portal/');
  });

  it('preserves foreign query params', () => {
    const href = computeConsultantBoardPlanHref({
      auditId: 'audit-1',
      isClient: false,
      pathname: '/plan/audit-1/roadmap',
      search: '?focus=node-1&lane=tech_delivery',
    });
    expect(href).toContain('focus=node-1');
    expect(href).toContain('lane=tech_delivery');
  });
});
