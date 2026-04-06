/**
 * Behaviour: client portal pipeline visibility after brief gates (see docs/PRODUCT.md intake paths).
 */
import { describe, expect, it } from 'vitest';
import { clientCanViewPortalPipeline } from './client-portal-pipeline-access';

describe('clientCanViewPortalPipeline', () => {
  it('returns false when audit meta is missing', () => {
    expect(clientCanViewPortalPipeline({ auditMeta: null, brief: null })).toBe(false);
    expect(clientCanViewPortalPipeline({ auditMeta: undefined, brief: {} })).toBe(false);
  });

  it('returns false when status or product_mode missing', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: '' },
        brief: { gates: { canStartFull: true } },
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: '', product_mode: 'full' },
        brief: { gates: { canStartFull: true } },
      }),
    ).toBe(false);
  });

  it('returns false for free_snapshot regardless of gates', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'free_snapshot' },
        brief: { gates: { canStartFull: true, canStartExpress: true } },
      }),
    ).toBe(false);
  });

  it('returns true when audit left created without checking gates', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'running', product_mode: 'full' },
        brief: null,
      }),
    ).toBe(true);
  });

  it('returns false for created when gates missing', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: {},
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: null },
      }),
    ).toBe(false);
  });

  it('uses canStartExpress when brief product_mode is express', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { product_mode: 'express', gates: { canStartExpress: true } },
      }),
    ).toBe(true);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { product_mode: 'express', gates: { canStartExpress: false } },
      }),
    ).toBe(false);
  });

  it('uses canStartFull when brief is not express', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { product_mode: 'full', gates: { canStartFull: true } },
      }),
    ).toBe(true);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartFull: true } },
      }),
    ).toBe(true);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartFull: false } },
      }),
    ).toBe(false);
  });
});
