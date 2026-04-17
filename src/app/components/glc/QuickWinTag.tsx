import { Lightning } from '@phosphor-icons/react';
import { Badge } from '../../../design-system/ui';

interface QuickWinTagProps {
  time?: string;
  cost?: string;
}

export function QuickWinTag({ time, cost }: QuickWinTagProps) {
  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--score-2-border)] bg-[var(--glc-orange-xlight)] px-[var(--space-2)] py-[var(--space-0-5)] pl-[var(--space-1-5)] text-[color:var(--glc-orange)] text-[length:var(--text-xs)] font-semibold tracking-[var(--tracking-normal)]"
    >
      <Lightning className="h-3 w-3 flex-shrink-0 fill-[var(--glc-orange)] stroke-none" />
      Quick Win
      {(time || cost) && (
        <span className="opacity-[0.55] font-normal">
          {time && ` · ${time}`}
          {cost && ` · ${cost}`}
        </span>
      )}
    </Badge>
  );
}
