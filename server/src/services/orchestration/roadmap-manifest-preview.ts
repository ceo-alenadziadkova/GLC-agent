import { ROADMAP_MANIFEST_PREVIEW_COPY } from '../../config/roadmap-manifest-preview-copy.en.js';
import type { AuditExecutionPlan } from '../../types/audit.js';
import {
  buildWaitingListDomains,
  lanesCutForSelectedDomains,
  lanesIncludedForSelectedDomains,
  roadmapPreviewCompressionHint,
  roadmapPreviewIsPartialCoverage,
  roadmapPreviewIsSingleDomainCoverage,
  roadmapPreviewLaneDensityBand,
} from '../../config/roadmap-manifest-policy.js';
import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';
import {
  RoadmapManifestPreviewSchema,
  type RoadmapManifestPreview,
} from '../../schemas/roadmap-manifest-preview.js';

function buildConfidenceCallouts(plan: AuditExecutionPlan): string[] {
  const notes: string[] = [];
  const n = plan.selected_domains.length;
  if (roadmapPreviewIsSingleDomainCoverage(n)) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.confidenceSingleDomain);
  } else if (roadmapPreviewIsPartialCoverage(n)) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.confidencePartialCoverage);
  }
  if (plan.include_strategy === false) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.confidenceStrategyOff);
  }
  return notes;
}

export function buildRoadmapManifestPreview(args: {
  manifest: RoadmapManifestPayload;
  executionPlan: AuditExecutionPlan;
}): RoadmapManifestPreview {
  const { manifest, executionPlan } = args;
  const selected = manifest.selected_domains;
  const preview = {
    lanes_included: lanesIncludedForSelectedDomains(selected),
    lanes_cut: lanesCutForSelectedDomains(selected),
    waiting_list_domains: buildWaitingListDomains({
      selectedDomains: selected,
      recommendedDomains: executionPlan.recommended_domains,
    }),
    execution_compression_hint: roadmapPreviewCompressionHint(manifest.change_scenario),
    lane_density_band: roadmapPreviewLaneDensityBand(manifest.season_preset),
    confidence_callouts: buildConfidenceCallouts(executionPlan),
  };
  return RoadmapManifestPreviewSchema.parse(preview);
}
