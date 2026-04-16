import { describe, expect, it } from 'vitest';
import { toSnapshotStatusResponse } from './snapshotLandingDto';

describe('toSnapshotStatusResponse', () => {
  it('returns success branch for ok responses', () => {
    const payload = { status: 'completed', company_url: 'https://example.com' };
    const result = toSnapshotStatusResponse(200, true, payload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(payload);
    }
  });

  it('returns error branch for failed responses', () => {
    const payload = { error: 'Bad request' };
    const result = toSnapshotStatusResponse(400, false, payload);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.payload).toEqual(payload);
    }
  });
});
