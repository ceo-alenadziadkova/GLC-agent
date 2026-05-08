import { buildAppRoute } from '../config/route-paths';
import { buildPlanUrlWithViewPreservingForeignParams } from './plan-cross-nav';

/**
 * Compute the consultant Plan Board deep-link displayed inside the Roadmap drawer.
 *
 * Returns `null` for client users or when audit id is missing — the link is consultant-only.
 * Pathname determines whether to build a portal or workspace plan path; query params from
 * the current location are preserved via {@link buildPlanUrlWithViewPreservingForeignParams}.
 */
export function computeConsultantBoardPlanHref(args: {
  auditId: string;
  isClient: boolean;
  pathname: string;
  search: string;
}): string | null {
  const { auditId, isClient, pathname, search } = args;
  if (isClient || !auditId) return null;
  const basePath = pathname.includes('/portal/plan/')
    ? buildAppRoute.portalPlan(auditId, 'board').replace(/\?.*$/, '')
    : buildAppRoute.plan(auditId, 'board').replace(/\?.*$/, '');
  return buildPlanUrlWithViewPreservingForeignParams({
    pathname: basePath,
    currentSearch: search ?? '',
    nextView: 'board',
  });
}
