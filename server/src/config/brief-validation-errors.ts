import type { BriefValidationResult } from '../services/brief-validator/types.js';

export const BRIEF_VALIDATION_ERROR_CODES = {
  INVALID_RESPONSES: 'INVALID_RESPONSES',
  SAVE_FAILED: 'SAVE_FAILED',
  INCOMPLETE: 'INCOMPLETE',
  INVALID_COLLECTION_MODE: 'INVALID_COLLECTION_MODE',
  INCOMPLETE_INTAKE_VERSIONS: 'INCOMPLETE_INTAKE_VERSIONS',
  UNSUPPORTED_INTAKE_VERSION: 'UNSUPPORTED_INTAKE_VERSION',
  INTAKE_VERSION_CONFLICT: 'INTAKE_VERSION_CONFLICT',
} as const;

export type BriefValidationErrorCode =
  (typeof BRIEF_VALIDATION_ERROR_CODES)[keyof typeof BRIEF_VALIDATION_ERROR_CODES];

export class BriefValidationError extends Error {
  readonly code: BriefValidationErrorCode;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;

  constructor(code: BriefValidationErrorCode, message: string, cause?: unknown, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BriefValidationError';
    this.code = code;
    this.cause = cause;
    this.details = details;
  }
}

export const BRIEF_VALIDATION_ERRORS = {
  invalidResponsesPrefix: 'Invalid brief responses',
  saveFailedPrefix: 'Failed to save brief',
  incompletePrefix: 'Intake brief incomplete',
} as const;

export function formatInvalidBriefResponsesError(details: string): string {
  return `${BRIEF_VALIDATION_ERRORS.invalidResponsesPrefix}: ${details}`;
}

export function formatSaveBriefFailedError(details: string): string {
  return `${BRIEF_VALIDATION_ERRORS.saveFailedPrefix}: ${details}`;
}

export function formatIncompleteBriefError(missingIds: string[], validation: BriefValidationResult): string {
  const questions = validation.missing_required
    .filter((item) => missingIds.includes(item.id))
    .map((item) => `• ${item.question}`)
    .join('\n');
  return `${BRIEF_VALIDATION_ERRORS.incompletePrefix} — ${missingIds.length} required question(s) unanswered:\n${questions}`;
}

export function makeInvalidBriefResponsesError(details: string, cause?: unknown): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.INVALID_RESPONSES,
    formatInvalidBriefResponsesError(details),
    cause,
  );
}

export function makeSaveBriefFailedError(details: string, cause?: unknown): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.SAVE_FAILED,
    formatSaveBriefFailedError(details),
    cause,
  );
}

export function makeIncompleteBriefError(
  missingIds: string[],
  validation: BriefValidationResult,
): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.INCOMPLETE,
    formatIncompleteBriefError(missingIds, validation),
  );
}

export function makeInvalidCollectionModeError(): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.INVALID_COLLECTION_MODE,
    'invalid_collection_mode',
  );
}

export function makeIncompleteIntakeVersionsError(): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.INCOMPLETE_INTAKE_VERSIONS,
    'incomplete_intake_versions',
  );
}

export function makeUnsupportedIntakeVersionError(details?: Record<string, unknown>): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.UNSUPPORTED_INTAKE_VERSION,
    'unsupported_intake_version',
    undefined,
    details,
  );
}

export function makeIntakeVersionConflictError(details?: Record<string, unknown>): BriefValidationError {
  return new BriefValidationError(
    BRIEF_VALIDATION_ERROR_CODES.INTAKE_VERSION_CONFLICT,
    'intake_version_conflict',
    undefined,
    details,
  );
}
