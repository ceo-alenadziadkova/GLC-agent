/**
 * Declarative strings and thresholds for public Discovery findings (`computeFindings` / triage).
 */
import raw from './discovery-findings-config.v1.json' with { type: 'json' };

export type DiscoveryFindingHook = 'revenue' | 'time' | 'visibility' | 'risk' | 'scale';

export interface DiscoveryFindingsConfigV1 {
  version: string;
  automatableD2Options: string[];
  d1TrivialTools: string[];
  d1EffectivelyEmptyIfOnlyOption: string;
  d1SoloWeakSpreadsheetOnlyLabel: string;
  channelPhoneLabel: string;
  channelWhatsAppSubstring: string;
  trackingInformalSubstrings: string[];
  trackingInformalExact: string[];
  crmBottleneckIgnorePrefix: string;
  excludeInvisibleFindingWhenGoalBucket: string;
  solePresenceChannelExclude: string;
  goalBucketAdminOverload: string;
  whatsappToolbarChannelLabel: string;
  triage: {
    ifZero: number;
    ifAtMost2: number;
    ifAtMost4: number;
    ifAtMost6: number;
    otherwise: number;
  };
  hookSortOrder: DiscoveryFindingHook[];
  maxFindingsReturned: number;
  maxFindingsPerZone: number;
  /** `normalizeIndustry` outcomes for Rule 5 (local service + no Google). */
  localServiceIndustryNorms: string[];
  /** `normalizeIndustry` outcome for Rule 12 (real estate + no CRM). */
  realEstateIndustryNorm: string;
  /** Copy for `d2_automatable` template when team is solo. */
  d2AutomatableHoursRangeSolo: string;
  /** Copy for `d2_automatable` template when team is not solo. */
  d2AutomatableHoursRangeNonSolo: string;
}

export const DISCOVERY_FINDINGS_CONFIG = raw as DiscoveryFindingsConfigV1;
