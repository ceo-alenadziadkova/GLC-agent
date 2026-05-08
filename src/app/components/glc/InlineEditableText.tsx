import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { cn } from '../ui/utils';

type InlineEditableTextProps = {
  value: string;
  ariaLabel: string;
  onCommit: (next: string) => Promise<void>;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
};

/**
 * Lightweight single-line editor (contenteditable) with blur/Enter commit and Esc revert.
 * English-only UI strings are provided by callers via `ariaLabel`.
 */
export function InlineEditableText(props: InlineEditableTextProps) {
  const { value, ariaLabel, onCommit, disabled = false, minLength = 1, maxLength = 200, className } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.textContent = value;
  }, [value]);

  const commit = useCallback(async () => {
    const el = ref.current;
    const next = (el?.innerText ?? '').replace(/\n/g, ' ').trim();
    if (next.length < minLength) {
      setError(`Min length ${minLength}`);
      if (el) el.textContent = value;
      return;
    }
    if (next.length > maxLength) {
      setError(`Max length ${maxLength}`);
      if (el) el.textContent = value;
      return;
    }
    if (next === value.trim()) {
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCommit(next);
    } catch {
      setError('Save failed');
      if (el) el.textContent = value;
    } finally {
      setSaving(false);
    }
  }, [maxLength, minLength, onCommit, value]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || saving) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void commit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setError(null);
        if (ref.current) ref.current.textContent = value;
      }
    },
    [commit, disabled, saving, value],
  );

  return (
    <div className="min-w-0 flex-1">
      <div
        ref={ref}
        role="textbox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-busy={saving}
        aria-invalid={error != null}
        contentEditable={!disabled && !saving}
        suppressContentEditableWarning
        className={cn(
          'outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring rounded px-0.5',
          disabled || saving ? 'cursor-not-allowed opacity-60' : 'cursor-text',
          className,
        )}
        onBlur={() => {
          if (disabled || saving) return;
          void commit();
        }}
        onKeyDown={onKeyDown}
      />
      {error ? <span className="text-destructive mt-0.5 block text-[length:var(--text-2xs)]">{error}</span> : null}
    </div>
  );
}
