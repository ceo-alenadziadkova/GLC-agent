import { CheckCircle } from '@phosphor-icons/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import type { DomainData } from '../../../data/auditTypes';

type Props = { domainData: DomainData };

export function StrengthsSection({ domainData }: Props) {
  if (domainData.strengths.length === 0) return null;

  return (
    <div className="glc-card rounded-[var(--radius-xl)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="h-4 w-4 text-[var(--glc-green)]" />
        <SectionLabel>{AUDIT_WORKSPACE_COPY.sections.strengths}</SectionLabel>
      </div>
      <ul className="space-y-2">
        {domainData.strengths.map((strength, index) => (
          <li
            key={index}
            className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gradient-success)]" />
            {strength}
          </li>
        ))}
      </ul>
    </div>
  );
}
