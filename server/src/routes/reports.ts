import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rate-limit.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';
import { reportProfiler, REPORT_PROFILES, type ReportProfile } from '../services/report-profiler.js';
import { pdfGenerator } from '../services/pdf-generator.js';
import { logger } from '../services/logger.js';

export const reportsRouter = Router();

reportsRouter.use(generalLimiter);
reportsRouter.use(requireAuth);

// ─── GET /api/audits/:id/report — Generate report ──────────
// ?format=json|markdown|csv|pdf  (default: json)
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
    const uid = req.userId!;
    const userFilter = safeOrUserFilter(uid);
    const [auditRes, reconRes, domainsRes, strategyRes] = await Promise.allSettled([
      supabase.from('audits').select('*').eq('id', id).or(userFilter).single(),
      supabase.from('audit_recon').select('*').eq('audit_id', id).single(),
      supabase.from('audit_domains').select('*').eq('audit_id', id).order('phase_number'),
      supabase.from('audit_strategy').select('*').eq('audit_id', id).single(),
    ]);

    const auditData = auditRes.status === 'fulfilled' ? auditRes.value : null;
    if (!auditData?.data) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const audit    = auditData.data;
    const recon    = reconRes.status === 'fulfilled' ? (reconRes.value.data ?? null) : null;
    const strategy = strategyRes.status === 'fulfilled' ? (strategyRes.value.data ?? null) : null;

    // Deduplicate domains by domain_key, keeping highest version
    const domainsRaw = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
    const latestByKey = new Map<string, (typeof domainsRaw)[0]>();
    for (const d of domainsRaw) {
      const prev = latestByKey.get(d.domain_key);
      if (!prev || (d.version ?? 0) > (prev.version ?? 0)) latestByKey.set(d.domain_key, d);
    }
    const domains = Array.from(latestByKey.values()).sort(
      (a, b) => (a.phase_number ?? 0) - (b.phase_number ?? 0)
    );

    const input = { audit, recon, domains, strategy };

    // ── PDF export ───────────────────────────────────────
    if (format === 'pdf') {
      const company = recon?.company_name ?? audit.company_url;
      const filename = `audit-report-${company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
      const pdfBuffer = await pdfGenerator.generate(input, profile);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
      return;
    }

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
    const e = err as Error;
    logger.error('route.report_failed', { component: 'reports', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to generate report' });
  }
});
