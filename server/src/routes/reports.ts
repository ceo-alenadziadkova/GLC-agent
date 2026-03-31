import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { SCORE_LABELS, EXPRESS_DOMAIN_KEYS } from '../types/audit.js';
import { generalLimiter } from '../middleware/rate-limit.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';

export const reportsRouter = Router();

reportsRouter.use(generalLimiter);
reportsRouter.use(requireAuth);

// ─── GET /api/audits/:id/report — Generate markdown report ─
reportsRouter.get('/:id/report', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

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

    const audit = auditData.data;
    const recon = reconRes.status === 'fulfilled' ? (reconRes.value.data ?? null) : null;
    const domainsRaw = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
    const strategy = strategyRes.status === 'fulfilled' ? (strategyRes.value.data ?? null) : null;

    const productMode = String(audit.product_mode ?? 'full');
    const profileParam = String(req.query.profile ?? '').toLowerCase();
    const effectiveProfile =
      profileParam === 'owner' || profileParam === 'full'
        ? profileParam
        : productMode === 'express'
          ? 'owner'
          : 'full';
    const isOwnerLike = effectiveProfile === 'owner';

    const latestByKey = new Map<string, (typeof domainsRaw)[0]>();
    for (const d of domainsRaw) {
      const prev = latestByKey.get(d.domain_key);
      if (!prev || (d.version ?? 0) > (prev.version ?? 0)) latestByKey.set(d.domain_key, d);
    }
    const domainsLatest = Array.from(latestByKey.values()).sort(
      (a, b) => (a.phase_number ?? 0) - (b.phase_number ?? 0)
    );
    let domains = domainsLatest;
    if (isOwnerLike) {
      const allow = new Set(EXPRESS_DOMAIN_KEYS);
      domains = domainsLatest.filter(d => allow.has(d.domain_key as (typeof EXPRESS_DOMAIN_KEYS)[number]));
    }

    const format = String(req.query.format ?? 'markdown');

    if (format === 'csv') {
      const rows = buildActionPlanRows(domainsLatest);
      const header = 'Title,Domain,Type,Priority,Timeframe,EstimatedCost\n';
      const body = rows
        .map(r =>
          [csvEscape(r.title), csvEscape(r.domain), csvEscape(r.type), csvEscape(r.priority), csvEscape(r.timeframe), csvEscape(r.estimatedCost)].join(',')
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${id}-action-plan.csv"`);
      res.send(header + body);
      return;
    }

    // Generate markdown
    const lines: string[] = [];

    const titleSuffix = isOwnerLike ? ' — Express summary' : '';
    lines.push(`# IT Audit Report: ${recon?.company_name ?? audit.company_url}${titleSuffix}`);
    lines.push('');
    lines.push(`**Date:** ${new Date(audit.created_at).toLocaleDateString('en-GB')}`);
    lines.push(`**URL:** ${audit.company_url}`);
    if (recon?.industry) lines.push(`**Industry:** ${recon.industry}`);
    if (recon?.location) lines.push(`**Location:** ${recon.location}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Executive summary (full profile or non-express)
    if (!isOwnerLike && strategy?.executive_summary) {
      lines.push('## Executive Summary');
      lines.push('');
      lines.push(strategy.executive_summary);
      lines.push('');
    }

    // Scorecard
    if (audit.overall_score) {
      lines.push(`## Overall Score: ${audit.overall_score}/5 — ${SCORE_LABELS[Math.round(audit.overall_score)] ?? 'N/A'}`);
      lines.push('');
    }

    lines.push('### Domain Scorecard');
    lines.push('');
    lines.push('| Domain | Score | Status |');
    lines.push('|--------|-------|--------|');

    for (const domain of domains) {
      if (domain.score) {
        const label = domain.label ?? SCORE_LABELS[domain.score] ?? '';
        lines.push(`| ${formatDomainName(domain.domain_key)} | ${domain.score}/5 | ${label} |`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Per-domain sections
    for (const domain of domains) {
      if (domain.status !== 'completed') continue;

      lines.push(`## ${formatDomainName(domain.domain_key)}`);
      lines.push('');

      if (domain.summary) {
        lines.push(domain.summary);
        lines.push('');
      }

      if (!isOwnerLike) {
        const strengths = (domain.strengths ?? []) as string[];
        if (strengths.length > 0) {
          lines.push('### Strengths');
          for (const s of strengths) lines.push(`- ✅ ${s}`);
          lines.push('');
        }

        const weaknesses = (domain.weaknesses ?? []) as string[];
        if (weaknesses.length > 0) {
          lines.push('### Areas for Improvement');
          for (const w of weaknesses) lines.push(`- ⚠️ ${w}`);
          lines.push('');
        }

        const issues = (domain.issues ?? []) as Array<{ severity: string; title: string; description: string }>;
        if (issues.length > 0) {
          lines.push('### Issues Found');
          for (const issue of issues) {
            lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.title}: ${issue.description}`);
          }
          lines.push('');
        }
      }

      const quickWins = (domain.quick_wins ?? []) as Array<{ title: string; description: string; timeframe: string }>;
      const qws = isOwnerLike ? quickWins.slice(0, 3) : quickWins;
      if (qws.length > 0) {
        lines.push('### Quick Wins');
        for (const qw of qws) {
          lines.push(`- 🚀 **${qw.title}** (${qw.timeframe}): ${qw.description}`);
        }
        lines.push('');
      }

      if (!isOwnerLike) {
        const recs = (domain.recommendations ?? []) as Array<{ title: string; description: string; priority: string; estimated_cost: string; estimated_time: string }>;
        if (recs.length > 0) {
          lines.push('### Recommendations');
          for (const rec of recs) {
            lines.push(`- **${rec.title}** [${rec.priority}] — ${rec.description} (Est: ${rec.estimated_cost}, ${rec.estimated_time})`);
          }
          lines.push('');
        }
      }

      lines.push('---');
      lines.push('');
    }

    // Roadmap
    if (!isOwnerLike && strategy) {
      const quickWins = (strategy.quick_wins ?? []) as Array<{ title: string; description: string }>;
      const mediumTerm = (strategy.medium_term ?? []) as Array<{ title: string; description: string }>;
      const strategic = (strategy.strategic ?? []) as Array<{ title: string; description: string }>;

      lines.push('## Strategic Roadmap');
      lines.push('');

      if (quickWins.length > 0) {
        lines.push('### Quick Wins (≤ 1 week)');
        for (const item of quickWins) lines.push(`- ${item.title}: ${item.description}`);
        lines.push('');
      }

      if (mediumTerm.length > 0) {
        lines.push('### Medium Term (~1 month)');
        for (const item of mediumTerm) lines.push(`- ${item.title}: ${item.description}`);
        lines.push('');
      }

      if (strategic.length > 0) {
        lines.push('### Strategic (1-3 months)');
        for (const item of strategic) lines.push(`- ${item.title}: ${item.description}`);
        lines.push('');
      }
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by GLC Audit Platform — glctech.es*');

    if (format === 'json') {
      res.json({
        audit_id: id,
        company: recon?.company_name ?? audit.company_url,
        generated_at: new Date().toISOString(),
        markdown: lines.join('\n'),
      });
    } else {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(lines.join('\n'));
    }
  } catch (err) {
    console.error('[GET /report]', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

function formatDomainName(key: string): string {
  const names: Record<string, string> = {
    tech_infrastructure: 'Tech Infrastructure',
    security_compliance: 'Security & Compliance',
    seo_digital: 'SEO & Digital Presence',
    ux_conversion: 'UX & Conversion',
    marketing_utp: 'Marketing & Positioning',
    automation_processes: 'Automation & Processes',
  };
  return names[key] ?? key;
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildActionPlanRows(
  domains: Array<{
    domain_key: string;
    status?: string;
    quick_wins?: unknown;
    recommendations?: unknown;
  }>
): Array<{ title: string; domain: string; type: string; priority: string; timeframe: string; estimatedCost: string }> {
  const rows: Array<{ title: string; domain: string; type: string; priority: string; timeframe: string; estimatedCost: string }> = [];
  const dk = (k: string) => formatDomainName(k);
  for (const domain of domains) {
    if (domain.status !== 'completed') continue;
    const qws = (domain.quick_wins ?? []) as Array<{ title: string; timeframe?: string }>;
    for (const qw of qws) {
      rows.push({
        title: qw.title ?? '',
        domain: dk(domain.domain_key),
        type: 'Quick Win',
        priority: 'high',
        timeframe: qw.timeframe ?? '',
        estimatedCost: '',
      });
    }
    const recs = (domain.recommendations ?? []) as Array<{
      title: string;
      priority?: string;
      estimated_time?: string;
      estimated_cost?: string;
    }>;
    for (const rec of recs) {
      rows.push({
        title: rec.title ?? '',
        domain: dk(domain.domain_key),
        type: 'Recommendation',
        priority: rec.priority ?? 'medium',
        timeframe: rec.estimated_time ?? '',
        estimatedCost: rec.estimated_cost ?? '',
      });
    }
  }
  return rows;
}
