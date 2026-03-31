import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';

const FILTER_RE = /^user_id\.eq\."((?:\\.|[^"\\])*)",client_id\.eq\."((?:\\.|[^"\\])*)"$/s;
const FAST_CHECK_SEED = Number.parseInt(process.env.FC_SEED ?? '', 10);
const FAST_CHECK_RUNS = Number.parseInt(process.env.FC_NUM_RUNS ?? '', 10);
const FC_CONFIG: fc.Parameters<unknown> = {
  ...(Number.isFinite(FAST_CHECK_SEED) ? { seed: FAST_CHECK_SEED } : {}),
  ...(Number.isFinite(FAST_CHECK_RUNS) ? { numRuns: FAST_CHECK_RUNS } : {}),
};

function decodeQuotedPostgrestValue(value: string): string {
  return value.replace(/\\(["\\])/g, '$1');
}

describe('safeOrUserFilter', () => {
  it('wraps uid in quotes for OR filter safety', () => {
    const filter = safeOrUserFilter('user-123');
    expect(filter).toBe('user_id.eq."user-123",client_id.eq."user-123"');
  });

  it('escapes dangerous characters in uid', () => {
    const malicious = 'abc,def)/"ghi';
    const filter = safeOrUserFilter(malicious);
    expect(filter).toContain('user_id.eq."abc,def)/\\"ghi"');
    expect(filter).toContain('client_id.eq."abc,def)/\\"ghi"');
  });

  it('property: preserves arbitrary uid and keeps filter grammar stable', () => {
    fc.assert(
      fc.property(fc.string(), uid => {
        const filter = safeOrUserFilter(uid);
        const match = filter.match(FILTER_RE);

        expect(match).not.toBeNull();
        const left = decodeQuotedPostgrestValue(match![1]);
        const right = decodeQuotedPostgrestValue(match![2]);

        expect(left).toBe(uid);
        expect(right).toBe(uid);
      }),
      FC_CONFIG
    );
  });

  it('property: preserves printable ASCII uid (debug-friendly counterexamples)', () => {
    const printableAscii = fc
      .array(fc.integer({ min: 32, max: 126 }), { minLength: 0, maxLength: 256 })
      .map(chars => String.fromCharCode(...chars));

    fc.assert(
      fc.property(printableAscii, uid => {
        const filter = safeOrUserFilter(uid);
        const match = filter.match(FILTER_RE);

        expect(match).not.toBeNull();
        const left = decodeQuotedPostgrestValue(match![1]);
        const right = decodeQuotedPostgrestValue(match![2]);

        expect(left).toBe(uid);
        expect(right).toBe(uid);
      }),
      FC_CONFIG
    );
  });
});
