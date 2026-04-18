import { z } from 'zod';
import { AUDIT_REQUESTS_LIST_DEFAULT_LIMIT, AUDIT_REQUESTS_LIST_MAX_LIMIT } from '../../config/route-query-limits.js';
import { REQUEST_FIELD_LIMITS } from '../../config/request-field-limits.js';
import { AUDIT_REQUEST_ALLOWED_PRODUCT_MODES } from '../domain/product-mode-policy.js';

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1))
  .nullable()
  .optional();

export const auditRequestIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const auditRequestListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(AUDIT_REQUESTS_LIST_MAX_LIMIT).default(AUDIT_REQUESTS_LIST_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export const auditRequestCreateBodySchema = z.object({
  url: z.string().optional(),
  industry: nullableTrimmedString,
  product_mode: z.enum(AUDIT_REQUEST_ALLOWED_PRODUCT_MODES).default(AUDIT_REQUEST_ALLOWED_PRODUCT_MODES[0]),
  brief_snapshot: z.record(z.string(), z.unknown()).optional().default({}),
  client_notes: z.string().max(REQUEST_FIELD_LIMITS.clientNotesMax).optional(),
  no_public_website: z.boolean().optional(),
});

export const auditRequestPatchBodySchema = z.object({
  url: z.string().optional(),
  industry: nullableTrimmedString,
  product_mode: z.enum(AUDIT_REQUEST_ALLOWED_PRODUCT_MODES).optional(),
  brief_snapshot: z.record(z.string(), z.unknown()).optional(),
  client_notes: z.string().max(REQUEST_FIELD_LIMITS.clientNotesMax).nullable().optional(),
});

export const auditRequestApproveBodySchema = z.object({
  consultant_note: z.string().max(REQUEST_FIELD_LIMITS.consultantNoteMax).optional(),
});

export const auditRequestRejectBodySchema = auditRequestApproveBodySchema;
