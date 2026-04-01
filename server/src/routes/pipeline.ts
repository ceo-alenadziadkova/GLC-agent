import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { pipelineLimiter } from '../middleware/rate-limit.js';
import { PipelineOrchestrator } from '../services/pipeline.js';
import { maxPhaseForMode, type ProductMode } from '../types/audit.js';
import { logger } from '../services/logger.js';
import { evaluateBriefGates } from '../services/brief-validator.js';

/**
 * Emit an error event to pipeline_events and mark audit as failed.
 * Used as a catch handler for fire-and-forget phase runs.
 *
 * [C4] Wrapped in try-catch: if Supabase is unreachable during error handling,
 * we log to console instead of throwing an unhandled rejection.
 */
async function emitPhaseError(auditId: string, phase: number, err: Error): Promise<void> {
  logger.error('Pipeline phase crashed', { audit_id: auditId, phase, error: err.message });
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
    logger.error('Failed to write pipeline error event', { audit_id: auditId, phase, error: (dbErr as Error).message });
  }
}

export const pipelineRouter = Router();

// All pipeline mutation routes require consultant role.
// Status endpoint is readable by any authenticated user (client progress tracking).
const consultantGuard = [requireAuth, attachProfile, requireRole('consultant')] as const;

// ─── POST /api/audits/:id/pipeline/start — Start pipeline ──
pipelineRouter.post('/:id/pipeline/start', ...consultantGuard, pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    // Verify ownership
    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, current_phase, tokens_used, token_budget, updated_at, product_mode')
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

    const { data: claimedStart } = await supabase
      .from('audits')
      .update({ status: 'recon', current_phase: 0 })
      .eq('id', id)
      .eq('user_id', req.userId!)
      .eq('status', 'created')
      .eq('updated_at', audit.updated_at)
      .select('id');
    if (!claimedStart || claimedStart.length === 0) {
      res.status(409).json({ error: 'Pipeline start already claimed by another request' });
      return;
    }

    // Include intake progress contract so UI can render readiness state.
    const { data: brief } = await supabase
      .from('intake_brief')
      .select('responses')
      .eq('audit_id', id)
      .single();
    const gates = evaluateBriefGates((brief?.responses as Record<string, unknown>) ?? {}, (audit.product_mode as ProductMode) ?? 'full');

    // Start pipeline (runs Phase 0: Recon)
    res.json({ status: 'started', phase: 0, intakeProgress: gates.intakeProgress });

    // Run asynchronously — surface errors to frontend via pipeline_events
    const orchestrator = new PipelineOrchestrator(id);
    orchestrator.startPhase(0).catch(err => emitPhaseError(id, 0, err as Error));
  } catch (err) {
    logger.error('Pipeline start route failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to start pipeline' });
  }
});

// ─── POST /api/audits/:id/pipeline/next — Run next phase ───
pipelineRouter.post('/:id/pipeline/next', ...consultantGuard, pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, current_phase, tokens_used, token_budget, product_mode, updated_at')
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

    // [C4] Concurrent phase lock: reject if a phase is actively executing.
    // DB constraint has no 'running' status — orchestrator uses 'recon'/'auto'/'analytic'/'strategy'.
    const PHASE_ACTIVE_STATUSES = ['recon', 'auto', 'analytic', 'strategy'] as const;
    if ((PHASE_ACTIVE_STATUSES as readonly string[]).includes(audit.status)) {
      res.status(409).json({ error: 'A phase is already in progress', status: audit.status });
      return;
    }

    const mode = (audit.product_mode ?? 'full') as ProductMode;
    const maxPhase = maxPhaseForMode(mode);
    const nextPhase = audit.current_phase + 1;

    if (nextPhase > maxPhase) {
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

    const { data: claimedNext } = await supabase
      .from('audits')
      .update({ status: String(audit.status) })
      .eq('id', id)
      .eq('user_id', req.userId!)
      .eq('updated_at', audit.updated_at)
      .select('id');
    if (!claimedNext || claimedNext.length === 0) {
      res.status(409).json({ error: 'Next phase request already claimed by another request' });
      return;
    }

    res.json({ status: 'running', phase: nextPhase });

    // Run asynchronously — runBlock() handles parallel wings internally.
    // Surface errors to frontend via pipeline_events.
    const orchestrator = new PipelineOrchestrator(id);
    orchestrator.runBlock().catch(err => emitPhaseError(id, nextPhase, err as Error));
  } catch (err) {
    logger.error('Pipeline next route failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to run next phase' });
  }
});

// ─── POST /api/audits/:id/pipeline/retry — Retry failed phase
pipelineRouter.post('/:id/pipeline/retry', ...consultantGuard, pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { phase } = req.body;

    if (phase === undefined || typeof phase !== 'number') {
      res.status(400).json({ error: 'phase is required (number)' });
      return;
    }
    if (!Number.isInteger(phase) || phase < 0 || phase > 7) {
      res.status(400).json({ error: 'phase must be an integer between 0 and 7' });
      return;
    }

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, tokens_used, token_budget, product_mode, updated_at')
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

    const retryMode = (audit.product_mode ?? 'full') as ProductMode;
    if (phase > maxPhaseForMode(retryMode)) {
      res.status(400).json({ error: `Phase ${phase} is not available for product_mode '${retryMode}'` });
      return;
    }

    // [C4] Concurrent phase lock — same guard as /next
    const PHASE_ACTIVE_STATUSES = ['recon', 'auto', 'analytic', 'strategy'] as const;
    if ((PHASE_ACTIVE_STATUSES as readonly string[]).includes(audit.status)) {
      res.status(409).json({ error: 'A phase is already in progress', status: audit.status });
      return;
    }

    const { data: claimedRetry } = await supabase
      .from('audits')
      .update({ status: String(audit.status) })
      .eq('id', id)
      .eq('user_id', req.userId!)
      .eq('updated_at', audit.updated_at)
      .select('id');
    if (!claimedRetry || claimedRetry.length === 0) {
      res.status(409).json({ error: 'Retry request already claimed by another request' });
      return;
    }

    res.json({ status: 'retrying', phase });

    // Run asynchronously — surface errors to frontend via pipeline_events
    const orchestrator = new PipelineOrchestrator(id);
    orchestrator.startPhase(phase).catch(err => emitPhaseError(id, phase as number, err as Error));
  } catch (err) {
    logger.error('Pipeline retry route failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to retry phase' });
  }
});

// ─── GET /api/audits/:id/pipeline/status — Pipeline status ──
// Readable by any authenticated user (clients track their own audit progress)
pipelineRouter.get('/:id/pipeline/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const [auditRes, eventsRes, reviewsRes] = await Promise.all([
      supabase.from('audits')
        .select('status, current_phase, tokens_used, token_budget, product_mode')
        .eq('id', id)
        .or(`user_id.eq.${req.userId!},client_id.eq.${req.userId!}`)
        .single(),
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

// ─── GET /api/audits/:id/quality-gate/:phase — Fetch quality gate report ──
pipelineRouter.get('/:id/quality-gate/:phase', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const phase = parseInt(req.params.phase as string);

    // Verify audit is accessible to this user (consultant or client)
    const { data: audit } = await supabase
      .from('audits')
      .select('id')
      .eq('id', id)
      .or(`user_id.eq.${req.userId!},client_id.eq.${req.userId!}`)
      .single();

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const { data: event } = await supabase
      .from('pipeline_events')
      .select('data, created_at')
      .eq('audit_id', id)
      .eq('phase', phase)
      .eq('event_type', 'quality_gate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!event) {
      res.json(null);
      return;
    }

    res.json(event.data);
  } catch (err) {
    console.error('[GET /quality-gate/:phase]', err);
    res.status(500).json({ error: 'Failed to fetch quality gate report' });
  }
});

// ─── POST /api/audits/:id/reviews/:phase — Approve review ──
pipelineRouter.post('/:id/reviews/:phase', ...consultantGuard, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const phase = req.params.phase as string;
    const { consultant_notes, interview_notes } = req.body;

    const MAX_NOTES_LENGTH = 5000;
    const sanitizedConsultantNotes = consultant_notes
      ? String(consultant_notes).trim().slice(0, MAX_NOTES_LENGTH) || null
      : null;
    const sanitizedInterviewNotes = interview_notes
      ? String(interview_notes).trim().slice(0, MAX_NOTES_LENGTH) || null
      : null;

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

    // ── Quality gate enforcement ───────────────────────────────────────
    // If this gate has warning-level flags, consultant notes are required.
    // This prevents silent approval of low-confidence or miscalibrated findings.
    const { data: qgEvent } = await supabase
      .from('pipeline_events')
      .select('data')
      .eq('audit_id', id)
      .eq('phase', parseInt(phase))
      .eq('event_type', 'quality_gate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (qgEvent?.data) {
      const qgReport = qgEvent.data as { passed: boolean; flags: Array<{ severity: string }> };
      const hasWarnings = !qgReport.passed && qgReport.flags.some(f => f.severity === 'warning');
      if (hasWarnings && !sanitizedConsultantNotes) {
        res.status(400).json({
          error: 'quality_gate_requires_notes',
          message: 'This review gate has quality warnings. Consultant notes are required to acknowledge them before approving.',
        });
        return;
      }
    }

    const { data, error } = await supabase
      .from('review_points')
      .update({
        status: 'approved',
        consultant_notes: sanitizedConsultantNotes,
        interview_notes: sanitizedInterviewNotes,
        approved_at: new Date().toISOString(),
      })
      .eq('audit_id', id)
      .eq('after_phase', parseInt(phase))
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(200).json({ status: 'already_approved' });
      return;
    }

    // Emit event
    await supabase.from('pipeline_events').insert({
      audit_id: id,
      phase: parseInt(phase),
      event_type: 'review_approved',
      message: `Review point after phase ${phase} approved`,
      data: { consultant_notes: sanitizedConsultantNotes, interview_notes: sanitizedInterviewNotes },
    });

    res.json(data);
  } catch (err) {
    console.error('[POST /reviews/:phase]', err);
    res.status(500).json({ error: 'Failed to approve review' });
  }
});
