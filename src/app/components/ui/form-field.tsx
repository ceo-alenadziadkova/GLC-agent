import type { ReactNode } from 'react';
import { cn } from './utils';

interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  requiredMark?: boolean;
  optionalHint?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  requiredMark = false,
  optionalHint,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
        {requiredMark && <span className="text-[var(--glc-orange)]">*</span>}
        {optionalHint ? (
          <span className="text-[11px] font-normal text-[var(--text-quaternary)]">{optionalHint}</span>
        ) : null}
      </label>
      {children}
      {error ? <p className="text-xs text-[var(--score-1)]">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-[var(--text-tertiary)]">{hint}</p> : null}
    </div>
  );
}
