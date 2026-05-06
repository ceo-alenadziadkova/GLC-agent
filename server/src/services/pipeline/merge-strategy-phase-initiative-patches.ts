import { z } from 'zod';

import { StrategyPhaseResultPatchSchema } from '../../schemas/pipeline-phase-result-edit.js';

type StrategyPhasePatch = z.infer<typeof StrategyPhaseResultPatchSchema>;
type InitiativePatch = NonNullable<StrategyPhasePatch['quick_wins']>[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Merges initiative field patches into persisted `audit_strategy` JSON arrays by matching `id`.
 * Preserves all other initiative fields (domain, priority, evidence, …).
 */
export function mergeStrategyInitiativeArrays(args: {
  currentQuickWins: unknown;
  currentMediumTerm: unknown;
  currentStrategic: unknown;
  patch: StrategyPhasePatch;
}): { quick_wins?: unknown[]; medium_term?: unknown[]; strategic?: unknown[] } {
  const mergeBucket = (current: unknown, patches: InitiativePatch[] | undefined): unknown[] | undefined => {
    if (patches == null) return undefined;
    const base: unknown[] = Array.isArray(current) ? [...current] : [];
    for (const p of patches) {
      const idx = base.findIndex((x) => isRecord(x) && String(x.id) === p.id);
      if (idx === -1) continue;
      const cur = { ...(base[idx] as Record<string, unknown>) };
      cur.title = p.title;
      cur.description = p.description;
      if (Object.prototype.hasOwnProperty.call(p, 'board_identity_key')) {
        if (p.board_identity_key === null) {
          delete cur.board_identity_key;
        } else {
          cur.board_identity_key = p.board_identity_key;
        }
      }
      base[idx] = cur;
    }
    return base;
  };

  const out: { quick_wins?: unknown[]; medium_term?: unknown[]; strategic?: unknown[] } = {};
  const qw = mergeBucket(args.currentQuickWins, args.patch.quick_wins);
  const mt = mergeBucket(args.currentMediumTerm, args.patch.medium_term);
  const st = mergeBucket(args.currentStrategic, args.patch.strategic);
  if (qw != null) out.quick_wins = qw;
  if (mt != null) out.medium_term = mt;
  if (st != null) out.strategic = st;
  return out;
}
