import { Warning, WarningCircle, WarningOctagon } from '@phosphor-icons/react';
import type { AuditIssue } from '../data/audit';
import { getSeverityTone } from '../design-system/tokens/report-semantic-tokens';
import { StatusBadge } from './ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface IssuesTableProps {
  issues: AuditIssue[];
}

export function IssuesTable({ issues }: IssuesTableProps) {
  const getSeverityIcon = (severity: string) => {
    const tone = getSeverityTone((severity as AuditIssue['severity']) ?? 'low');
    switch (severity) {
      case 'critical':
        return <WarningOctagon className={`h-4 w-4 ${tone.iconClassName}`} />;
      case 'high':
        return <Warning className={`h-4 w-4 ${tone.iconClassName}`} />;
      case 'medium':
        return <WarningCircle className={`h-4 w-4 ${tone.iconClassName}`} />;
      default:
        return <WarningCircle className={`h-4 w-4 ${tone.iconClassName}`} />;
    }
  };

  if (issues.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--text-tertiary)]">
        <p className="text-sm">No critical issues identified in this domain.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--panel-border)]">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--panel-border)] bg-[var(--surface)]">
            <TableHead className="px-6 py-3 text-xs font-medium tracking-wide text-[var(--text-tertiary)]">
              SEVERITY
            </TableHead>
            <TableHead className="px-6 py-3 text-xs font-medium tracking-wide text-[var(--text-tertiary)]">
              ISSUE
            </TableHead>
            <TableHead className="px-6 py-3 text-xs font-medium tracking-wide text-[var(--text-tertiary)]">
              BUSINESS IMPACT
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[var(--panel-border)] bg-[var(--bg-surface)]">
          {issues.map((issue) => {
            const tone = getSeverityTone(issue.severity);
            return (
            <TableRow key={issue.id} className="transition-colors hover:bg-[var(--surface)]">
              <TableCell className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(issue.severity)}
                  <StatusBadge label={tone.label} toneClassName={tone.badgeClassName} />
                </div>
              </TableCell>
              <TableCell className="px-6 py-4">
                <div className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                  {issue.title}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">{issue.description}</div>
              </TableCell>
              <TableCell className="px-6 py-4">
                <div className="text-sm text-[var(--text-secondary)]">{issue.impact}</div>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
