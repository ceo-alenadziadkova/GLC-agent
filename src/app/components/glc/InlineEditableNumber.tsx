import { useState } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';

type InlineEditableNumberProps = {
  value: number | null | undefined;
  ariaLabel: string;
  onCommit: (next: number | null) => Promise<void>;
  disabled?: boolean;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  className?: string;
};

/**
 * Inline numeric editor (e.g. story points) with optional empty state.
 */
export function InlineEditableNumber(props: InlineEditableNumberProps) {
  const {
    value,
    ariaLabel,
    onCommit,
    disabled = false,
    min = 0,
    max = 999,
    allowEmpty = true,
    className,
  } = props;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);
  const currentValue = value == null ? '' : String(value);

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
          {currentValue !== '' ? currentValue : 'Set value'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Input
            type="number"
            aria-label={ariaLabel}
            value={pending}
            min={min}
            max={max}
            onChange={(event) => setPending(event.target.value)}
            disabled={saving}
          />
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving || !allowEmpty}
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
                    const trimmed = pending.trim();
                    const parsed = trimmed === '' ? null : Number(trimmed);
                    if (parsed != null && (Number.isNaN(parsed) || parsed < min || parsed > max)) {
                      return;
                    }
                    setSaving(true);
                    try {
                      await onCommit(parsed);
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
