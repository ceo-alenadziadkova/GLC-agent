import type { SiteProfile } from '../types.js';

export function buildUnknownSiteProfile(): SiteProfile {
  return {
    siteType: 'unknown',
    industry: 'unknown',
    conversionModel: 'unknown',
    primaryOffer: '',
    shortLabel: '',
    audienceGuess: 'unknown',
    businessSignals: [],
    classificationConfidence: 0,
    classificationConfidenceBand: 'low',
    companyNameGuess: null,
    locationGuess: null,
  };
}
