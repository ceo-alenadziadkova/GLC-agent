/**
 * Ensures SPA legacy brief rows are the same object graph as the server schema (ADR Phase A drift guard).
 */
import { describe, expect, it } from 'vitest';
import { BRIEF_QUESTIONS, INTAKE_IDENTITY_BRIEF_QUESTIONS } from './briefQuestions';
import {
  BRIEF_QUESTIONS as SERVER_BRIEF,
  INTAKE_IDENTITY_BRIEF_QUESTIONS as SERVER_IDENTITY,
  INTAKE_IDENTITY_FIELD_IDS as SERVER_IDENTITY_IDS,
} from '../../../server/src/schemas/intake-brief-questions';
import { INTAKE_IDENTITY_FIELD_IDS } from './intakeIdentityFieldIds';

describe('legacy brief SPA ↔ server parity', () => {
  it('reuses server array references (no forked copy)', () => {
    expect(BRIEF_QUESTIONS).toBe(SERVER_BRIEF);
    expect(INTAKE_IDENTITY_BRIEF_QUESTIONS).toBe(SERVER_IDENTITY);
  });

  it('identity field id tuple matches server', () => {
    expect(INTAKE_IDENTITY_FIELD_IDS).toBe(SERVER_IDENTITY_IDS);
  });

  it('required id list matches server filter', () => {
    const fromServer = [...new Set(SERVER_BRIEF.filter(q => q.priority === 'required').map(q => q.id))].sort();
    const fromSpa = [...new Set(BRIEF_QUESTIONS.filter(q => q.priority === 'required').map(q => q.id))].sort();
    expect(fromSpa).toEqual(fromServer);
  });
});
