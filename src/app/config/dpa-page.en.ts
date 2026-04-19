import { DPA_DOCUMENT_LAST_UPDATED_EN, LEGAL_PUBLIC_CONTACT_EN } from './legal-contract-defaults';
import { LEGAL_DOC_PAGES_EN } from './legal-doc-pages-copy.en';

export type DpaBlock =
  | { readonly type: 'paragraph'; text: string }
  | { readonly type: 'list'; items: readonly string[] };

export type DpaSection = {
  readonly id: string;
  /** Omit for preamble blocks before numbered sections. */
  readonly title?: string;
  readonly blocks: readonly DpaBlock[];
};

const PROCESSOR_PARTY = `(2) GLC (Processor)
Name: Alena Dziadkova (trading as "GLC")
NIF: ${LEGAL_PUBLIC_CONTACT_EN.nif}
Address: ${LEGAL_PUBLIC_CONTACT_EN.addressSingleLine}
Email: ${LEGAL_PUBLIC_CONTACT_EN.email}
(hereinafter the "Processor")`;

const CLIENT_PARTY = `(1) Client (Controller)
Name: [CLIENT LEGAL NAME]
Registered address: [CLIENT ADDRESS]
VAT / NIF: [CLIENT TAX ID]
(hereinafter the "Controller")`;

export const DPA_PAGE_EN = {
  documentTitle: 'Data Processing Agreement | GLC',
  htmlLang: 'en' as const,
  titlePrimary: 'Data Processing Agreement (DPA)',
  titleSecondary: 'Contrato de Encargo de Tratamiento',
  lastUpdatedLabel: 'Last updated',
  lastUpdatedValue: DPA_DOCUMENT_LAST_UPDATED_EN,
  backToLogin: LEGAL_DOC_PAGES_EN.backToLogin,
  footerPrivacyLinkLabel: 'Privacy Policy',
  footerLinkSeparator: ' · ',
  sections: [
    {
      id: 'preamble',
      blocks: [
        {
          type: 'paragraph',
          text: 'This Data Processing Agreement ("DPA") forms part of the agreement for services (the "Principal Agreement") between:',
        },
        { type: 'paragraph', text: CLIENT_PARTY },
        { type: 'paragraph', text: 'and' },
        { type: 'paragraph', text: PROCESSOR_PARTY },
        {
          type: 'paragraph',
          text: 'Controller and Processor are collectively referred to as the "Parties".',
        },
      ],
    },
    {
      id: 'subject-matter',
      title: '1. Subject-Matter, Nature and Purpose of Processing',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Processor will process personal data on behalf of the Controller in order to provide the consulting, audit, analysis and related services described in the Principal Agreement.',
        },
        {
          type: 'paragraph',
          text: 'The nature of the processing may include collection, recording, organisation, structuring, storage, consultation, analysis, pseudonymisation, and deletion of personal data.',
        },
        {
          type: 'paragraph',
          text: 'The purpose of the processing is to perform business and technical audits, generate reports, roadmaps and recommendations, and provide follow-up support as agreed with the Controller.',
        },
      ],
    },
    {
      id: 'duration',
      title: '2. Duration',
      blocks: [
        {
          type: 'paragraph',
          text: 'This DPA shall apply for the duration of the Principal Agreement and any additional period during which the Processor processes personal data on behalf of the Controller (e.g., retention, deletion, export).',
        },
        {
          type: 'paragraph',
          text: 'Upon termination of the Principal Agreement, the Processor shall delete or return the personal data as specified in Section 10.',
        },
      ],
    },
    {
      id: 'categories',
      title: '3. Categories of Data Subjects and Personal Data',
      blocks: [
        {
          type: 'paragraph',
          text: 'The processing may concern the following categories of data subjects:',
        },
        {
          type: 'list',
          items: [
            'employees, contractors and collaborators of the Controller',
            'clients, users or customers of the Controller',
            'other contact persons or individuals whose data are included in the materials provided by the Controller',
          ],
        },
        {
          type: 'paragraph',
          text: 'The categories of personal data may include:',
        },
        {
          type: 'list',
          items: [
            'identification and contact data (name, email, role, phone, organisation)',
            'professional and organisational data (position, department, responsibilities)',
            'usage and technical data derived from digital assets (e.g., logs, analytics), where such data relate to identifiable individuals',
            'any other categories of data included in the systems and documentation provided by the Controller to the Processor, excluding special categories of data unless expressly agreed in writing.',
          ],
        },
        {
          type: 'paragraph',
          text: 'The Controller shall not provide special categories of personal data (Article 9 GDPR) or data relating to criminal convictions (Article 10 GDPR) unless the Parties expressly agree otherwise in writing and specify appropriate safeguards.',
        },
      ],
    },
    {
      id: 'processor-obligations',
      title: '4. Obligations of the Processor',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Processor undertakes to:',
        },
        {
          type: 'list',
          items: [
            'a) Process personal data only on documented instructions from the Controller, including with regard to transfers of personal data to a third country, unless required to do so by Union or Member State law. In such a case, the Processor shall inform the Controller of that legal requirement before processing, unless the law prohibits such information.',
            'b) Ensure that persons authorised to process personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.',
            'c) Implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, as required by Article 32 GDPR.',
            'd) Assist the Controller, insofar as possible and taking into account the nature of processing, by appropriate technical and organisational measures, in fulfilling the Controller\'s obligation to respond to requests for exercising data subjects\' rights.',
            'e) Assist the Controller in ensuring compliance with obligations pursuant to Articles 32 to 36 GDPR (security, breach notification, data protection impact assessments), taking into account the nature of processing and the information available to the Processor.',
            'f) Inform the Controller without undue delay after becoming aware of a personal data breach affecting personal data processed on behalf of the Controller, providing the information reasonably required for the Controller to comply with its legal obligations.',
            'g) Make available to the Controller all information necessary to demonstrate compliance with the obligations laid down in Article 28 GDPR and allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller, under reasonable notice and conditions to avoid disproportionate disruption.',
          ],
        },
      ],
    },
    {
      id: 'controller-obligations',
      title: '5. Obligations of the Controller',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Controller is responsible for:',
        },
        {
          type: 'list',
          items: [
            'determining the purposes and means of processing,',
            'ensuring that it has a valid legal basis for all processing operations and for the transfer of personal data to the Processor,',
            'informing data subjects as required by Articles 13 and 14 GDPR,',
            'maintaining an accurate record of processing activities.',
          ],
        },
        {
          type: 'paragraph',
          text: 'The Controller shall provide the Processor with documented instructions, and shall not instruct the Processor to perform any processing that would infringe applicable data protection law.',
        },
      ],
    },
    {
      id: 'sub-processing',
      title: '6. Sub-Processing',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Controller hereby grants the Processor a general authorisation to engage sub-processors for the provision of the services (e.g., hosting, storage, email, analytics, AI providers).',
        },
        {
          type: 'paragraph',
          text: 'The Processor shall:',
        },
        {
          type: 'list',
          items: [
            'maintain an up-to-date list of sub-processors, available to the Controller upon request or via its website,',
            'inform the Controller of any intended changes concerning the addition or replacement of sub-processors, thereby giving the Controller the opportunity to object on reasonable data protection grounds,',
            'ensure that the same data protection obligations as set out in this DPA are imposed on each sub-processor by way of a contract.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Where a sub-processor fails to fulfil its data protection obligations, the Processor shall remain fully liable to the Controller for the performance of that sub-processor\'s obligations.',
        },
      ],
    },
    {
      id: 'international-transfers',
      title: '7. International Transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'If the Processor or its sub-processors process personal data outside the EEA, the Processor shall ensure that such transfers are made in compliance with Chapter V GDPR, for example by:',
        },
        {
          type: 'list',
          items: [
            'relying on an adequacy decision, or',
            'entering into Standard Contractual Clauses with the relevant recipients.',
          ],
        },
        {
          type: 'paragraph',
          text: 'The Processor shall provide information on the applicable transfer mechanisms upon the Controller\'s request.',
        },
      ],
    },
    {
      id: 'security',
      title: '8. Security Measures',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Processor shall implement and maintain appropriate technical and organisational security measures, which may include, as appropriate:',
        },
        {
          type: 'list',
          items: [
            'pseudonymisation and encryption of personal data',
            'measures to ensure ongoing confidentiality, integrity, availability and resilience',
            'procedures for regular testing and evaluation of the effectiveness of technical and organisational measures',
            'measures to ensure the ability to restore availability and access to personal data in a timely manner in the event of a physical or technical incident',
            'access control and least-privilege principles for personnel and systems.',
          ],
        },
        {
          type: 'paragraph',
          text: 'A high-level description of the current security measures may be provided in an annex to this DPA.',
        },
      ],
    },
    {
      id: 'data-subject-requests',
      title: '9. Data Subject Requests',
      blocks: [
        {
          type: 'paragraph',
          text: 'Taking into account the nature of the processing, the Processor shall assist the Controller by appropriate technical and organisational measures, as far as possible, for the fulfilment of the Controller\'s obligation to respond to requests for exercising data subject rights.',
        },
        {
          type: 'paragraph',
          text: 'If the Processor receives a request directly from a data subject relating to personal data processed on behalf of the Controller, it shall promptly forward the request to the Controller and shall not respond to it directly unless authorized by the Controller.',
        },
      ],
    },
    {
      id: 'return-deletion',
      title: '10. Return and Deletion of Data',
      blocks: [
        {
          type: 'paragraph',
          text: 'Upon termination of the Principal Agreement or upon the Controller\'s written request, the Processor shall, at the choice of the Controller:',
        },
        {
          type: 'list',
          items: [
            'return all personal data processed on behalf of the Controller, or',
            'delete such data, except where Union or Member State law requires storage.',
          ],
        },
        {
          type: 'paragraph',
          text: 'The Processor may retain evidence of deletion and minimal logs strictly necessary to demonstrate compliance and handle potential legal claims, for the period allowed by law.',
        },
      ],
    },
    {
      id: 'priority',
      title: '11. Priority',
      blocks: [
        {
          type: 'paragraph',
          text: 'In the event of any conflict between the terms of this DPA and the Principal Agreement with respect to the processing of personal data, the terms of this DPA shall prevail.',
        },
      ],
    },
    {
      id: 'governing-law',
      title: '12. Governing Law and Jurisdiction',
      blocks: [
        {
          type: 'paragraph',
          text: 'This DPA shall be governed by and construed in accordance with the laws of Spain.',
        },
        {
          type: 'paragraph',
          text: 'Any disputes arising out of or in connection with this DPA shall be submitted to the jurisdiction established in the Principal Agreement.',
        },
      ],
    },
  ] as const satisfies readonly DpaSection[],
} as const;
