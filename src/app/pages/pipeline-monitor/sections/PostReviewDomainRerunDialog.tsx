import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { PHASE_META } from '../phase-meta';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../components/ui/utils';

function phaseShortName(phaseId: number): string {
  return PHASE_META.find(m => m.id === phaseId)?.name ?? `${PM.phasePrefix} ${phaseId}`;
}

export function PostReviewDomainRerunDialog(props: {
  open: boolean;
  selectablePhaseIds: readonly number[];
  busy: boolean;
  /** Overlay / Escape / close icon — same action as the outline button. */
  onDismissContinue: () => void | Promise<void>;
  onRetrySelectedPhases: (phaseIds: number[]) => void | Promise<void>;
}) {
  const { open, selectablePhaseIds, busy, onDismissContinue, onRetrySelectedPhases } = props;
  const cp = PM.postReviewRerun;

  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set());
    }
  }, [open, selectablePhaseIds]);

  const toggle = (phaseId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const retryDisabled = busy || selected.size === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next === false && !busy) {
          void onDismissContinue();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cp.title}</DialogTitle>
          <DialogDescription>{cp.intro}</DialogDescription>
        </DialogHeader>

        <ul className="border-border mt-2 max-h-56 space-y-3 overflow-y-auto rounded-md border p-3">
          {selectablePhaseIds.map(id => (
            <li key={id} className="flex items-start gap-3">
              <Checkbox
                id={`post-review-rerun-${id}`}
                checked={selected.has(id)}
                disabled={busy}
                onCheckedChange={() => toggle(id)}
                aria-labelledby={`post-review-rerun-${id}-label`}
              />
              <Label
                id={`post-review-rerun-${id}-label`}
                htmlFor={`post-review-rerun-${id}`}
                className={cn('text-sm font-normal leading-snug', busy && 'text-muted-foreground')}
              >
                {cp.phaseLabelPrefix} {id}: {phaseShortName(id)}
              </Label>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void onDismissContinue()}>
            {busy ? cp.busy : cp.continueWithout}
          </Button>
          <Button type="button" disabled={retryDisabled} onClick={() => void onRetrySelectedPhases(Array.from(selected).sort((a, b) => a - b))}>
            {busy ? cp.busy : cp.retrySelected}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
