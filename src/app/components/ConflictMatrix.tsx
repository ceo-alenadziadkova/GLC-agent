import { WarningCircle } from '@phosphor-icons/react';
import { COALITION_PROTOCOL_COPY } from '../config/coalition-protocol-copy.en';

type ConflictLike = {
  id?: unknown;
  parties?: unknown;
  decision?: unknown;
  reason?: unknown;
  recommended_action?: unknown;
};

function asConflictRows(value: unknown): ConflictLike[] {
  return Array.isArray(value)
    ? value.filter((item): item is ConflictLike => Boolean(item) && typeof item === 'object')
    : [];
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function ConflictRows({ rows, unresolved }: { rows: ConflictLike[]; unresolved?: boolean }) {
  const copy = COALITION_PROTOCOL_COPY.conflictMatrix;
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold">
        {unresolved ? copy.unresolved : copy.resolved}
      </p>
      <div className="overflow-hidden rounded-lg border bg-card">
        {rows.map((row, index) => (
          <div key={`${String(row.id ?? index)}-${index}`} className="border-b px-4 py-3 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-foreground text-sm font-semibold">{String(row.id ?? 'Conflict')}</p>
              {unresolved ? (
                <span className="rounded-md border px-2 py-1 text-[length:var(--text-2xs)] font-medium text-muted-foreground">
                  {String(row.recommended_action ?? copy.recommendedAction)}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {copy.parties}: {asStringList(row.parties).join(', ') || 'n/a'}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              {unresolved ? String(row.reason ?? '') : String(row.decision ?? '')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConflictMatrix({ resolution }: { resolution: Record<string, unknown> | null | undefined }) {
  const copy = COALITION_PROTOCOL_COPY.conflictMatrix;
  const resolved = asConflictRows(resolution?.resolved_conflicts);
  const unresolved = asConflictRows(resolution?.unresolved);
  if (resolved.length === 0 && unresolved.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <WarningCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-foreground text-sm font-semibold">{copy.title}</h3>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">{copy.empty}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <WarningCircle className="h-4 w-4 text-warning" aria-hidden />
        <h3 className="text-foreground text-sm font-semibold">{copy.title}</h3>
      </div>
      <div className="space-y-4">
        <ConflictRows rows={resolved} />
        <ConflictRows rows={unresolved} unresolved />
      </div>
    </section>
  );
}
