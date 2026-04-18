/** Public marketing routes — single source for header/footer/hub cards. */

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
