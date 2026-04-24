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

function buildConfidenceCallouts(args: { plan: AuditExecutionPlan; waitingListCount: number }): string[] {
  const notes: string[] = [];
  const n = args.plan.selected_domains.length;
  if (roadmapPreviewIsSingleDomainCoverage(n)) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.confidenceSingleDomain);
  } else if (roadmapPreviewIsPartialCoverage(n)) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.confidencePartialCoverage);
  }
  if (args.plan.include_strategy === false) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.confidenceStrategyOff);
  }
  if (args.waitingListCount > 0) {
    notes.push(ROADMAP_MANIFEST_PREVIEW_COPY.waitingListBlocks);
  }
  return notes;
}

export function buildRoadmapManifestPreview(args: {
  manifest: RoadmapManifestPayload;
  executionPlan: AuditExecutionPlan;
}): RoadmapManifestPreview {
  const { manifest, executionPlan } = args;
  const selected = manifest.selected_domains;
  const waiting_list_domains = buildWaitingListDomains({
    selectedDomains: selected,
    recommendedDomains: executionPlan.recommended_domains,
  });
  const preview = {
    lanes_included: lanesIncludedForSelectedDomains(selected),
    lanes_cut: lanesCutForSelectedDomains(selected),
    waiting_list_domains,
    execution_compression_hint: roadmapPreviewCompressionHint(manifest.change_scenario),
    lane_density_band: roadmapPreviewLaneDensityBand(manifest.season_preset),
    confidence_callouts: buildConfidenceCallouts({ plan: executionPlan, waitingListCount: waiting_list_domains.length }),
  };
  return RoadmapManifestPreviewSchema.parse(preview);
}
