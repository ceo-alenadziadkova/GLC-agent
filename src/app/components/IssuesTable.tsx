import { Warning, WarningCircle, WarningOctagon } from '@phosphor-icons/react';
import type { AuditIssue } from '../data/auditData';

interface IssuesTableProps {
  issues: AuditIssue[];
}

export function IssuesTable({ issues }: IssuesTableProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <WarningOctagon className="w-4 h-4" style={{ color: 'var(--status-critical)' }} />;
      case 'high':
        return <Warning className="w-4 h-4" style={{ color: 'var(--status-needs-improvement)' }} />;
      case 'medium':
        return <WarningCircle className="w-4 h-4" style={{ color: 'var(--status-moderate)' }} />;
      default:
        return <WarningCircle className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, { bg: string; color: string; text: string }> = {
      critical: { bg: '#FFF1F0', color: 'var(--status-critical)', text: 'Critical' },
      high: { bg: '#FFF7ED', color: 'var(--status-needs-improvement)', text: 'High' },
      medium: { bg: '#FFFBEB', color: 'var(--status-moderate)', text: 'Medium' },
      low: { bg: 'var(--surface)', color: 'var(--text-secondary)', text: 'Low' }
    };

    const style = styles[severity] || styles.low;

    return (
      <span
        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.text}
      </span>
    );
  };

  if (issues.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
        <p className="text-sm">No critical issues identified in this domain.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--panel-border)' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--surface)' }}>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              SEVERITY
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              ISSUE
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              BUSINESS IMPACT
            </th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ backgroundColor: 'white', borderColor: 'var(--panel-border)' }}>
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-[var(--surface)] transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(issue.severity)}
                  {getSeverityBadge(issue.severity)}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {issue.title}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {issue.description}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {issue.impact}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
