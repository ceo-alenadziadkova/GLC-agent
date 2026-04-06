import type { RuleResult, SnapshotFacts, SnapshotAuditCategory } from '../types.js';
import type { AuditRuleRow } from './parse-audit-rules.js';
import { getHeroPrimaryCtaCount, getGenericMarketingHero } from '../extract-facts.js';

type Status = RuleResult['status'];

function scoreStatus(max: number, status: Status): number {
  if (status === 'pass') return max;
  if (status === 'partial') return max * 0.5;
  return 0;
}

const SERVICE_WORDS =
  /\b(services?|solutions?|software|consulting|agency|clinic|law|dental|design|marketing|seo|build|sell|shop|book|appointment|treatment|legal|advice|platform|app|product|pricing|plans?)\b/i;

function h1ServiceIntent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const h1 = facts.siteText.h1.trim();
  let status: Status = 'fail';
  if (!h1) status = 'fail';
  else if (facts.siteText.h1Count > 1) status = 'partial';
  else if (getGenericMarketingHero(facts) && !SERVICE_WORDS.test(h1)) status = 'partial';
  else if (SERVICE_WORDS.test(h1) && h1.length > 8) status = 'pass';
  else if (h1.length > 12) status = 'partial';
  else status = 'fail';

  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`h1Count=${facts.siteText.h1Count}`, `h1Len=${h1.length}`, `genericHero=${getGenericMarketingHero(facts)}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function heroPrimaryCta(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = getHeroPrimaryCtaCount(facts);
  let status: Status = 'fail';
  if (n >= 1) status = 'pass';
  else if (facts.siteText.ctaTexts.length > 0) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`heroIntentCtas=${n}`, `ctaTexts=${facts.siteText.ctaTexts.length}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function contactDiscoverable(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const navBlob = facts.siteText.navItems.join(' ').toLowerCase();
  const hasContactNav = /contact|call|phone|email|reach|visit/.test(navBlob);
  const ok =
    facts.contact.phonePresent ||
    facts.contact.emailPresent ||
    hasContactNav ||
    facts.urls.slugs.some(s => /contact|locations?|visit/i.test(s));
  let status: Status = ok ? 'pass' : 'fail';
  if (ok && !facts.contact.phonePresent && !facts.contact.emailPresent) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [
      `phone=${facts.contact.phonePresent}`,
      `email=${facts.contact.emailPresent}`,
      `contactNav=${hasContactNav}`,
    ],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function trustBlocksPresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.blocks.testimonialLike || facts.blocks.pricingMention;
  let status: Status = ok ? 'pass' : 'fail';
  if (facts.blocks.testimonialLike && !facts.blocks.pricingMention) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`testimonialLike=${facts.blocks.testimonialLike}`, `pricingMention=${facts.blocks.pricingMention}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

const STRONG_CTA = /(book|schedule|request|get quote|get started|start free|try|demo|contact us|call|buy|add to cart|checkout|subscribe)/i;

function primaryCtaStrong(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ctas = facts.siteText.ctaTexts;
  const strong = ctas.some(t => STRONG_CTA.test(t));
  let status: Status = 'fail';
  if (strong) status = 'pass';
  else if (ctas.length > 0) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`ctaCount=${ctas.length}`, `strong=${strong}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function formFriction(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  if (!facts.forms.present) {
    return {
      id: rule.id,
      category: rule.category as SnapshotAuditCategory,
      status: 'pass',
      score: rule.maxPoints,
      maxScore: rule.maxPoints,
      evidence: ['no primary form — N/A scored as pass for friction'],
      impactTier: rule.impactTier,
    };
  }
  const f = facts.forms.primaryFieldCount;
  const r = facts.forms.primaryRequiredCount;
  let status: Status = 'pass';
  if (f > 8 || r > 5) status = 'fail';
  else if (f > 5 || r > 3) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`fields=${f}`, `required=${r}`, `labels=${facts.forms.primaryHasLabels}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function trustNearConversion(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const trust = facts.blocks.testimonialLike || facts.blocks.faqLike || facts.blocks.pricingMention;
  const conv = facts.forms.present || getHeroPrimaryCtaCount(facts) > 0 || facts.siteText.ctaTexts.length > 0;
  let status: Status = 'fail';
  if (trust && conv) status = 'pass';
  else if (trust || conv) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`trustSignals=${trust}`, `conversionSignals=${conv}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function faqOrObjections(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.blocks.faqLike;
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`faqLike=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function organizationSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const types = facts.schema.types.map(t => t.toLowerCase());
  const ok = types.some(t =>
    /organization|localbusiness|corporation|store|dentist|medicalbusiness|attorney|legalservice|professional/.test(t),
  );
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`schemaTypes=${facts.schema.types.slice(0, 6).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function faqOrArticleSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const types = facts.schema.types.join(' ').toLowerCase();
  const ok = /faqpage|article|breadcrumb|howto|qapage/.test(types);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`schema=${facts.schema.types.slice(0, 8).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function metaDescriptionUseful(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const d = facts.siteText.metaDescription.trim();
  let status: Status = 'fail';
  if (d.length >= 40 && d.length <= 170) status = 'pass';
  else if (d.length >= 25 && d.length < 40) status = 'partial';
  else if (d.length > 170 && d.length <= 320) status = 'partial';
  else if (d.length > 0 && d.length < 25) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`metaDescriptionLen=${d.length}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function viewportMetaPresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.meta.viewportPresent;
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`viewportPresent=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function imageAltCoverage(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const total = facts.images.total;
  if (total === 0) {
    return {
      id: rule.id,
      category: rule.category as SnapshotAuditCategory,
      status: 'pass',
      score: rule.maxPoints,
      maxScore: rule.maxPoints,
      evidence: ['no images in sampled HTML'],
      impactTier: rule.impactTier,
    };
  }
  const ratio = facts.images.withAlt / total;
  let status: Status = 'fail';
  if (ratio >= 0.85) status = 'pass';
  else if (ratio >= 0.45) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`images=${total}`, `withAlt=${facts.images.withAlt}`, `ratio=${ratio.toFixed(2)}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function publicIndexableHome(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blocked = facts.meta.hasNoindex;
  const status: Status = blocked ? 'fail' : 'pass';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`robotsMeta=${facts.meta.robotsMeta.slice(0, 80)}`, `hasNoindex=${blocked}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function titlePresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const t = facts.siteText.title.trim();
  let status: Status = 'fail';
  if (t.length >= 15 && t.length <= 70) status = 'pass';
  else if (t.length >= 5) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`titleLen=${t.length}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function canonicalHealthy(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const c = facts.meta.canonical.trim();
  const home = facts.site.homepageUrl.replace(/\/$/, '');
  let status: Status = 'fail';
  if (!c) status = 'fail';
  else if (c.replace(/\/$/, '') === home || c.replace(/\/$/, '') === `${home}/`) status = 'pass';
  else if (/^https?:\/\//i.test(c)) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`canonical=${c.slice(0, 120)}`, `home=${home}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function subheadingSupport(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.siteText.h2Texts.length;
  let status: Status = 'fail';
  if (n >= 2) status = 'pass';
  else if (n === 1) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`h2Count=${n}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function navBreadth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.siteText.navItems.length;
  let status: Status = 'fail';
  if (n >= 5) status = 'pass';
  else if (n >= 2) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`navItems=${n}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function supportingCopyDepth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ps = facts.siteText.topParagraphs;
  const totalLen = ps.join(' ').length;
  let status: Status = 'fail';
  if (ps.length >= 2 && totalLen >= 120) status = 'pass';
  else if (totalLen >= 60) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`paragraphs=${ps.length}`, `sampleLen=${totalLen}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function htmlLangDeclared(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const lang = facts.document.lang?.trim() ?? '';
  const ok = lang.length >= 2;
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`declaredLang=${lang || 'none'}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function bodyContentDepth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const len = facts.siteText.bodyTextSample.length;
  let status: Status = 'fail';
  if (len >= 800) status = 'pass';
  else if (len >= 350) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`bodyTextLen=${len}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function ctaNoiseLevel(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const hero = getHeroPrimaryCtaCount(facts);
  const total = facts.siteText.ctaTexts.length;
  let status: Status = 'fail';
  if (hero <= 1 && total <= 8) status = 'pass';
  else if (hero <= 2 && total <= 14) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`heroCtas=${hero}`, `ctaTexts=${total}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function formLabelsPresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  if (!facts.forms.present) {
    return {
      id: rule.id,
      category: rule.category as SnapshotAuditCategory,
      status: 'pass',
      score: rule.maxPoints,
      maxScore: rule.maxPoints,
      evidence: ['no form — labels N/A'],
      impactTier: rule.impactTier,
    };
  }
  const ok = facts.forms.primaryHasLabels;
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`hasLabels=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function pricingPathDiscoverable(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const nav = facts.siteText.navItems.join(' ').toLowerCase();
  const slugBlob = facts.urls.slugs.join(' ');
  const ok =
    /pricing|plans?|packages|quote|subscribe/i.test(nav) ||
    /pricing|plans?|quote|buy|cart|checkout/i.test(slugBlob);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`pricingPathHints=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function processStepsVisible(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.blocks.processLike;
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`processLike=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function reassuranceLanguage(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const t = facts.siteText.bodyTextSample.toLowerCase();
  const ok =
    /money-back|money back|guarantee|full refund|refund policy|warranty|risk-free|risk free|no risk/i.test(t);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`reassuranceCue=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function conversionContextDepth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const meaty = facts.siteText.topParagraphs.filter(p => p.length > 55).length;
  let status: Status = 'fail';
  if (meaty >= 2) status = 'pass';
  else if (meaty === 1) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`substantiveParagraphs=${meaty}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function websiteSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = /\bwebsite\b|\bwebpage\b/.test(blob);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`types=${facts.schema.types.slice(0, 6).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function productOrOfferSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = /product|offer|aggregateoffer|service\b/.test(blob);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`types=${facts.schema.types.slice(0, 8).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function howToOrCreativeSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = /howto|speakable|creativework|recipe/.test(blob);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`types=${facts.schema.types.slice(0, 8).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function reviewOrRatingSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = /review|aggregaterating|rating\b/.test(blob);
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`types=${facts.schema.types.slice(0, 8).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function schemaTypeBreadth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.schema.types.length;
  let status: Status = 'fail';
  if (n >= 4) status = 'pass';
  else if (n >= 2) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`typeCount=${n}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function supplementalAiEntitySchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const rich =
    /softwareapplication|mobileapplication|dataset|jobposting|event|course|videoobject|podcast/.test(blob);
  let status: Status = 'fail';
  if (rich) status = 'pass';
  else if (facts.schema.types.length > 0) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`types=${facts.schema.types.slice(0, 10).join(',')}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function httpsHomepage(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.site.homepageUrl.startsWith('https:');
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`homepage=${facts.site.homepageUrl.slice(0, 80)}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function openGraphBasics(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.meta.openGraphTitlePresent;
  const status: Status = ok ? 'pass' : 'fail';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`ogTitlePresent=${ok}`],
    issueKey: status === 'fail' ? rule.issueKey : undefined,
    quickWinKey: status === 'fail' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

function structuredDataShape(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.schema.types.length;
  let status: Status = 'fail';
  if (n >= 2) status = 'pass';
  else if (n === 1) status = 'partial';
  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status,
    score: scoreStatus(rule.maxPoints, status),
    maxScore: rule.maxPoints,
    evidence: [`jsonLdTypeCount=${n}`],
    issueKey: status !== 'pass' ? rule.issueKey : undefined,
    quickWinKey: status !== 'pass' ? rule.quickWinKey : undefined,
    impactTier: rule.impactTier,
  };
}

const registry: Record<string, (facts: SnapshotFacts, rule: AuditRuleRow) => RuleResult> = {
  bodyContentDepth,
  canonicalHealthy,
  contactDiscoverable,
  conversionContextDepth,
  ctaNoiseLevel,
  faqOrArticleSchema,
  faqOrObjections,
  formFriction,
  formLabelsPresent,
  h1ServiceIntent,
  heroPrimaryCta,
  howToOrCreativeSchema,
  htmlLangDeclared,
  httpsHomepage,
  imageAltCoverage,
  metaDescriptionUseful,
  navBreadth,
  openGraphBasics,
  organizationSchema,
  pricingPathDiscoverable,
  primaryCtaStrong,
  processStepsVisible,
  productOrOfferSchema,
  publicIndexableHome,
  reassuranceLanguage,
  reviewOrRatingSchema,
  schemaTypeBreadth,
  structuredDataShape,
  subheadingSupport,
  supplementalAiEntitySchema,
  supportingCopyDepth,
  titlePresent,
  trustBlocksPresent,
  trustNearConversion,
  viewportMetaPresent,
  websiteSchema,
};

/** Evaluator names registered in code — YAML `evaluator` must reference one of these. */
export const SNAPSHOT_AUDIT_EVALUATOR_NAMES = Object.freeze(Object.keys(registry));

export function runEvaluator(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const fn = registry[rule.evaluator];
  if (!fn) {
    throw new Error(`Unknown snapshot evaluator: ${rule.evaluator}`);
  }
  return fn(facts, rule);
}
