import { describe, expect, it } from 'vitest';

import { buildGraphModel } from './graph-model';

describe('buildGraphModel', () => {
  it('returns all nodes in layers even when isolated', () => {
    const ids = ['unknown_a', 'unknown_b'];
    const graph = buildGraphModel(ids);
    const flattened = graph.layers.flat();

    expect(flattened.sort()).toEqual([...ids].sort());
    expect(graph.edges).toHaveLength(0);
  });
});

