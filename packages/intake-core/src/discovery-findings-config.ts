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
}

export const DISCOVERY_FINDINGS_CONFIG = raw as DiscoveryFindingsConfigV1;
