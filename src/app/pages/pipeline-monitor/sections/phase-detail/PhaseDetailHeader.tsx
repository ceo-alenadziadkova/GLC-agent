import { cn } from '../../../../components/ui/utils';
import { ScoreBadge } from '../../../../components/glc/ScoreBadge';
import { StatusPill } from '../../../../components/glc/StatusPill';
import type { PhaseView } from '../../types';

type Props = {
  selectedPhase: PhaseView;
};

export function PhaseDetailHeader(props: Props) {
  const { selectedPhase } = props;
  const Icon = selectedPhase.icon;
  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
          selectedPhase.status === 'completed'
            ? 'bg-[var(--gradient-success)] shadow-[var(--glow-green)]'
            : selectedPhase.status === 'running'
              ? 'bg-[var(--gradient-brand)] shadow-[var(--glow-blue-sm)]'
              : 'bg-muted',
        )}
      >
        <Icon
          className={cn(
            'h-6 w-6',
            selectedPhase.status === 'pending'
              ? 'text-muted-foreground'
              : selectedPhase.status === 'completed'
                ? 'text-[var(--on-gradient-success-fg)]'
                : selectedPhase.status === 'running'
                  ? 'text-[var(--on-gradient-brand-fg)]'
                  : 'text-primary-foreground',
          )}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            {selectedPhase.label}: {selectedPhase.name}
          </h2>
          <StatusPill status={selectedPhase.status} pulse={selectedPhase.status === 'running'} />
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
          {selectedPhase.score !== null && <ScoreBadge score={selectedPhase.score} showLabel size="md" />}
        </div>
      </div>
    </div>
  );
}
