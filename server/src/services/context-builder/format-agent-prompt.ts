import {
  CONTEXT_BUILDER_MAX_RAW_CHARS_PER_COLLECTOR,
  CONTEXT_BUILDER_MAX_TOTAL_RAW_CHARS,
} from '../../config/context-builder-limits.js';
import { CONTEXT_BUILDER_PROMPT } from '../../config/context-builder-prompt.js';
import { formatClientBriefSection } from './format-client-brief.js';
import { formatPeerHypothesesForPrompt } from './format-peer-hypotheses.js';
import { escapePromptContent } from './lib/escape-prompt.js';
import { formatCompanyUrlForPrompt } from './lib/format-company-url-for-prompt.js';
import { trimJsonByTopLevelKeys } from './lib/trim-json-by-keys.js';
import type { AgentContext } from './agent-context.types.js';
import type { DomainKey } from '../../types/audit.js';

/**
 * Formats context into two parts:
 * - `system`: role instructions (goes to Claude's system parameter)
 * - `prompt`: all factual data (goes to the user message)
 *
 * Separating role from data improves instruction following — Claude treats
 * system-level directives with higher priority than user-message content.
 */
export function formatAgentPrompt(ctx: AgentContext): {
  system: string;
  prompt: string;
  truncated: boolean;
  truncatedKeys: string[];
} {
  const P = CONTEXT_BUILDER_PROMPT;
  const sections: string[] = [];
  const truncatedKeys: string[] = [];

  const specifyRaw = ctx.brief_responses.intake_industry_specify;
  const specifyStr =
    specifyRaw != null && specifyRaw !== ''
      ? (Array.isArray(specifyRaw) ? specifyRaw.join(', ') : String(specifyRaw)).trim()
      : '';
  const industryLine =
    ctx.industry === 'Other' && specifyStr
      ? `${P.companyProfileIndustryOtherPrefix}${specifyStr}${P.companyProfileIndustryOtherSuffix}`
      : (ctx.industry ?? P.companyProfileIndustryNotDetermined);

  let profileBlock = `${P.companyProfileHeading}
${P.companyProfileUrl}${formatCompanyUrlForPrompt(ctx.company_url, ctx.no_public_website)}
${P.companyProfileName}${ctx.company_name ?? P.companyProfileUnknownName}
${P.companyProfileIndustry}${industryLine}
${P.companyProfileDomainWeight}${ctx.domain_weight}x
${P.companyProfileIntakeReadiness}${ctx.intake_readiness_badge}
${P.companyProfileIntakeDataQuality}${ctx.intake_data_quality_score}`;

  if (ctx.intake_ai_readiness_score != null) {
    profileBlock += `${P.companyProfileIntakeAiReadiness}${ctx.intake_ai_readiness_score}/100`;
  }
  if (ctx.intake_report_anchors && Object.keys(ctx.intake_report_anchors).length > 0) {
    profileBlock += `${P.companyProfileIntakeReportAnchors}${Object.entries(ctx.intake_report_anchors)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('; ')}`;
  }
  if (ctx.intake_missing_report_domains && ctx.intake_missing_report_domains.length > 0) {
    profileBlock += `${P.companyProfileIntakeReportGaps}${ctx.intake_missing_report_domains.join(', ')}`;
  }

  sections.push(profileBlock);

  if (
    ctx.client_situation_snapshot
    && Object.keys(ctx.client_situation_snapshot).length > 0
  ) {
    sections.push(
      `${P.clientSituationHeading}
${P.clientSituationSubheading}
${P.collectedDataJsonFenceOpen}${JSON.stringify(ctx.client_situation_snapshot, null, 2)}${P.collectedDataJsonFenceClose}`,
    );
  }

  const hypothesisRows =
    ctx.coalition_context_stage === 'alignment'
      ? formatPeerHypothesesForPrompt(ctx.coalition_hypothesis_drafts, ctx.slice_domain as DomainKey)
      : (ctx.coalition_hypothesis_drafts ?? []);
  if (
    hypothesisRows.length > 0
    && ctx.coalition_context_stage !== 'hypothesis'
    && ctx.coalition_context_stage !== 'context_director'
  ) {
    sections.push(
      `${P.peerHypothesesHeading}
${P.collectedDataJsonFenceOpen}${JSON.stringify(hypothesisRows, null, 2)}${P.collectedDataJsonFenceClose}`,
    );
  }

  if (
    (ctx.coalition_alignment_responses?.length ?? 0) > 0
    && (
      ctx.coalition_context_stage === undefined
      || ctx.coalition_context_stage === 'conflict_resolver'
      || ctx.coalition_context_stage === 'finalize'
    )
  ) {
    sections.push(
      `${P.peerAlignmentsHeading}
${P.collectedDataJsonFenceOpen}${JSON.stringify(ctx.coalition_alignment_responses, null, 2)}${P.collectedDataJsonFenceClose}`,
    );
  }

  if (
    ctx.coalition_conflict_resolution
    && Object.keys(ctx.coalition_conflict_resolution).length > 0
  ) {
    sections.push(
      `${P.coalitionResolutionHeading}
${P.collectedDataJsonFenceOpen}${JSON.stringify(ctx.coalition_conflict_resolution, null, 2)}${P.collectedDataJsonFenceClose}`,
    );
  }

  if (
    ctx.intake_project_context_envelope
    && Object.keys(ctx.intake_project_context_envelope).length > 0
  ) {
    sections.push(
      `${P.intakeProjectContextEnvelopeHeading}
${P.collectedDataJsonFenceOpen}${JSON.stringify(ctx.intake_project_context_envelope, null, 2)}${P.collectedDataJsonFenceClose}`,
    );
  }

  const briefSection = formatClientBriefSection(ctx, specifyStr);
  if (briefSection) {
    sections.push(briefSection);
  }

  if (ctx.post_audit_questions.length > 0) {
    sections.push(
      `${P.postAuditHeading}\n${ctx.post_audit_questions
        .map(
          (q, i) =>
            `${P.postAuditQuestionPrefix}${i + 1}${P.postAuditQuestionSuffix}${String(
              q.question ?? q.item ?? P.postAuditFallbackQuestion,
            )}`,
        )
        .join('\n')}`,
    );
  }

  const openConflicts = ctx.recon_conflicts.filter(c => c.status === 'open');
  if (openConflicts.length > 0) {
    sections.push(
      `${P.reconConflictsHeading}\n${openConflicts
        .map(c =>
          P.reconConflictsLine
            .replace('{{questionId}}', String(c.questionId))
            .replace('{{detectedValue}}', String(c.detectedValue))
            .replace('{{clientValue}}', String(c.clientValue)),
        )
        .join('\n')}`,
    );
  }

  if (Object.keys(ctx.recon_prefills).length > 0) {
    sections.push(
      `${P.reconPrefillsHeading}\n${Object.entries(ctx.recon_prefills)
        .map(([k, v]) =>
          P.reconPrefillsLine.replace('{{key}}', k).replace(
            '{{value}}',
            typeof v === 'object' ? JSON.stringify(v) : String(v),
          ),
        )
        .join('\n')}`,
    );
  }

  if (ctx.recon && ctx.recon.status === 'completed') {
    const recon = ctx.recon;
    sections.push(
      `${P.reconDataHeading}
${P.reconTechStack}${JSON.stringify(recon.tech_stack)}
${P.reconLanguages}${(recon.languages as string[]).join(', ')}
${P.reconPagesCrawled}${(recon.pages_crawled as unknown[]).length}
${P.reconSocialProfiles}${JSON.stringify(recon.social_profiles)}
${P.reconContactInfo}${JSON.stringify(recon.contact_info)}`,
    );
  }

  if (Object.keys(ctx.collected_data).length > 0) {
    sections.push(P.collectedDataHeading);
    let totalRawChars = 0;
    for (const [key, data] of Object.entries(ctx.collected_data)) {
      if (totalRawChars >= CONTEXT_BUILDER_MAX_TOTAL_RAW_CHARS) {
        sections.push(`${P.collectedDataSubheadingPrefix}${key}\n${P.collectedDataOmittedTotalLimit}`);
        truncatedKeys.push(key);
        continue;
      }
      let json = JSON.stringify(data, null, 2);
      if (json.length > CONTEXT_BUILDER_MAX_RAW_CHARS_PER_COLLECTOR) {
        const trimmed = trimJsonByTopLevelKeys(data, CONTEXT_BUILDER_MAX_RAW_CHARS_PER_COLLECTOR);
        json = JSON.stringify(trimmed.obj, null, 2);
        if (trimmed.removed > 0) {
          json += P.collectedDataOmittedKeysComment.replace('{{count}}', String(trimmed.removed)).replace(
            '{{keys}}',
            trimmed.removedKeys.join(', '),
          );
        }
        truncatedKeys.push(key);
      }
      sections.push(
        `${P.collectedDataSubheadingPrefix}${key}\n${P.collectedDataJsonFenceOpen}${escapePromptContent(json)}${P.collectedDataJsonFenceClose}`,
      );
      totalRawChars += json.length;
    }
  }

  if (ctx.previous_domains.length > 0) {
    sections.push(P.previousDomainsHeading);
    for (const domain of ctx.previous_domains) {
      sections.push(
        P.previousDomainBlock
          .replace('{{domainKey}}', domain.domain_key)
          .replace('{{score}}', String(domain.score))
          .replace('{{summary}}', domain.summary)
          .replace('{{strengths}}', domain.strengths.join('; '))
          .replace('{{weaknesses}}', domain.weaknesses.join('; ')),
      );
    }
  }

  if (ctx.failed_domains.length > 0) {
    sections.push(
      `${P.domainsUnavailableHeading}\n${P.domainsUnavailableIntro}\n${ctx.failed_domains.map(d => `- ${d}`).join('\n')}\n\n${P.domainsUnavailableClosing}`,
    );
  }

  /**
   * Human review notes come **after** recon, collectors, and prior domain summaries so the model
   * sees contradictory automation last in context and can override it (especially Strategy todos).
   */
  const notesWithContent = ctx.review_notes.filter(n => n.consultant_notes || n.interview_notes);
  if (notesWithContent.length > 0) {
    sections.push(P.consultantNotesGroundTruthIntro);
    sections.push(P.consultantNotesHeading);
    for (const note of notesWithContent) {
      if (note.consultant_notes) {
        sections.push(
          P.consultantNotesLine.replace('{{phase}}', String(note.phase)).replace('{{notes}}', note.consultant_notes),
        );
      }
      if (note.interview_notes) {
        sections.push(
          P.clientInterviewLine.replace('{{phase}}', String(note.phase)).replace('{{notes}}', note.interview_notes),
        );
      }
    }
    if (ctx.slice_domain === 'strategy') {
      sections.push(P.consultantNotesStrategyInitiativesReminder);
    }
  }

  const retryNotes = ctx.retry_notes ?? [];
  if (retryNotes.length > 0) {
    sections.push(P.retryNotesHeading);
    for (const retryNote of retryNotes) {
      sections.push(
        P.retryNotesLine
          .replace('{{phase}}', String(retryNote.phase))
          .replace('{{createdAt}}', retryNote.created_at)
          .replace('{{comment}}', retryNote.retry_comment),
      );
    }
  }

  return {
    system: ctx.instructions,
    prompt: sections.join('\n\n'),
    truncated: truncatedKeys.length > 0,
    truncatedKeys,
  };
}
