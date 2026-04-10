import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSentry, Sentry } from './config/sentry.js';
import { auditsRouter } from './routes/audits.js';
import { pipelineRouter } from './routes/pipeline.js';
import { reportsRouter } from './routes/reports.js';
import { logRouter } from './routes/log.js';
import { snapshotRouter } from './routes/snapshot.js';
import { intakeRouter } from './routes/intake.js';
import { intakeTraceToolRouter } from './routes/intake-trace-tool.js';
import { discoverRouter } from './routes/discover.js';
import { marketingRouter } from './routes/marketing-brief.js';
import { auditRequestsRouter } from './routes/audit-requests.js';
import { analyticsRouter } from './routes/analytics.js';
import { notificationsRouter } from './routes/notifications.js';
import { profileRouter } from './routes/profile.js';
import { platformRouter } from './routes/platform.js';
import { traceMiddleware } from './middleware/trace.js';
import { requestLogMiddleware } from './middleware/request-log.js';
import { logger } from './services/logger.js';
import { startAlertsWorker } from './services/alerts.js';
import { updateContext } from './services/observability-context.js';
import { getCorsAllowedOrigins } from './config/cors-origins.js';
import { assertSnapshotGuestSaltIfProduction } from './lib/guest-session.js';
import { recoverStalledPipelines } from './services/pipeline.js';
import { startPipelineWorker } from './services/pipeline-jobs.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
initSentry();

const corsAllowedOrigins = getCorsAllowedOrigins();
if (process.env.NODE_ENV === 'production' && corsAllowedOrigins.length === 0) {
  logger.warn('CORS allowlist is empty: set ALLOWED_ORIGINS and/or FRONTEND_URL or browser API calls will fail CORS');
}

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
app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use((req, _res, next) => {
  const auditId = req.params?.id;
  updateContext({ auditId: typeof auditId === 'string' ? auditId : undefined });
  next();
});

// Sensitive API responses must not be cached by shared proxies or browsers.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/health') {
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
});

// ─── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────────────────────
app.use('/api/profile', profileRouter);
app.use('/api/platform', platformRouter);
app.use('/api/snapshot', snapshotRouter);          // Public snapshot + guest cookie; POST /claim uses JWT
app.use('/api/intake', intakeRouter);               // Public token GET/respond; POST requires consultant auth
app.use('/api/intake-trace-tool', intakeTraceToolRouter); // Consultant: trace tool telemetry + wording drafts
app.use('/api/discover', discoverRouter);           // Public submit/load; consultant sessions/convert
app.use('/api/marketing', marketingRouter);         // Public marketing brief
app.use('/api/audit-requests', auditRequestsRouter); // Client portal requests
app.use('/api/analytics', analyticsRouter);          // Consultant analytics
app.use('/api/notifications', notificationsRouter);  // In-app notification center
app.use('/api/audits', auditsRouter);
app.use('/api/audits', pipelineRouter);
app.use('/api/audits', reportsRouter);
app.use('/api/log', logRouter);

// ─── Error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  Sentry.captureException(err);
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json(
    isProd ? { error: 'Internal server error' } : { error: 'Internal server error', message: err.message },
  );
});

// ─── Start ─────────────────────────────────────────────────
try {
  assertSnapshotGuestSaltIfProduction();
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  logger.error('Snapshot guest configuration invalid', { error: msg });
  process.exit(1);
}

// Bind 0.0.0.0 so Docker / Railway edge can reach the process (not only loopback).
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started', {
    port: PORT,
    env: process.env.NODE_ENV ?? 'development',
  });
  void recoverStalledPipelines().then((count) => {
    if (count > 0) {
      logger.warn('Recovered stalled pipelines on startup', { stalled_count: count });
    }
  });
  startPipelineWorker();
  startAlertsWorker();
});

export { app };
