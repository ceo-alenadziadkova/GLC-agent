import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';

export function isReliableSource(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const source = (value as { source?: unknown }).source;
  return source === 'client' || source === 'consultant' || source === 'recon_confirmed';
}

export function isIntakeF1Enabled(): boolean {
  return APP_FEATURE_FLAGS.diagnosticIntakePilotEnabled && APP_FEATURE_FLAGS.intakeNextQuestionClientEnabled;
}

export function shouldForceProgressiveMode(questionMode: 'progressive' | 'all_questions'): boolean {
  return APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled && questionMode === 'all_questions';
}
