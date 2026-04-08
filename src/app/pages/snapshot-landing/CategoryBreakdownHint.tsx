import { Info } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import {
  SNAPSHOT_CATEGORY_BREAKDOWN_HINTS,
  type SnapshotCategoryScoreKey,
} from '../../lib/snapshot-landing-helpers';

export function CategoryBreakdownHint(props: { label: string; categoryKey: SnapshotCategoryScoreKey }) {
  const { label, categoryKey } = props;
  const copy = SNAPSHOT_CATEGORY_BREAKDOWN_HINTS[categoryKey];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded p-0.5 text-[var(--text-quaternary)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--glc-blue)]"
          aria-label={`What “${label}” means in this report`}
        >
          <Info size={15} weight="bold" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[min(22rem,92vw)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-[var(--text-primary)] shadow-lg [&>svg]:hidden"
      >
        {copy}
      </TooltipContent>
    </Tooltip>
  );
}
