import { Compass } from '@phosphor-icons/react';
import { COALITION_PROTOCOL_COPY } from '../config/coalition-protocol-copy.en';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return 'n/a';
  return String(value).replaceAll('_', ' ');
}

function metricLine(label: string, value: unknown) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-muted-foreground text-[length:var(--text-2xs)] font-medium uppercase tracking-wide">{label}</p>
      <p className="text-foreground mt-1 text-xs font-semibold capitalize">{displayValue(value)}</p>
    </div>
  );
}

export function ClientSituationCard({ snapshot }: { snapshot: Record<string, unknown> | null | undefined }) {
  const copy = COALITION_PROTOCOL_COPY.clientSituationCard;
  const maturity = asRecord(snapshot?.maturity);
  const assumptions = asArray(snapshot?.assumptions);
  const questions = asArray(snapshot?.clarifying_questions);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-info" aria-hidden />
        <h3 className="text-foreground text-sm font-semibold">{copy.title}</h3>
      </div>
      {!snapshot ? (
        <p className="text-muted-foreground mt-2 text-xs">{copy.empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {metricLine(copy.entityType, snapshot.entity_type)}
            {metricLine(copy.dominantConstraint, snapshot.dominant_constraint)}
            {metricLine(copy.strategicMode, snapshot.strategic_mode)}
            {metricLine(copy.dataQuality, `${displayValue(snapshot.data_quality_score)}/100`)}
          </div>
          {maturity ? (
            <div className="rounded-lg border bg-background p-3">
              <p className="text-foreground text-xs font-semibold">{copy.maturity}</p>
              <div className="mt-2 grid gap-1.5 text-[length:var(--text-2xs)] text-muted-foreground sm:grid-cols-2">
                {Object.entries(maturity).map(([key, value]) => (
                  <span key={key} className="capitalize">{displayValue(key)}: {displayValue(value)}</span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {metricLine(copy.assumptions, assumptions.length)}
            {metricLine(copy.questions, questions.length)}
          </div>
        </div>
      )}
    </section>
  );
}
