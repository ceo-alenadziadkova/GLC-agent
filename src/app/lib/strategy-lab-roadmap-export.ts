import type { StrategyInitiative } from '../data/auditTypes';
import {
  STRATEGY_LAB_ROADMAP_EXPORT_POLICY,
  STRATEGY_LAB_ROADMAP_TIMEFRAMES,
  type StrategyLabRoadmapTimeframe,
} from '../config/strategy-lab';

export type { StrategyLabRoadmapTimeframe };

export interface BuildStrategyLabRoadmapMarkdownParams {
  title: string;
  companyLabel: string;
  urlLabel: string;
  auditIdLabel: string;
  generatedOnLabel: string;
  executiveSummaryHeading: string;
  selectedHeading: string;
  sectionLabels: Record<StrategyLabRoadmapTimeframe, string>;
  impactLabel: string;
  effortLabel: string;
  dependenciesLabel: string;
  /** Placeholder when company name or URL is absent (from copy layer). */
  missingFieldValue: string;
  companyName: string | null;
  companyUrl: string;
  auditId: string;
  executiveSummary: string | null;
  /** Selected initiatives grouped by roadmap horizon (only non-empty groups are rendered). */
  selectedByTimeframe: Record<StrategyLabRoadmapTimeframe, StrategyInitiative[]>;
}

function formatInitiativeBlock(
  init: StrategyInitiative,
  labels: Pick<
    BuildStrategyLabRoadmapMarkdownParams,
    'impactLabel' | 'effortLabel' | 'dependenciesLabel'
  >,
  dependenciesJoiner: string,
): string {
  const rawDesc = init.description;
  const desc = typeof rawDesc === 'string' ? rawDesc.trim() : '';
  const lines = [`### ${init.title}`, '', desc, ''];
  lines.push(`- **${labels.impactLabel}:** ${init.impact}`);
  lines.push(`- **${labels.effortLabel}:** ${init.effort}`);
  if (init.domain) lines.push(`- **Domain:** ${init.domain}`);
  if (init.stage) lines.push(`- **Stage:** ${init.stage}`);
  if (init.priority) lines.push(`- **Priority:** ${init.priority}`);
  if (init.decision?.why_this?.length) {
    lines.push('- **Why this:**');
    for (const s of init.decision.why_this) {
      lines.push(`  - ${s}`);
    }
  }
  if (init.outcome?.description) {
    lines.push(`- **Outcome:** ${init.outcome.description}`);
  }
  if (init.scope?.includes?.length) {
    lines.push(`- **In scope:** ${init.scope.includes.join(dependenciesJoiner)}`);
  }
  if (init.scope?.excludes?.length) {
    lines.push(`- **Out of scope:** ${init.scope.excludes.join(dependenciesJoiner)}`);
  }
  if (init.execution_paths?.length) {
    lines.push('- **Execution paths:**');
    for (const p of init.execution_paths) {
      lines.push(`  - **${p.type}** (${p.time_estimate}): ${p.description}`);
    }
  }
  if (init.dependencies?.length) {
    lines.push(`- **${labels.dependenciesLabel}:** ${init.dependencies.join(dependenciesJoiner)}`);
  }
  if (typeof init.evidence_verified === 'boolean') {
    lines.push(`- **Evidence verified:** ${init.evidence_verified ? 'yes' : 'no'}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Builds a portable Markdown document from Strategy Lab picks (client-side export). */
export function buildStrategyLabRoadmapMarkdown(p: BuildStrategyLabRoadmapMarkdownParams): string {
  const policy = STRATEGY_LAB_ROADMAP_EXPORT_POLICY;
  const generatedIso = new Date().toISOString();
  const headerLines = [
    `# ${p.title}`,
    '',
    `- **${p.companyLabel}:** ${p.companyName?.trim() || p.missingFieldValue}`,
    `- **${p.urlLabel}:** ${p.companyUrl.trim() || p.missingFieldValue}`,
    `- **${p.auditIdLabel}:** ${p.auditId}`,
    `- **${p.generatedOnLabel}:** ${generatedIso}`,
    '',
  ];

  const body: string[] = [];
  const summary = p.executiveSummary?.trim();
  if (summary) {
    body.push(`## ${p.executiveSummaryHeading}`, '', summary, '', '');
  }

  body.push(`## ${p.selectedHeading}`, '');

  for (const key of STRATEGY_LAB_ROADMAP_TIMEFRAMES) {
    const items = p.selectedByTimeframe[key];
    if (!items.length) continue;
    body.push(`### ${p.sectionLabels[key]}`, '');
    for (const init of items) {
      body.push(formatInitiativeBlock(init, p, policy.dependenciesListJoiner));
    }
  }

  return [...headerLines, ...body].join('\n').trimEnd() + '\n';
}

/** Trigger a one-click download in the browser (no server round-trip). */
export function downloadTextFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function strategyLabRoadmapFilenamePrefix(meta: {
  id: string;
  company_name: string | null;
  company_url: string;
}): string {
  const policy = STRATEGY_LAB_ROADMAP_EXPORT_POLICY;
  const fallback = meta.id.slice(0, policy.auditIdFallbackPrefixChars);
  const rawName = meta.company_name?.trim();
  if (rawName) {
    const slug = rawName
      .replace(policy.slugNonWordClassPattern, '-')
      .replace(policy.slugEdgeHyphenTrimPattern, '')
      .slice(0, policy.companySlugMaxChars)
      .toLowerCase();
    if (slug.length > 0) return `${policy.fileNameStem}-${slug}`;
  }
  try {
    const host = new URL(meta.company_url).hostname.replace(policy.hostnameStripLeadingPattern, '');
    if (host) {
      return `${policy.fileNameStem}-${host.replace(policy.hostnameFilenameSafePattern, '-')}`;
    }
  } catch {
    /* ignore */
  }
  return `${policy.fileNameStem}-${fallback}`;
}

export function strategyLabRoadmapExportFileName(
  meta: { id: string; company_name: string | null; company_url: string },
  generatedAt: Date,
): string {
  const policy = STRATEGY_LAB_ROADMAP_EXPORT_POLICY;
  const prefix = strategyLabRoadmapFilenamePrefix(meta);
  const day = generatedAt.toISOString().slice(0, policy.isoDatePrefixChars);
  return `${prefix}-${day}.${policy.fileExtension}`;
}
