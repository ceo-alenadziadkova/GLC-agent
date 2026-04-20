import type { DomainKey } from '@glc/intake-core';
import { resolveOrchestrationDomainConflictRule } from '../../config/orchestration-domain-conflict-policy.js';
import {
  ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS,
  ORCHESTRATION_COMMERCIAL_POLICY,
} from '../../config/orchestration-commercial-policy.js';
import { ROADMAP_MANIFEST_SCHEMA_VERSION } from '../../config/orchestration-roadmap-presets.js';
import {
  OrchestrationCommercialOfferResponseSchema,
  type OrchestrationCommercialOfferRequest,
  type OrchestrationCommercialOfferResponse,
} from '../../schemas/orchestration-commercial-offer.js';
import { buildRoadmapManifestPreview } from './roadmap-manifest-preview.js';

function buildCommercialWhyNowBullets(args: {
  offerDomain: DomainKey;
  selectedDomains: readonly DomainKey[];
}): string[] {
  const bullets: string[] = [];
  const label = (d: DomainKey) => ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS[d] ?? d;
  for (const s of args.selectedDomains) {
    if (s === args.offerDomain) continue;
    const rule = resolveOrchestrationDomainConflictRule(args.offerDomain, s);
    if (rule) {
      bullets.push(
        `Resolves ${rule.narrative_key.replace(/_/g, ' ')} tension with ${label(s)} while sequencing is still open.`,
      );
    }
  }
  if (bullets.length === 0) {
    bullets.push(
      `Adds ${label(args.offerDomain)} so cross-lane dependencies can be wired with the current critical path.`,
    );
  }
  return bullets.slice(0, ORCHESTRATION_COMMERCIAL_POLICY.maxWhyNowBullets);
}

export function buildOrchestrationCommercialOffer(args: {
  executionPlan: { selected_domains: readonly DomainKey[]; recommended_domains?: readonly DomainKey[] | null };
  request: OrchestrationCommercialOfferRequest;
}): OrchestrationCommercialOfferResponse {
  const normalizedRecommendedDomains = args.executionPlan.recommended_domains
    ? [...args.executionPlan.recommended_domains]
    : undefined;
  const basePreview = buildRoadmapManifestPreview({
    executionPlan: {
      ...args.executionPlan,
      recommended_domains: normalizedRecommendedDomains,
      selected_domains: [...args.request.selected_domains],
      depth: 'standard',
      source: 'user_selected',
      include_strategy: true,
    },
    manifest: {
      schema_version: ROADMAP_MANIFEST_SCHEMA_VERSION,
      selected_domains: [...args.request.selected_domains],
      change_scenario: args.request.change_scenario,
      season_preset: args.request.season_preset,
    },
  });

  const laneDensityRank: Record<'sparse' | 'standard' | 'dense', number> = {
    sparse: 0,
    standard: 1,
    dense: 2,
  };
  const meetsCoverageGuardrail =
    laneDensityRank[basePreview.lane_density_band] >=
    laneDensityRank[ORCHESTRATION_COMMERCIAL_POLICY.minCoverageDensityBandForOffer];
  const meetsConfidenceGuardrail =
    basePreview.confidence_callouts.length <= ORCHESTRATION_COMMERCIAL_POLICY.maxConfidenceCalloutsForOffer;
  const canOfferExpansion = meetsCoverageGuardrail && meetsConfidenceGuardrail;

  const estimateIncrementalEffortWeeks = (): number => {
    const byDensity = ORCHESTRATION_COMMERCIAL_POLICY.incrementalEffortWeeksByDensity;
    return (
      byDensity[basePreview.lane_density_band] ??
      ORCHESTRATION_COMMERCIAL_POLICY.defaultIncrementalEffortWeeks
    );
  };

  const waitingListDomains = basePreview.waiting_list_domains as DomainKey[];
  const offers = canOfferExpansion
    ? waitingListDomains
        .slice(0, ORCHESTRATION_COMMERCIAL_POLICY.maxSuggestedDomains)
        .map((domain) => ({
          domain,
          value_message: `Add ${ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS[domain]} to unlock a fuller cross-lane roadmap.`,
          estimated_incremental_effort_weeks: estimateIncrementalEffortWeeks(),
          why_now_bullets: buildCommercialWhyNowBullets({
            offerDomain: domain,
            selectedDomains: args.request.selected_domains,
          }),
        }))
    : [];

  const accepted_domain = canOfferExpansion ? (args.request.accept_domain ?? null) : null;
  const recalculated_preview =
    accepted_domain && !args.request.selected_domains.includes(accepted_domain)
      ? buildRoadmapManifestPreview({
          executionPlan: {
            ...args.executionPlan,
            recommended_domains: normalizedRecommendedDomains,
            selected_domains: [...args.request.selected_domains, accepted_domain],
            depth: 'standard',
            source: 'user_selected',
            include_strategy: true,
          },
          manifest: {
            schema_version: ROADMAP_MANIFEST_SCHEMA_VERSION,
            selected_domains: [...args.request.selected_domains, accepted_domain],
            change_scenario: args.request.change_scenario,
            season_preset: args.request.season_preset,
          },
        })
      : null;

  return OrchestrationCommercialOfferResponseSchema.parse({
    offers,
    accepted_domain,
    base_preview: basePreview,
    recalculated_preview,
    accepted_pack_result: null,
  });
}
