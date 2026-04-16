import { EXPRESS_PRODUCT_MODE, FULL_PRODUCT_MODE } from '../../types/audit.js';
import type { AuditRequestProductMode } from '../types.js';

export const AUDIT_REQUEST_ALLOWED_PRODUCT_MODES = [EXPRESS_PRODUCT_MODE, FULL_PRODUCT_MODE] as const;

export function isAllowedAuditRequestProductMode(mode: unknown): mode is AuditRequestProductMode {
  return (
    typeof mode === 'string' &&
    AUDIT_REQUEST_ALLOWED_PRODUCT_MODES.includes(mode as (typeof AUDIT_REQUEST_ALLOWED_PRODUCT_MODES)[number])
  );
}
