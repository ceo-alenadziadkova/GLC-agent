/** Public marketing routes — single source for header/footer/hub cards. */

export const MARKETING_PACKAGE_LINKS = [
  { to: '/starter', label: 'Focus' },
  { to: '/pro', label: 'Context' },
  { to: '/complete', label: 'Strategy' },
] as const;

/** Top-level marketing destinations shown beside the grouped package menu (desktop). */
export const MARKETING_DESKTOP_HUB_LINKS = [
  { to: '/snapshot', label: 'Snapshot' },
  { to: '/discovery', label: 'Discovery' },
] as const;

export const MARKETING_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/snapshot', label: 'Snapshot' },
  { to: '/starter', label: 'Focus' },
  { to: '/pro', label: 'Context' },
  { to: '/complete', label: 'Strategy' },
  { to: '/discovery', label: 'Discovery' },
  { to: '/brief', label: 'Brief' },
  { to: '/faq', label: 'FAQ' },
] as const;

export type MarketingPath = (typeof MARKETING_LINKS)[number]['to'];

export const LOGIN_PATH = '/login' as const;
