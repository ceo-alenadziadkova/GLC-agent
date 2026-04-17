import { describe, expect, it } from 'vitest';

import { deriveVisibleNodeSet } from './filters';

describe('deriveVisibleNodeSet', () => {
  it('keeps only nodes that match search query', () => {
    const ids = ['alpha', 'beta', 'gamma'];
    const result = deriveVisibleNodeSet({
      ids,
      pathOnlyMode: false,
      pathSet: new Set(ids),
      collapsedRoots: new Set<string>(),
      pinnedFocusId: null,
      focusId: '',
      selectedIds: new Set<string>(),
      upstreamById: new Map([
        ['alpha', []],
        ['beta', []],
        ['gamma', []],
      ]),
      downstreamById: new Map([
        ['alpha', []],
        ['beta', []],
        ['gamma', []],
      ]),
      downstreamDepth: 2,
      collapsedSections: new Set<string>(),
      searchQuery: 'bet',
      resolveLabel: id => id.toUpperCase(),
    });

    expect([...result]).toEqual(['beta']);
  });
});

