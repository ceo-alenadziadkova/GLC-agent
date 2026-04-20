import { supabase } from '../../../services/supabase.js';
import { NO_PUBLIC_WEBSITE_URL } from '../../../config/no-public-website.js';
import { saveBriefResponses } from '../../../services/brief-validator.js';
import { DEFAULT_AUDIT_PRODUCT_MODE, DOMAIN_KEYS, reviewPhasesForMode } from '../../../types/audit.js';
import { logger } from '../../../services/logger.js';
import {
  API_ERROR_CODES,
  DISCOVER_ALREADY_CONVERTED_MESSAGE,
  DISCOVER_CLAIM_CONFLICT_MESSAGE,
  DISCOVER_CONVERT_FAILED_MESSAGE,
  DISCOVER_FORBIDDEN_OWNER_MESSAGE,
  DISCOVER_LINK_CONFLICT_MESSAGE,
  DISCOVER_SESSION_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { DISCOVER_CONVERT_SESSION_RPC } from '../../../config/discover-convert-rpc.js';
import { coerceDiscoverySessionAnswers, discoveryToBriefPatch } from '../domain/discovery-to-brief-patch.js';

type DiscoveryConvertRpcRow = {
  audit_id: string | null;
  error_code: string | null;
  answers: unknown;
};

function parseDiscoveryConvertRpcRow(data: unknown): DiscoveryConvertRpcRow | undefined {
  if (data == null) return undefined;
  const rows = Array.isArray(data) ? data : [data];
  const first = rows[0];
  if (first == null || typeof first !== 'object' || Array.isArray(first)) return undefined;
  const o = first as Record<string, unknown>;
  return {
    audit_id: (o.audit_id as string | null | undefined) ?? null,
    error_code: (o.error_code as string | null | undefined) ?? null,
    answers: o.answers,
  };
}

/**
 * Consultant-only: atomically convert a discovery session into an audit shell, then seed intake brief from answers.
 * Returns HTTP status + JSON body for the route layer.
 */
export async function convertDiscoverySessionToAudit(
  sessionToken: string,
  consultantId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const reviewPhases = reviewPhasesForMode(DEFAULT_AUDIT_PRODUCT_MODE);
  const { data: convertRows, error: convertErr } = await supabase.rpc(DISCOVER_CONVERT_SESSION_RPC, {
    p_session_token: sessionToken,
    p_consultant_id: consultantId,
    p_company_url: NO_PUBLIC_WEBSITE_URL,
    p_product_mode: DEFAULT_AUDIT_PRODUCT_MODE,
    p_review_phases: reviewPhases,
    p_domain_keys: [...DOMAIN_KEYS],
    p_no_public_website: true,
  });
  if (convertErr) {
    logger.error('discover.convert_rpc_failed', {
      component: 'discover',
      error: convertErr.message,
      code: (convertErr as { code?: string }).code,
      details: (convertErr as { details?: string }).details,
      hint: (convertErr as { hint?: string }).hint,
      session_token: sessionToken,
    });
    return {
      status: 500,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE),
    };
  }
  const convertRow = parseDiscoveryConvertRpcRow(convertRows);
  if (!convertRow) {
    logger.error('discover.convert_rpc_empty_shape', {
      component: 'discover',
      session_token: sessionToken,
    });
    return {
      status: 500,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE),
    };
  }
  if (convertRow.error_code === 'not_found') {
    return {
      status: 404,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_SESSION_NOT_FOUND, DISCOVER_SESSION_NOT_FOUND_MESSAGE),
    };
  }
  if (convertRow.error_code === 'already_converted') {
    return {
      status: 409,
      body: {
        ...apiErrorJson(API_ERROR_CODES.DISCOVER_ALREADY_CONVERTED, DISCOVER_ALREADY_CONVERTED_MESSAGE),
        audit_id: convertRow.audit_id,
      },
    };
  }
  if (convertRow.error_code === 'forbidden_owner') {
    return {
      status: 403,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_FORBIDDEN_OWNER, DISCOVER_FORBIDDEN_OWNER_MESSAGE),
    };
  }
  if (convertRow.error_code === 'claim_conflict') {
    return {
      status: 409,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_CLAIM_CONFLICT, DISCOVER_CLAIM_CONFLICT_MESSAGE),
    };
  }
  if (convertRow.error_code === 'link_conflict') {
    return {
      status: 409,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_LINK_CONFLICT, DISCOVER_LINK_CONFLICT_MESSAGE),
    };
  }
  if (convertRow.error_code || !convertRow.audit_id) {
    return {
      status: 500,
      body: apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE),
    };
  }
  const auditId = convertRow.audit_id;
  await supabase
    .from('audits')
    .update({ origin: 'discovery' })
    .eq('id', auditId);
  const answers = coerceDiscoverySessionAnswers(convertRow.answers);

  let briefPatch: ReturnType<typeof discoveryToBriefPatch> = {};
  try {
    briefPatch = discoveryToBriefPatch(answers);
  } catch (mapErr) {
    logger.warn('discover.convert_brief_map_failed', {
      component: 'discover',
      audit_id: auditId,
      error: (mapErr as Error).message,
    });
  }
  if (Object.keys(briefPatch).length > 0) {
    try {
      await saveBriefResponses(auditId, briefPatch, {
        // Continue as consultant-led intake (not public discovery); mapped cells stay source: client.
        collection_mode: 'interview',
        validation_perspective: 'consultant',
      });
    } catch (briefErr) {
      logger.warn('discover.convert_brief_skipped', {
        component: 'discover',
        error: (briefErr as Error).message,
      });
    }
  }

  logger.info('discover.converted', { component: 'discover', audit_id: auditId, session_token: sessionToken });
  return { status: 201, body: { audit_id: auditId } };
}
