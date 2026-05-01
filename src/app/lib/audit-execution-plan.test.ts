// Behaviour: execution_plan visibility for portal/workspace — aligns with docs/PIPELINE.md coverage packages.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  EXPRESS_PRODUCT_MODE,
  FREE_SNAPSHOT_PRODUCT_MODE,
  PRO_AUDIT_COVERAGE_PACKAGE,
  STARTER_AUDIT_COVERAGE_PACKAGE,
} from '../data/auditTypes';
import type { AuditMeta } from '../data/auditTypes';
import {
  auditPackageLabel,
  coveragePackageFromMeta,
  coveragePackageLabel,
  isExpressLikeAudit,
  isSnapshotStyleAudit,
  phaseIdsFromMetaPlan,
  plannedExecutionPhaseIdSet,
} from './audit-execution-plan';

function meta(over: Partial<AuditMeta> = {}): AuditMeta {
  return {
    id: 'a1',
    company_url: 'https://example.com',
    status: 'draft',
    current_phase: 0,
    ...over,
  } as AuditMeta;
}

describe('audit-execution-plan', () => {
  describe('coveragePackageFromMeta', () => {
    it('defaults when execution_plan missing', () => {
      expect(coveragePackageFromMeta({})).toBe(DEFAULT_AUDIT_COVERAGE_PACKAGE);
    });

    it('reads coverage_package from execution_plan', () => {
      expect(
        coveragePackageFromMeta({
          execution_plan: { coverage_package: 'starter', selected_domains: ['ux_conversion'] },
        }),
      ).toBe('starter');
    });
  });

  describe('isSnapshotStyleAudit', () => {
    it('is true for free_snapshot with no execution_plan', () => {
      expect(
        isSnapshotStyleAudit({
          product_mode: FREE_SNAPSHOT_PRODUCT_MODE,
          snapshot_token: null,
          execution_plan: undefined,
        }),
      ).toBe(true);
    });

    it('is true for starter UX-only plan with token and no strategy', () => {
      expect(
        isSnapshotStyleAudit({
          snapshot_token: 'tok',
          execution_plan: {
            coverage_package: STARTER_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['ux_conversion'],
            include_strategy: false,
          },
        }),
      ).toBe(true);
    });

    it('is false when include_strategy is true', () => {
      expect(
        isSnapshotStyleAudit({
          snapshot_token: 'tok',
          execution_plan: {
            coverage_package: STARTER_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['ux_conversion'],
            include_strategy: true,
          },
        }),
      ).toBe(false);
    });

    it('is false when more than one domain selected', () => {
      expect(
        isSnapshotStyleAudit({
          snapshot_token: 'tok',
          execution_plan: {
            coverage_package: STARTER_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['ux_conversion', 'seo_digital'],
            include_strategy: false,
          },
        }),
      ).toBe(false);
    });
  });

  describe('phaseIdsFromMetaPlan', () => {
    it('includes recon, sorted domain phases, and strategy when requested', () => {
      const phases = phaseIdsFromMetaPlan(
        meta({
          execution_plan: {
            coverage_package: 'pro',
            selected_domains: ['marketing_utp', 'tech_infrastructure'],
            include_strategy: true,
            depth: 'standard',
            source: 'user_selected',
          },
        }),
      );
      expect(phases).toEqual([0, 1, 5, 7]);
    });

    it('omits strategy phase when include_strategy is false', () => {
      const phases = phaseIdsFromMetaPlan(
        meta({
          execution_plan: {
            coverage_package: 'pro',
            selected_domains: ['seo_digital'],
            include_strategy: false,
            depth: 'standard',
            source: 'user_selected',
          },
        }),
      );
      expect(phases).toEqual([0, 3]);
      expect(phases).not.toContain(7);
    });
  });

  describe('plannedExecutionPhaseIdSet', () => {
    it('returns null when execution_plan absent or domains not selected', () => {
      expect(plannedExecutionPhaseIdSet(meta({ execution_plan: undefined }))).toBe(null);
      expect(
        plannedExecutionPhaseIdSet(
          meta({
            execution_plan: { coverage_package: 'complete', selected_domains: [], include_strategy: true },
          }),
        ),
      ).toBe(null);
    });

    it('returns a set of planned phase ids when domains are selected', () => {
      const set = plannedExecutionPhaseIdSet(
        meta({
          execution_plan: {
            coverage_package: 'complete',
            selected_domains: ['tech_infrastructure', 'automation_processes'],
            include_strategy: false,
            depth: 'standard',
            source: 'user_selected',
          },
        }),
      );
      expect(set?.has(0)).toBe(true);
      expect(set?.has(1)).toBe(true);
      expect(set?.has(5)).toBe(false);
      expect(set?.has(6)).toBe(true);
    });
  });

  describe('isExpressLikeAudit', () => {
    it('is true when all phases are at most UX (4)', () => {
      expect(
        isExpressLikeAudit(
          meta({
            execution_plan: {
              coverage_package: 'pro',
              selected_domains: ['tech_infrastructure', 'ux_conversion'],
              include_strategy: false,
              depth: 'standard',
              source: 'user_selected',
            },
          }),
        ),
      ).toBe(true);
    });

    it('is false when marketing domain included', () => {
      expect(
        isExpressLikeAudit(
          meta({
            execution_plan: {
              coverage_package: 'complete',
              selected_domains: ['marketing_utp'],
              include_strategy: false,
              depth: 'deep',
              source: 'user_selected',
            },
          }),
        ),
      ).toBe(false);
    });
  });

  describe('coveragePackageLabel', () => {
    it('returns title and audit variants', () => {
      expect(coveragePackageLabel('starter', 'title')).toBe('Starter');
      expect(coveragePackageLabel('starter', 'audit')).toBe('Starter audit');
    });
  });

  describe('auditPackageLabel', () => {
    it('returns snapshot label for snapshot-style audit', () => {
      expect(
        auditPackageLabel(
          {
            snapshot_token: 't',
            execution_plan: {
              coverage_package: STARTER_AUDIT_COVERAGE_PACKAGE,
              selected_domains: ['ux_conversion'],
              include_strategy: false,
            },
          },
          { snapshotLabel: 'Snap' },
        ),
      ).toBe('Snap');
    });

    it('uses legacy express product_mode fallback when package missing', () => {
      expect(
        auditPackageLabel({
          product_mode: EXPRESS_PRODUCT_MODE,
          snapshot_token: null,
          execution_plan: undefined,
        }),
      ).toBe('Pro');
    });

    it('uses free_snapshot label when no plan and product_mode is free_snapshot', () => {
      expect(
        auditPackageLabel({
          product_mode: FREE_SNAPSHOT_PRODUCT_MODE,
          snapshot_token: null,
          execution_plan: undefined,
        }),
      ).toBe('Free snapshot');
    });

    it('reads package from execution_plan when set', () => {
      expect(
        auditPackageLabel({
          snapshot_token: null,
          execution_plan: {
            coverage_package: PRO_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['seo_digital', 'ux_conversion'],
            include_strategy: true,
            depth: 'standard',
            source: 'user_selected',
          },
        }),
      ).toBe('Pro');
    });
  });
});
