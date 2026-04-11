/**
 * Rule-based site profile from SnapshotFacts (no LLM).
 */
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { logger } from '../../services/logger.js';
import type { SiteProfile, SnapshotFacts } from '../types.js';
import { getClassificationRules, type SignalDef } from './parse-rules.js';
import { getGenericMarketingHero } from '../extract-facts.js';

export interface SiteProfileDebug {
  matchedSignals: string[];
  /** Signals from the winning site-type rule that did not match (JSON per signal). */
  rejectedSignals: string[];
  rejectedTop: string[];
  winningSiteTypeRule: string;
  winningIndustryRule: string;
  winningConversionRule: string;
  scoreTopTwoSiteTypes: [string, number][];
  /** Top two site types were within `tieDeltaThreshold` (classification may be unstable). */
  tieAmbiguous: boolean;
}

function norm(s: string): string {
  return s.toLowerCase();
}

function fieldText(facts: SnapshotFacts, field: string): string {
  const st = facts.siteText;
  switch (field) {
    case 'title':
      return st.title;
    case 'h1':
      return st.h1;
    case 'metaDescription':
      return st.metaDescription;
    case 'bodyTextSample':
      return st.bodyTextSample;
    default:
      return '';
  }
}

function matchSignal(facts: SnapshotFacts, sig: SignalDef): boolean {
  switch (sig.kind) {
    case 'schemaTypeAny': {
      const types = new Set(facts.schema.types.map(t => norm(t)));
      return sig.types.some(t => types.has(norm(t)));
    }
    case 'ctaSubstringAny': {
      const blob = facts.siteText.ctaTexts.join(' ').toLowerCase();
      return sig.substrings.some(s => blob.includes(s.toLowerCase()));
    }
    case 'techAny': {
      const plat = facts.tech.platforms.map(norm);
      return sig.names.some(n => plat.includes(norm(n)));
    }
    case 'slugAny': {
      const slugs = facts.urls.slugs.join(' ').toLowerCase();
      return sig.substrings.some(s => slugs.includes(s.toLowerCase()));
    }
    case 'keywordAny': {
      const parts = sig.fields.map(f => fieldText(facts, f).toLowerCase()).join(' ');
      return sig.substrings.some(s => parts.includes(s.toLowerCase()));
    }
    case 'contactAll': {
      const c = facts.contact;
      return sig.flags.every(f => c[f]);
    }
    case 'formPresent': {
      return facts.forms.present;
    }
    default:
      return false;
  }
}

function countMatches(facts: SnapshotFacts, signals: SignalDef[]): { count: number; matched: string[] } {
  const matched: string[] = [];
  for (const s of signals) {
    if (matchSignal(facts, s)) {
      matched.push(JSON.stringify(s));
    }
  }
  return { count: matched.length, matched };
}

function pickTaxon(
  facts: SnapshotFacts,
  items: { id: string; minMatch: number; signals: SignalDef[]; priority?: number }[],
  filter: (id: string) => boolean,
): { id: string; score: number; matched: string[] } {
  let best = { id: 'unknown', score: -1, matched: [] as string[] };
  for (const it of items) {
    if (it.id === 'unknown') continue;
    if (!filter(it.id)) continue;
    const { count, matched } = countMatches(facts, it.signals);
    if (count < it.minMatch) continue;
    const priority = it.priority ?? 0;
    const score = count * 100 + priority;
    if (score > best.score) {
      best = { id: it.id, score, matched };
    }
  }
  if (best.score < 0) {
    const unk = items.find(i => i.id === 'unknown');
    return { id: 'unknown', score: 0, matched: unk ? countMatches(facts, unk.signals).matched : [] };
  }
  return best;
}

function applyConfidenceCaps(
  band: 'high' | 'medium' | 'low',
  rules: ReturnType<typeof getClassificationRules>,
  facts: SnapshotFacts,
  tieAmbiguous: boolean,
): 'high' | 'medium' | 'low' {
  let max: 'high' | 'medium' | 'low' = 'high';
  if (facts.contentQuality === 'low') {
    max = rules.globalCaps.contentQualityLow;
  }
  if (tieAmbiguous) {
    const t = rules.globalCaps.tieAmbiguous;
    if (rank(t) < rank(max)) max = t;
  }
  if (facts.schema.types.length === 0 && facts.siteText.bodyTextSample.length < 400) {
    const t = rules.globalCaps.noSchemaThinText;
    if (rank(t) < rank(max)) max = t;
  }
  if (rank(band) > rank(max)) return max;
  return band;
}

function rank(b: 'high' | 'medium' | 'low'): number {
  if (b === 'high') return 3;
  if (b === 'medium') return 2;
  return 1;
}

/** Prefer `first` or `second` by tieBreakOrder; null if order does not resolve. */
function preferByTieOrder(
  firstId: string,
  secondId: string,
  order: string[] | undefined,
): 'first' | 'second' | null {
  if (!order?.length) return null;
  const i1 = order.indexOf(firstId);
  const i2 = order.indexOf(secondId);
  if (i1 === -1 && i2 === -1) return null;
  if (i1 === -1) return 'second';
  if (i2 === -1) return 'first';
  if (i1 < i2) return 'first';
  if (i2 < i1) return 'second';
  return null;
}

function numericToBand(n: number): 'high' | 'medium' | 'low' {
  if (n >= 0.72) return 'high';
  if (n >= 0.42) return 'medium';
  return 'low';
}

function audienceGuess(facts: SnapshotFacts): SiteProfile['audienceGuess'] {
  const blob = [
    facts.siteText.title,
    facts.siteText.h1,
    facts.siteText.metaDescription,
    facts.siteText.bodyTextSample.slice(0, 800),
  ]
    .join(' ')
    .toLowerCase();
  if (/\b(b2b|enterprise|businesses|for teams|for companies)\b/.test(blob)) return 'b2b';
  if (/\b(patients?|consumers?|shoppers?|families|guests)\b/.test(blob)) return 'b2c';
  return 'unknown';
}

export function runSiteProfile(
  facts: SnapshotFacts,
): { profile: SiteProfile; debug: SiteProfileDebug } {
  const rules = getClassificationRules();
  const supported = rules.supportedLangPrefixes;
  const lang = facts.document.lang?.toLowerCase().split('-')[0] ?? '';
  const langUnsupported = lang.length > 0 && !supported.some(p => lang === p || lang.startsWith(p));

  const siteTypeCandidates = rules.siteTypes.map(s => ({
    id: s.id,
    minMatch: s.minMatch,
    signals: s.signals,
    priority: s.priority,
  }));

  const scored = siteTypeCandidates
    .filter(s => s.id !== 'unknown')
    .map(s => {
      const { count, matched } = countMatches(facts, s.signals);
      return { id: s.id, count, matched, minMatch: s.minMatch, priority: s.priority ?? 0 };
    })
    .filter(s => s.count >= s.minMatch)
    .sort((a, b) => b.count * 100 + b.priority - (a.count * 100 + a.priority));

  const top = scored[0] ?? { id: 'unknown', count: 0, matched: [] as string[], minMatch: 0, priority: 0 };
  const second = scored[1] ?? { id: 'unknown', count: 0, matched: [] as string[], minMatch: 0, priority: 0 };

  let siteTypeId = top.id;
  let matchedSignals = [...top.matched];
  let tieAmbiguous = false;

  if (top.id !== 'unknown' && second.id !== 'unknown') {
    const delta = top.count - second.count;
    if (delta < rules.tieDeltaThreshold) {
      tieAmbiguous = true;
      const orderPick = preferByTieOrder(top.id, second.id, rules.tieBreakOrder);
      if (orderPick === 'second') {
        siteTypeId = second.id;
        matchedSignals = [...second.matched];
      } else if (orderPick === null && top.priority < second.priority) {
        siteTypeId = second.id;
        matchedSignals = [...second.matched];
      }
    }
  }

  if (top.id === 'unknown' || (scored.length === 0 && siteTypeId === 'unknown')) {
    siteTypeId = 'unknown';
    matchedSignals = [];
  }

  const industryPick = pickTaxon(
    facts,
    rules.industries.map(i => ({
      id: i.id,
      minMatch: i.minMatch,
      signals: i.signals,
      priority: i.priority,
    })),
    id => {
      const row = rules.industries.find(r => r.id === id);
      if (!row || id === 'unknown') return true;
      const parents = row.parentSiteTypes ?? [];
      if (parents.length === 0) return true;
      return parents.includes(siteTypeId);
    },
  );

  let industryId = industryPick.id;
  if (getGenericMarketingHero(facts) && industryId !== 'unknown') {
    const { count } = countMatches(facts, rules.industries.find(i => i.id === industryId)?.signals ?? []);
    if (count < 4) {
      industryId = 'unknown';
    }
  }

  const convPick = pickTaxon(
    facts,
    rules.conversionModels.map(c => ({
      id: c.id,
      minMatch: c.minMatch,
      signals: c.signals,
      priority: c.priority,
    })),
    () => true,
  );

  const strongSignals =
    (facts.schema.types.length > 0 ? 1 : 0) +
    (facts.siteText.ctaTexts.length > 0 ? 1 : 0) +
    (facts.urls.slugs.length > 1 ? 1 : 0) +
    (facts.siteText.navItems.length > 2 ? 1 : 0) +
    (facts.siteText.bodyTextSample.length > 500 ? 1 : 0);
  let confNum = Math.min(1, strongSignals / 5 + (industryId !== 'unknown' ? 0.15 : 0));
  if (langUnsupported) confNum *= 0.7;
  if (tieAmbiguous) confNum *= 0.85;

  let band = numericToBand(confNum);
  band = applyConfidenceCaps(band, rules, facts, tieAmbiguous);

  const offerSource =
    industryId === 'unknown'
      ? facts.siteText.h1 || facts.siteText.title || 'General web presence'
      : `${industryId.replace(/-/g, ' ')}-related services`;
  const primaryOffer = offerSource.slice(0, 120).trim();

  const shortParts: string[] = [];
  if (siteTypeId !== 'unknown') shortParts.push(siteTypeId.replace(/-/g, ' '));
  if (industryId !== 'unknown') shortParts.push(industryId.replace(/-/g, ' '));
  const shortLabel =
    shortParts.length > 0
      ? shortParts.join(' · ')
      : 'Website (limited automatic classification)';

  const orgName =
    facts.schema.types.some(t => /organization|localbusiness|store/i.test(t)) &&
    facts.siteText.title
      ? facts.siteText.title.split(/[|\-–]/)[0]?.trim() ?? null
      : facts.siteText.title
        ? facts.siteText.title.split(/[|\-–]/)[0]?.trim() ?? null
        : null;

  const locationGuess =
    facts.contact.addressPresent || facts.schema.types.some(t => /localbusiness|dentist/i.test(t))
      ? 'Location signals present (not geocoded)'
      : null;

  const winnerSiteTypeRow = rules.siteTypes.find(s => s.id === siteTypeId);
  const rejectedSignals =
    winnerSiteTypeRow && siteTypeId !== 'unknown'
      ? winnerSiteTypeRow.signals.filter(sig => !matchSignal(facts, sig)).map(s => JSON.stringify(s))
      : [];

  const profile: SiteProfile = {
    siteType: siteTypeId,
    industry: industryId,
    conversionModel: convPick.id,
    primaryOffer,
    shortLabel,
    audienceGuess: audienceGuess(facts),
    businessSignals: [
      ...facts.schema.types.slice(0, 4).map(t => `schema:${t}`),
      ...facts.tech.platforms.slice(0, 4).map(t => `tech:${t}`),
      ...(facts.forms.present ? ['form present'] : []),
      ...(facts.contact.phonePresent ? ['phone link'] : []),
    ].slice(0, 8),
    classificationConfidence: Math.round(confNum * 100) / 100,
    classificationConfidenceBand: band,
    companyNameGuess: orgName,
    locationGuess,
  };

  const debug: SiteProfileDebug = {
    matchedSignals,
    rejectedSignals,
    rejectedTop: second.id !== 'unknown' ? [`runner-up:${second.id}`] : [],
    winningSiteTypeRule: siteTypeId,
    winningIndustryRule: industryId,
    winningConversionRule: convPick.id,
    scoreTopTwoSiteTypes: [
      [top.id, top.count],
      [second.id, second.count],
    ],
    tieAmbiguous,
  };

  if (rules.debugSignals || SYSTEM_DEFAULTS.snapshotClassification.debugSignals) {
    logger.info('snapshot.classification_debug', {
      siteType: siteTypeId,
      industry: industryId,
      conversionModel: convPick.id,
      matchedSignals,
      rejectedSignals,
      scoreTopTwo: debug.scoreTopTwoSiteTypes,
      tieAmbiguous: debug.tieAmbiguous,
    });
  }

  return { profile, debug };
}
