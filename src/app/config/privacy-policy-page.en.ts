import { LEGAL_DOCUMENT_SPA_ROUTES } from '@glc/api-paths';
import {
  LEGAL_CONTRACT_DEFAULTS,
  LEGAL_PUBLIC_CONTACT_EN,
  PRIVACY_DOCUMENT_LAST_UPDATED_EN,
} from './legal-contract-defaults';
import { LEGAL_DOC_PAGES_EN } from './legal-doc-pages-copy.en';

const TECH_LOG_RETENTION = `Technical and log data: for the time strictly necessary to ensure security and the proper functioning of the Service, generally not exceeding ${String(LEGAL_CONTRACT_DEFAULTS.technicalLogRetentionMonths)} months, unless a longer period is required in connection with security incidents or investigations.`;

const ANALYTICS_LEGAL_BASIS_WITH_COOKIES_REF = `Consent or, where applicable, legitimate interest (see Cookies Policy at ${LEGAL_DOCUMENT_SPA_ROUTES.cookiePolicy})`;

export type PrivacyBlock =
  | { readonly type: 'paragraph'; text: string }
  | { readonly type: 'list'; items: readonly string[] }
  | {
      readonly type: 'table';
      readonly headers: readonly string[];
      readonly rows: readonly (readonly string[])[];
    };

export type PrivacySubsection = {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly PrivacyBlock[];
};

export type PrivacySection = {
  readonly id: string;
  readonly title: string;
  readonly blocks?: readonly PrivacyBlock[];
  readonly subsections?: readonly PrivacySubsection[];
};

const CONTROLLER_INTRO = `Data Controller: ${LEGAL_PUBLIC_CONTACT_EN.controllerDisplayName}
NIF: ${LEGAL_PUBLIC_CONTACT_EN.nif}
Address: ${LEGAL_PUBLIC_CONTACT_EN.addressSingleLine}
Email: ${LEGAL_PUBLIC_CONTACT_EN.email}`;

export const PRIVACY_POLICY_PAGE_EN = {
  documentTitle: 'Privacy Policy | GLC',
  htmlLang: 'en' as const,
  titlePrimary: 'Privacy Policy',
  titleSecondary: 'Política de Privacidad',
  lastUpdatedLabel: 'Last updated',
  lastUpdatedValue: PRIVACY_DOCUMENT_LAST_UPDATED_EN,
  backToLogin: LEGAL_DOC_PAGES_EN.backToLogin,
  sections: [
    {
      id: 'controller',
      title: '1. Data Controller / Responsable del Tratamiento',
      blocks: [
        { type: 'paragraph', text: CONTROLLER_INTRO },
        {
          type: 'paragraph',
          text: 'If in the future a Data Protection Officer (DPO) is appointed, their contact details will be published here.',
        },
      ],
    },
    {
      id: 'data-we-collect',
      title: '2. Data We Collect',
      subsections: [
        {
          id: 'account-contact',
          title: '2.1. Account and Contact Data',
          blocks: [
            {
              type: 'list',
              items: ['name and surname', 'email address', 'role and position', 'company name'],
            },
          ],
        },
        {
          id: 'business-project',
          title: '2.2. Business and Project Data',
          blocks: [
            {
              type: 'list',
              items: [
                'company information and business model',
                'description of products and services',
                'processes and workflows',
                'technical infrastructure and architecture',
                'information contained in websites, documentation or other materials you share for the purposes of the audit',
              ],
            },
            {
              type: 'paragraph',
              text: 'These data may include personal data of contact persons or other individuals (e.g., names, emails, job titles).',
            },
          ],
        },
        {
          id: 'technical-usage',
          title: '2.3. Technical and Usage Data',
          blocks: [
            {
              type: 'list',
              items: [
                'IP address and approximate location (city/country)',
                'browser type and version, device information',
                'pages visited, actions performed, time and date of visits',
                'log data and diagnostic information',
              ],
            },
          ],
        },
        {
          id: 'marketing-communication',
          title: '2.4. Marketing and Communication Data',
          blocks: [
            {
              type: 'list',
              items: [
                'subscription to newsletters or updates',
                'preferences regarding marketing communications',
                'information about interactions with our emails (open rates, clicks) where permitted.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'purposes-legal-basis',
      title: '3. Purposes and Legal Basis',
      blocks: [
        {
          type: 'paragraph',
          text: 'We process personal data for the following purposes and on the following legal bases:',
        },
        {
          type: 'table',
          headers: ['Purpose', 'Data', 'Legal Basis'],
          rows: [
            [
              'Service delivery and account management',
              'account, contact, business data',
              'Performance of a contract or pre-contractual steps',
            ],
            [
              'Communication regarding the Service',
              'email, contact data',
              'Performance of a contract / legitimate interest (service follow-up)',
            ],
            [
              'Security, logs and fraud prevention',
              'technical and usage data',
              'Legitimate interest (ensure security and integrity of the Service)',
            ],
            [
              'Marketing communications (newsletter, updates)',
              'email, name, preferences',
              'Consent (opt-in)',
            ],
            [
              'Analytics and service improvement (where not strictly necessary)',
              'usage and technical data',
              ANALYTICS_LEGAL_BASIS_WITH_COOKIES_REF,
            ],
          ],
        },
        {
          type: 'paragraph',
          text: 'For processing based on legitimate interest, our legitimate interest is to protect the integrity of the Service, prevent misuse, ensure network and information security and improve our services in a proportionate manner.',
        },
        {
          type: 'paragraph',
          text: 'You may object to processing based on legitimate interest at any time, as described in the "User Rights" section.',
        },
      ],
    },
    {
      id: 'sharing-processors',
      title: '4. Data Sharing and Processors',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may share personal data with:',
        },
        {
          type: 'list',
          items: [
            'cloud infrastructure and hosting providers',
            'email service providers and communication tools',
            'analytics and logging providers',
            'subcontractors and collaborators assisting in the provision of the Service',
            'professional advisers (e.g., legal, accounting) when strictly necessary',
          ],
        },
        {
          type: 'paragraph',
          text: 'These third parties act as data processors or sub-processors and are subject to contractual obligations of confidentiality, data protection and security.',
        },
        {
          type: 'paragraph',
          text: 'An up-to-date list of our main processors and sub-processors, including their role and location, may be made available to Clients (e.g., via our website or upon request).',
        },
        {
          type: 'paragraph',
          text: 'We may also disclose data where necessary to comply with a legal obligation or a request from a competent authority.',
        },
      ],
    },
    {
      id: 'international-transfers',
      title: '5. International Transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Some of our service providers may be located outside the European Economic Area (EEA).',
        },
        {
          type: 'paragraph',
          text: 'In such cases, we will ensure that appropriate safeguards are in place, such as:',
        },
        {
          type: 'list',
          items: [
            'an adequacy decision by the European Commission, or',
            'Standard Contractual Clauses (SCCs) approved by the European Commission, or',
            'other mechanisms recognized by data protection law.',
          ],
        },
        {
          type: 'paragraph',
          text: `You may obtain more information about international transfers and the applicable safeguards by contacting us at the email indicated above (${LEGAL_PUBLIC_CONTACT_EN.email}).`,
        },
      ],
    },
    {
      id: 'retention',
      title: '6. Data Retention',
      blocks: [
        {
          type: 'paragraph',
          text: 'We retain personal data only for as long as necessary to fulfil the purposes described above and to comply with legal obligations.',
        },
        { type: 'paragraph', text: 'In particular:' },
        {
          type: 'list',
          items: [
            'Client and contract data: for the duration of the contractual relationship and for up to six (6) years after its end, in order to comply with tax and commercial law and to address potential liabilities.',
            'Contact forms and pre-contract enquiries: for the time necessary to handle the request and for up to twelve (12) months for reasonable follow-up, unless a contractual relationship is established.',
            'Marketing data (email, preferences): until you withdraw your consent or object to receiving marketing communications, and in any case subject to periodic review and deletion of inactive contacts.',
            TECH_LOG_RETENTION,
          ],
        },
        {
          type: 'paragraph',
          text: 'Once the retention periods have expired, data will be deleted or anonymised, unless their conservation is required by law.',
        },
      ],
    },
    {
      id: 'automated-processing',
      title: '7. Automated Processing and Profiling',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may use automated systems and tools (including AI-based tools) to analyse information and generate insights and recommendations within the scope of the Service.',
        },
        {
          type: 'paragraph',
          text: 'These tools do not involve automated decision-making that produces legal effects or significantly affects individuals in the sense of Article 22 GDPR; any important decisions are ultimately taken by humans (you and your team).',
        },
      ],
    },
    {
      id: 'user-rights',
      title: '8. User Rights / Derechos de los interesados',
      blocks: [
        {
          type: 'paragraph',
          text: 'Under the GDPR and applicable national law, you have the following rights:',
        },
        {
          type: 'list',
          items: [
            'right of access to your personal data',
            'right to rectification of inaccurate or incomplete data',
            'right to erasure ("right to be forgotten") in the cases provided by law',
            'right to restriction of processing in certain circumstances',
            'right to data portability, where legally applicable',
            'right to object to processing based on legitimate interest or direct marketing',
            'right not to be subject to decisions based solely on automated processing where the legal requirements are met',
          ],
        },
        {
          type: 'paragraph',
          text: `You may exercise these rights by sending a request to: ${LEGAL_PUBLIC_CONTACT_EN.email}, clearly indicating the right you wish to exercise and providing sufficient information to verify your identity.`,
        },
        {
          type: 'paragraph',
          text: 'You also have the right to lodge a complaint with the Spanish Data Protection Authority (Agencia Española de Protección de Datos, www.aepd.es) if you consider that the processing of your personal data infringes data protection regulations.',
        },
      ],
    },
    {
      id: 'consent',
      title: '9. Consent and Its Withdrawal',
      blocks: [
        {
          type: 'paragraph',
          text: 'Where processing is based on your consent (for example, for marketing or certain types of cookies), such consent is freely given, specific, informed and unambiguous.',
        },
        {
          type: 'paragraph',
          text: 'You may withdraw your consent at any time, without affecting the lawfulness of processing based on consent before its withdrawal.',
        },
        {
          type: 'paragraph',
          text: 'For marketing emails, you can withdraw consent by using the "unsubscribe" link included in each communication or by contacting us at the above email.',
        },
      ],
    },
    {
      id: 'cookies',
      title: '10. Cookies and Tracking Technologies',
      blocks: [
        {
          type: 'paragraph',
          text: `We may use cookies and similar technologies on our website. Detailed information on the types of cookies used, their purposes and configuration options is provided in our Cookies Policy (${LEGAL_DOCUMENT_SPA_ROUTES.cookiePolicy}).`,
        },
        {
          type: 'paragraph',
          text: 'You can manage your preferences and, where required, give or withdraw your consent through the cookie banner or settings panel.',
        },
      ],
    },
    {
      id: 'security',
      title: '11. Security Measures',
      blocks: [
        {
          type: 'paragraph',
          text: 'We implement appropriate technical and organizational measures designed to protect personal data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure or access.',
        },
        {
          type: 'paragraph',
          text: 'These measures are proportionate to the risks and take into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing.',
        },
      ],
    },
    {
      id: 'changes',
      title: '12. Changes to This Policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this Privacy Policy from time to time.',
        },
        {
          type: 'paragraph',
          text: 'Any material changes will be communicated by appropriate means (for example, via the website). The "Last updated" date at the top of this Policy will indicate the effective date of the latest version.',
        },
      ],
    },
    {
      id: 'contact',
      title: '13. Contact',
      blocks: [
        {
          type: 'paragraph',
          text: 'For any questions, requests or claims regarding this Privacy Policy or the processing of your personal data, you can contact:',
        },
        {
          type: 'paragraph',
          text: `${LEGAL_PUBLIC_CONTACT_EN.controllerDisplayName}\nEmail: ${LEGAL_PUBLIC_CONTACT_EN.email}\nPostal address: ${LEGAL_PUBLIC_CONTACT_EN.addressSingleLine}`,
        },
      ],
    },
  ] as const satisfies readonly PrivacySection[],
} as const;
