import 'dotenv/config';
import { GLC_DEV_API_PORT } from '@glc/dev-brand-defaults';
import express from 'express';
import cors from 'cors';
import { initSentry, Sentry } from './config/sentry.js';
import { traceMiddleware } from './middleware/trace.js';
import { requestLogMiddleware } from './middleware/request-log.js';
import { logger } from './services/logger.js';
import { startAlertsWorker } from './services/alerts.js';
import { updateContext } from './services/observability-context.js';
import { getCorsAllowedOrigins } from './config/cors-origins.js';
import { assertProductionRuntimeConfig } from './config/runtime-assert.js';
import { API_HEALTH_PATH, API_PREFIX, DEFAULT_LISTEN_HOST, getExpressJsonBodyLimit } from './config/http-server.js';
import { mountApiRouters } from './config/api-route-mounts.js';
import { API_ERROR_CODES } from './config/api-error-codes.js';
import { INTERNAL_SERVER_ERROR_MESSAGE } from './config/api-user-messages.en.js';
import { getContext } from './services/observability-context.js';
import { assertSnapshotGuestSaltIfProduction } from './lib/guest-session.js';
import { setStandardSecurityHeaders } from './config/security-headers.js';
import { recoverStalledPipelines } from './services/pipeline.js';
import { startPipelineWorker } from './services/pipeline-jobs.js';
import { startDirectorDeepDiveWorker } from './services/orchestration/run-director-deep-dive.service.js';
import { warnPlatformAdminUserIdsEnvBootstrap } from './lib/platform-admin.js';
import { warnSelfServeAuditOwnerEnvIfSet } from './lib/self-serve-audit-owner.js';
import { getEffectiveFeatureFlagsSnapshot } from './config/feature-flags-snapshot.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? String(GLC_DEV_API_PORT), 10);
/** Bind address: default from static config; override with LISTEN_HOST (e.g. 127.0.0.1) for local hardening. */
const LISTEN_HOST = (process.env.LISTEN_HOST ?? DEFAULT_LISTEN_HOST).trim() || DEFAULT_LISTEN_HOST;
initSentry();
assertProductionRuntimeConfig();
warnPlatformAdminUserIdsEnvBootstrap(logger);
warnSelfServeAuditOwnerEnvIfSet(logger);

const corsAllowedOrigins = getCorsAllowedOrigins();

// ─── Middleware ─────────────────────────────────────────────
app.use(traceMiddleware);
app.use(requestLogMiddleware);
app.use(cors({
  origin: corsAllowedOrigins,
  credentials: true,
  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'RateLimit-Policy',
    'Retry-After',
  ],
}));
app.use(express.json({ limit: getExpressJsonBodyLimit() }));
app.use((_req, res, next) => {
  setStandardSecurityHeaders(res, process.env.NODE_ENV === 'production');
  next();
});
app.use((req, _res, next) => {
  const fromParams = req.params?.id;
  const fromPath = req.path.match(/^\/api\/audits\/([^/]+)/)?.[1];
  const fromBody = typeof req.body?.audit_id === 'string' ? req.body.audit_id : undefined;
  const auditId = fromParams ?? fromPath ?? fromBody;
  updateContext({ auditId: typeof auditId === 'string' ? auditId : undefined });
  next();
});

// Sensitive API responses must not be cached by shared proxies or browsers.
app.use((req, res, next) => {
  if (req.path.startsWith(`${API_PREFIX}/`) && req.path !== API_HEALTH_PATH) {
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
});

// ─── Health check ──────────────────────────────────────────
app.get(API_HEALTH_PATH, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API routes (prefixes: `config/api-route-mounts.ts`) ───
mountApiRouters(app);

// ─── Error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  Sentry.captureException(err);
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const traceId = getContext()?.traceId;
  res.status(500).json({
    code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
    error: INTERNAL_SERVER_ERROR_MESSAGE,
    ...(traceId ? { request_id: traceId } : {}),
  });
});

// ─── Start ─────────────────────────────────────────────────
try {
  assertSnapshotGuestSaltIfProduction();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  logger.error('Snapshot guest configuration invalid', { error: msg });
  process.exit(1);
}

app.listen(PORT, LISTEN_HOST, () => {
  const featureFlags = getEffectiveFeatureFlagsSnapshot();
  logger.info('Server started', {
    port: PORT,
    host: LISTEN_HOST,
    env: process.env.NODE_ENV ?? 'development',
  });
  logger.info('feature_flags.effective_snapshot', {
    component: 'bootstrap',
    ...featureFlags,
  });
  void recoverStalledPipelines().then((count) => {
    if (count > 0) {
      logger.warn('Recovered stalled pipelines on startup', { stalled_count: count });
    }
  });
  startPipelineWorker();
  startDirectorDeepDiveWorker();
  startAlertsWorker();
});

export { app };
