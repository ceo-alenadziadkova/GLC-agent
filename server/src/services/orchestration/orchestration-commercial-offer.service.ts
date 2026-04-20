import type { DomainKey } from '@glc/intake-core';
import {
  ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS,
  ORCHESTRATION_COMMERCIAL_POLICY,
} from '../../config/orchestration-commercial-policy.js';
import {
  OrchestrationCommercialOfferResponseSchema,
  type OrchestrationCommercialOfferRequest,
  type OrchestrationCommercialOfferResponse,
} from '../../schemas/orchestration-commercial-offer.js';
import { buildRoadmapManifestPreview } from './roadmap-manifest-preview.js';

export function buildOrchestrationCommercialOffer(args: {
  executionPlan: { selected_domains: readonly DomainKey[]; recommended_domains?: readonly DomainKey[] | null };
  request: OrchestrationCommercialOfferRequest;
}): OrchestrationCommercialOfferResponse {
  const basePreview = buildRoadmapManifestPreview({
    executionPlan: {
      ...args.executionPlan,
      selected_domains: [...args.request.selected_domains],
      depth: 'standard',
      source: 'user_selected',
      include_strategy: true,
    },
    manifest: {
      selected_domains: [...args.request.selected_domains],
      change_scenario: args.request.change_scenario,
      season_preset: args.request.season_preset,
    },
  });

  const offers = basePreview.waiting_list_domains
    .slice(0, ORCHESTRATION_COMMERCIAL_POLICY.maxSuggestedDomains)
    .map(domain => ({
      domain,
      value_message: `Add ${ORCHESTRATION_COMMERCIAL_DOMAIN_VALUE_LABELS[domain]} to unlock a fuller cross-lane roadmap.`,
      estimated_incremental_effort_weeks: ORCHESTRATION_COMMERCIAL_POLICY.defaultIncrementalEffortWeeks,
    }));

  const accepted_domain = args.request.accept_domain ?? null;
  const recalculated_preview =
    accepted_domain && !args.request.selected_domains.includes(accepted_domain)
      ? buildRoadmapManifestPreview({
          executionPlan: {
            ...args.executionPlan,
            selected_domains: [...args.request.selected_domains, accepted_domain],
            depth: 'standard',
            source: 'user_selected',
            include_strategy: true,
          },
          manifest: {
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
