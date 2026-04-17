import {
  API_ERROR_CODES,
  AUDIT_REQUEST_FETCH_FAILED_MESSAGE,
  AUDIT_REQUEST_NOT_FOUND_MESSAGE,
} from '../../config/api-error-codes.js';
import { AuditRequestHttpError } from '../mappers/audit-request-error.mapper.js';
import { getAuditRequestById, listAuditRequests } from '../repositories/audit-request.repository.js';

export async function listAuditRequestsForActor(input: { isConsultant: boolean; userId: string; limit: number; offset: number }) {
  const { data, error, count } = await listAuditRequests({
    clientId: input.isConsultant ? undefined : input.userId,
    limit: input.limit,
    offset: input.offset,
  });

  if (error) {
    throw error;
  }

  return {
    data,
    total: count ?? 0,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getAuditRequestForActor(input: { id: string; isConsultant: boolean; userId: string }) {
  const { data, error } = await getAuditRequestById(input.id, input.isConsultant ? undefined : input.userId);
  if (error || !data) {
    throw new AuditRequestHttpError(404, API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE);
  }

  return data;
}

export function throwFetchFailed(): never {
  throw new AuditRequestHttpError(500, API_ERROR_CODES.AUDIT_REQUEST_FETCH_FAILED, AUDIT_REQUEST_FETCH_FAILED_MESSAGE);
}
