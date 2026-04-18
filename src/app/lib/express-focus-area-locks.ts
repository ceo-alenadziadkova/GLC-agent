export const EXPRESS_LOCKED_F2_OPTIONS = [
  'Marketing and positioning (clarity of message and differentiation)',
  'Process automation and efficiency (less manual work and handoffs)',
] as const;

export function normalizeF2ValueForExpress(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const next = value.filter(v => typeof v === 'string' && !EXPRESS_LOCKED_F2_OPTIONS.includes(v as (typeof EXPRESS_LOCKED_F2_OPTIONS)[number]));
  return next.length ? next : null;
}

