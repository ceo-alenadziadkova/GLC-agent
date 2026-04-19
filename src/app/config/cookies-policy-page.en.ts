import { LEGAL_DOCUMENT_SPA_ROUTES } from '@glc/api-paths';
import { COOKIES_DOCUMENT_LAST_UPDATED_EN, LEGAL_PUBLIC_CONTACT_EN } from './legal-contract-defaults';
import { LEGAL_DOC_PAGES_EN } from './legal-doc-pages-copy.en';

export type CookiesBlock =
  | { readonly type: 'paragraph'; text: string }
  | { readonly type: 'list'; items: readonly string[] };

export type CookiesSection = {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly CookiesBlock[];
};

const COOKIE_CONTROLLER_LINES = `${LEGAL_PUBLIC_CONTACT_EN.controllerDisplayName}
NIF: ${LEGAL_PUBLIC_CONTACT_EN.nif}
Email: ${LEGAL_PUBLIC_CONTACT_EN.email}`;

const PRIVACY_REF = LEGAL_DOCUMENT_SPA_ROUTES.privacyPolicy;

export const COOKIES_POLICY_PAGE_EN = {
  documentTitle: 'Cookies Policy | GLC',
  htmlLang: 'en' as const,
  titlePrimary: 'Cookies Policy',
  titleSecondary: 'Política de Cookies',
  lastUpdatedLabel: 'Last updated',
  lastUpdatedValue: COOKIES_DOCUMENT_LAST_UPDATED_EN,
  backToLogin: LEGAL_DOC_PAGES_EN.backToLogin,
  footerPrivacyLinkLabel: 'Privacy Policy',
  footerLinkSeparator: ' · ',
  sections: [
    {
      id: 'what-are-cookies',
      title: '1. What Are Cookies?',
      blocks: [
        {
          type: 'paragraph',
          text: 'Cookies are small text files that are stored on your device (computer, smartphone, tablet) when you visit certain websites. Cookies allow the website to recognise your device and store information about your preferences or past actions.',
        },
        {
          type: 'paragraph',
          text: 'We also use similar technologies such as local storage, pixels or tags, which may have a similar purpose.',
        },
      ],
    },
    {
      id: 'who-responsible',
      title: '2. Who Is Responsible for the Cookies?',
      blocks: [
        {
          type: 'paragraph',
          text: 'The cookies used on this website are set by:',
        },
        { type: 'paragraph', text: COOKIE_CONTROLLER_LINES },
        {
          type: 'paragraph',
          text: 'In some cases, third parties (e.g., analytics or embedded services) may also set cookies via our site.',
        },
      ],
    },
    {
      id: 'types',
      title: '3. Types of Cookies We Use',
      blocks: [
        {
          type: 'paragraph',
          text: 'Depending on their purpose and who manages them, we may use:',
        },
        {
          type: 'list',
          items: [
            'Strictly necessary (technical) cookies: required for the website to function properly (e.g., to manage logins, security, load balancing). These do not require consent.',
            'Preference or customization cookies: remember your settings such as language or interface preferences.',
            'Analytics or measurement cookies: help us understand how visitors use the site (pages visited, time spent, clicks), in order to improve performance and usability.',
            'Advertising or behavioural cookies (if applicable): used to display advertising based on your browsing profile and interests.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We will provide a detailed list of cookies (own and third-party) in the cookie settings panel, indicating for each:',
        },
        {
          type: 'list',
          items: [
            'owner (first-party / third-party)',
            'purpose',
            'duration',
            'whether it requires consent',
          ],
        },
      ],
    },
    {
      id: 'legal-basis',
      title: '4. Legal Basis for Using Cookies',
      blocks: [
        {
          type: 'list',
          items: [
            'Strictly necessary cookies are processed on the basis of our legitimate interest in providing a secure and functional website.',
            'All other cookies (e.g., analytics or advertising cookies) will only be used with your prior consent, given through our cookie banner or settings panel.',
          ],
        },
        {
          type: 'paragraph',
          text: 'You can withdraw your consent at any time as explained below.',
        },
      ],
    },
    {
      id: 'banner-settings',
      title: '5. Cookie Banner and Settings',
      blocks: [
        {
          type: 'paragraph',
          text: 'When you first visit our website, a banner will be displayed:',
        },
        {
          type: 'list',
          items: [
            'informing you in a clear and simple way about the use of cookies,',
            'offering you options to accept all, reject all or configure cookies,',
            'with both "accept" and "reject" actions presented at the same level and with equal prominence.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Through the configuration panel you can enable or disable categories of cookies (except strictly necessary cookies). You can change your preferences at any time by accessing the cookie settings again, for example via a permanent link or icon on the website.',
        },
      ],
    },
    {
      id: 'browser',
      title: '6. Managing Cookies from Your Browser',
      blocks: [
        {
          type: 'paragraph',
          text: 'In addition to our settings panel, you can manage or delete cookies via your browser settings. Please note that disabling certain cookies may affect the proper functioning of the website.',
        },
        {
          type: 'paragraph',
          text: 'For more information on how to manage cookies in the most common browsers:',
        },
        {
          type: 'list',
          items: ['Chrome', 'Firefox', 'Safari', 'Edge'],
        },
        {
          type: 'paragraph',
          text: '(Consult the help section of your browser for the latest instructions.)',
        },
      ],
    },
    {
      id: 'international-transfers',
      title: '7. International Transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Some of the third-party cookies we use may involve international transfers of data to countries outside the EEA.',
        },
        {
          type: 'paragraph',
          text: `In such cases, we will ensure that appropriate safeguards (e.g., Standard Contractual Clauses or adequacy decisions) are in place. You can find more information on this in our Privacy Policy (${PRIVACY_REF}) or by consulting the privacy policies of the third-party providers identified in the cookie list.`,
        },
      ],
    },
    {
      id: 'changes',
      title: '8. Changes to This Cookies Policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this Cookies Policy from time to time to reflect changes in the cookies we use or legal requirements.',
        },
        {
          type: 'paragraph',
          text: 'Any significant change will be communicated via the website or through the cookie banner. The "Last updated" date will indicate the latest version.',
        },
      ],
    },
  ] as const satisfies readonly CookiesSection[],
} as const;
