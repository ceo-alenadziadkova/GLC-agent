import { supabase } from './supabase.js';
import type { DomainKey, ReconData } from '../types/audit.js';
import { getDomainWeight } from '../config/industry-weights.js';

export interface AgentContext {
  company_url: string;
  company_name: string | null;
  industry: string | null;
  recon: ReconData | null;
  collected_data: Record<string, Record<string, unknown>>;
  previous_domains: Array<{
    domain_key: string;
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  review_notes: Array<{ phase: number; consultant_notes: string | null; interview_notes: string | null }>;
  domain_weight: number;
  instructions: string;
}

/**
 * Assembles the full context for an agent call.
 * This is Step 2 of the Data-First pipeline: COLLECT → **ASSEMBLE** → CALL → VERIFY.
 */
export class ContextBuilder {
  async build(
    auditId: string,
    domainKey: DomainKey | 'recon' | 'strategy',
    collectedData: Record<string, Record<string, unknown>>,
    instructions: string
  ): Promise<AgentContext> {
    // Fetch audit meta
    const { data: audit } = await supabase
      .from('audits')
      .select('company_url, company_name, industry')
      .eq('id', auditId)
      .single();

    // Fetch recon data
    const { data: recon } = await supabase
      .from('audit_recon')
      .select('*')
      .eq('audit_id', auditId)
      .single();

    // Fetch completed domain results (for cross-domain context)
    const { data: completedDomains } = await supabase
      .from('audit_domains')
      .select('domain_key, score, summary, strengths, weaknesses')
      .eq('audit_id', auditId)
      .eq('status', 'completed')
      .order('phase_number');

    // Fetch review notes
    const { data: reviews } = await supabase
      .from('review_points')
      .select('after_phase, consultant_notes, interview_notes')
      .eq('audit_id', auditId)
      .eq('status', 'approved');

    const industry = audit?.industry ?? recon?.industry ?? null;

    return {
      company_url: audit?.company_url ?? '',
      company_name: audit?.company_name ?? recon?.company_name ?? null,
      industry,
      recon: recon as ReconData | null,
      collected_data: collectedData,
      previous_domains: (completedDomains ?? []).map(d => ({
        domain_key: d.domain_key,
        score: d.score ?? 0,
        summary: d.summary ?? '',
        strengths: (d.strengths as string[]) ?? [],
        weaknesses: (d.weaknesses as string[]) ?? [],
      })),
      review_notes: (reviews ?? []).map(r => ({
        phase: r.after_phase,
        consultant_notes: r.consultant_notes,
        interview_notes: r.interview_notes,
      })),
      domain_weight: typeof domainKey === 'string' && domainKey !== 'recon' && domainKey !== 'strategy'
        ? getDomainWeight(industry, domainKey)
        : 1,
      instructions,
    };
  }

  /**
   * Formats context into a structured prompt string for Claude.
   */
  formatPrompt(ctx: AgentContext): string {
    const sections: string[] = [];

    // Company profile
    sections.push(`## Company Profile
- **URL:** ${ctx.company_url}
- **Name:** ${ctx.company_name ?? 'Unknown'}
- **Industry:** ${ctx.industry ?? 'Not determined'}
- **Domain weight for this industry:** ${ctx.domain_weight}x`);

    // Recon summary
    if (ctx.recon && ctx.recon.status === 'completed') {
      const recon = ctx.recon;
      sections.push(`## Reconnaissance Data
- **Tech Stack:** ${JSON.stringify(recon.tech_stack)}
- **Languages:** ${(recon.languages as string[]).join(', ')}
- **Pages Crawled:** ${(recon.pages_crawled as unknown[]).length}
- **Social Profiles:** ${JSON.stringify(recon.social_profiles)}
- **Contact Info:** ${JSON.stringify(recon.contact_info)}`);
    }

    // Collected raw data
    if (Object.keys(ctx.collected_data).length > 0) {
      sections.push('## Collected Data (Raw Analysis)');
      for (const [key, data] of Object.entries(ctx.collected_data)) {
        sections.push(`### ${key}\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
      }
    }

    // Previous domain results
    if (ctx.previous_domains.length > 0) {
      sections.push('## Previous Domain Analysis Results');
      for (const domain of ctx.previous_domains) {
        sections.push(`### ${domain.domain_key} (Score: ${domain.score}/5)
${domain.summary}
- Strengths: ${domain.strengths.join('; ')}
- Weaknesses: ${domain.weaknesses.join('; ')}`);
      }
    }

    // Review notes
    const notesWithContent = ctx.review_notes.filter(n => n.consultant_notes || n.interview_notes);
    if (notesWithContent.length > 0) {
      sections.push('## Consultant & Interview Notes');
      for (const note of notesWithContent) {
        if (note.consultant_notes) {
          sections.push(`**Consultant notes (after phase ${note.phase}):** ${note.consultant_notes}`);
        }
        if (note.interview_notes) {
          sections.push(`**Client interview (after phase ${note.phase}):** ${note.interview_notes}`);
        }
      }
    }

    // Instructions
    sections.push(`## Your Task\n${ctx.instructions}`);

    return sections.join('\n\n');
  }
}
