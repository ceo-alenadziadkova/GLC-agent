import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { auditsRouter } from './routes/audits.js';
import { pipelineRouter } from './routes/pipeline.js';
import { reportsRouter } from './routes/reports.js';
import { logRouter } from './routes/log.js';
import { snapshotRouter } from './routes/snapshot.js';
import { auditRequestsRouter } from './routes/audit-requests.js';
import { requireAuth, attachProfile, type AuthRequest } from './middleware/auth.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ─── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Profile endpoint ──────────────────────────────────────
// GET /api/profile — returns the current user's profile.
// Running requireAuth + attachProfile upserts the profile row if it doesn't
// exist yet (handles existing users created before migration 005).
app.get('/api/profile', requireAuth, attachProfile, (req: AuthRequest, res) => {
  res.json({
    id: req.userId,
    role: req.userRole,
    email: req.userEmail,
  });
});

// ─── Routes ────────────────────────────────────────────────
app.use('/api/snapshot', snapshotRouter);          // Public — no auth
app.use('/api/audit-requests', auditRequestsRouter); // Client portal requests
app.use('/api/audits', auditsRouter);
app.use('/api/audits', pipelineRouter);
app.use('/api/audits', reportsRouter);
app.use('/api/log', logRouter);

// ─── Error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[GLC Server] Running on http://localhost:${PORT}`);
  console.log(`[GLC Server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export { app };
