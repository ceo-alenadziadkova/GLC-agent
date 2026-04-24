import { APP_ROUTE_PATHS } from './route-paths';

/**
 * Cookie banner and settings panel copy (English; future i18n can mirror this module).
 *
 * "Accept all" / "Reject all" wording aligns with the published Cookies Policy
 * (`cookies-policy-page.en.ts` — section "Cookie Banner and Settings").
 */
export const COOKIE_CONSENT_BANNER_EN = {
  bannerLandmarkLabel: 'Cookie consent',
  title: 'Cookies on this site',
  description:
    'We use strictly necessary cookies to run the service. With your consent we also use analytics and marketing cookies. You can change your choices anytime in settings.',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  openSettings: 'Cookie settings',
  policyLinkLabel: 'Cookies Policy',
  privacyLinkLabel: 'Privacy Policy',
  linkSeparator: ' · ',
  routes: {
    cookiesPolicy: APP_ROUTE_PATHS.legalCookies,
    privacyPolicy: APP_ROUTE_PATHS.legalPrivacy,
  },
  /** Shown when an authenticated user's choice could not be saved to the API. */
  syncFailed: 'Could not save cookie preferences. Please try again.',
  dialog: {
    title: 'Cookie preferences',
    description:
      'Strictly necessary cookies are always on. You can enable or disable optional categories below.',
    necessaryTitle: 'Strictly necessary',
    necessaryDescription: 'Required for security, login sessions, and core site functionality. Cannot be turned off.',
    necessaryAlwaysOn: 'Always active',
    analyticsTitle: 'Analytics',
    analyticsDescription: 'Helps us understand how the product is used so we can improve it.',
    marketingTitle: 'Marketing',
    marketingDescription: 'Used for relevant communications and measurement related to marketing.',
    save: 'Save preferences',
    cancel: 'Cancel',
  },
} as const;
