import { createHash } from 'node:crypto';

import { isManifestScenarioCompareEnabled } from '../../config/feature-flags.js';
import type { RoadmapManifestPreview } from '../../schemas/roadmap-manifest-preview.js';

const TTL_MS = 60_000;
const MAX_ENTRIES = 200;

type CacheEntry = { preview: RoadmapManifestPreview; expiresAt: number };
const store = new Map<string, CacheEntry>();

function keyFor(auditId: string, bodyJson: string): string {
  const h = createHash('sha256');
  h.update(auditId);
  h.update('\0');
  h.update(bodyJson);
  return h.digest('hex');
}

/**
 * In-process memo for `POST /roadmap/manifest-preview` (scenario-compare: dual preview).
 * Best-effort; bypassed when `FEATURE_MANIFEST_SCENARIO_COMPARE` is off.
 */
export function getOrSetRoadmapManifestPreviewMemo(args: {
  auditId: string;
  bodyJson: string;
  compute: () => RoadmapManifestPreview;
}): RoadmapManifestPreview {
  if (!isManifestScenarioCompareEnabled()) {
    return args.compute();
  }
  const k = keyFor(args.auditId, args.bodyJson);
  const now = Date.now();
  for (const [k0, e] of store) {
    if (e.expiresAt <= now) store.delete(k0);
  }
  const hit = store.get(k);
  if (hit && hit.expiresAt > now) {
    return hit.preview;
  }
  const preview = args.compute();
  store.set(k, { preview, expiresAt: now + TTL_MS });
  if (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  return preview;
}
