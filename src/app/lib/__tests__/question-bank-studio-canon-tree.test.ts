import { describe, expect, it } from 'vitest';
import {
  getQuestionBankSchemaMeta,
  QUESTION_BANK_V1_STUBS,
} from '@glc/intake-core';
import {
  buildQuestionBankStudioGraph,
  collectStudioGraphQuestionIds,
  partitionStubsByCanonSection,
} from '../question-bank-studio-graph';
import {
  computeStudioPolicyModeStats,
  participatesInPolicyMode,
} from '../question-bank-studio-policy';

describe('question-bank-studio canon tree', () => {
  const canonIds = new Set(QUESTION_BANK_V1_STUBS.map(s => s.id));

  it('includes every bank id exactly once when no sections are collapsed', () => {
    const g = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
      clusterByPrimaryDomain: false,
      layoutSurface: null,
    });
    const onCanvas = collectStudioGraphQuestionIds(g.nodes);
    expect(onCanvas.size).toBe(canonIds.size);
    for (const id of canonIds) {
      expect(onCanvas.has(id)).toBe(true);
    }
    for (const id of onCanvas) {
      expect(canonIds.has(id)).toBe(true);
    }
  });

  it('keeps stable section key order across graph rebuilds (canon order)', () => {
    const { sectionKeysInOrder } = partitionStubsByCanonSection(QUESTION_BANK_V1_STUBS);
    const a = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
    });
    const b = buildQuestionBankStudioGraph({
      policyMode: 'express',
      showBranchEdges: true,
      colorByDomain: true,
      clusterByPrimaryDomain: true,
      layoutSurface: 'consultant_interview',
    });
    expect(a.sectionKeys).toEqual(sectionKeysInOrder);
    expect(b.sectionKeys).toEqual(sectionKeysInOrder);
    expect(a.sectionKeys).toEqual(b.sectionKeys);
  });

  it('stable section order matches two sequential partition calls', () => {
    const x = partitionStubsByCanonSection(QUESTION_BANK_V1_STUBS);
    const y = partitionStubsByCanonSection(QUESTION_BANK_V1_STUBS);
    expect(x.sectionKeysInOrder).toEqual(y.sectionKeysInOrder);
    expect(x.sectionKeysInOrder.length).toBeGreaterThan(0);
    let total = 0;
    for (const k of x.sectionKeysInOrder) {
      total += x.sectionMembers.get(k)?.length ?? 0;
    }
    expect(total).toBe(QUESTION_BANK_V1_STUBS.length);
  });

  it('collapsed section drops its questions from the graph but other ids remain', () => {
    const { sectionKeysInOrder } = partitionStubsByCanonSection(QUESTION_BANK_V1_STUBS);
    const dropKey = sectionKeysInOrder[0]!;
    const g = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
      collapsedSectionKeys: new Set([dropKey]),
    });
    const onCanvas = collectStudioGraphQuestionIds(g.nodes);
    const dropped = QUESTION_BANK_V1_STUBS.filter(s => {
      const meta = getQuestionBankSchemaMeta(s.id);
      return (meta?.section ?? '—') === dropKey;
    }).map(s => s.id);
    expect(dropped.length).toBeGreaterThan(0);
    for (const id of dropped) {
      expect(onCanvas.has(id)).toBe(false);
    }
    expect(onCanvas.size).toBe(canonIds.size - dropped.length);
  });

  it('computeStudioPolicyModeStats matches participatesInPolicyMode for discovery and pre_brief', () => {
    for (const mode of ['discovery', 'pre_brief'] as const) {
      let manual = 0;
      for (const s of QUESTION_BANK_V1_STUBS) {
        if (participatesInPolicyMode(s.id, mode)) manual++;
      }
      const stats = computeStudioPolicyModeStats(mode);
      expect(stats.bankParticipating).toBe(manual);
      expect(stats.bankOutsidePolicy).toBe(canonIds.size - manual);
    }
  });

  it('question nodes carry policyBaseVisual and layoutSize for export and canvas', () => {
    const g = buildQuestionBankStudioGraph({
      policyMode: 'full',
      showBranchEdges: false,
      viewDensity: 'comfortable',
    });
    const q = g.nodes.find(n => n.type === 'studioQuestion' && n.data.kind === 'question');
    expect(q?.data.kind).toBe('question');
    if (q?.data.kind === 'question') {
      expect(q.data.policyBaseVisual).toBeTruthy();
      expect(q.data.layoutSize.w).toBeGreaterThan(0);
      expect(q.data.layoutSize.h).toBeGreaterThan(0);
    }
  });
});
