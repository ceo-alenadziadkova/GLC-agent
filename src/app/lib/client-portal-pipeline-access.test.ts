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
        brief: { gates: { canStartPipeline: true } },
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: '', product_mode: 'full' },
        brief: { gates: { canStartPipeline: true } },
      }),
    ).toBe(false);
  });

  it('returns false for free_snapshot regardless of gates', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'free_snapshot' },
        brief: { gates: { canStartPipeline: true, canStartFull: true, canStartExpress: true } },
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

  it('uses canStartPipeline as canonical gate', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartPipeline: true } },
      }),
    ).toBe(true);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartPipeline: false } },
      }),
    ).toBe(false);
  });

  it('does not allow legacy gate flags without canStartPipeline', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartFull: true } },
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartExpress: true } },
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created', product_mode: 'full' },
        brief: { gates: { canStartFull: false, canStartExpress: false } },
      }),
    ).toBe(false);
  });
});
