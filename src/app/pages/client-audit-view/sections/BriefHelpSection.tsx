import { ChatCircleDots, CheckCircle } from '@phosphor-icons/react';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { UI_SEMANTIC_COLORS } from '../../../config/ui-semantic-colors';
import { Callout } from '../../../components/ui/callout';
import { Surface } from '../../../components/ui/surface';

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
    <Surface
      className="mobile:px-4 space-y-3 px-5 py-4"
      style={{ backgroundColor: 'rgba(28,189,255,0.04)', borderColor: 'rgba(28,189,255,0.12)' }}
    >
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
        className="w-full rounded-lg px-3 py-2 text-sm resize-y min-h-[72px]"
        style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
      />
      {helpError && (
        <Callout intent="danger">
          <div className="text-xs text-[var(--score-1)]">{helpError}</div>
        </Callout>
      )}
      {helpOk && (
        <div className="flex items-center gap-2 text-xs" style={{ color: UI_SEMANTIC_COLORS.success }}>
          <CheckCircle weight="fill" className="w-3.5 h-3.5" />
          {CLIENT_AUDIT_VIEW_COPY.help.success}
        </div>
      )}
      <button
        type="button"
        onClick={onHelp}
        disabled={helpBusy}
        className="px-4 py-2 rounded-lg text-sm font-medium glc-touch-target"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          cursor: helpBusy ? 'not-allowed' : 'pointer',
        }}
      >
        {helpBusy ? CLIENT_AUDIT_VIEW_COPY.help.sending : CLIENT_AUDIT_VIEW_COPY.help.send}
      </button>
    </Surface>
  );
}
