/**
 * POST /api/marketing/brief — public — short lead form from marketing site.
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { marketingBriefPublicLimiter } from '../middleware/rate-limit.js';
import { emitStructuredNotification } from '../services/notifications.js';
import { logger } from '../services/logger.js';
import {
  computeMarketingBriefRecommendedRoute,
  isAllowedMarketingBriefRoute,
  type MarketingBriefPreferredAuditDepth,
} from '../config/marketing-brief-routing.js';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import {
  API_ERROR_CODES,
  MARKETING_DEPTH_REQUIRED_MESSAGE,
  MARKETING_INVALID_RECOMMENDATION_MESSAGE,
  MARKETING_NAME_REQUIRED_MESSAGE,
  MARKETING_SAVE_FAILED_MESSAGE,
  MARKETING_WEBSITE_OR_FLAG_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';

export const marketingRouter = Router();

function clampStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

marketingRouter.post('/brief', marketingBriefPublicLimiter, async (req, res) => {
  try {
    const name = clampStr(req.body?.name, REQUEST_FIELD_LIMITS.marketingNameMax);
    if (!name) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.MARKETING_NAME_REQUIRED, MARKETING_NAME_REQUIRED_MESSAGE));
      return;
    }

    const company = clampStr(req.body?.company, REQUEST_FIELD_LIMITS.marketingCompanyMax);
    const noWebsite = Boolean(req.body?.no_website);
    const website = noWebsite ? '' : clampStr(req.body?.website, REQUEST_FIELD_LIMITS.marketingWebsiteMax);
    const concern = clampStr(req.body?.concern, REQUEST_FIELD_LIMITS.marketingLongTextMax);
    const improve = clampStr(req.body?.improve, REQUEST_FIELD_LIMITS.marketingLongTextMax);
    const urgency = clampStr(req.body?.urgency, REQUEST_FIELD_LIMITS.marketingUrgencyMax);
    const contactMethod = clampStr(req.body?.contact_method, REQUEST_FIELD_LIMITS.marketingContactMethodMax);
    const unsureChoice = Boolean(req.body?.unsure_choice);
    const depthRaw = req.body?.preferred_audit_depth;
    const preferredAuditDepth: MarketingBriefPreferredAuditDepth | null =
      depthRaw === 'express' || depthRaw === 'full' ? depthRaw : null;

    if (!noWebsite && !website) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.MARKETING_WEBSITE_OR_FLAG_REQUIRED,
            MARKETING_WEBSITE_OR_FLAG_REQUIRED_MESSAGE,
          ),
        );
      return;
    }

    if (!unsureChoice && !noWebsite && preferredAuditDepth == null) {
      res.status(400).json(
        apiErrorJson(API_ERROR_CODES.MARKETING_DEPTH_REQUIRED, MARKETING_DEPTH_REQUIRED_MESSAGE),
      );
      return;
    }

    const recommendedRoute = computeMarketingBriefRecommendedRoute({
      unsure_choice: unsureChoice,
      no_website: noWebsite,
      preferred_audit_depth: unsureChoice || noWebsite ? null : preferredAuditDepth,
    });

    if (!isAllowedMarketingBriefRoute(recommendedRoute)) {
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.MARKETING_INVALID_RECOMMENDATION, MARKETING_INVALID_RECOMMENDATION_MESSAGE),
        );
      return;
    }

    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent'].slice(0, REQUEST_FIELD_LIMITS.storedUserAgentMax)
        : null;

    const { data, error } = await supabase
      .from('marketing_brief_submissions')
      .insert({
        name,
        company: company || null,
        website: website || null,
        no_website: noWebsite,
        concern,
        improve,
        urgency,
        contact_method: contactMethod,
        unsure_choice: unsureChoice,
        preferred_audit_depth: unsureChoice || noWebsite ? null : preferredAuditDepth,
        recommended_route: recommendedRoute,
        user_agent: userAgent,
      })
      .select('id, created_at, recommended_route')
      .single();

    if (error) {
      logger.error('marketing_brief.insert_failed', { component: 'marketing-brief', error: error.message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.MARKETING_SAVE_FAILED, MARKETING_SAVE_FAILED_MESSAGE));
      return;
    }

    await emitStructuredNotification({
      category: 'intake',
      event: 'marketing_brief_submitted',
      priority: 'medium',
      audience: 'consultants',
      title: 'Marketing brief submitted',
      message: `${name}${company ? ` (${company})` : ''} — suggested route: ${recommendedRoute}`,
      route: '/admin/requests',
      payload: {
        actor_role: 'client',
        recommended_route: recommendedRoute,
      },
    });

    res.status(201).json({
      id: data.id,
      created_at: data.created_at,
      recommended_route: data.recommended_route,
    });
  } catch (err) {
    logger.error('marketing_brief.exception', { component: 'marketing-brief', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.MARKETING_SAVE_FAILED, MARKETING_SAVE_FAILED_MESSAGE));
  }
});
