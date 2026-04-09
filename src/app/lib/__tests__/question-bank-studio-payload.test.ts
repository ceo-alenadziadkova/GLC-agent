import { describe, expect, it } from 'vitest';
import {
  STUDIO_BANK_PAYLOAD_SCHEMA_PHASE1,
  STUDIO_BANK_PAYLOAD_SCHEMA_PHASE2,
  buildQuestionBankStudioPayloadPhase1,
  buildQuestionBankStudioPayloadPhase2,
} from '../question-bank-studio-payload';
import { QUESTION_BANK_V1_STUBS } from '../../../../server/src/intake/question-bank';

describe('question-bank-studio-payload', () => {
  it('phase1 is JSON-serializable and includes all bank questions as nodes', () => {
    const p = buildQuestionBankStudioPayloadPhase1({ policyMode: 'full' });
    expect(p.schemaId).toBe(STUDIO_BANK_PAYLOAD_SCHEMA_PHASE1);
    expect(p.bankVersion).toMatch(/^\d+\.\d+/);
    expect(p.layoutSurface).toBe(null);
    expect(p.clusterByPrimaryDomain).toBe(false);
    expect(() => JSON.stringify(p)).not.toThrow();
    const questions = p.nodes.filter(n => n.kind === 'question');
    expect(questions.length).toBe(QUESTION_BANK_V1_STUBS.length);
    expect(p.branchTopology.edges.length).toBeGreaterThan(0);
    expect(p.structureEdges.length).toBeGreaterThan(0);
    expect(p.stats.structureLeafCount).toBe(QUESTION_BANK_V1_STUBS.length);
    expect(p.stats.structureMaxDepth).toBeGreaterThan(0);
  });

  it('phase1 with layout surface adds layout step nodes and deeper structure path', () => {
    const flat = buildQuestionBankStudioPayloadPhase1({ policyMode: 'full', layoutSurface: null });
    const laid = buildQuestionBankStudioPayloadPhase1({
      policyMode: 'full',
      layoutSurface: 'consultant_interview',
    });
    expect(laid.layoutSurface).toBe('consultant_interview');
    expect(laid.nodes.filter(n => n.kind === 'layoutStep').length).toBeGreaterThan(0);
    expect(flat.nodes.filter(n => n.kind === 'layoutStep').length).toBe(0);
    expect(laid.stats.structureMaxDepth).toBeGreaterThanOrEqual(flat.stats.structureMaxDepth);
    expect(laid.structureEdges.some(e => e.kind === 'section_to_layout_step')).toBe(true);
    expect(laid.structureEdges.some(e => e.kind === 'layout_step_to_question')).toBe(true);
  });

  it('phase1 with clusterByPrimaryDomain adds domain cluster nodes and edges', () => {
    const p = buildQuestionBankStudioPayloadPhase1({
      policyMode: 'full',
      clusterByPrimaryDomain: true,
    });
    expect(p.clusterByPrimaryDomain).toBe(true);
    expect(p.nodes.some(n => n.kind === 'domainCluster')).toBe(true);
    expect(p.structureEdges.some(e => e.kind === 'root_to_domain')).toBe(true);
    expect(p.structureEdges.some(e => e.kind === 'domain_to_section')).toBe(true);
  });

  it('phase2 includes branchEdges when showBranchEdges is true', () => {
    const on = buildQuestionBankStudioPayloadPhase2({
      policyMode: 'full',
      showBranchEdges: true,
      colorByDomain: false,
    });
    expect(on.schemaId).toBe(STUDIO_BANK_PAYLOAD_SCHEMA_PHASE2);
    expect(on.branchEdges.length).toBeGreaterThan(0);
    expect(Object.keys(on.questionPolicyById).length).toBe(QUESTION_BANK_V1_STUBS.length);
  });

  it('phase2 has empty branchEdges when showBranchEdges is false', () => {
    const off = buildQuestionBankStudioPayloadPhase2({
      policyMode: 'express',
      showBranchEdges: false,
    });
    expect(off.branchEdges.length).toBe(0);
  });
});
