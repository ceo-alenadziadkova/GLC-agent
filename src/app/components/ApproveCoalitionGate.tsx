import { useEffect, useMemo, useState } from 'react';
import { COALITION_PROTOCOL_COPY } from '../config/coalition-protocol-copy.en';
import { ClientSituationCard } from './ClientSituationCard';

type SnapshotOverride = {
  entity_type: string;
  dominant_constraint: string;
  strategic_mode: string;
  maturity: {
    product_clarity: number;
    audience_clarity: number;
    positioning_strength: number;
    channel_readiness: number;
    resource_constraints: number;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function initialOverride(snapshot: Record<string, unknown> | null | undefined): SnapshotOverride {
  const maturity = asRecord(snapshot?.maturity);
  return {
    entity_type: String(snapshot?.entity_type ?? ''),
    dominant_constraint: String(snapshot?.dominant_constraint ?? ''),
    strategic_mode: String(snapshot?.strategic_mode ?? ''),
    maturity: {
      product_clarity: toNumber(maturity?.product_clarity, 3),
      audience_clarity: toNumber(maturity?.audience_clarity, 3),
      positioning_strength: toNumber(maturity?.positioning_strength, 3),
      channel_readiness: toNumber(maturity?.channel_readiness, 3),
      resource_constraints: toNumber(maturity?.resource_constraints, 3),
    },
  };
}

function inputClassName(): string {
  return 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <input className={inputClassName()} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <input
        className={inputClassName()}
        type="number"
        min={1}
        max={5}
        value={value}
        onChange={event => onChange(toNumber(event.target.value, value))}
      />
    </label>
  );
}

export function ApproveCoalitionGate({
  snapshot,
  onVerifiedOverrideChange,
}: {
  snapshot: Record<string, unknown> | null | undefined;
  onVerifiedOverrideChange?: (note: string) => void;
}) {
  const copy = COALITION_PROTOCOL_COPY.gate;
  const [override, setOverride] = useState<SnapshotOverride>(() => initialOverride(snapshot));

  useEffect(() => {
    setOverride(initialOverride(snapshot));
  }, [snapshot]);

  const note = useMemo(() => {
    if (!snapshot) return '';
    return [
      '[verified_by_server:true]',
      'Coalition client situation override:',
      JSON.stringify(override),
    ].join('\n');
  }, [override, snapshot]);

  useEffect(() => {
    onVerifiedOverrideChange?.(note);
  }, [note, onVerifiedOverrideChange]);

  return (
    <div className="space-y-4">
      <ClientSituationCard snapshot={snapshot} />
      {snapshot ? (
        <section className="rounded-lg border bg-card p-4">
          <h4 className="text-foreground text-sm font-semibold">{copy.editHeading}</h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{copy.editIntro}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field
              label={copy.entityType}
              value={override.entity_type}
              onChange={value => setOverride(prev => ({ ...prev, entity_type: value }))}
            />
            <Field
              label={copy.dominantConstraint}
              value={override.dominant_constraint}
              onChange={value => setOverride(prev => ({ ...prev, dominant_constraint: value }))}
            />
            <Field
              label={copy.strategicMode}
              value={override.strategic_mode}
              onChange={value => setOverride(prev => ({ ...prev, strategic_mode: value }))}
            />
          </div>
          <p className="text-muted-foreground mt-4 text-xs font-semibold">{copy.maturity}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <NumberField
              label={copy.productClarity}
              value={override.maturity.product_clarity}
              onChange={value => setOverride(prev => ({ ...prev, maturity: { ...prev.maturity, product_clarity: value } }))}
            />
            <NumberField
              label={copy.audienceClarity}
              value={override.maturity.audience_clarity}
              onChange={value => setOverride(prev => ({ ...prev, maturity: { ...prev.maturity, audience_clarity: value } }))}
            />
            <NumberField
              label={copy.positioningStrength}
              value={override.maturity.positioning_strength}
              onChange={value => setOverride(prev => ({ ...prev, maturity: { ...prev.maturity, positioning_strength: value } }))}
            />
            <NumberField
              label={copy.channelReadiness}
              value={override.maturity.channel_readiness}
              onChange={value => setOverride(prev => ({ ...prev, maturity: { ...prev.maturity, channel_readiness: value } }))}
            />
            <NumberField
              label={copy.resourceConstraints}
              value={override.maturity.resource_constraints}
              onChange={value => setOverride(prev => ({ ...prev, maturity: { ...prev.maturity, resource_constraints: value } }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
