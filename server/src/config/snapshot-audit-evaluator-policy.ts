/**
 * Snapshot audit evaluator patterns and diagnostic evidence strings.
 * Numeric thresholds live in `SYSTEM_DEFAULTS.snapshotAudit.evaluatorThresholds`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

export const SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS = SYSTEM_DEFAULTS.snapshotAudit.evaluatorThresholds;

/** Compiled regex used by hero / CTA / contact / pricing / schema heuristics. */
export const SNAPSHOT_AUDIT_EVALUATOR_REGEX = {
  serviceWords:
    /\b(services?|solutions?|software|consulting|agency|clinic|law|dental|design|marketing|seo|build|sell|shop|book|appointment|treatment|legal|advice|platform|app|product|pricing|plans?)\b/i,
  strongCta:
    /(book|schedule|request|get quote|get started|start free|try|demo|contact us|call|buy|add to cart|checkout|subscribe)/i,
  contactNavHints: /contact|call|phone|email|reach|visit/,
  contactSlugHints: /contact|locations?|visit/i,
  pricingNavHints: /pricing|plans?|packages|quote|subscribe/i,
  pricingSlugHints: /pricing|plans?|quote|buy|cart|checkout/i,
  reassuranceLanguage:
    /money-back|money back|guarantee|full refund|refund policy|warranty|risk-free|risk free|no risk/i,
  organizationSchemaType:
    /organization|localbusiness|corporation|store|dentist|medicalbusiness|attorney|legalservice|professional/,
  faqOrArticleSchemaTypes: /faqpage|article|breadcrumb|howto|qapage/,
  websiteOrWebpageSchema: /\bwebsite\b|\bwebpage\b/,
  productOfferServiceSchema: /product|offer|aggregateoffer|service\b/,
  howToCreativeSchema: /howto|speakable|creativework|recipe/,
  reviewRatingSchema: /review|aggregaterating|rating\b/,
  supplementalRichSchema:
    /softwareapplication|mobileapplication|dataset|jobposting|event|course|videoobject|podcast/,
  absoluteHttpUrl: /^https?:\/\//i,
} as const;

/** Evidence log lines when a rule is skipped as N/A. */
export const SNAPSHOT_AUDIT_EVALUATOR_EVIDENCE = {
  formFrictionNoPrimaryForm: 'no primary form — N/A scored as pass for friction',
  formLabelsNoForm: 'no form — labels N/A',
  imageAltNoImages: 'no images in sampled HTML',
} as const;
