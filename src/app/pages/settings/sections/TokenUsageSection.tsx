import { Link } from 'react-router';
import { Coins } from '@phosphor-icons/react';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { SettingsCard } from '../components/SettingsCard';
import { useTokenUsageSummary } from '../hooks/useTokenUsageSummary';
import { renderCopyTemplate } from '../utils/render-copy-template';
import { formatAppInteger } from '../../../lib/number-format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';

type TokenUsageSectionProps = {
  enabled: boolean;
};

function formatTokens(n: number): string {
  return formatAppInteger(n);
}

export function TokenUsageSection({ enabled }: TokenUsageSectionProps) {
  const { data, loading, error } = useTokenUsageSummary(enabled);

  if (!enabled) return null;

  return (
    <SettingsCard>
      <div className="mb-2 flex items-center gap-2 text-[var(--text-primary)]">
        <Coins className="h-4 w-4" aria-hidden />
        <h2 className="text-sm font-semibold">{SETTINGS_PAGE_COPY.tokenUsage.title}</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-[var(--text-quaternary)]">
        {SETTINGS_PAGE_COPY.tokenUsage.description}
      </p>
      {loading ? (
        <p className="m-0 text-xs text-[var(--text-tertiary)]">{SETTINGS_PAGE_COPY.tokenUsage.loading}</p>
      ) : error || !data ? (
        <p className="m-0 text-xs text-[var(--text-tertiary)]">{SETTINGS_PAGE_COPY.tokenUsage.loadFailed}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="m-0 text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
                {SETTINGS_PAGE_COPY.tokenUsage.totalUsed}
              </p>
              <p className="mt-1 mb-0 font-mono text-sm text-[var(--text-primary)]">
                {formatTokens(data.scopes.accessible.sum_tokens_used)}
              </p>
            </div>
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="m-0 text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
                {SETTINGS_PAGE_COPY.tokenUsage.totalBudget}
              </p>
              <p className="mt-1 mb-0 font-mono text-sm text-[var(--text-primary)]">
                {formatTokens(data.scopes.accessible.sum_token_budget)}
              </p>
            </div>
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="m-0 text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--text-quaternary)]">
                {SETTINGS_PAGE_COPY.tokenUsage.totalRemaining}
              </p>
              <p className="mt-1 mb-0 font-mono text-sm text-[var(--text-primary)]">
                {formatTokens(data.scopes.accessible.sum_tokens_remaining)}
              </p>
            </div>
          </div>
          <p className="m-0 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
            {SETTINGS_PAGE_COPY.tokenUsage.accessibleTotals}
          </p>

          {data.scopes.platform ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 sm:col-span-3">
                <p className="m-0 text-xs font-semibold text-[var(--text-secondary)]">
                  {SETTINGS_PAGE_COPY.tokenUsage.platformPool}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="m-0 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
                      {SETTINGS_PAGE_COPY.tokenUsage.platformCap}
                    </p>
                    <p className="mt-0.5 mb-0 font-mono text-sm">{formatTokens(data.scopes.platform.pool_cap)}</p>
                  </div>
                  <div>
                    <p className="m-0 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
                      {SETTINGS_PAGE_COPY.tokenUsage.platformUsed}
                    </p>
                    <p className="mt-0.5 mb-0 font-mono text-sm">
                      {formatTokens(data.scopes.platform.global_tokens_used)}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 text-[length:var(--text-2xs)] text-[var(--text-quaternary)]">
                      {SETTINGS_PAGE_COPY.tokenUsage.platformRemaining}
                    </p>
                    <p className="mt-0.5 mb-0 font-mono text-sm">
                      {formatTokens(data.scopes.platform.pool_tokens_remaining)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="m-0 text-[length:var(--text-2xs)] leading-relaxed text-[var(--text-quaternary)]">
              {SETTINGS_PAGE_COPY.tokenUsage.platformPoolUnset}
            </p>
          )}

          <p className="m-0 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
            {renderCopyTemplate(SETTINGS_PAGE_COPY.tokenUsage.showingCount, {
              shown: String(data.audits.length),
              total: String(data.pagination.total),
            })}
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{SETTINGS_PAGE_COPY.tokenUsage.colAudit}</TableHead>
                <TableHead className="text-right">{SETTINGS_PAGE_COPY.tokenUsage.colUsed}</TableHead>
                <TableHead className="text-right">{SETTINGS_PAGE_COPY.tokenUsage.colBudget}</TableHead>
                <TableHead className="text-right">{SETTINGS_PAGE_COPY.tokenUsage.colRemaining}</TableHead>
                <TableHead className="w-[1%]">{SETTINGS_PAGE_COPY.tokenUsage.openWorkspace}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-[var(--text-tertiary)]">
                    —
                  </TableCell>
                </TableRow>
              ) : (
                data.audits.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[length:var(--settings-token-usage-audit-name-max-width)] truncate font-medium text-[var(--text-secondary)]">
                      {row.company_name?.trim() || row.company_url}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatTokens(row.tokens_used)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatTokens(row.token_budget)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatTokens(row.tokens_remaining)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/audit/${encodeURIComponent(row.id)}`}
                        className="text-xs font-medium text-[var(--glc-blue)] underline"
                      >
                        {SETTINGS_PAGE_COPY.tokenUsage.openWorkspace}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </SettingsCard>
  );
}
