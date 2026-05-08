import { useState } from 'react';

import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';

export type InlineLaneOption = { value: string; label: string };

type InlineEditableLanePickerProps = {
  value: string;
  options: readonly InlineLaneOption[];
  ariaLabel: string;
  onCommit: (next: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * Compact lane switcher: shows current label, opens popover with Select to commit a new lane.
 */
export function InlineEditableLanePicker(props: InlineEditableLanePickerProps) {
  const { value, options, ariaLabel, onCommit, disabled = false, className } = props;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value);
  const [saving, setSaving] = useState(false);

  const currentLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPending(value);
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
          {currentLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Select value={pending} onValueChange={setPending} disabled={saving}>
            <SelectTrigger aria-label={ariaLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || pending === value}
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
      </PopoverContent>
    </Popover>
  );
}
