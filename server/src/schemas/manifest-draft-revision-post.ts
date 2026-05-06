import { z } from 'zod';

import {
  MANIFEST_DRAFT_REVISION_OWNER_HINT_MAX_CHARS,
} from '../config/orchestration-manifest-draft-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';

const laneTupleDraft = [...ORCHESTRATION_LANE_IDS] as [
  (typeof ORCHESTRATION_LANE_IDS)[number],
  ...(typeof ORCHESTRATION_LANE_IDS)[number][],
];

export const ManifestDraftRevisionPostSchema = z
  .object({
    canonical_node_key: z.string().trim().min(1).max(120),
    expected_pack_version: z.number().int().nonnegative(),
    lane: z.enum(laneTupleDraft).optional(),
    owner_hint: z
      .string()
      .trim()
      .min(1)
      .max(MANIFEST_DRAFT_REVISION_OWNER_HINT_MAX_CHARS)
      .optional(),
  })
  .refine(body => body.lane != null || body.owner_hint != null, {
    message: 'lane or owner_hint is required',
  });

export type ManifestDraftRevisionPost = z.infer<typeof ManifestDraftRevisionPostSchema>;
