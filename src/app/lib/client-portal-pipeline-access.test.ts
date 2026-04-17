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

  it('returns false when status missing', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: '' },
        brief: { gates: { canStartPipeline: true } },
      }),
    ).toBe(false);
  });

  it('returns false for snapshot-style starter audit regardless of gates', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: {
          status: 'created',
          snapshot_token: 'snap_001',
          execution_plan: {
            coverage_package: 'starter',
            selected_domains: ['ux_conversion'],
            include_strategy: false,
          },
        },
        brief: { gates: { canStartPipeline: true } },
      }),
    ).toBe(false);
  });

  it('returns true when audit left created without checking gates', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'running' },
        brief: null,
      }),
    ).toBe(true);
  });

  it('returns false for created when gates missing', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: {},
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: { gates: null },
      }),
    ).toBe(false);
  });

  it('uses canStartPipeline as canonical gate', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: { gates: { canStartPipeline: true } },
      }),
    ).toBe(true);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: { gates: { canStartPipeline: false } },
      }),
    ).toBe(false);
  });

  it('does not allow legacy gate flags without canStartPipeline', () => {
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: { gates: {} },
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: { gates: {} },
      }),
    ).toBe(false);
    expect(
      clientCanViewPortalPipeline({
        auditMeta: { status: 'created' },
        brief: { gates: {} },
      }),
    ).toBe(false);
  });
});
