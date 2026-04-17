import type { Response } from 'express';
import {
  API_ERROR_CODES,
  AUDITS_BRIEF_COLLECTION_MODE_INVALID_MESSAGE,
  AUDITS_BRIEF_SAVE_FAILED_MESSAGE,
  INCOMPLETE_INTAKE_VERSIONS_MESSAGE,
  INTAKE_VERSION_CONFLICT_MESSAGE,
  UNSUPPORTED_INTAKE_VERSION_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  BRIEF_VALIDATION_ERROR_CODES,
  BriefValidationError,
} from '../../../config/brief-validation-errors.js';
import { sendApiError } from './audits-http.mapper.js';

/**
 * Maps domain-level brief validation errors to stable HTTP error responses.
 * Returns true when the error has been handled and response has been sent.
 */
export function tryHandleBriefValidationError(res: Response, err: unknown): boolean {
  if (!(err instanceof BriefValidationError)) return false;

  if (err.code === BRIEF_VALIDATION_ERROR_CODES.INVALID_COLLECTION_MODE) {
    sendApiError(
      res,
      400,
      API_ERROR_CODES.AUDITS_BRIEF_COLLECTION_MODE_INVALID,
      AUDITS_BRIEF_COLLECTION_MODE_INVALID_MESSAGE,
    );
    return true;
  }
  if (err.code === BRIEF_VALIDATION_ERROR_CODES.INVALID_RESPONSES) {
    sendApiError(res, 400, API_ERROR_CODES.AUDITS_BRIEF_VALIDATION_FAILED, err.message);
    return true;
  }
  if (err.code === BRIEF_VALIDATION_ERROR_CODES.INCOMPLETE_INTAKE_VERSIONS) {
    sendApiError(res, 400, API_ERROR_CODES.INCOMPLETE_INTAKE_VERSIONS, INCOMPLETE_INTAKE_VERSIONS_MESSAGE);
    return true;
  }
  if (err.code === BRIEF_VALIDATION_ERROR_CODES.UNSUPPORTED_INTAKE_VERSION) {
    sendApiError(res, 400, API_ERROR_CODES.UNSUPPORTED_INTAKE_VERSION, UNSUPPORTED_INTAKE_VERSION_MESSAGE, {
      received: err.details?.received,
      supportedHint: err.details?.supportedHint,
    });
    return true;
  }
  if (err.code === BRIEF_VALIDATION_ERROR_CODES.INTAKE_VERSION_CONFLICT) {
    sendApiError(res, 409, API_ERROR_CODES.INTAKE_VERSION_CONFLICT, INTAKE_VERSION_CONFLICT_MESSAGE, {
      stored: err.details?.stored,
      received: err.details?.received,
    });
    return true;
  }
  if (err.code === BRIEF_VALIDATION_ERROR_CODES.SAVE_FAILED) {
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_BRIEF_SAVE_FAILED, AUDITS_BRIEF_SAVE_FAILED_MESSAGE);
    return true;
  }

  return false;
}
