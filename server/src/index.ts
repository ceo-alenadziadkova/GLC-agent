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
import { discoverRouter } from './routes/discover.js';
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

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
initSentry();

// ─── Middleware ─────────────────────────────────────────────
app.use(traceMiddleware);
app.use(requestLogMiddleware);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
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
app.use('/api/snapshot', snapshotRouter);          // Public — no auth
app.use('/api/intake', intakeRouter);               // Public token GET/respond; POST requires consultant auth
app.use('/api/discover', discoverRouter);           // Public submit/load; consultant sessions/convert
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
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    env: process.env.NODE_ENV ?? 'development',
  });
  startAlertsWorker();
});

export { app };
