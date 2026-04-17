import { Question } from '@phosphor-icons/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import type { DomainData } from '../../../data/auditTypes';

type Props = { domainData: DomainData };

export function DataGapsSection({ domainData }: Props) {
  if (!domainData.unknown_items || domainData.unknown_items.length === 0) return null;

  return (
    <div className="glc-card rounded-[var(--radius-xl)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Question className="h-4 w-4 text-[var(--text-tertiary)]" />
        <SectionLabel>{AUDIT_WORKSPACE_COPY.sections.dataGaps}</SectionLabel>
        <span className="ml-1 text-xs text-[var(--text-tertiary)]">
          {AUDIT_WORKSPACE_COPY.sections.dataGapsHint}
        </span>
      </div>
      <ul className="space-y-1.5">
        {domainData.unknown_items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-xs text-[var(--text-tertiary)]"
          >
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
