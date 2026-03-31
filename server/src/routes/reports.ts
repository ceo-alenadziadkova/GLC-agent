import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rate-limit.js';
import { reportProfiler, REPORT_PROFILES, type ReportProfile } from '../services/report-profiler.js';

export const reportsRouter = Router();

reportsRouter.use(generalLimiter);
reportsRouter.use(requireAuth);

// ─── GET /api/audits/:id/report — Generate report ──────────
// ?format=json|markdown|csv  (default: json)
// ?profile=full|owner|tech|marketing|onepager  (default: full)
reportsRouter.get('/:id/report', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const rawProfile = String(req.query.profile ?? 'full');
    const profile: ReportProfile = (REPORT_PROFILES as string[]).includes(rawProfile)
      ? (rawProfile as ReportProfile)
      : 'full';
    const format = String(req.query.format ?? 'json');

    // Fetch full audit state — allSettled so a missing recon/strategy
    // doesn't prevent the rest of the report from rendering.
    const [auditRes, reconRes, domainsRes, strategyRes] = await Promise.allSettled([
      supabase.from('audits').select('*').eq('id', id).eq('user_id', req.userId!).single(),
      supabase.from('audit_recon').select('*').eq('audit_id', id).single(),
      supabase.from('audit_domains').select('*').eq('audit_id', id).order('phase_number'),
      supabase.from('audit_strategy').select('*').eq('audit_id', id).single(),
    ]);

    const auditData = auditRes.status === 'fulfilled' ? auditRes.value : null;
    if (!auditData?.data) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const audit   = auditData.data;
    const recon   = reconRes.status === 'fulfilled' ? (reconRes.value.data ?? null) : null;
    const domains = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
    const strategy = strategyRes.status === 'fulfilled' ? (strategyRes.value.data ?? null) : null;

    const input = { audit, recon, domains, strategy };

    // ── CSV export ────────────────────────────────────────
    if (format === 'csv') {
      const company = recon?.company_name ?? audit.company_url;
      const filename = `action-plan-${company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.csv`;
      const csv = reportProfiler.generateCsv(input);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      return;
    }

    // ── Markdown / JSON report ────────────────────────────
    const report = reportProfiler.generate(input, profile);

    if (format === 'json') {
      res.json({
        audit_id:      id,
        company:       report.company,
        profile:       report.profile,
        profile_label: report.profile_label,
        generated_at:  report.generated_at,
        markdown:      report.markdown,
      });
    } else {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(report.markdown);
    }
  } catch (err) {
    console.error('[GET /report]', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
