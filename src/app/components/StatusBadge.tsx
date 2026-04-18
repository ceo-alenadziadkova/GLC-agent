import { getDomainStatusTone, type ReportDomainStatus } from '../design-system/tokens/report-semantic-tokens';
import { StatusBadge as UiStatusBadge } from './ui/status-badge';

interface StatusBadgeProps {
  status: ReportDomainStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = getDomainStatusTone(status);
  return <UiStatusBadge label={tone.label} toneClassName={tone.badgeClassName} className={className} />;
}
