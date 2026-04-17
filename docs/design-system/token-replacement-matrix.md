# Token Replacement Matrix (Violation Audit)

Status: active migration reference  
Scope: token-first refactor execution

## Enforcement Baseline Isolation

- Legacy/global violations are isolated via:
  - `scripts/design-system-baseline.allowlist.txt`
- Both checks support baseline filtering:
  - `scripts/design-system-raw-values-check.mjs`
  - `scripts/design-system-enforcement-check.mjs`
- CI entrypoint:
  - `pnpm run audit:ds:ci`

## Raw Value -> Canonical Token

| Raw value | Canonical token |
| --- | --- |
| `#EF4444` | `var(--score-1)` |
| `#F97316` | `var(--score-2)` |
| `#10B981` | `var(--glc-green)` |
| `#1CBDFF` | `var(--glc-blue)` |
| `#8B5CF6` | `var(--ui-strategic-purple)` |
| `rgba(28,189,255,0.25)` | `var(--callout-info-border)` |
| `rgba(14,207,130,0.25)` | `var(--score-5-border)` |
| `rgba(249,115,22,0.28)` | `var(--callout-warning-border)` |
| `rgba(249,115,22,0.20)` | `var(--score-2-border)` |
| `rgba(249,115,22,0.08)` | `var(--callout-warning-bg)` |
| `rgba(28,189,255,0.22)` | `var(--callout-info-border)` |
| `rgba(28,189,255,0.18)` | `var(--callout-info-border)` |
| `rgba(28,189,255,0.15)` | `var(--glc-blue-muted-strong)` |
| `rgba(28,189,255,0.14)` | `var(--glc-blue-muted-strong)` |
| `rgba(28,189,255,0.10)` | `var(--glc-blue-muted)` |
| `rgba(28,189,255,0.06)` | `var(--glc-blue-muted-soft)` |
| `rgba(28,189,255,0.05)` | `var(--glc-blue-muted-soft)` |
| `rgba(28,189,255,0.04)` | `var(--glc-blue-muted-faint)` |
| `rgba(28,189,255,0.03)` | `var(--glc-blue-muted-faint)` |
| `rgba(8,15,30,0.45)` | `var(--overlay-backdrop)` |
| `rgba(8,15,30,0.5)` | `var(--overlay-backdrop-strong)` |
| `rgba(11,17,32,0.06)` | `var(--overlay-shadow-soft)` |
| `rgba(255,255,255,0.46)` | `var(--overlay-white-46)` |
| `rgba(255,255,255,0.45)` | `var(--overlay-white-45)` |
| `rgba(255,255,255,0.38)` | `var(--overlay-white-38)` |
| `rgba(255,255,255,0.35)` | `var(--overlay-white-35)` |
| `rgba(255,255,255,0.30)` | `var(--overlay-white-30)` |
| `rgba(255,255,255,0.20)` | `var(--overlay-white-20)` |
| `rgba(255,255,255,0.15)` | `var(--overlay-white-15)` |
| `rgba(255,255,255,0.08)` | `var(--sidebar-border)` |
| `rgba(255,255,255,0.06)` | `var(--sidebar-border)` |
| `11px` | `var(--text-xs)` |
| `2px 8px 2px 6px` | `var(--space-0-5) var(--space-2) var(--space-0-5) var(--space-1-5)` |
| `0.625rem` | `var(--space-2-5)` |
| `0.875rem` | `var(--space-3-5)` |
| `0.75rem` | `var(--space-3)` |
| `2rem` | `var(--space-8)` |
| `1rem` | `var(--space-4)` |
| `1.125rem` | `var(--space-4-5)` |
| `1.5rem` | `var(--space-6)` |
| `0.35rem` | `var(--space-1-4)` |
| `0.375rem` | `var(--space-1-5)` |
| `0.65rem` | `var(--text-xs)` |
| `#22C55E` + `#16A34A` gradient pair | `var(--gradient-success)` |
| `#EAB308` + `#CA8A04` gradient pair | `var(--gradient-accent)` |
| `#F97316` + `#EA580C` gradient pair | `var(--gradient-accent)` |
| `#EF4444` + `#DC2626` gradient pair | `var(--gradient-accent)` |
| `2px 8px` | `var(--space-0-5) var(--space-2)` |
| `3px 10px` | `var(--space-1) var(--space-2-5)` |
| `5px 12px`/`5px 13px` | `var(--space-1-5) var(--space-3)` |
| `16px` (badge width) | `var(--space-4)` |
| `rgba(28,189,255,0.35)` | `var(--overlay-white-35)` |
| `rgba(28,189,255,0.25)` | `var(--callout-info-border)` |

## Baseline Violations (tracked targets)

### Token enforcement

- `src/app/config/admin-request-queue-copy.en.ts`
- `src/app/config/discovery-queue-copy.en.ts`
- `src/app/data/discover-page-results-ui.en.json`
- `src/app/components/glc/ScoreDistributionChart.tsx`
- `src/app/lib/question-bank-studio-graph/studio-graph-visual.config.ts`
- `src/app/lib/question-bank-studio-node-style.ts`

### Component enforcement

- `src/styles/components.css` (legacy compatibility layer)
- `src/app/components/glc/StatusPill.tsx`
- `src/app/components/StatusBadge.tsx`
- `src/app/components/ui/status-badge.tsx`

### Layout / state / naming

- mixed `data-[state=*]` and pseudo-class state styles
- arbitrary `text-[...]`, `max-w-[...]`, `grid-cols-[...]` usage in feature/page layers
- breakpoint split between `src/styles/tokens.css` and `src/app/config/ui-breakpoints.ts`

## New canonical aliases introduced

Only aliases required by repeated usage (>=3 occurrences) are added:

- `--glc-blue-muted-faint`
- `--glc-blue-muted-soft`
- `--glc-blue-muted-strong`
- `--overlay-backdrop`
- `--overlay-backdrop-strong`
- `--overlay-shadow-soft`
- `--overlay-white-46`
- `--overlay-white-45`
- `--overlay-white-38`
- `--overlay-white-35`
- `--overlay-white-30`
- `--overlay-white-20`
- `--overlay-white-15`
- `--space-0-5`
- `--space-1-4`
- `--space-4-5`
- `--font-logo`
- `BREAKPOINT_TOKENS` TS map (`sm/lg/xl`) exported from `src/design-system/tokens/breakpoints.ts`

## Component/API consolidation snapshot

- Modal-like overlays (`Dialog`, `Sheet`, `Drawer`, `AlertDialog`) now use one canonical scrim token:
  - `bg-[var(--overlay-backdrop-strong)]`
- Typography token map now has a defined logo token source:
  - `TYPOGRAPHY_TOKENS.fontFamily.logo -> var(--font-logo)`
- Legacy CSS keeps compatibility contract during migration:
  - `src/styles/components.css` marked as compatibility layer for gradual primitive adoption.

## Medium Component Unification Plan (backward-compatible)

1. **Button adapter migration**
   - Replace `glc-btn-*` usage in:
     - `src/app/marketing/blocks/PackageMarketingHero.tsx`
     - `src/app/marketing/blocks/MarketingMidCtaBand.tsx`
   - Preserve current CTA appearance via utility/shim classes.
   - Keep public component props unchanged.

2. **Status component adapter migration**
   - Keep `StatusPill` external API stable (`status`, `label`, `pulse`).
   - Route rendering through canonical `ui/status-badge` building blocks.
   - Keep legacy call sites unchanged.

3. **Inline visual style normalization**
   - High-impact targets:
     - `src/app/components/snapshot/SnapshotAccessBlockedCallout.tsx`
     - `src/app/components/glc/ScoreBadge.tsx`
   - Convert visual inline props to tokenized class/variant composition.

## Risky Phase Definition

### Entry criteria

- SAFE replacements merged and stable.
- Enforcement scripts pass in `ds` and `ui` scopes.
- No API regressions in components touched by SAFE/MEDIUM steps.

### Scope

- Gradual retirement of `src/styles/components.css` legacy selectors.
- Consolidation of arbitrary layout values into shared contracts.
- Final naming convergence (`glc-*` compatibility layer -> canonical primitive usage).

### Rollback strategy

- Keep compatibility shims until each feature area is migrated.
- Remove legacy selectors only after per-feature visual checks pass.
- For each removal batch, keep one revertable commit boundary per feature area.

## Migration strategy (execution order)

1. Introduce/alias canonical tokens in `src/styles/tokens.css`.
2. Replace repeated raw values in primitives and shared style layers.
3. Keep legacy selectors as compatibility shims while feature code migrates to primitives.
4. Enforce replacements with lint/check scripts and incremental rollout per feature area.
