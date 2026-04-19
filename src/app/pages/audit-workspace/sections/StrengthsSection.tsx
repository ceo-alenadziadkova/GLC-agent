import { CheckCircle } from '@phosphor-icons/react';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { AUDIT_WORKSPACE_COPY } from '../../../config/audit-workspace-copy.en';
import type { DomainData } from '../../../data/auditTypes';

type Props = { domainData: DomainData };

export function StrengthsSection({ domainData }: Props) {
  if (domainData.strengths.length === 0) return null;

  return (
    <div className="glc-card overflow-hidden rounded-[var(--radius-xl)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 py-3">
        <CheckCircle className="h-4 w-4 shrink-0 text-[var(--glc-green)]" weight="fill" />
        <SectionLabel>{AUDIT_WORKSPACE_COPY.sections.strengths}</SectionLabel>
        <span className="ml-auto rounded-full bg-[var(--glc-green)]/12 px-2 py-0.5 text-[length:var(--text-2xs)] font-bold text-[var(--glc-green)]">
          {domainData.strengths.length}
        </span>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] list-none m-0 p-0">
        {domainData.strengths.map((strength, index) => (
          <li key={index} className="flex gap-3 px-5 py-4">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--glc-green)]/14 text-[length:var(--text-2xs)] font-bold tabular-nums text-[var(--glc-green)]"
              aria-hidden
            >
              {index + 1}
            </span>
            <p className="m-0 min-w-0 flex-1 text-sm leading-relaxed text-[var(--text-secondary)] text-pretty">
              {strength}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
