import type { RuleResult, SnapshotFacts } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import * as contactTrustFaq from './contact-trust-faq.js';
import * as contentStructure from './content-structure.js';
import * as formsPricingConversion from './forms-pricing-conversion.js';
import * as heroCta from './hero-cta.js';
import * as schema from './schema.js';
import * as seoMetaCrawl from './seo-meta-crawl.js';

export type SnapshotAuditEvaluatorFn = (facts: SnapshotFacts, rule: AuditRuleRow) => RuleResult;

/** Alphabetical registry — keys must match `evaluator` in `audit-rules.v1.yaml`. */
export const SNAPSHOT_AUDIT_EVALUATOR_REGISTRY: Record<string, SnapshotAuditEvaluatorFn> = {
  bodyContentDepth: contentStructure.bodyContentDepth,
  canonicalHealthy: seoMetaCrawl.canonicalHealthy,
  contactDiscoverable: contactTrustFaq.contactDiscoverable,
  conversionContextDepth: formsPricingConversion.conversionContextDepth,
  ctaNoiseLevel: heroCta.ctaNoiseLevel,
  faqOrArticleSchema: schema.faqOrArticleSchema,
  faqOrObjections: contactTrustFaq.faqOrObjections,
  formFriction: formsPricingConversion.formFriction,
  formLabelsPresent: formsPricingConversion.formLabelsPresent,
  h1ServiceIntent: heroCta.h1ServiceIntent,
  heroPrimaryCta: heroCta.heroPrimaryCta,
  howToOrCreativeSchema: schema.howToOrCreativeSchema,
  htmlLangDeclared: contentStructure.htmlLangDeclared,
  httpsHomepage: seoMetaCrawl.httpsHomepage,
  imageAltCoverage: seoMetaCrawl.imageAltCoverage,
  metaDescriptionUseful: seoMetaCrawl.metaDescriptionUseful,
  navBreadth: contentStructure.navBreadth,
  openGraphBasics: seoMetaCrawl.openGraphBasics,
  organizationSchema: schema.organizationSchema,
  pricingPathDiscoverable: formsPricingConversion.pricingPathDiscoverable,
  primaryCtaStrong: heroCta.primaryCtaStrong,
  processStepsVisible: contactTrustFaq.processStepsVisible,
  productOrOfferSchema: schema.productOrOfferSchema,
  publicIndexableHome: seoMetaCrawl.publicIndexableHome,
  reassuranceLanguage: contactTrustFaq.reassuranceLanguage,
  reviewOrRatingSchema: schema.reviewOrRatingSchema,
  schemaTypeBreadth: schema.schemaTypeBreadth,
  structuredDataShape: schema.structuredDataShape,
  subheadingSupport: contentStructure.subheadingSupport,
  supplementalAiEntitySchema: schema.supplementalAiEntitySchema,
  supportingCopyDepth: contentStructure.supportingCopyDepth,
  titlePresent: seoMetaCrawl.titlePresent,
  trustBlocksPresent: contactTrustFaq.trustBlocksPresent,
  trustNearConversion: formsPricingConversion.trustNearConversion,
  viewportMetaPresent: seoMetaCrawl.viewportMetaPresent,
  websiteSchema: schema.websiteSchema,
};
