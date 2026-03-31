import { supabase } from './supabase.js';
import type { DomainKey, ReconData } from '../types/audit.js';
import { getDomainWeight } from '../config/industry-weights.js';
import { BRIEF_QUESTIONS, getQuestionsForDomain } from '../schemas/intake-brief.js';

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
  /** Answered brief responses relevant to this domain (empty object when no brief) */
  brief_responses: Record<string, string | string[] | number | null>;
  /**
   * Domain keys that failed during a parallel wing run.
   * Passed to Strategy Agent so it can acknowledge gaps in its report.
   */
  failed_domains: string[];
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
    // Fetch audit meta — [C2] check error: missing audit = invalid context, must throw
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('company_url, company_name, industry')
      .eq('id', auditId)
      .single();

    if (auditError || !audit) {
      throw new Error(`[ContextBuilder] Failed to fetch audit ${auditId}: ${auditError?.message ?? 'not found'}`);
    }

    // Fetch recon data — recon may genuinely be missing (phase 0 not yet run), so warn but don't throw
    const { data: recon, error: reconError } = await supabase
      .from('audit_recon')
      .select('*')
      .eq('audit_id', auditId)
      .single();

    if (reconError && reconError.code !== 'PGRST116') {
      // PGRST116 = "no rows returned" — acceptable for early phases; other errors are real failures
      console.warn(`[ContextBuilder] Recon data unavailable for ${auditId}: ${reconError.message}`);
    }

    // Fetch completed domain results (for cross-domain context)
    const { data: completedDomains } = await supabase
      .from('audit_domains')
      .select('domain_key, score, summary, strengths, weaknesses')
      .eq('audit_id', auditId)
      .eq('status', 'completed')
      .order('phase_number');

    // Fetch failed domains — surfaced to Strategy Agent so it can acknowledge data gaps
    const { data: failedDomains } = await supabase
      .from('audit_domains')
      .select('domain_key')
      .eq('audit_id', auditId)
      .eq('status', 'failed');

    // Fetch review notes
    const { data: reviews } = await supabase
      .from('review_points')
      .select('after_phase, consultant_notes, interview_notes')
      .eq('audit_id', auditId)
      .eq('status', 'approved');

    // Fetch intake brief — get only questions relevant to this domain
    const { data: brief } = await supabase
      .from('intake_brief')
      .select('responses')
      .eq('audit_id', auditId)
      .single();

    const allResponses = (brief?.responses as Record<string, unknown>) ?? {};
    const domainQuestions = getQuestionsForDomain(domainKey);
    const briefResponses: Record<string, string | string[] | number | null> = {};
    for (const q of domainQuestions) {
      const val = allResponses[q.id];
      if (val !== undefined) {
        briefResponses[q.id] = val as string | string[] | number | null;
      }
    }

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
      brief_responses: briefResponses,
      failed_domains: (failedDomains ?? []).map(d => String(d.domain_key)),
      instructions,
    };
  }

  /**
   * Formats context into two parts:
   * - `system`: role instructions (goes to Claude's system parameter)
   * - `prompt`: all factual data (goes to the user message)
   *
   * Separating role from data improves instruction following — Claude treats
   * system-level directives with higher priority than user-message content.
   */
  formatPrompt(ctx: AgentContext): { system: string; prompt: string; truncated: boolean; truncatedKeys: string[] } {
    const sections: string[] = [];
    const truncatedKeys: string[] = [];

    // Company profile
    sections.push(`## Company Profile
- **URL:** ${ctx.company_url}
- **Name:** ${ctx.company_name ?? 'Unknown'}
- **Industry:** ${ctx.industry ?? 'Not determined'}
- **Domain weight for this industry:** ${ctx.domain_weight}x`);

    // Intake brief — domain-relevant answers (shown before raw data for prominence)
    if (Object.keys(ctx.brief_responses).length > 0) {
      const briefLines = Object.entries(ctx.brief_responses)
        .filter(([, v]) => v !== null && v !== '')
        .map(([id, v]) => {
          const question = BRIEF_QUESTIONS.find(q => q.id === id)?.question ?? id.replace(/_/g, ' ');
          const answer = Array.isArray(v) ? v.join(', ') : String(v);
          return `- **${question}:** ${answer}`;
        });
      if (briefLines.length > 0) {
        sections.push(`## Client Brief (Pre-Audit Intake)\n${briefLines.join('\n')}`);
      }
    }

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

    // Collected raw data — truncated to avoid overflowing the context window.
    // Strategy: remove top-level keys one by one (largest first) until the JSON fits.
    // This always produces valid JSON, unlike slicing the serialised string mid-byte.
    // Each collector block: ≤40K chars (~10K tokens); total across all: ≤120K chars.
    const MAX_PER_COLLECTOR = 40_000;
    const MAX_TOTAL_RAW = 120_000;
    if (Object.keys(ctx.collected_data).length > 0) {
      sections.push('## Collected Data (Raw Analysis)');
      let totalRawChars = 0;
      for (const [key, data] of Object.entries(ctx.collected_data)) {
        if (totalRawChars >= MAX_TOTAL_RAW) {
          sections.push(`### ${key}\n_[omitted — total raw data limit reached]_`);
          truncatedKeys.push(key);
          continue;
        }
        let json = JSON.stringify(data, null, 2);
        if (json.length > MAX_PER_COLLECTOR) {
          // Trim by removing top-level keys largest-first until JSON fits
          const trimmed = trimByKeys(data, MAX_PER_COLLECTOR);
          json = JSON.stringify(trimmed.obj, null, 2);
          if (trimmed.removed > 0) {
            json += `\n// [${trimmed.removed} large key(s) omitted: ${trimmed.removedKeys.join(', ')}]`;
          }
          truncatedKeys.push(key);
        }
        sections.push(`### ${key}\n\`\`\`json\n${json}\n\`\`\``);
        totalRawChars += json.length;
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

    // Failed domains — alert Strategy Agent to acknowledge data gaps
    if (ctx.failed_domains.length > 0) {
      sections.push(`## Domains Unavailable\n` +
        `The following domain analyses could not be completed and have no data:\n` +
        ctx.failed_domains.map(d => `- ${d}`).join('\n') + `\n\n` +
        `Explicitly note in your report that these areas could not be assessed and recommend the client seek targeted reviews for them.`
      );
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

    return {
      // Role goes to system — highest-priority Claude instruction channel
      system: ctx.instructions,
      // All factual data goes to the user message
      prompt: sections.join('\n\n'),
      truncated: truncatedKeys.length > 0,
      truncatedKeys,
    };
  }
}

/**
 * Reduce a JSON-serialisable object to fit within `maxChars` by removing
 * top-level keys, largest-serialised-value first.
 *
 * Unlike slicing the JSON string, this always produces valid JSON.
 * Array-typed top-level keys (e.g. pages_crawled) are trimmed by halving
 * the array length before removing the key entirely.
 */
function trimByKeys(
  obj: Record<string, unknown>,
  maxChars: number
): { obj: Record<string, unknown>; removed: number; removedKeys: string[] } {
  const result: Record<string, unknown> = { ...obj };
  const removedKeys: string[] = [];

  // First pass: halve any large arrays (preserves structure, reduces size)
  for (const [k, v] of Object.entries(result)) {
    if (Array.isArray(v) && v.length > 5) {
      const serialised = JSON.stringify(v);
      if (serialised.length > maxChars / 4) {
        result[k] = v.slice(0, Math.ceil(v.length / 2));
      }
    }
  }

  // Second pass: remove keys largest-first until the object fits
  while (JSON.stringify(result).length > maxChars) {
    // Find the largest key by serialised value size
    const entries = Object.entries(result);
    if (entries.length === 0) break;

    let largestKey = entries[0][0];
    let largestSize = JSON.stringify(entries[0][1]).length;
    for (const [k, v] of entries.slice(1)) {
      const size = JSON.stringify(v).length;
      if (size > largestSize) { largestKey = k; largestSize = size; }
    }

    delete result[largestKey];
    removedKeys.push(largestKey);
  }

  return { obj: result, removed: removedKeys.length, removedKeys };
}
