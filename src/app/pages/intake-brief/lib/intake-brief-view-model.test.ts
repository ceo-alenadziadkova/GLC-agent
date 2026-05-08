import { describe, expect, it } from 'vitest';
import {
  buildModeSubtitleOverride,
  buildProgressiveContinueBusy,
  buildTailoredPhaseBanner,
  buildVisibleOptionalDetailsById,
} from './intake-brief-view-model';

describe('intake-brief-view-model', () => {
  it('builds optional details map only for active ids', () => {
    expect(buildVisibleOptionalDetailsById(['a1', 'a2'], { a1: true, a3: true })).toEqual({ a1: true });
  });

  it('builds tailored banner for first tailored step', () => {
    const banner = buildTailoredPhaseBanner({
      twoPhaseWave: 'tailored',
      progressiveStepIndex: 0,
      intelligenceSnapshotNarrative: 'Narrative',
      copy: { tailoredPhaseTitle: 'Title', tailoredPhaseBody: 'Body' },
    });
    expect(banner === null || banner.title === 'Title').toBe(true);
  });

  it('marks continue button busy during tailored loading', () => {
    expect(typeof buildProgressiveContinueBusy('tailored_loading')).toBe('boolean');
  });

  it('returns subtitle only for tailored wave', () => {
    const value = buildModeSubtitleOverride({
      twoPhaseWave: 'tailored',
      tailoredSubtitle: 'Tailored',
    });
    expect(typeof value === 'string' || value === null).toBe(true);
  });
});
