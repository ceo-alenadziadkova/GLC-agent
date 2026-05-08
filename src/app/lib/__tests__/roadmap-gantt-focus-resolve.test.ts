import { describe, expect, it } from 'vitest';

import { resolveTaskFocusFromUrl } from '../roadmap-gantt-focus-resolve';

const ids = new Set(['a', 'b', 'c']);

describe('resolveTaskFocusFromUrl', () => {
  it('returns the URL task param when it exists in the projection', () => {
    expect(
      resolveTaskFocusFromUrl({
        urlTaskParam: 'b',
        fallbackResolvedFocusTaskId: 'c',
        projectionTaskIds: ids,
      }),
    ).toBe('b');
  });

  it('falls back to resolved focus when the URL param is missing or unknown', () => {
    expect(
      resolveTaskFocusFromUrl({
        urlTaskParam: '',
        fallbackResolvedFocusTaskId: 'c',
        projectionTaskIds: ids,
      }),
    ).toBe('c');
    expect(
      resolveTaskFocusFromUrl({
        urlTaskParam: 'unknown',
        fallbackResolvedFocusTaskId: 'a',
        projectionTaskIds: ids,
      }),
    ).toBe('a');
  });

  it('returns null when neither url nor fallback resolve to a known id', () => {
    expect(
      resolveTaskFocusFromUrl({
        urlTaskParam: '',
        fallbackResolvedFocusTaskId: 'unknown',
        projectionTaskIds: ids,
      }),
    ).toBeNull();
  });
});
