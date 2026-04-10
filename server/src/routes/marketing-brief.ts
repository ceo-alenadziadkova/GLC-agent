/**
 * POST /api/marketing/brief — public — short lead form from marketing site.
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { marketingBriefPublicLimiter } from '../middleware/rate-limit.js';
import { emitStructuredNotification } from '../services/notifications.js';
import { logger } from '../services/logger.js';

export const marketingRouter = Router();

const ROUTES = new Set(['/snapshot', '/express-audit', '/audit', '/discovery']);

function clampStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function computeRecommendedRoute(body: {
  unsure_choice: boolean;
  no_website: boolean;
  urgency: string;
}): string {
  if (body.unsure_choice) return '/snapshot';
  if (body.no_website) return '/discovery';
  const u = body.urgency.toLowerCase();
  if (u.includes('urgent') || u.includes('2 weeks') || u.includes('two weeks')) {
    return '/express-audit';
  }
  return '/audit';
}

marketingRouter.post('/brief', marketingBriefPublicLimiter, async (req, res) => {
  try {
    const name = clampStr(req.body?.name, 200);
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const company = clampStr(req.body?.company, 200);
    const noWebsite = Boolean(req.body?.no_website);
    const website = noWebsite ? '' : clampStr(req.body?.website, 500);
    const concern = clampStr(req.body?.concern, 2000);
    const improve = clampStr(req.body?.improve, 2000);
    const urgency = clampStr(req.body?.urgency, 120);
    const contactMethod = clampStr(req.body?.contact_method, 200);
    const unsureChoice = Boolean(req.body?.unsure_choice);

    if (!noWebsite && !website) {
      res.status(400).json({ error: 'Provide a website URL or mark no website' });
      return;
    }

    const recommendedRoute = computeRecommendedRoute({
      unsure_choice: unsureChoice,
      no_website: noWebsite,
      urgency,
    });

    if (!ROUTES.has(recommendedRoute)) {
      res.status(500).json({ error: 'Invalid recommendation' });
      return;
    }

    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 512) : null;

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
        recommended_route: recommendedRoute,
        user_agent: userAgent,
      })
      .select('id, created_at, recommended_route')
      .single();

    if (error) {
      logger.error('marketing_brief.insert_failed', { component: 'marketing-brief', error: error.message });
      res.status(500).json({ error: 'Failed to save brief' });
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
    res.status(500).json({ error: 'Failed to save brief' });
  }
});
