/**
 * Website-standard commercial defaults referenced from legal copy (e.g. payment terms).
 * Bespoke client agreements may override; this layer avoids magic numbers in prose modules.
 */
export const LEGAL_CONTRACT_DEFAULTS = {
  /** Net days from invoice date unless the order or agreement states otherwise. */
  invoicePaymentDaysFromIssue: 30,
  /**
   * Default maximum retention window for routine technical and log data (website / app),
   * unless a longer period is required for security incidents or investigations.
   */
  technicalLogRetentionMonths: 12,
} as const;

/** Statutory and marketing legal pages: controller identity (Spain). */
export const LEGAL_PUBLIC_CONTACT_EN = {
  controllerDisplayName: 'Alena Dziadkova (GLC)',
  nif: 'Z3331966F',
  email: 'alena.dziadkova@glctech.es',
  /** Single-line postal address (English order; matches Aviso Legal). */
  addressSingleLine: 'C/ Francesc Suau 13, 2º 2B, 07010, Palma de Mallorca, Illes Balears, Spain',
} as const;

/** Display string for the Terms “Last updated” line (align with counsel publication date). */
export const TERMS_DOCUMENT_LAST_UPDATED_EN = '20 April 2026' as const;

/** Display string for the Privacy Policy “Last updated” line. */
export const PRIVACY_DOCUMENT_LAST_UPDATED_EN = '21 April 2026' as const;

/** Display string for the Cookies Policy “Last updated” line. */
export const COOKIES_DOCUMENT_LAST_UPDATED_EN = '22 April 2026' as const;

/** Display string for the DPA “Last updated” line (website template). */
export const DPA_DOCUMENT_LAST_UPDATED_EN = '23 April 2026' as const;
