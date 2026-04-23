import { describe, expect, it } from 'vitest';

import { mapNlDescribeTextToGraphDraft } from '../services/intake/nl-describe-graph-mapper.js';

describe('mapNlDescribeTextToGraphDraft', () => {
  it('infers ecommerce hint for a2', () => {
    const d = mapNlDescribeTextToGraphDraft('We run a Shopify store selling home goods.');
    expect(d.inferred.some(x => x.questionId === 'a2' && x.rationale.includes('ecommerce'))).toBe(true);
  });

  it('infers compliance hint for f1', () => {
    const d = mapNlDescribeTextToGraphDraft('We need GDPR and HIPAA alignment before scaling.');
    expect(d.inferred.some(x => x.questionId === 'f1')).toBe(true);
  });
});
