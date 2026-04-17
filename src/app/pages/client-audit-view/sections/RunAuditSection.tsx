import { Rocket, Spinner } from '@phosphor-icons/react';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { Surface } from '../../../components/ui/surface';

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
        className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        style={{
          background: canStart && !starting ? 'var(--gradient-brand)' : 'var(--bg-muted)',
          color: canStart && !starting ? 'var(--glc-ink)' : 'var(--text-quaternary)',
          cursor: canStart && !starting ? 'pointer' : 'not-allowed',
          boxShadow: canStart && !starting ? 'var(--glow-blue-sm)' : 'none',
          border: 'none',
        }}
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
