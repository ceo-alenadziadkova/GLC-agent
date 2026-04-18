import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_ANALYTICS_ACCEPT_FAILED_MESSAGE,
  DISCOVER_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
  DISCOVER_ANALYTICS_STORE_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { INTAKE_ANALYTICS_INTAKE_VERSIONS_EXPERIMENT_VARIANT_KEY } from '../../../config/intake-analytics-discovery-policy.js';
import { intakeAnalyticsDiscoveryBatchSchema } from '../../../schemas/intake-analytics-events.js';
import { supabase } from '../../../services/supabase.js';
import { logger } from '../../../services/logger.js';

export async function postDiscoverAnalyticsEventsController(req: Request, res: Response) {
  try {
    const parsed = intakeAnalyticsDiscoveryBatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.DISCOVER_ANALYTICS_PAYLOAD_INVALID,
          DISCOVER_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const body = parsed.data;
    const hasTuple =
      body.intake_versions && Object.values(body.intake_versions).some(v => v != null && v !== '');
    let versions: Record<string, unknown> | null = hasTuple ? { ...body.intake_versions } : null;
    if (body.experiment_variant) {
      versions = {
        ...(versions ?? {}),
        [INTAKE_ANALYTICS_INTAKE_VERSIONS_EXPERIMENT_VARIANT_KEY]: body.experiment_variant,
      };
    }

    const rows = body.events.map(e => ({
      surface: body.surface,
      event_type: e.event_type,
      client_session_id: body.client_session_id,
      discovery_session_token: body.discovery_session_token ?? null,
      question_id: e.question_id ?? null,
      step_index: e.step_index ?? null,
      intake_versions: versions,
      client_ts: e.client_ts ?? null,
    }));

    const { error } = await supabase.from('intake_analytics_events').insert(rows);
    if (error) {
      logger.error('discover.analytics_insert_failed', {
        component: 'discover',
        error: error.message,
      });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_ANALYTICS_STORE_FAILED, DISCOVER_ANALYTICS_STORE_FAILED_MESSAGE));
      return;
    }

    res.status(200).json({ ok: true as const, received: rows.length });
  } catch (err) {
    logger.error('discover.analytics_exception', {
      component: 'discover',
      error: (err as Error).message,
    });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_ANALYTICS_ACCEPT_FAILED, DISCOVER_ANALYTICS_ACCEPT_FAILED_MESSAGE));
  }
}
