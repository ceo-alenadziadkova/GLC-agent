import { describe, expect, it } from 'vitest';
import {
  coveragePackageFromAuditRequestProductMode,
  intakeBriefGateModeFromExecutionPlan,
  intakeBriefGateModeFromPartialPlan,
  isFreeSnapshotUpgradeEligibleAudit,
  persistedProductModeForExecutionPlan,
} from '../lib/audit-coverage-bridge.js';
import {
  COMPLETE_AUDIT_COVERAGE_PACKAGE,
  DEFAULT_AUDIT_PRODUCT_MODE,
  EXPRESS_PRODUCT_MODE,
  FREE_SNAPSHOT_PRODUCT_MODE,
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  PRO_AUDIT_COVERAGE_PACKAGE,
  STARTER_AUDIT_COVERAGE_PACKAGE,
} from '../types/audit.js';
import { defaultExecutionPlanForPackage } from '../services/execution-plan.js';

describe('audit-coverage-bridge', () => {
  describe('coveragePackageFromAuditRequestProductMode', () => {
    it('maps full to complete and express to pro', () => {
      expect(coveragePackageFromAuditRequestProductMode('full')).toBe(COMPLETE_AUDIT_COVERAGE_PACKAGE);
      expect(coveragePackageFromAuditRequestProductMode('express')).toBe(PRO_AUDIT_COVERAGE_PACKAGE);
    });

    it('defaults non-full modes to pro', () => {
      expect(coveragePackageFromAuditRequestProductMode(null)).toBe(PRO_AUDIT_COVERAGE_PACKAGE);
      expect(coveragePackageFromAuditRequestProductMode('')).toBe(PRO_AUDIT_COVERAGE_PACKAGE);
    });
  });

  describe('persistedProductModeForExecutionPlan', () => {
    it('uses default full product mode for complete package', () => {
      const plan = defaultExecutionPlanForPackage('complete');
      expect(persistedProductModeForExecutionPlan(plan)).toBe(DEFAULT_AUDIT_PRODUCT_MODE);
    });

    it('uses express for non-complete packages', () => {
      const plan = defaultExecutionPlanForPackage('pro');
      expect(persistedProductModeForExecutionPlan(plan)).toBe(EXPRESS_PRODUCT_MODE);
    });
  });

  describe('intakeBriefGateModeFromExecutionPlan', () => {
    it('always returns SLA full mode', () => {
      const plan = defaultExecutionPlanForPackage('starter');
      expect(intakeBriefGateModeFromExecutionPlan(plan)).toBe(INTAKE_BRIEF_SLA_PRODUCT_MODE);
    });
  });

  describe('intakeBriefGateModeFromPartialPlan', () => {
    it('normalizes partial plan then returns SLA mode', () => {
      expect(intakeBriefGateModeFromPartialPlan(null)).toBe(INTAKE_BRIEF_SLA_PRODUCT_MODE);
      expect(intakeBriefGateModeFromPartialPlan({ coverage_package: 'pro' })).toBe(
        INTAKE_BRIEF_SLA_PRODUCT_MODE,
      );
    });
  });

  describe('isFreeSnapshotUpgradeEligibleAudit', () => {
    it('allows free_snapshot product_mode regardless of token', () => {
      expect(
        isFreeSnapshotUpgradeEligibleAudit({
          product_mode: FREE_SNAPSHOT_PRODUCT_MODE,
          snapshot_token: null,
          execution_plan: null,
        }),
      ).toBe(true);
    });

    it('allows starter UX-only plan with non-empty token', () => {
      expect(
        isFreeSnapshotUpgradeEligibleAudit({
          product_mode: 'full',
          snapshot_token: 'tok',
          execution_plan: {
            coverage_package: STARTER_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['ux_conversion'],
            include_strategy: false,
            depth: 'light',
            source: 'system_default',
          },
        }),
      ).toBe(true);
    });

    it('rejects when token missing for non-free_snapshot rows', () => {
      expect(
        isFreeSnapshotUpgradeEligibleAudit({
          product_mode: 'full',
          snapshot_token: null,
          execution_plan: {
            coverage_package: STARTER_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['ux_conversion'],
            include_strategy: false,
            depth: 'light',
            source: 'system_default',
          },
        }),
      ).toBe(false);
    });

    it('rejects non-starter coverage even with token', () => {
      expect(
        isFreeSnapshotUpgradeEligibleAudit({
          product_mode: 'full',
          snapshot_token: 'tok',
          execution_plan: {
            coverage_package: PRO_AUDIT_COVERAGE_PACKAGE,
            selected_domains: ['ux_conversion', 'seo_digital'],
            include_strategy: false,
            depth: 'standard',
            source: 'user_selected',
          },
        }),
      ).toBe(false);
    });
  });
});
