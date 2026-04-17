import { ChatCircleDots, CheckCircle } from '@phosphor-icons/react';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { Callout } from '../../../components/ui/callout';
import { Surface } from '../../../components/ui/surface';
import { cn } from '../../../components/ui/utils';

export function BriefHelpSection({
  helpMessage,
  setHelpMessage,
  helpError,
  helpOk,
  helpBusy,
  onHelp,
}: {
  helpMessage: string;
  setHelpMessage: (next: string) => void;
  helpError: string | null;
  helpOk: boolean;
  helpBusy: boolean;
  onHelp: () => void;
}) {
  return (
    <Surface className="mobile:px-4 space-y-3 border-[var(--ui-info-border-20)] bg-[var(--ui-info-muted-bg)] px-5 py-4">
      <div className="flex items-center gap-2">
        <ChatCircleDots className="h-4 w-4 text-[var(--glc-blue)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">{CLIENT_AUDIT_VIEW_COPY.help.title}</span>
      </div>
      <p className="text-xs leading-[1.5] text-[var(--text-secondary)]">
        {CLIENT_AUDIT_VIEW_COPY.help.body}
      </p>
      <textarea
        value={helpMessage}
        onChange={(event) => setHelpMessage(event.target.value)}
        placeholder={CLIENT_AUDIT_VIEW_COPY.help.placeholder}
        rows={3}
        className="ds-brief-help-textarea-minh w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
      {helpError && (
        <Callout intent="danger">
          <div className="text-xs text-[var(--score-1)]">{helpError}</div>
        </Callout>
      )}
      {helpOk && (
        <div className="flex items-center gap-2 text-xs text-[var(--ui-success-fg-strong)]">
          <CheckCircle weight="fill" className="w-3.5 h-3.5" />
          {CLIENT_AUDIT_VIEW_COPY.help.success}
        </div>
      )}
      <button
        type="button"
        onClick={onHelp}
        disabled={helpBusy}
        className={cn(
          'glc-touch-target rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] disabled:cursor-not-allowed',
          helpBusy ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        {helpBusy ? CLIENT_AUDIT_VIEW_COPY.help.sending : CLIENT_AUDIT_VIEW_COPY.help.send}
      </button>
    </Surface>
  );
}
