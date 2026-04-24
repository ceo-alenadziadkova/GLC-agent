import type { IntakeCriticalSignalConfidence } from '../audit-contract.js';
import type { IntakeQuestionStub } from '../types.js';
import criticalSignals from '../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };
import { computeSignalPrioritization } from './signal-prioritization.js';

type SignalsArtifact = {
  signals: Record<string, { bankIds: string[] }>;
};

const ART = criticalSignals as SignalsArtifact;
const RANK_UNMAPPED = 100_000;

function buildBankToSignalKeys(): Map<string, string[]> {
  const bankToSignalKeys = new Map<string, string[]>();
  for (const [sk, def] of Object.entries(ART.signals)) {
    for (const bid of def.bankIds) {
      const cur = bankToSignalKeys.get(bid) ?? [];
      if (!cur.includes(sk)) cur.push(sk);
      bankToSignalKeys.set(bid, cur);
    }
  }
  return bankToSignalKeys;
}

const BANK_TO_SIGNAL_KEYS = buildBankToSignalKeys();

/**
 * Ranks each bank by the minimum index of its signal key(s) in `nextSignalKeys` (pilot registry).
 * Unmapped banks sort after mapped banks, preserving original order as tie-breaker.
 */
function reorderIdListByNextSignalKeys(
  nextRecommended: string[],
  nextSignalKeys: string[],
): string[] {
  const keyIndex = new Map(nextSignalKeys.map((k, i) => [k, i]));
  const withIdx = nextRecommended.map((id, origIdx) => {
    const keys = BANK_TO_SIGNAL_KEYS.get(id) ?? [];
    let rank = RANK_UNMAPPED;
    for (const k of keys) {
      const pos = keyIndex.get(k);
      if (pos !== undefined) rank = Math.min(rank, pos);
    }
    return { id, rank, origIdx };
  });
  withIdx.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.origIdx - b.origIdx;
  });
  return withIdx.map(x => x.id);
}

/**
 * Secondary ordering for `nextRecommended` after heuristics + sequencing pilot: each bank is ranked by the
 * earliest index among its signal key(s) in `nextSignalKeys` (readiness contract parity).
 */
export function reorderNextRecommendedForSignalPriority(args: {
  nextRecommended: string[];
  responses: Record<string, unknown>;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
}): { nextRecommended: string[]; nextSignalKeys: string[] } {
  const { nextSignalKeys } = computeSignalPrioritization({
    responses: args.responses,
    confidenceByKey: args.confidenceByKey,
  });
  return {
    nextRecommended: reorderIdListByNextSignalKeys(args.nextRecommended, nextSignalKeys),
    nextSignalKeys,
  };
}

function tierForStub(stubs: IntakeQuestionStub[], id: string): 0 | 1 | 2 {
  const p = stubs.find(s => s.id === id)?.priority;
  if (p === 'required') return 0;
  if (p === 'recommended') return 1;
  return 2;
}

/**
 * Same as {@link reorderNextRecommendedForSignalPriority}, but keeps `required` before `recommended` before `optional`
 * (ADR Phase F heuristics) while applying signal key order **within** each stub tier.
 */
export function reorderNextRecommendedForSignalPriorityRespectingTiers(args: {
  nextRecommended: string[];
  responses: Record<string, unknown>;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  stubs: IntakeQuestionStub[];
}): { nextRecommended: string[]; nextSignalKeys: string[] } {
  const { nextSignalKeys } = computeSignalPrioritization({
    responses: args.responses,
    confidenceByKey: args.confidenceByKey,
  });
  const tiers: [string[], string[], string[]] = [[], [], []];
  for (const id of args.nextRecommended) {
    tiers[tierForStub(args.stubs, id)].push(id);
  }
  const out: string[] = [];
  for (const tier of tiers) {
    if (tier.length === 0) continue;
    out.push(...reorderIdListByNextSignalKeys(tier, nextSignalKeys));
  }
  return { nextRecommended: out, nextSignalKeys };
}
