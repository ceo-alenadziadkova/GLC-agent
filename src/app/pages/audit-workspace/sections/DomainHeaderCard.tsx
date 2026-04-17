import { ScoreBadge } from '../../../components/glc/ScoreBadge';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import { DOMAIN_LABELS, type DomainData, type DomainKey } from '../../../data/auditTypes';
import { DOMAIN_ICONS } from '../config/presentation';

type Props = {
  activeDomain: DomainKey;
  domainData: DomainData;
};

export function DomainHeaderCard({ activeDomain, domainData }: Props) {
  const DomainIcon = DOMAIN_ICONS[activeDomain];

  return (
    <div className="glc-page-hero glc-orb-decor p-5 sm:p-6">
      <div className="flex items-start gap-5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--gradient-brand)] shadow-[0_6px_20px_rgba(28,189,255,0.25)]"
        >
          <DomainIcon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <p className="glc-kicker mb-2">{AUDIT_WORKSPACE_COPY.sections.domainFocus}</p>
          <h2 className="glc-hero-title text-[var(--text-primary)]">
            {DOMAIN_LABELS[activeDomain]}
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            {domainData.score !== null && <ScoreBadge score={domainData.score} showLabel size="md" />}
            {domainData.summary && (
              <>
                <span className="text-[length:var(--text-xs)] text-[var(--text-tertiary)]">·</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {domainData.summary}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
