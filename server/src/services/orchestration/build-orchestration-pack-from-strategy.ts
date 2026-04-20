import type { StrategyInitiative } from '../../schemas/domain-output.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { RoadmapInputManifest } from '../../schemas/roadmap-manifest.js';
import { buildGlcOrchestrationPackFromInitiatives } from './build-glc-orchestration-pack.js';
import { flattenNormalizedStrategyInitiativeBuckets } from '../strategy/strategy-audit-read-normalize.js';

/**
 * Derived orchestrator builder (phase-2 style): produces deterministic orchestration pack
 * from already persisted strategy initiatives, without requiring director stage-2 data.
 */
export function buildOrchestrationPackFromStrategy(args: {
  normalizedStrategy: Record<string, unknown>;
  manifestSnapshotId: string;
  manifest: Pick<RoadmapInputManifest, 'season_preset'>;
}): GlcOrchestrationPack {
  const initiatives = flattenNormalizedStrategyInitiativeBuckets(args.normalizedStrategy) as StrategyInitiative[];
  return buildGlcOrchestrationPackFromInitiatives({
    initiatives,
    manifestSnapshotId: args.manifestSnapshotId,
    seasonPreset: args.manifest.season_preset,
  });
}

