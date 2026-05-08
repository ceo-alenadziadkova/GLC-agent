import { useState } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';

type InlineEditableDateProps = {
  value: string | null | undefined;
  ariaLabel: string;
  onCommit: (next: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * Inline date editor with apply/cancel flow to avoid accidental immediate saves.
 */
export function InlineEditableDate(props: InlineEditableDateProps) {
  const { value, ariaLabel, onCommit, disabled = false, className } = props;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const currentValue = value ?? '';
  const triggerLabel = currentValue !== '' ? currentValue : 'Set date';

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPending(currentValue);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="link"
          size="sm"
          disabled={disabled || saving}
          className={cn('text-muted-foreground h-auto p-0 text-xs font-normal underline-offset-2', className)}
          aria-label={ariaLabel}
        >
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Input
            type="date"
            aria-label={ariaLabel}
            value={pending}
            onChange={(event) => setPending(event.target.value)}
            disabled={saving}
          />
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => setPending('')}
            >
              Clear
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving || pending === currentValue}
                onClick={() => {
                  void (async () => {
                    setSaving(true);
                    try {
                      await onCommit(pending);
                      setOpen(false);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                {saving ? 'Saving…' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
