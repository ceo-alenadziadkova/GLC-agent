import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';

export function buildVisibleOptionalDetailsById(activeQueueItem: string[], optionalDetailsOpenById: Record<string, boolean>) {
  const out: Record<string, boolean> = {};
  for (const id of activeQueueItem) {
    if (optionalDetailsOpenById[id]) out[id] = true;
  }
  return out;
}

export function buildTailoredPhaseBanner(args: {
  twoPhaseWave: 'none' | 'prebrief' | 'tailored_loading' | 'tailored';
  progressiveStepIndex: number;
  intelligenceSnapshotNarrative: string | null;
  copy: { tailoredPhaseTitle: string; tailoredPhaseBody: string };
}) {
  if (!APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled) return null;
  if (args.twoPhaseWave !== 'tailored' || args.progressiveStepIndex !== 0) return null;
  return {
    title: args.copy.tailoredPhaseTitle,
    body:
      args.intelligenceSnapshotNarrative && args.intelligenceSnapshotNarrative.length > 0
        ? `${args.copy.tailoredPhaseBody}\n\n${args.intelligenceSnapshotNarrative}`
        : args.copy.tailoredPhaseBody,
  };
}

export function buildModeSubtitleOverride(args: {
  twoPhaseWave: 'none' | 'prebrief' | 'tailored_loading' | 'tailored';
  tailoredSubtitle: string;
}) {
  if (!APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled) return null;
  return args.twoPhaseWave === 'tailored' ? args.tailoredSubtitle : null;
}

export function buildProgressiveContinueBusy(twoPhaseWave: 'none' | 'prebrief' | 'tailored_loading' | 'tailored') {
  return APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && twoPhaseWave === 'tailored_loading';
}
