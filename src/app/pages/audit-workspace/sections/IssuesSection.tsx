import { motion } from 'motion/react';
import { Link as LinkIcon, Warning } from '@phosphor-icons/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import type { ConfidenceLevel, DomainData } from '../../../data/auditTypes';
import { AUDIT_WORKSPACE_UI } from '../config/ui';
import { CONF_BG, CONF_COLOR, SEV_BG, SEV_COLOR } from '../config/presentation';

type Props = { domainData: DomainData };

export function IssuesSection({ domainData }: Props) {
  if (domainData.issues.length === 0) return null;

  return (
    <div className="glc-card overflow-hidden rounded-[var(--radius-xl)]">
      <div
        className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 py-3"
      >
        <Warning className="h-4 w-4 text-[var(--score-1)]" />
        <SectionLabel>{AUDIT_WORKSPACE_COPY.sections.issuesFound}</SectionLabel>
        <span
          className="ml-auto rounded-full bg-[var(--score-1-bg)] px-2 py-0.5 text-[length:var(--text-2xs)] font-bold text-[var(--score-1)]"
        >
          {domainData.issues.length}
        </span>
      </div>
      <div className="divide-y [border-color:var(--border-subtle)]">
        {domainData.issues.map((issue, index) => {
          const conf = (issue.confidence ?? 'medium') as ConfidenceLevel;
          return (
            <motion.div
              key={issue.id || index}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * AUDIT_WORKSPACE_UI.transitions.staggerDelayStep,
                duration: AUDIT_WORKSPACE_UI.transitions.rowFadeDuration,
                ease: AUDIT_WORKSPACE_UI.transitions.panelEase,
              }}
              className="flex items-start gap-3 px-5 py-3"
            >
              <span
                className="px-2 py-0.5 rounded-full font-bold capitalize flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: SEV_BG[issue.severity] || SEV_BG.medium,
                  color: SEV_COLOR[issue.severity] || SEV_COLOR.medium,
                  fontSize: 'var(--text-2xs)',
                  minWidth: AUDIT_WORKSPACE_UI.issueSeverityMinWidth,
                  textAlign: 'center',
                }}
              >
                {issue.severity}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {issue.title}
                  </span>
                  <span
                    className="ds-issue-confidence-pill px-1.5 py-0.5 rounded font-medium capitalize flex-shrink-0"
                    style={{
                      backgroundColor: CONF_BG[conf],
                      color: CONF_COLOR[conf],
                    }}
                    title={`Confidence: ${conf}${issue.data_source ? ` — ${issue.data_source.replace(/_/g, ' ')}` : ''}`}
                  >
                    {conf}
                  </span>
                </div>
                {issue.description && (
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    {issue.description}
                  </p>
                )}
                {issue.evidence_refs && issue.evidence_refs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {issue.evidence_refs.map((ref, refIndex) => (
                      <span
                        key={refIndex}
                        className="flex items-center gap-1 rounded bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-[length:var(--text-2xs)] text-[var(--text-tertiary)]"
                        title={ref.url ? `URL: ${ref.url}` : undefined}
                      >
                        {ref.url && <LinkIcon size={9} />}
                        <span>
                          {ref.type}: {ref.finding}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
