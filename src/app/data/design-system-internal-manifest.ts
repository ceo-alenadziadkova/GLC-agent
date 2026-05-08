import { APP_ROUTE_PATHS } from '../config/route-paths';

/**
 * Structured facts for the internal design-system page and for LLM ingestion
 * (serialized to JSON in the UI). Keep in sync with docs/design-system/*.md when governance changes.
 */
export const DESIGN_SYSTEM_INTERNAL_MANIFEST = {
  schemaVersion: 1 as const,
  kind: 'glc.design_system.internal_index',
  audience: ['glc_engineering', 'llm_tooling'],
  access: {
    spaPath: APP_ROUTE_PATHS.adminDesignSystem,
    requiredProfileRoles: ['consultant'] as const,
    excludedProfileRoles: ['client', 'guest'] as const,
    note: 'Route is wrapped with ProtectedRoute requiredRole=consultant in routes.tsx.',
  },
  canonicalRepoPaths: {
    cssTokenSource: 'src/styles/tokens.css',
    cssSurfaces: [
      'src/styles/index.css',
      'src/styles/theme.css',
      'src/styles/base.css',
      'src/styles/components/index.css',
      'src/styles/components/',
      'src/styles/features.css',
      'src/styles/utilities.css',
      'src/styles/tailwind.css',
    ],
    tsTokenFacades: 'src/design-system/tokens/',
    uiPrimitives: ['src/design-system/ui/', 'src/app/components/ui/'],
    patterns: 'src/design-system/patterns/',
    patternCssBridges: 'src/styles/components/*.css (.ds-pattern-*, .ds-*)',
    semanticUiConfig: 'src/app/config/ui-semantic-colors.ts',
    marketingMotionConfig: [
      'src/app/config/marketing-motion.ts',
      'src/app/config/marketing-surface-tokens.ts',
      'src/app/config/package-page-layout.ts',
    ],
  },
  specificationDocs: {
    asIsNarrativeSpec: 'docs/design-system/current.md',
    governanceAndCommands: 'docs/design-system/roadmap-notes.md',
    generatedInventory: 'docs/design-system/inventory-dump.md',
    generatedViolations: 'docs/design-system/violations-export.md',
    tokenReplacementMatrix: 'docs/design-system/token-replacement-matrix.md',
  },
  enforcementCommands: {
    mergeGateRuntime: 'pnpm run audit:ds:ci',
    mergeGateRuntimeAlias: 'pnpm run audit:ds:runtime',
    migrationDriftReport: 'pnpm run audit:ds:migration-report',
    migrationExportViolations: 'pnpm run audit:ds:export-violations',
    driftBudgetGate: 'pnpm run audit:ds:drift-budget',
    driftBudgetRecord: 'pnpm run audit:ds:drift-budget:record',
    inventoryRegenerate: 'pnpm run audit:ds:inventory-dump',
    migrationSoftGate: 'pnpm run audit:ds:migration-gate',
    refreshBaselineAllowlist: 'pnpm run audit:ds:refresh-allowlist',
    refreshPrimitiveBoundaryAllowlist: 'pnpm run audit:ds:refresh-primitive-boundary-allowlist',
  },
  enforcementScripts: [
    'scripts/design-system-runtime-ci.mjs',
    'scripts/design-system-raw-values-check.mjs',
    'scripts/design-system-enforcement-check.mjs',
    'scripts/design-system-ts-color-literals-check.mjs',
    'scripts/design-system-primitive-boundary-check.mjs',
    'scripts/design-system-patterns-lock-check.mjs',
    'scripts/design-system-migration-drift-sigs.mjs',
    'scripts/design-system-drift-budget-check.mjs',
  ],
  policyHighlights: {
    runtimeGate: '§4.2 — zero violations; baseline/primitive-boundary grandfather files are not applied.',
    migrationTracking: '§4.1 — violations-export and drift-budget track legacy signatures without blocking merge alone.',
    patternsLayer: 'src/design-system/patterns/** must not embed Tailwind visual utilities or raw colors; use .ds-pattern-* in src/styles/components/*.css.',
    utilitiesLayer: 'src/styles/utilities.css — layout-only (no colors, typography, shadows, radius).',
  },
  knownHardcodeOrDriftBuckets: [
    {
      id: 'frozen_marketing_hero',
      summary: 'HomeHeroCockpit is product-frozen and skipped by enforcement scripts via exempt list.',
      paths: [
        'src/app/marketing/blocks/HomeHeroCockpit.tsx',
        'scripts/design-system-frozen-tsx-exempt.txt',
      ],
    },
    {
      id: 'vendor_primitives_tailwind_units',
      summary: 'src/app/components/ui/** may still contain Tailwind unit literals (h-8, p-3); CI does not require literal-zero there today.',
      paths: ['src/app/components/ui/'],
    },
    {
      id: 'marketing_package_surfaces',
      summary: 'Package marketing heroes may use marketing-surface-tokens + intentional inline style for product parity (documented in roadmap).',
      paths: ['src/app/config/marketing-surface-tokens.ts'],
    },
    {
      id: 'dual_mobile_breakpoints',
      summary: '40rem token breakpoint vs UI_BREAKPOINTS.mobile 768px coexistence — documented in current.md.',
      paths: ['src/app/config/ui-breakpoints.ts', 'src/styles/tokens.css'],
    },
    {
      id: 'style_config_visuals',
      summary: 'Some src/app/config/** modules still carry allowed semantic or bridge values; avoid new raw scales per design-system-enforcement.',
      paths: ['src/app/config/'],
    },
  ],
} as const;

export type DesignSystemInternalManifest = typeof DESIGN_SYSTEM_INTERNAL_MANIFEST;
