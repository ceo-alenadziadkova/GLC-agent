import { Rocket, Spinner } from '@phosphor-icons/react';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { Surface } from '../../../components/ui/surface';
import { cn } from '../../../components/ui/utils';

export function RunAuditSection({
  canStart,
  starting,
  onStart,
}: {
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <Surface className="mobile:px-4 space-y-3 px-5 py-4">
      <div className="text-sm font-medium text-[var(--text-primary)]">{CLIENT_AUDIT_VIEW_COPY.shell.runAuditTitle}</div>
      <p className="text-xs leading-[1.5] text-[var(--text-tertiary)]">
        {CLIENT_AUDIT_VIEW_COPY.shell.runAuditBody}
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart || starting}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg border-0 py-2.5 text-sm font-medium',
          canStart && !starting
            ? 'cursor-pointer bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--glow-blue-sm)]'
            : 'cursor-not-allowed bg-[var(--bg-muted)] text-[var(--text-quaternary)] shadow-none',
        )}
      >
        {starting ? (
          <><Spinner className="w-3.5 h-3.5 animate-spin" /> {CLIENT_AUDIT_VIEW_COPY.shell.starting}</>
        ) : (
          <><Rocket className="w-4 h-4" /> {CLIENT_AUDIT_VIEW_COPY.shell.startAudit}</>
        )}
      </button>
    </Surface>
  );
}
