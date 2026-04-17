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
| `rgba(28,189,255,0.25)` | `var(--glc-blue-alpha-25)` |
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
| `rgba(255,255,255,0.85)` | `var(--overlay-white-85)` |
| `rgba(255,255,255,0.14)` | `var(--overlay-white-14)` |
| `rgba(255,255,255,0.09)` | `var(--overlay-white-09)` |
| `rgba(255,255,255,0.08)` | `var(--overlay-white-08)` (on dark marketing shells; `var(--sidebar-border)` when matching legacy sidebar) |
| `rgba(255,255,255,0.06)` | `var(--sidebar-border)` |
| `#4285F4` (Google OAuth mark) | `var(--brand-oauth-google-blue)` |
| `#34A853` | `var(--brand-oauth-google-green)` |
| `#FBBC05` | `var(--brand-oauth-google-yellow)` |
| `#EA4335` | `var(--brand-oauth-google-red)` |
| `rgba(30,58,138,0.22)` + `rgba(14,165,233,0.18)` (discover mesh) | `var(--discover-results-mesh-indigo)` + `var(--discover-results-mesh-sky)` via `.ds-discover-results-mesh-bg` |
| `linear-gradient(135deg, rgba(28,189,255,0.12) 0%, rgba(242,79,29,0.08) 100%)` | `var(--gradient-badge-blue-orange)` / `.ds-bg-gradient-badge-blue-orange` |
| `rgba(28,189,255,0.12)` | `var(--glc-blue-alpha-12)` |
| `rgba(28,189,255,0.18)` | `var(--glc-blue-alpha-18)` |
| `rgba(28,189,255,0.20)` | `var(--glc-blue-alpha-20)` |
| `rgba(28,189,255,0.25)` | `var(--glc-blue-alpha-25)` |
| `rgba(28,189,255,0.30)` | `var(--glc-blue-alpha-30)` |
| `rgba(234,179,8,0.10)` | `var(--score-3-alpha-10)` |
| `rgba(14,207,130,0.06)` (success header fade) | `var(--glc-green-alpha-06)` |
| `rgba(14,207,130,0.1)` (confidence high bg) | `var(--glc-green-muted)` |
| `0 2px 8px rgba(242,79,29,0.28)` | `var(--shadow-orange-tab)` |
| `0 0 12px rgba(28,189,255,0.30)` | `var(--glow-step-ring)` |
| `rgba(14,207,130,0.20)` (report strengths border) | `var(--score-5-border)` (nearest band; was 0.20) |
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

## Wave SAFE — product bridge (2026-04-17)

| Raw / pattern in TS/TSX | Bridge / token |
| --- | --- |
| `1px solid …` in inline `style` | `var(--border-width-default) solid …` |
| `0.6875rem` section label (discover teaser) | `font-size: var(--text-xs)` on `.ds-audit-teaser-section-label` |
| `text-[0.9375rem]` (discover contact form) | `text-[length:var(--text-base)]` |
| `clamp(1.75rem, 4vw, 2.5rem)` + `/100` denom (snapshot badge) | `.ds-snapshot-badge-score-value--bento`, `.ds-snapshot-badge-denom--bento` / `--compact` in `components.css` |
| `18rem` rail card width (`NextStepsCta`) | `.ds-next-steps-rail-card` in `components.css` |
| Dashed tentative tech pill border | `.ds-snapshot-tentative-tech-pill` |
| Intake section `tracking-[0.12em]` + border | `.ds-intake-form-section-heading` |
| Marketing header blur / padding / shadow | `.ds-marketing-header-shell` + `data-scrolled` |
| Home hero display H2 (Tailwind with `2.75rem` / `-0.02em`) | `.ds-home-display-h2` |
| Login submit glow `0 8px 20px` | `0 var(--space-2) var(--space-5) …` |
| `11px` meta text (report scorecard) | `text-[length:var(--text-xs)]` |
| `12px` tab label (report profile tabs) | `font-size: var(--space-3)` (12px spacing token) |
| `10px` quick-win index (report findings) | `font-size: var(--text-2xs)` |
| `-0.01em` letter-spacing | `.ds-letterspace-tight-01` |
| Custom properties on wrappers (`DecisionPath`, `FindingCard`) | `style={… as CSSProperties}` for `--*` keys |

### Wave 2 (2026-04-17) — marketing home, package hero, snapshot results

| Raw / pattern | Bridge |
| --- | --- |
| Home hero grid / title clamp / supporting 0.95rem | `.ds-home-hero-billboard-grid`, `.ds-home-hero-billboard-title`, `.ds-home-hero-supporting-line` |
| Eyebrow `tracking-[0.1em]` | `.ds-tracking-marketing-eyebrow` |
| Package hero grid / cover max 340px / title clamp / coverage card | `.ds-package-marketing-hero-grid`, `.ds-package-marketing-hero-cover`, `.ds-package-marketing-hero-title`, `.ds-package-marketing-hero-card` + `marketing-surface-tokens.ts` (coverage cells, chips, tier badge) |
| Cockpit 420×360, panel `top-[5.5rem]`, cell border shell | `.ds-home-hero-cockpit-wrap`, `.ds-home-hero-cockpit-stage`, `.ds-home-hero-cockpit-panel-offset`, `.ds-home-hero-cockpit-cell`, `.ds-home-hero-cockpit-floating-panel` — **TSX frozen** (`HomeHeroCockpit.tsx`; not in migration matrix) |
| Section description `1.02rem` / rail `pl-3.25rem` | `.ds-home-section-desc-size`, `.ds-home-section-desc-rail` |
| Mid CTA body 0.95rem | `.ds-marketing-mid-cta-body` |
| Audience caps `0.12em` | `.ds-package-audience-caps` |
| Timeline connector `left-[15px]` | `.ds-process-timeline-connector` |
| Metrics value / tagline | `.ds-home-metric-value`, `.ds-home-metrics-tagline` |
| Trust strip `0.14em` | `.ds-home-trust-caps` |
| Snapshot results max width / score min-height / labels | `.ds-snapshot-results-stack`, `.ds-snapshot-score-hero-minh`, `.ds-snapshot-section-eyebrow`, `.ds-snapshot-signals-heading` |
| CTA band `min-w-[12rem]` | `.ds-results-cta-primary-minw` |

## Migration strategy (execution order)

1. Introduce/alias canonical tokens in `src/styles/tokens.css`.
2. Replace repeated raw values in primitives and shared style layers.
3. Keep legacy selectors as compatibility shims while feature code migrates to primitives.
4. Enforce replacements with lint/check scripts and incremental rollout per feature area.
