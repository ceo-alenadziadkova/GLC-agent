import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { APP_FEATURE_FLAGS, type FeatureRolloutMode } from './app-feature-flags';
import {
  getEffectiveDirectorDeepDiveOnDemandEnabled,
  getEffectiveDirectorSubAgentsEnabled,
  getEffectiveOrchestrationRoadmapNarrativeEnabled,
} from './orchestration-client-feature-gates';

describe('orchestration-client-feature-gates', () => {
  const originalNarrative = APP_FEATURE_FLAGS.orchestrationRoadmapNarrativeEnabled;
  const originalNarrativeMode = APP_FEATURE_FLAGS.orchestrationRoadmapNarrativeRolloutMode;
  const originalDeepDive = APP_FEATURE_FLAGS.directorDeepDiveOnDemandEnabled;
  const originalDeepDiveMode = APP_FEATURE_FLAGS.directorDeepDiveRolloutMode;
  const originalSub = APP_FEATURE_FLAGS.directorSubAgentsEnabled;
  const originalSubMode = APP_FEATURE_FLAGS.directorSubAgentsRolloutMode;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeEnabled: boolean }).orchestrationRoadmapNarrativeEnabled =
      originalNarrative;
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeRolloutMode: FeatureRolloutMode }).orchestrationRoadmapNarrativeRolloutMode =
      originalNarrativeMode;
    (APP_FEATURE_FLAGS as { directorDeepDiveOnDemandEnabled: boolean }).directorDeepDiveOnDemandEnabled = originalDeepDive;
    (APP_FEATURE_FLAGS as { directorDeepDiveRolloutMode: FeatureRolloutMode }).directorDeepDiveRolloutMode = originalDeepDiveMode;
    (APP_FEATURE_FLAGS as { directorSubAgentsEnabled: boolean }).directorSubAgentsEnabled = originalSub;
    (APP_FEATURE_FLAGS as { directorSubAgentsRolloutMode: FeatureRolloutMode }).directorSubAgentsRolloutMode = originalSubMode;
  });

  it('returns true when base narrative flag is on regardless of email', () => {
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeEnabled: boolean }).orchestrationRoadmapNarrativeEnabled = true;
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeRolloutMode: FeatureRolloutMode }).orchestrationRoadmapNarrativeRolloutMode =
      'shadow';
    expect(getEffectiveOrchestrationRoadmapNarrativeEnabled(null)).toBe(true);
  });

  it('unlocks narrative for allowlisted email in internal mode when base flag is off', () => {
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeEnabled: boolean }).orchestrationRoadmapNarrativeEnabled = false;
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeRolloutMode: FeatureRolloutMode }).orchestrationRoadmapNarrativeRolloutMode =
      'internal';
    expect(getEffectiveOrchestrationRoadmapNarrativeEnabled('CEO.AlenaDziadkova@gmail.com')).toBe(true);
  });

  it('keeps narrative off in shadow when base flag is off', () => {
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeEnabled: boolean }).orchestrationRoadmapNarrativeEnabled = false;
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeRolloutMode: FeatureRolloutMode }).orchestrationRoadmapNarrativeRolloutMode =
      'shadow';
    expect(getEffectiveOrchestrationRoadmapNarrativeEnabled('ceo.alenadziadkova@gmail.com')).toBe(false);
  });

  it('deep-dive effective flag mirrors same rollout rules', () => {
    (APP_FEATURE_FLAGS as { directorDeepDiveOnDemandEnabled: boolean }).directorDeepDiveOnDemandEnabled = false;
    (APP_FEATURE_FLAGS as { directorDeepDiveRolloutMode: FeatureRolloutMode }).directorDeepDiveRolloutMode = 'pilot';
    expect(getEffectiveDirectorDeepDiveOnDemandEnabled('ceo.alenadziadkova@gmail.com')).toBe(true);
  });

  it('sub-agents effective flag mirrors same rollout rules', () => {
    (APP_FEATURE_FLAGS as { directorSubAgentsEnabled: boolean }).directorSubAgentsEnabled = false;
    (APP_FEATURE_FLAGS as { directorSubAgentsRolloutMode: FeatureRolloutMode }).directorSubAgentsRolloutMode = 'ga';
    expect(getEffectiveDirectorSubAgentsEnabled(null)).toBe(true);
  });
});
