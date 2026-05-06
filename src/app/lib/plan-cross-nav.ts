import { PORTAL_PLAN_VIEW_QUERY_KEY, type PortalPlanViewParam } from '../config/portal-plan';

/** Shared deep-link parameter across Plan surfaces (Board / Roadmap / Timeline). */
export const PORTAL_PLAN_FOCUS_QUERY_KEY = 'focus' as const;

export function readPlanFocusCanonicalKey(search: string): string | null {
  const sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = sp.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  return raw != null && raw.trim() !== '' ? raw.trim() : null;
}

/**
 * Adds or removes `focus` on a canonical plan href (`buildAppRoute.plan` / `portalPlan`).
 */
export function mergeFocusIntoPlanHref(baseHref: string, focus: string | null | undefined): string {
  const sharp = baseHref.indexOf('#');
  const pathPart = sharp === -1 ? baseHref : baseHref.slice(0, sharp);
  const hashPart = sharp === -1 ? '' : baseHref.slice(sharp);
  const q = pathPart.indexOf('?');
  const pathOnly = q === -1 ? pathPart : pathPart.slice(0, q);
  const rawQs = q === -1 ? '' : pathPart.slice(q + 1);
  const sp = new URLSearchParams(rawQs);
  if (focus != null && String(focus).trim() !== '') {
    sp.set(PORTAL_PLAN_FOCUS_QUERY_KEY, String(focus).trim());
  } else {
    sp.delete(PORTAL_PLAN_FOCUS_QUERY_KEY);
  }
  const qs = sp.toString();
  return `${pathOnly}${qs ? `?${qs}` : ''}${hashPart}`;
}

/**
 * Switches `view=` while preserving `focus` and any other foreign query pairs (toolbar deep-links).
 */
export function buildPlanUrlWithViewPreservingForeignParams(args: {
  pathname: string;
  currentSearch: string;
  nextView: PortalPlanViewParam;
}): string {
  const sp = new URLSearchParams(args.currentSearch.startsWith('?') ? args.currentSearch.slice(1) : args.currentSearch);
  const focus = sp.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  sp.set(PORTAL_PLAN_VIEW_QUERY_KEY, args.nextView);
  if (focus != null && focus.trim() !== '') {
    sp.set(PORTAL_PLAN_FOCUS_QUERY_KEY, focus.trim());
  } else {
    sp.delete(PORTAL_PLAN_FOCUS_QUERY_KEY);
  }
  const qs = sp.toString();
  return qs ? `${args.pathname}?${qs}` : args.pathname;
}
