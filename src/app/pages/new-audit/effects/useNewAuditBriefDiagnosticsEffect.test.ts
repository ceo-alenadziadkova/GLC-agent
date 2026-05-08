import { describe, expect, it } from 'vitest';
import { getVisibleQuestionIdsFromBriefPayload } from './useNewAuditBriefDiagnosticsEffect';

describe('useNewAuditBriefDiagnosticsEffect helpers', () => {
  it('extracts only non-empty ids', () => {
    const ids = getVisibleQuestionIdsFromBriefPayload({
      questions: [{ id: 'a1' }, { id: '' }, { test: true }, null] as unknown[],
    });
    expect(ids).toEqual(['a1']);
  });
});
