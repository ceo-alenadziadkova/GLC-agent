import { describe, expect, it } from 'vitest';
import { QUESTION_BANK_V1_STUBS } from '../../../../server/src/intake/question-bank';
import { buildQuestionBankStudioPayloadPhase2 } from '../question-bank-studio-payload';
import { canonBranchEdgeKeySet } from '../question-bank-studio-graph';

/**
 * Phase 2: Studio `branchEdges` must match the single canon module
 * (`computeBranchTopology` → `computeBranchUpstreamIds` on `QUESTION_BANK_V1_STUBS`).
 * No duplicated branch rules in the UI — payload is built from the same graph builder.
 */
describe('question-bank-studio branch parity (resolver canon)', () => {
  const expected = canonBranchEdgeKeySet(QUESTION_BANK_V1_STUBS);

  it('phase2 branchEdges match canon topology when showBranchEdges is true', () => {
    const p = buildQuestionBankStudioPayloadPhase2({
      policyMode: 'full',
      showBranchEdges: true,
      colorByDomain: false,
    });
    expect(p.branchEdges.length).toBe(expected.size);
    const seen = new Set<string>();
    for (const e of p.branchEdges) {
      const k = `${e.fromQuestionId}\t${e.toQuestionId}`;
      expect(expected.has(k)).toBe(true);
      seen.add(k);
    }
    expect(seen.size).toBe(expected.size);
  });

  it('phase2 has no branch edges when showBranchEdges is false', () => {
    const p = buildQuestionBankStudioPayloadPhase2({
      policyMode: 'full',
      showBranchEdges: false,
      colorByDomain: false,
    });
    expect(p.branchEdges.length).toBe(0);
  });

  it('branch payload unchanged across layout/cluster toggles (canon-only edges)', () => {
    const base = buildQuestionBankStudioPayloadPhase2({
      policyMode: 'full',
      showBranchEdges: true,
      colorByDomain: false,
    });
    const rich = buildQuestionBankStudioPayloadPhase2({
      policyMode: 'pre_brief',
      showBranchEdges: true,
      colorByDomain: true,
      clusterByPrimaryDomain: true,
      layoutSurface: 'consultant_interview',
    });
    const keys = (x: typeof base) =>
      [...x.branchEdges]
        .map(e => `${e.fromQuestionId}\t${e.toQuestionId}`)
        .sort()
        .join('|');
    expect(keys(base)).toBe(keys(rich));
  });
});
