import { describe, expect, it } from 'vitest';
import { buildBriefSchemaSnapshot } from '@glc/intake-core';
import { buildIntakePlan } from '@glc/intake-core';
import { currentIntakeVersionTuple } from '@glc/intake-core';
import { getQuestionBankSchemaMeta } from '@glc/intake-core';
import { getBriefQuestionsByIds } from '../schemas/intake-brief.js';

describe('question plan resolver parity', () => {
  it('brief schema question ids follow plan.visible bank ids', () => {
    const args = {
      responses: {
        a5: 'No website yet',
        a2: 'Hospitality',
        d1: ['Email'],
      },
      productMode: 'full' as const,
      collectionMode: 'self_serve' as const,
      surface: 'consultant_interview' as const,
      intakeVersionTuple: currentIntakeVersionTuple(),
    };
    const schema = buildBriefSchemaSnapshot(args);
    const plan = buildIntakePlan(args);
    const schemaBankIds = plan.visible.filter(id => !!getQuestionBankSchemaMeta(id));
    expect(schema.questions.map(q => q.id)).toEqual(schemaBankIds);
  });

  it('legacy brief question projection stays an ordered subset of schema ids', () => {
    const args = {
      responses: {
        a5: 'No website yet',
        a2: 'Retail',
      },
      productMode: 'full' as const,
      collectionMode: 'discovery' as const,
      surface: 'public_discovery' as const,
      intakeVersionTuple: currentIntakeVersionTuple(),
    };
    const schema = buildBriefSchemaSnapshot(args);
    const plan = buildIntakePlan(args);
    const schemaIds = schema.questions.map(q => q.id);
    const legacyIds = getBriefQuestionsByIds(plan.visible).map(q => q.id);
    const schemaSubset = schemaIds.filter(id => legacyIds.includes(id));
    expect(schemaSubset).toEqual(legacyIds);
  });
});
