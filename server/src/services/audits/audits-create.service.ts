import {
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  type AuditExecutionPlan,
  type AuditOrigin,
  type ProductMode,
} from '../../types/audit.js';
import { normalizeExecutionPlan } from '../execution-plan.js';
import { persistedProductModeForExecutionPlan } from '../../lib/audit-coverage-bridge.js';
import { ensureHttpsUrl } from '@glc/intake-core';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../../lib/public-http-url.js';
import { NO_PUBLIC_WEBSITE_URL } from '../../config/no-public-website.js';
import { REQUEST_FIELD_LIMITS } from '../../config/request-field-limits.js';
import { resolveSelfServeAuditOwnerUserId } from '../../lib/self-serve-audit-owner.js';
import { createAuditWithChildren } from '../audit-initialization.js';
import type { UserRole } from '../../middleware/auth.js';

export async function resolveCreateAuditCompanyUrl(input: {
  noPublicWebsite: boolean;
  companyUrl: unknown;
}) {
  if (input.noPublicWebsite) {
    if (typeof input.companyUrl === 'string' && input.companyUrl.trim() !== '') {
      return { ok: false as const, kind: 'omit_company_url' as const };
    }
    return { ok: true as const, url: NO_PUBLIC_WEBSITE_URL };
  }

  if (!input.companyUrl || typeof input.companyUrl !== 'string') {
    return { ok: false as const, kind: 'company_url_required' as const };
  }

  let normalized = ensureHttpsUrl(input.companyUrl);
  if (normalized.length < REQUEST_FIELD_LIMITS.auditCompanyUrlMinNormalizedLength) {
    return { ok: false as const, kind: 'company_url_invalid' as const };
  }

  try {
    normalized = await validatePublicAuditUrl(normalized);
  } catch (error) {
    if (error instanceof PublicUrlNotAllowedError) {
      return { ok: false as const, kind: 'public_url_not_allowed' as const, code: error.code, message: error.message };
    }
    throw error;
  }

  return { ok: true as const, url: normalized };
}

export function resolveCreateAuditMode(executionPlan: Partial<AuditExecutionPlan> | null | undefined): {
  executionPlan: AuditExecutionPlan;
  mode: ProductMode;
} {
  const normalizedPlan = normalizeExecutionPlan(executionPlan ?? null, DEFAULT_AUDIT_COVERAGE_PACKAGE);
  return {
    executionPlan: normalizedPlan,
    mode: persistedProductModeForExecutionPlan(normalizedPlan),
  };
}

export async function resolveCreateAuditOwnership(role: UserRole, userId: string) {
  if (role === 'consultant') return { ok: true as const, ownerUserId: userId, clientId: null };

  const resolved = await resolveSelfServeAuditOwnerUserId();
  if (!resolved.ok) return resolved;
  return { ok: true as const, ownerUserId: resolved.userId, clientId: userId };
}

export async function createAuditEntity(input: {
  ownerUserId: string;
  clientId: string | null;
  companyUrl: string;
  companyName: unknown;
  industry: unknown;
  mode: ProductMode;
  executionPlan: AuditExecutionPlan;
  noPublicWebsite: boolean;
  origin: AuditOrigin;
}) {
  return createAuditWithChildren({
    ownerUserId: input.ownerUserId,
    clientId: input.clientId,
    company_url: input.companyUrl,
    company_name: typeof input.companyName === 'string' && input.companyName.trim() ? input.companyName.trim() : null,
    industry: typeof input.industry === 'string' && input.industry.trim() ? input.industry.trim() : null,
    mode: input.mode,
    origin: input.origin,
    execution_plan: input.executionPlan,
    no_public_website: input.noPublicWebsite,
  });
}
