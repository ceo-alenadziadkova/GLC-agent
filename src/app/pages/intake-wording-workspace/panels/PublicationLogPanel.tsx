import type { PublicationLogEntry } from '../types';
import { formatPublicationLogTimestamp } from '../model';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';

export function PublicationLogPanel(props: {
  hydrated: boolean;
  publicationLog: PublicationLogEntry[];
  onRefresh: () => void;
}) {
  const { hydrated, publicationLog, onRefresh } = props;
  if (!hydrated) return null;
  return (
    <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium">{W.publicationLog.summaryLabel}</summary>
      <div className="mt-3 space-y-2">
        <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onRefresh}>
          {W.actions.refresh}
        </button>
        {publicationLog.length === 0 ? (
          <p className="text-xs text-[var(--glc-muted)]">{W.publicationLog.empty}</p>
        ) : (
          <ul className="space-y-2 text-xs font-mono max-h-[280px] overflow-auto">
            {publicationLog.map(entry => (
              <li key={entry.id} className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] px-2 py-1.5">
                <div className="text-[var(--glc-muted)]">
                  {formatPublicationLogTimestamp(entry.created_at)} {' — '}
                  <span className="text-[var(--glc-fg)]">{entry.action}</span>
                </div>
                <div className="break-all mt-0.5">{entry.question_ids.join(', ')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
