/**
 * Ensures SPA legacy brief rows are the same object graph as `@glc/intake-core` (no forked copy).
 */
import { describe, expect, it } from 'vitest';
import { BRIEF_QUESTIONS, INTAKE_IDENTITY_BRIEF_QUESTIONS } from './briefQuestions';
import {
  BRIEF_QUESTIONS as SERVER_BRIEF,
  INTAKE_IDENTITY_BRIEF_QUESTIONS as SERVER_IDENTITY,
  INTAKE_IDENTITY_FIELD_IDS as SERVER_IDENTITY_IDS,
} from '@glc/intake-core';
import { INTAKE_IDENTITY_FIELD_IDS } from './intakeIdentityFieldIds';

describe('legacy brief SPA ↔ intake-core parity', () => {
  it('reuses intake-core array references (no forked copy)', () => {
    expect(BRIEF_QUESTIONS).toBe(SERVER_BRIEF);
    expect(INTAKE_IDENTITY_BRIEF_QUESTIONS).toBe(SERVER_IDENTITY);
  });

  it('identity field ids match policy-derived export from intake-core', () => {
    expect(INTAKE_IDENTITY_FIELD_IDS).toBe(SERVER_IDENTITY_IDS);
  });

  it('required id list matches intake-core filter', () => {
    const fromCore = [...new Set(SERVER_BRIEF.filter(q => q.priority === 'required').map(q => q.id))].sort();
    const fromSpa = [...new Set(BRIEF_QUESTIONS.filter(q => q.priority === 'required').map(q => q.id))].sort();
    expect(fromSpa).toEqual(fromCore);
  });
});
