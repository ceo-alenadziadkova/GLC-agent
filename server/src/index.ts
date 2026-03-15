import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { auditsRouter } from './routes/audits.js';
import { pipelineRouter } from './routes/pipeline.js';
import { reportsRouter } from './routes/reports.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ─── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────────────────────
app.use('/api/audits', auditsRouter);
app.use('/api/audits', pipelineRouter);
app.use('/api/audits', reportsRouter);

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
