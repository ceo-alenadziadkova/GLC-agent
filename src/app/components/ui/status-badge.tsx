import { Badge } from './badge';
import { cn } from './utils';

interface StatusBadgeProps {
  label: string;
  toneClassName: string;
  className?: string;
}

export function StatusBadge({ label, toneClassName, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('border-transparent text-xs font-medium', toneClassName, className)}
    >
      {label}
    </Badge>
  );
}
