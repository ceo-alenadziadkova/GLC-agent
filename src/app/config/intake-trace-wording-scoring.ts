export type IntakeWordingScoringMode = 'strict' | 'balanced' | 'lenient';

export const INTAKE_WORDING_SCORING = {
  penaltyMultiplier: {
    strict: 1.25,
    balanced: 1,
    lenient: 0.8,
  },
  longThreshold: {
    strict: 80,
    balanced: 90,
    lenient: 105,
  },
  shortThreshold: {
    strict: 14,
    balanced: 12,
    lenient: 10,
  },
  penalties: {
    longWording: 25,
    shortWording: 20,
    separator: 10,
    vagueWording: 20,
    missingQuestionMark: 8,
    draftEqualsCanon: 2,
  },
  severityHighReasonsMin: 3,
  score: {
    min: 0,
    max: 100,
  },
} as const;

export function resolveIntakeWordingScoringMode(mode: string): IntakeWordingScoringMode {
  if (mode === 'strict') return 'strict';
  if (mode === 'lenient') return 'lenient';
  return 'balanced';
}
