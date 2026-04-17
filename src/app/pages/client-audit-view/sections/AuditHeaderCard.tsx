import { Globe } from '@phosphor-icons/react';
import type { AuditMeta } from '../../../data/auditTypes';
import { auditPackageLabel } from '../../../lib/audit-execution-plan';
import { auditSkipsPublicWebsiteFetches } from '../../../data/no-public-website';
import { StatusBadge } from '../../../components/ui/status-badge';
import { Surface } from '../../../components/ui/surface';

export function AuditHeaderCard({ domain, meta, statusLabel }: { domain: string; meta: AuditMeta; statusLabel: string }) {
  return (
    <Surface className="mobile:px-4 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="break-words text-[length:var(--text-base)] font-semibold text-[var(--text-primary)]">
            {domain}
          </div>
          {!auditSkipsPublicWebsiteFetches(meta.no_public_website, meta.company_url) && (
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <Globe className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)]" />
              <span className="break-all text-xs text-[var(--text-tertiary)]">{meta.company_url}</span>
            </div>
          )}
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
          <StatusBadge
            label={auditPackageLabel(meta)}
            toneClassName="border border-[rgba(28,189,255,0.20)] bg-[rgba(28,189,255,0.08)] text-[var(--glc-blue)] capitalize"
          />
          <span className="text-xs text-[var(--text-tertiary)]">{statusLabel}</span>
        </div>
      </div>
    </Surface>
  );
}
