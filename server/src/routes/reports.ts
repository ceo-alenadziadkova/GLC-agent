import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, rejectGuestFromPortal, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter, reportPdfLimiter } from '../middleware/rate-limit.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';
import { reportProfiler, REPORT_PROFILES, type ReportProfile } from '../services/report-profiler.js';
import { pdfGenerator } from '../services/pdf-generator.js';
import { PdfRenderSizeLimitError, PdfRenderTimeoutError } from '../services/pdf-generator/pdf-generator-class.js';
import { logger } from '../services/logger.js';
import { notifyAuditParticipantsExcept } from '../services/notifications.js';
import {
  REPORTS_ARTIFACT_READY_NOTIFICATION_TITLE,
  REPORTS_CSV_READY_NOTIFICATION_MESSAGE,
  REPORTS_PDF_READY_NOTIFICATION_MESSAGE,
} from '../config/route-notification-messages.js';
import {
  API_ERROR_CODES,
  REPORTS_AUDIT_NOT_FOUND_MESSAGE,
  REPORTS_GENERATE_FAILED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import { validatePdfReportInput } from '../services/pdf-generator/lib/pdf-input-guard.js';

export const reportsRouter = Router();
const REPORT_FORMATS = ['json', 'markdown', 'csv', 'pdf'] as const;

reportsRouter.use(generalLimiter);
reportsRouter.use(requireAuth);

function buildSafeExportFilename(prefix: string, candidate: string): string {
  const slug = candidate.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
  const fallback = slug.length > 0 ? slug : 'audit';
  return `${prefix}-${fallback}`;
}

// ─── GET /api/audits/:id/report — Generate report ──────────
// ?format=json|markdown|csv|pdf  (default: json)
// ?profile=full|owner|tech|marketing|onepager  (default: full)
reportsRouter.get('/:id/report', attachProfile, rejectGuestFromPortal, reportPdfLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const rawProfile = String(req.query.profile ?? 'full');
    const profile: ReportProfile = (REPORT_PROFILES as string[]).includes(rawProfile)
      ? (rawProfile as ReportProfile)
      : 'full';
    const format = String(req.query.format ?? 'json');
    if (!REPORT_FORMATS.includes(format as (typeof REPORT_FORMATS)[number])) {
      res.status(400).json(
        apiErrorJson(API_ERROR_CODES.REPORTS_GENERATE_FAILED, REPORTS_GENERATE_FAILED_MESSAGE, {
          reason: 'unsupported_format',
          allowed_formats: REPORT_FORMATS,
        }),
      );
      return;
    }

    // Pre-auth short-circuit: reject unauthorized/not-found before fan-out reads.
    const uid = req.userId!;
    const userFilter = safeOrUserFilter(uid);
    const auditData = await supabase.from('audits').select('*').eq('id', id).or(userFilter).single();
    if (!auditData.data) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.REPORTS_AUDIT_NOT_FOUND, REPORTS_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    // Fetch related audit state — allSettled so a missing recon/strategy
    // doesn't prevent the rest of the report from rendering.
    const [reconRes, domainsRes, strategyRes, briefRes] = await Promise.allSettled([
      supabase.from('audit_recon').select('*').eq('audit_id', id).single(),
      supabase.from('audit_domains').select('*').eq('audit_id', id).order('phase_number'),
      supabase.from('audit_strategy').select('*').eq('audit_id', id).single(),
      supabase.from('intake_brief').select('responses').eq('audit_id', id).maybeSingle(),
    ]);

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

    const briefResponses =
      briefRes && briefRes.status === 'fulfilled' && briefRes.value?.data?.responses
        ? briefRes.value.data.responses
        : null;
    const input = { audit, recon, domains, strategy, brief_responses: briefResponses };

    // ── PDF export ───────────────────────────────────────
    if (format === 'pdf') {
      const validatedInput = validatePdfReportInput(input);
      if (!validatedInput.ok) {
        logger.warn('route.report_pdf_input_invalid', {
          component: 'reports',
          audit_id: id,
          issues_count: validatedInput.issues.length,
        });
        res
          .status(422)
          .json(
            apiErrorJson(API_ERROR_CODES.REPORTS_GENERATE_FAILED, REPORTS_GENERATE_FAILED_MESSAGE, {
              reason: 'pdf_input_invalid',
            }),
          );
        return;
      }
      const company = recon?.company_name ?? audit.company_url;
      const filename = `${buildSafeExportFilename('audit-report', company)}.pdf`;
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await pdfGenerator.generate(validatedInput.value, profile);
      } catch (error) {
        if (error instanceof PdfRenderTimeoutError) {
          res
            .status(504)
            .json(
              apiErrorJson(API_ERROR_CODES.REPORTS_GENERATE_FAILED, REPORTS_GENERATE_FAILED_MESSAGE, {
                reason: 'pdf_render_timeout',
              }),
            );
          return;
        }
        if (error instanceof PdfRenderSizeLimitError) {
          res
            .status(413)
            .json(
              apiErrorJson(API_ERROR_CODES.REPORTS_GENERATE_FAILED, REPORTS_GENERATE_FAILED_MESSAGE, {
                reason: 'pdf_render_size_limit',
              }),
            );
          return;
        }
        throw error;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(pdfBuffer);
      await notifyAuditParticipantsExcept(
        id,
        'pipeline',
        REPORTS_ARTIFACT_READY_NOTIFICATION_TITLE,
        REPORTS_PDF_READY_NOTIFICATION_MESSAGE,
        [req.userId!],
        {
          audit_id: id,
          artifact: 'report_pdf',
          route: `/reports/${id}`,
          occurred_at: new Date().toISOString(),
          actor_role: 'system',
        },
      );
      return;
    }

    // ── CSV export ────────────────────────────────────────
    if (format === 'csv') {
      const company = recon?.company_name ?? audit.company_url;
      const filename = `${buildSafeExportFilename('action-plan', company)}.csv`;
      const csv = reportProfiler.generateCsv(input);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      await notifyAuditParticipantsExcept(
        id,
        'pipeline',
        REPORTS_ARTIFACT_READY_NOTIFICATION_TITLE,
        REPORTS_CSV_READY_NOTIFICATION_MESSAGE,
        [req.userId!],
        {
          audit_id: id,
          artifact: 'action_plan_csv',
          route: `/reports/${id}`,
          occurred_at: new Date().toISOString(),
          actor_role: 'system',
        },
      );
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
        coverage:      report.coverage,
        idea_stage_readiness: report.idea_stage_readiness,
        markdown:      report.markdown,
      });
    } else {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(report.markdown);
    }
  } catch (err) {
    const e = err as Error;
    logger.error('route.report_failed', { component: 'reports', error: e.message, stack: e.stack });
    if (!res.headersSent) {
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.REPORTS_GENERATE_FAILED, REPORTS_GENERATE_FAILED_MESSAGE));
    }
  }
});
