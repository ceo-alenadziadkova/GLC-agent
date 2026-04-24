import { ScoreBadge } from '../../../components/glc/ScoreBadge';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import { DOMAIN_LABELS, type DomainData, type DomainKey } from '../../../data/auditTypes';
import { DOMAIN_ICONS } from '../config/presentation';

type Props = {
  activeDomain: DomainKey;
  domainData: DomainData;
};

function splitSummaryParagraphs(summary: string): string[] {
  return summary
    .split(/\n{2,}/)
    .map(chunk => chunk.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function DomainHeaderCard({ activeDomain, domainData }: Props) {
  const DomainIcon = DOMAIN_ICONS[activeDomain];
  const summaryParagraphs = domainData.summary ? splitSummaryParagraphs(domainData.summary) : [];

  return (
    <div className="glc-page-hero glc-orb-decor p-5 sm:p-6">
      <div className="flex items-start gap-5">
        <div className="ds-bg-fill-gradient-brand flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[var(--shadow-brand-cta)]">
          <DomainIcon className="w-7 h-7 text-[var(--audit-domain-header-icon-fg)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="glc-kicker mb-2">{AUDIT_WORKSPACE_COPY.sections.domainFocus}</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h2 className="glc-hero-title text-[var(--text-primary)] mb-0">
              {DOMAIN_LABELS[activeDomain]}
            </h2>
            {domainData.score !== null ? (
              <ScoreBadge score={domainData.score} showLabel size="md" />
            ) : null}
          </div>
          {summaryParagraphs.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[length:var(--text-xs)] font-medium text-[var(--text-tertiary)]">
                {AUDIT_WORKSPACE_COPY.sections.domainSummaryLabel}
              </p>
              <div className="max-w-[65ch] space-y-3">
                {summaryParagraphs.map((para, i) => (
                  <p
                    key={i}
                    className="m-0 text-sm leading-relaxed text-[var(--text-secondary)] text-pretty"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
