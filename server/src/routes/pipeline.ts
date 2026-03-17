import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { pipelineLimiter } from '../middleware/rate-limit.js';
import { PipelineOrchestrator } from '../services/pipeline.js';

/**
 * Emit an error event to pipeline_events and mark audit as failed.
 * Used as a catch handler for fire-and-forget phase runs.
 *
 * [C4] Wrapped in try-catch: if Supabase is unreachable during error handling,
 * we log to console instead of throwing an unhandled rejection.
 */
async function emitPhaseError(auditId: string, phase: number, err: Error): Promise<void> {
  console.error(`[Pipeline ${auditId}] Phase ${phase} crashed:`, err.message);
  try {
    await Promise.all([
      supabase.from('pipeline_events').insert({
        audit_id: auditId,
        phase,
        event_type: 'error',
        message: err.message ?? 'Phase failed unexpectedly',
        data: { error: err.message, stack: err.stack?.split('\n')[1]?.trim() ?? '' },
      }),
      supabase.from('audits')
        .update({ status: 'failed' })
        .eq('id', auditId),
    ]);
  } catch (dbErr) {
    // DB unavailable — already logged to console above, don't rethrow
    console.error(`[Pipeline ${auditId}] Failed to write error event to DB:`, dbErr);
  }
}

export const pipelineRouter = Router();

pipelineRouter.use(requireAuth);

// ─── POST /api/audits/:id/pipeline/start — Start pipeline ──
pipelineRouter.post('/:id/pipeline/start', pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Verify ownership
    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, current_phase, tokens_used, token_budget')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    if (audit.status !== 'created') {
      res.status(400).json({ error: 'Pipeline already started', status: audit.status });
      return;
    }

    // Check token budget
    if (audit.tokens_used >= audit.token_budget) {
      res.status(400).json({ error: 'Token budget exceeded' });
      return;
    }

    // Start pipeline (runs Phase 0: Recon)
    res.json({ status: 'started', phase: 0 });

    // Run asynchronously — surface errors to frontend via pipeline_events
    const orchestrator = new PipelineOrchestrator(id);
    orchestrator.startPhase(0).catch(err => emitPhaseError(id, 0, err as Error));
  } catch (err) {
    console.error('[POST /pipeline/start]', err);
    res.status(500).json({ error: 'Failed to start pipeline' });
  }
});

// ─── POST /api/audits/:id/pipeline/next — Run next phase ───
pipelineRouter.post('/:id/pipeline/next', pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, current_phase, tokens_used, token_budget')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    if (audit.tokens_used >= audit.token_budget) {
      res.status(400).json({ error: 'Token budget exceeded', tokens_used: audit.tokens_used, token_budget: audit.token_budget });
      return;
    }

    // [C4] Concurrent phase lock: reject if a phase is already running
    if (audit.status === 'running') {
      res.status(409).json({ error: 'A phase is already in progress', status: audit.status });
      return;
    }

    const nextPhase = audit.current_phase + 1;

    if (nextPhase > 7) {
      res.status(400).json({ error: 'All phases completed' });
      return;
    }

    // Check if review point is pending
    const { data: pendingReview } = await supabase
      .from('review_points')
      .select('*')
      .eq('audit_id', id)
      .eq('after_phase', audit.current_phase)
      .eq('status', 'pending')
      .single();

    if (pendingReview) {
      res.status(400).json({
        error: 'Review point pending',
        review_after_phase: audit.current_phase,
        message: 'Approve the review point before proceeding to the next phase',
      });
      return;
    }

    res.json({ status: 'running', phase: nextPhase });

    // Run asynchronously — surface errors to frontend via pipeline_events
    const orchestrator = new PipelineOrchestrator(id);
    orchestrator.startPhase(nextPhase).catch(err => emitPhaseError(id, nextPhase, err as Error));
  } catch (err) {
    console.error('[POST /pipeline/next]', err);
    res.status(500).json({ error: 'Failed to run next phase' });
  }
});

// ─── POST /api/audits/:id/pipeline/retry — Retry failed phase
pipelineRouter.post('/:id/pipeline/retry', pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { phase } = req.body;

    if (phase === undefined || typeof phase !== 'number') {
      res.status(400).json({ error: 'phase is required (number)' });
      return;
    }

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, tokens_used, token_budget')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    if (audit.tokens_used >= audit.token_budget) {
      res.status(400).json({ error: 'Token budget exceeded' });
      return;
    }

    // [C4] Concurrent phase lock: reject if a phase is already running
    if (audit.status === 'running') {
      res.status(409).json({ error: 'A phase is already in progress', status: audit.status });
      return;
    }

    res.json({ status: 'retrying', phase });

    // Run asynchronously — surface errors to frontend via pipeline_events
    const orchestrator = new PipelineOrchestrator(id);
    orchestrator.startPhase(phase).catch(err => emitPhaseError(id, phase as number, err as Error));
  } catch (err) {
    console.error('[POST /pipeline/retry]', err);
    res.status(500).json({ error: 'Failed to retry phase' });
  }
});

// ─── GET /api/audits/:id/pipeline/status — Pipeline status ──
pipelineRouter.get('/:id/pipeline/status', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const [auditRes, eventsRes, reviewsRes] = await Promise.all([
      supabase.from('audits')
        .select('status, current_phase, tokens_used, token_budget')
        .eq('id', id).eq('user_id', req.userId!).single(),
      supabase.from('pipeline_events')
        .select('*')
        .eq('audit_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('review_points')
        .select('*')
        .eq('audit_id', id)
        .order('after_phase'),
    ]);

    if (auditRes.error || !auditRes.data) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    res.json({
      ...auditRes.data,
      events: eventsRes.data ?? [],
      reviews: reviewsRes.data ?? [],
    });
  } catch (err) {
    console.error('[GET /pipeline/status]', err);
    res.status(500).json({ error: 'Failed to get pipeline status' });
  }
});

// ─── POST /api/audits/:id/reviews/:phase — Approve review ──
pipelineRouter.post('/:id/reviews/:phase', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const phase = req.params.phase as string;
    const { consultant_notes, interview_notes } = req.body;

    // Verify ownership
    const { data: audit } = await supabase
      .from('audits')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const { data, error } = await supabase
      .from('review_points')
      .update({
        status: 'approved',
        consultant_notes: consultant_notes || null,
        interview_notes: interview_notes || null,
        approved_at: new Date().toISOString(),
      })
      .eq('audit_id', id)
      .eq('after_phase', parseInt(phase))
      .select()
      .single();

    if (error) throw error;

    // Emit event
    await supabase.from('pipeline_events').insert({
      audit_id: id,
      phase: parseInt(phase),
      event_type: 'review_approved',
      message: `Review point after phase ${phase} approved`,
      data: { consultant_notes, interview_notes },
    });

    res.json(data);
  } catch (err) {
    console.error('[POST /reviews/:phase]', err);
    res.status(500).json({ error: 'Failed to approve review' });
  }
});
