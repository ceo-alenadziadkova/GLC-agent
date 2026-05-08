import type { HTMLAttributes } from 'react';

import { StatusBadge, type StatusBadgeTone } from '../../../design-system/ui';

export type PlanWorkspaceManifestPillTone = 'saved' | 'dirty' | 'pending';

const MANIFEST_PILL_CONFIG: Record<
  PlanWorkspaceManifestPillTone,
  { tone: StatusBadgeTone; dotClassName: string; pulse?: boolean }
> = {
  saved: {
    tone: 'success',
    dotClassName: 'bg-[var(--score-5)]',
  },
  dirty: {
    tone: 'warning',
    dotClassName: 'bg-[var(--score-3)]',
  },
  pending: {
    tone: 'info',
    dotClassName: 'bg-[var(--text-blue)]',
    pulse: true,
  },
};

export type PlanWorkspaceManifestStatePillProps = {
  tone: PlanWorkspaceManifestPillTone;
  label: string;
  /** Optional screen-reader-only supplement (visible label stays concise). */
  srLabel?: string;
} & Pick<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-live' | 'className'>;

/**
 * Compact saved / dirty / compiling indicator for manifest state next to primary Plan compile actions.
 * Token-only visuals (CSS variables); pairs with {@link StatusBadge} from the design system.
 */
export function PlanWorkspaceManifestStatePill({
  tone,
  label,
  srLabel,
  role = 'status',
  'aria-live': ariaLive = 'polite',
  className,
}: PlanWorkspaceManifestStatePillProps) {
  const cfg = MANIFEST_PILL_CONFIG[tone];
  return (
    <div
      className={className}
      role={role}
      aria-live={ariaLive}
      data-testid={`plan-manifest-state-pill-${tone}`}
    >
      <StatusBadge
        label={label}
        tone={cfg.tone}
        dotClassName={cfg.dotClassName}
        pulse={cfg.pulse === true}
        pulseClassName={cfg.pulse ? cfg.dotClassName : undefined}
      />
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </div>
  );
}
