import { DOMAIN_KEYS } from '@glc/intake-core';
import { z } from 'zod';

import {
  ROADMAP_EXECUTION_COMPRESSION_HINTS,
  ROADMAP_LANE_DENSITY_BANDS,
} from '../config/roadmap-manifest-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';

const laneEnum = [...ORCHESTRATION_LANE_IDS] as [
  (typeof ORCHESTRATION_LANE_IDS)[number],
  ...(typeof ORCHESTRATION_LANE_IDS)[number][],
];

const domainEnum = [...DOMAIN_KEYS] as [string, ...string[]];

export const RoadmapManifestPreviewSchema = z.object({
  lanes_included: z.array(z.enum(laneEnum)),
  lanes_cut: z.array(z.enum(laneEnum)),
  waiting_list_domains: z.array(z.enum(domainEnum)),
  execution_compression_hint: z.enum(ROADMAP_EXECUTION_COMPRESSION_HINTS),
  lane_density_band: z.enum(ROADMAP_LANE_DENSITY_BANDS),
  confidence_callouts: z.array(z.string().min(1)),
});

export type RoadmapManifestPreview = z.infer<typeof RoadmapManifestPreviewSchema>;
