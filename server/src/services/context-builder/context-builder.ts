import type { IntakeSliceDomain } from '@glc/intake-core';
import type { DomainKey, ReconConflict, ReconData } from '../../types/audit.js';
import { coalitionSnapshotAllowsDomainWeightOverride } from '../../config/coalition-protocol-policy.js';
import { getDomainWeight } from '../../config/industry-weights.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import {
  CONTEXT_BUILDER_RETRY_NOTES_CURRENT_PHASE_MAX,
  CONTEXT_BUILDER_RETRY_NOTES_OTHER_PHASES_MAX,
} from '../../config/context-builder-limits.js';
import { assembleBriefResponses, prepareAllBriefResponses } from './assemble-brief-responses.js';
import { enrichIntakeMetadata } from './enrich-intake-metadata.js';
import { loadContextSnapshot } from './load-context-snapshot.js';
import { formatClientBriefSection as formatClientBriefSectionImpl } from './format-client-brief.js';
import { formatAgentPrompt } from './format-agent-prompt.js';
import type { AgentContext } from './agent-context.types.js';

/**
 * Assembles the full context for an agent call.
 * This is Step 2 of the Data-First pipeline: COLLECT → **ASSEMBLE** → CALL → VERIFY.
 */
export class ContextBuilder {
  private resolveDomainWeight(args: {
    domainKey: DomainKey | 'recon' | 'strategy';
    industry: string | null;
    clientSituation: Record<string, unknown> | null;
  }): number {
    const { domainKey, industry, clientSituation } = args;
    if (domainKey === 'recon' || domainKey === 'strategy') return 1;

    const resourceEnvelope = clientSituation?.resource_envelope;
    const confidence =
      resourceEnvelope && typeof resourceEnvelope === 'object'
        ? (resourceEnvelope as { confidence?: unknown }).confidence
        : undefined;
    const domainWeights = clientSituation?.domain_weights;
    if (
      coalitionSnapshotAllowsDomainWeightOverride(confidence)
      && domainWeights
      && typeof domainWeights === 'object'
    ) {
      const snapshotWeight = (domainWeights as Partial<Record<DomainKey, unknown>>)[domainKey];
      if (typeof snapshotWeight === 'number') {
        return snapshotWeight;
      }
    }

    return getDomainWeight(industry, domainKey);
  }

  async build(
    auditId: string,
    phaseNumber: number,
    domainKey: DomainKey | 'recon' | 'strategy',
    collectedData: Record<string, Record<string, unknown>>,
    instructions: string,
  ): Promise<AgentContext> {
    const snapshot = await loadContextSnapshot(auditId);
    const {
      audit,
      recon,
      completedDomains,
      failedDomains,
      reviews,
      retryNotes,
      brief,
      clientSituation,
      hypothesisDrafts,
      alignmentResponses,
      conflictResolution,
    } = snapshot;

    const allResponses = prepareAllBriefResponses(brief?.responses);

    const { briefResponses, briefResponseSources, productMode } = assembleBriefResponses({
      domainKey,
      allResponses,
      audit,
    });

    const industry = audit?.industry ?? (recon?.industry as string | undefined) ?? null;

    const enrich = enrichIntakeMetadata({ allResponses, brief, productMode });

    const reconConflictsRaw = brief?.recon_conflicts;

    return {
      company_url: audit?.company_url ?? '',
      no_public_website: audit?.no_public_website === true,
      company_name: audit?.company_name ?? (recon?.company_name as string | null) ?? null,
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
      retry_notes: (retryNotes ?? [])
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .reduce<Array<{ phase: number; retry_comment: string; created_at: string }>>((acc, note) => {
          const currentPhaseCount = acc.filter(item => item.phase === phaseNumber).length;
          const otherPhasesCount = acc.filter(item => item.phase !== phaseNumber).length;
          if (note.phase === phaseNumber) {
            if (currentPhaseCount >= CONTEXT_BUILDER_RETRY_NOTES_CURRENT_PHASE_MAX) return acc;
            return [...acc, note];
          }
          if (domainKey !== 'strategy') return acc;
          if (otherPhasesCount >= CONTEXT_BUILDER_RETRY_NOTES_OTHER_PHASES_MAX) return acc;
          return [...acc, note];
        }, []),
      domain_weight: this.resolveDomainWeight({ domainKey, industry, clientSituation }),
      brief_responses: briefResponses,
      brief_response_sources: briefResponseSources,
      intake_data_quality_score: Number(brief?.data_quality_score ?? 0),
      intake_readiness_badge:
        (brief?.readiness_badge as AgentContext['intake_readiness_badge']) ??
        SYSTEM_DEFAULTS.intake.defaultReadinessBadge,
      ...enrich,
      post_audit_questions: (brief?.post_audit_questions as Array<Record<string, unknown>>) ?? [],
      recon_prefills: (brief?.recon_prefills as Record<string, unknown>) ?? {},
      recon_conflicts: Array.isArray(reconConflictsRaw) ? (reconConflictsRaw as ReconConflict[]) : [],
      failed_domains: (failedDomains ?? []).map(d => String(d.domain_key)),
      slice_domain: domainKey as IntakeSliceDomain,
      client_situation_snapshot: clientSituation,
      coalition_hypothesis_drafts: hypothesisDrafts,
      coalition_alignment_responses: alignmentResponses,
      coalition_conflict_resolution: conflictResolution,
      instructions,
    };
  }

  /**
   * Markdown for "## Client Brief" with primary vs secondary grouping when bank v1 ids are present.
   */
  static formatClientBriefSection(ctx: AgentContext, industryOtherSpecify: string): string | null {
    return formatClientBriefSectionImpl(ctx, industryOtherSpecify);
  }

  formatPrompt(ctx: AgentContext): ReturnType<typeof formatAgentPrompt> {
    return formatAgentPrompt(ctx);
  }
}
