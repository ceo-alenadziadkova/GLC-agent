# Design System Specification (As-Is Extraction)

Date: 2026-04-17  
Scope: extracted strictly from existing code.

## Extraction Sources

- Styles:
  - `src/styles/index.css`
  - `src/styles/theme.css`
  - `src/styles/tokens.css`
  - `src/styles/base.css`
  - `src/styles/components.css`
  - `src/styles/features.css`
  - `src/styles/utilities.css`
  - `src/styles/tailwind.css`
- Design-system tokens:
  - `src/design-system/tokens/index.ts`
  - `src/design-system/tokens/colors.ts`
  - `src/design-system/tokens/spacing.ts`
  - `src/design-system/tokens/typography.ts`
  - `src/design-system/tokens/radius.ts`
  - `src/design-system/tokens/shadows.ts`
  - `src/design-system/tokens/z-index.ts`
  - `src/design-system/tokens/breakpoints.ts`
  - `src/design-system/tokens/ui-semantic-colors.ts`
- Reusable UI and layout:
  - `src/design-system/ui/index.ts`
  - `src/app/components/ui/**`
  - `src/design-system/patterns/Layouts/layout-contracts.ts`
  - `src/app/marketing/MarketingLayout.tsx`
- Style config with raw visuals:
  - `src/app/config/admin-request-queue-copy.en.ts`
  - `src/app/config/ui-breakpoints.ts`

## 1. Design Tokens (Foundation)

### 1.1 Color tokens

| Group | Token examples (as defined) | Source |
| --- | --- | --- |
| Brand | `--glc-blue`, `--glc-blue-dark`, `--glc-blue-deeper`, `--glc-blue-light`, `--glc-blue-xlight`, `--glc-orange`, `--glc-orange-dark`, `--glc-orange-light`, `--glc-orange-xlight`, `--glc-green`, `--glc-green-dark`, `--glc-green-light`, `--glc-green-xlight`, `--glc-ink`, `--glc-ink-1`, `--glc-ink-2`, `--glc-ink-3`, `--glc-ink-4` | `src/styles/tokens.css` |
| Brand muted/alpha | `--glc-blue-muted`, `--glc-blue-muted-faint`, `--glc-blue-muted-soft`, `--glc-blue-muted-strong`, `--glc-orange-muted`, `--glc-green-muted` | `src/styles/tokens.css` |
| Score scale | `--score-1..5`, `--score-1-bg..5-bg`, `--score-1-border..5-border` | `src/styles/tokens.css` |
| Callout semantic | `--callout-warning-*`, `--callout-error-*`, `--callout-info-*` | `src/styles/tokens.css` |
| UI semantic | `--ui-danger-*`, `--ui-success-*`, `--ui-warning-*`, `--ui-code-surface`, `--ui-slate-muted`, `--ui-strategic-purple` | `src/styles/tokens.css` |
| Intake graph semantic | `--ui-intake-edge-*`, `--ui-intake-node-*` | `src/styles/tokens.css` |
| Surface/text/border | `--bg-*`, `--text-*`, `--border-*`, `--surface`, `--surface-elevated`, `--panel-border` | `src/styles/tokens.css` |
| Component semantic aliases | `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--accent`, `--destructive`, `--input`, `--ring`, `--sidebar-*`, `--chart-*` | `src/styles/tokens.css` |
| Overlay colors | `--overlay-backdrop`, `--overlay-backdrop-strong`, `--overlay-shadow-soft`, `--overlay-white-*` | `src/styles/tokens.css` |
| Theme inline aliases | `--color-background`, `--color-foreground`, `--color-primary`, etc. | `src/styles/tokens.css` |

Light/dark overrides are defined via `:root` and `html.dark` in `src/styles/tokens.css`.

### 1.2 Typography tokens

| Category | Tokens | Source |
| --- | --- | --- |
| Font families | `--font-display`, `--font-sans`, `--font-mono`, `--font-logo` | `src/styles/tokens.css` |
| Font sizes | `--text-2xs`, `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`, `--text-4xl` | `src/styles/tokens.css` |
| Line height | `--leading-none`, `--leading-tight`, `--leading-snug`, `--leading-normal`, `--leading-relaxed` | `src/styles/tokens.css` |
| Letter spacing | `--tracking-tighter`, `--tracking-tight`, `--tracking-normal`, `--tracking-wide`, `--tracking-wider`, `--tracking-widest` | `src/styles/tokens.css` |
| Font weights | `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` | `src/styles/tokens.css` |

### 1.3 Spacing tokens

| Scale token | Value |
| --- | --- |
| `--space-0-5` | `2px` |
| `--space-1` | `4px` |
| `--space-1-4` | `0.35rem` |
| `--space-1-5` | `6px` |
| `--space-2` | `calc(var(--space-1) * 2)` |
| `--space-2-5` | `10px` |
| `--space-3` | `12px` |
| `--space-3-5` | `14px` |
| `--space-4` | `16px` |
| `--space-4-5` | `1.125rem` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-7` | `28px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

Source: `src/styles/tokens.css`.

### 1.4 Radius tokens

`--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-pill`, plus alias `--radius` and derived inline aliases (`--radius-sm/md/lg/xl`) in `@theme inline`.  
Source: `src/styles/tokens.css`.

### 1.5 Shadow tokens

`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-blue`, `--shadow-card`, `--glow-blue`, `--glow-blue-sm`, `--glow-orange`, `--glow-green`, `--shadow-ink`, `--shadow-swiss`, `--glass-shadow`.  
Source: `src/styles/tokens.css`.

### 1.6 Z-index tokens

`--z-base`, `--z-content`, `--z-overlay`, `--z-floating`, `--z-login-mesh`, `--z-login-decor`, `--z-login-layout`, `--z-login-video`, `--z-login-content`, `--z-login-floating`.  
Source: `src/styles/tokens.css`.

### 1.7 Breakpoint tokens

| Token | Value | Source |
| --- | --- | --- |
| `--breakpoint-sm` | `40rem` | `src/styles/tokens.css` |
| `--breakpoint-lg` | `64rem` | `src/styles/tokens.css` |
| `--breakpoint-xl` | `80rem` | `src/styles/tokens.css` |
| `mobile` custom variant | `@media (width < 40rem)` | `src/styles/tailwind.css` |
| `UI_BREAKPOINTS.mobile` | `768` | `src/app/config/ui-breakpoints.ts` |

### 1.8 TS token maps (design-system layer)

- `COLOR_TOKENS` (`cssVars` + `semantic`): `src/design-system/tokens/colors.ts`
- `SPACING_TOKENS`: `src/design-system/tokens/spacing.ts`
- `TYPOGRAPHY_TOKENS`: `src/design-system/tokens/typography.ts`
- `RADIUS_TOKENS`: `src/design-system/tokens/radius.ts`
- `SHADOW_TOKENS`: `src/design-system/tokens/shadows.ts`
- `Z_INDEX_TOKENS`: `src/design-system/tokens/z-index.ts`
- `BREAKPOINT_TOKENS`: `src/design-system/tokens/breakpoints.ts`
- `UI_SEMANTIC_COLORS`, `UI_INTAKE_TRACE_GRAPH`: `src/design-system/tokens/ui-semantic-colors.ts`

## 2. Style Inventory

Raw unique values observed in extracted sources.

### 2.1 Color values (raw literals)

- Hex examples observed:  
  `#1CBDFF`, `#0EA3E0`, `#0077A8`, `#8ADEFF`, `#E0F6FF`, `#F24F1D`, `#D43A0C`, `#F9A48A`, `#FEF0EB`, `#0ECF82`, `#0AB36F`, `#7EEBB9`, `#E6FAF3`, `#E5E7EB`, `#080F1E`, `#0D1628`, `#111E38`, `#172849`, `#1E345C`, `#EF4444`, `#FEF2F2`, `#F97316`, `#FFF7ED`, `#EAB308`, `#FEFCE8`, `#22C55E`, `#F0FDF4`, `#92400E`, `#D97706`, `#F59E0B`, `#FFFBEB`, `#b91c1c`, `#fee2e2`, `#34D399`, `#F87171`, `#CA8A04`, `#0A0F1E`, `#8B5CF6`, `#64748b`, `#38bdf8`, `#34d399`, `#22d3ee`, `#7c4a03`, `#f59e0b`, `#fef3c7`, `#0b3f5c`, `#e0f2fe`, `#3b1f59`, `#a78bfa`, `#f3e8ff`, `#2f2f34`, `#71717a`, `#f4f4f5`, `#1f2937`, `#94a3b8`, `#e2e8f0`, `#EFF3FA`, `#FFFFFF`, `#E5ECF7`, `#E8EFF8`, `#0B1120`, `#334861`, `#7488A4`, `#A3B2C4`, `#D6E0ED`, `#BDCBDE`, `#95A7C0`, `#121418`, `#1A1D22`, `#22262C`, `#2A2E35`, `#16181C`, `#010409`, `#E6EDF3`, `#9EA8B3`, `#7D8793`, `#6A737D`, `#0D1117`, `#2A313B`, `#3A4451`, `#596575`, `#161B22`, `#30363D`, `#484F58`, `#3B82F6`, `#10B981`.
- RGBA examples observed:  
  `rgba(28, 189, 255, 0.10)`, `rgba(28, 189, 255, 0.04)`, `rgba(28, 189, 255, 0.06)`, `rgba(28, 189, 255, 0.15)`, `rgba(242, 79, 29, 0.08)`, `rgba(14, 207, 130, 0.10)`, `rgba(239, 68, 68, 0.18)`, `rgba(249, 115, 22, 0.18)`, `rgba(234, 179, 8, 0.18)`, `rgba(34, 197, 94, 0.18)`, `rgba(245, 158, 11, 0.06)`, `rgba(245, 158, 11, 0.07)`, `rgba(245, 158, 11, 0.12)`, `rgba(245, 158, 11, 0.22)`, `rgba(239, 68, 68, 0.07)`, `rgba(239, 68, 68, 0.25)`, `rgba(16, 185, 129, 0.12)`, `rgba(11, 17, 32, 0.06)`, `rgba(11, 17, 32, 0.09)`, `rgba(255, 255, 255, 0.68)`, `rgba(8, 15, 30, 0.45)`, `rgba(255, 255, 255, 0.46)`, `rgba(0, 0, 0, 0.45)`, `rgba(255,255,255,0.30)`, `rgba(239,68,68,0.08)`, `rgba(239,68,68,0.20)`, `rgba(28,189,255,0.35)`.

### 2.2 Font sizes (raw + tokenized usage)

- Tokenized: `--text-2xs`, `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`, `--text-4xl`.
- Raw literals in styles/components: `16px`, `0.2rem`, `0.35rem`, `0.38rem`, `0.42rem`, `0.68rem`, `0.72rem`, `0.875rem`, `1.5rem`, `1.7rem`, `1.95rem`, `2.1rem`, `2.6rem`, plus `clamp(...)` forms (e.g. `clamp(1.45rem, 1.2rem + 0.6vw, 1.95rem)`).

### 2.3 Spacing values

- Tokenized spacing: full `--space-*` set.
- Raw spacing values additionally observed: `1px`, `2px`, `3px`, `4px`, `5px`, `10px`, `14px`, `16px`, `20px`, `24px`, `28px`, `32px`, `40px`, `44px`, `48px`, `52px`, `56px`, `64px`, `100px`, `180px`, negative offsets like `-36px`, `-44px`, and layout widths like `34rem`, `32rem`, `40rem`, `64rem`, `80rem`.

### 2.4 Border-radius values

- Tokenized: `2px`, `4px`, `0.5rem`, `12px`, `16px`, `22px`, `999px`.
- Raw literals additionally observed: `1.5rem`, `inherit`, `0`.

### 2.5 Shadows and effects

- Token shadows: `--shadow-xs/sm/md/lg/xl`, `--shadow-card`, `--shadow-blue`, `--glow-*`, `--glass-shadow`.
- Additional raw shadow forms in feature/component styles:
  - `0 22px 48px rgba(11, 17, 32, 0.12), 0 3px 10px rgba(11, 17, 32, 0.06)`
  - `0 18px 40px rgba(15, 21, 36, 0.1), 0 2px 10px rgba(15, 21, 36, 0.05)`
  - `0 24px 46px rgba(6, 12, 26, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.16)`
  - multiple `drop-shadow(...)`, `text-shadow(...)`, and `backdrop-filter: blur(...)`.

## 3. Component Mapping

### 3.1 Design-system exported primitives

Source: `src/design-system/ui/index.ts`.

- `Button`
- `Input`
- `Badge`
- `Callout`
- `Surface`
- `Textarea`
- `StatusBadge`

### 3.2 Reusable UI library inventory

Source: `src/app/components/ui/**` (57 files).

- Form/input: `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Slider`, `InputOTP`, `Label`, `Form`, `FormField`, `Switch`.
- Buttons/chips: `Button`, `Badge`, `Toggle`, `ToggleGroup`, `StatusBadge`.
- Feedback/display: `Alert`, `Callout`, `Surface`, `Skeleton`, `Progress`.
- Overlay/navigation: `Dialog`, `AlertDialog`, `Drawer`, `Sheet`, `Popover`, `Tooltip`, `HoverCard`, `DropdownMenu`, `ContextMenu`, `Menubar`, `NavigationMenu`, `Tabs`, `Breadcrumb`, `Pagination`.
- Layout/structure: `Accordion`, `Collapsible`, `Card`, `Table`, `ScrollArea`, `Resizable`, `Carousel`, `Sidebar` family.

### 3.3 Components with explicit variants/sizes

| Component | Variants | Sizes | States observed in component styles |
| --- | --- | --- | --- |
| `Button` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` | `default`, `sm`, `lg`, `icon` | `hover`, `focus-visible`, `disabled`, `aria-invalid`, `loading` (`data-loading`, `aria-busy`) |
| `Badge` | `default`, `secondary`, `destructive`, `outline` | Not observed | `hover` for anchor context (`[a&]`), `focus-visible`, `aria-invalid` |
| `Toggle` | `default`, `outline` | `default`, `sm`, `lg` | `hover`, `focus-visible`, `disabled`, `data-[state=on]`, `aria-invalid` |
| `Alert` | `default`, `destructive` | Not observed | No explicit hover/active/disabled styles in component definition |
| `Callout` | `info`, `warning`, `danger`, `success`, `neutral` (`intent`) | Not observed | No interactive states (static container) |
| `Surface` | `base`, `raised` (`elevation`) | `sm`, `md`, `lg`, `none` (`padding`) | No interactive states (static container) |
| `SelectTrigger` | Not observed | `default`, `sm` | `focus-visible`, `disabled`, `aria-invalid`, placeholder (`data-[placeholder]`) |
| `PaginationLink` | Uses `Button` variants (`outline`/`ghost` by `isActive`) | Uses `Button` sizes | `aria-current`, `data-active` |
| `SidebarMenuButton` | `default`, `outline` | `default`, `sm`, `lg` | `hover`, `active`, `focus-visible`, `disabled`, `aria-disabled`, `data-active`, `data-state=open` |
| `SidebarMenuSubButton` | Not observed | `sm`, `md` | `hover`, `active`, `focus-visible`, `disabled`, `aria-disabled`, `data-active` |
| `Sidebar` | `sidebar`, `floating`, `inset` | Not observed | `data-state=expanded/collapsed`, `data-collapsible`, `data-side`, mobile/desktop branches |
| `SheetContent` | Directional `side` branch | `top`, `right`, `bottom`, `left` (`side`) | `data-[state=open]`, `data-[state=closed]` |
| `StatusBadge` | fixed `Badge variant="secondary"` | Not observed | No component-level interactive states |

## 4. Component API (Inferred)

Only props observed in code are listed.

```tsx
<Button variant="default|destructive|outline|secondary|ghost|link" size="default|sm|lg|icon" asChild loading />
<Badge variant="default|secondary|destructive|outline" asChild />
<Toggle variant="default|outline" size="default|sm|lg" />
<Alert variant="default|destructive" />
<Callout intent="info|warning|danger|success|neutral" title>{children}</Callout>
<Surface elevation="base|raised" padding="sm|md|lg|none" />
<SelectTrigger size="default|sm" />
<PaginationLink isActive size />
<Sidebar side="left|right" variant="sidebar|floating|inset" collapsible="offcanvas|icon|none" />
<SidebarMenuButton asChild isActive variant="default|outline" size="default|sm|lg" tooltip />
<SidebarMenuSubButton asChild isActive size="sm|md" />
<SheetContent side="top|right|bottom|left" />
<StatusBadge label toneClassName className />
```

## 5. Hierarchy (Atomic Structure)

Derived from folder structure and composition.

- **Atoms**
  - Base primitives in `src/app/components/ui/*` (`Button`, `Input`, `Badge`, `Label`, `Checkbox`, `Switch`, etc.).
  - DS export façade in `src/design-system/ui/*`.
- **Molecules**
  - Compound UI in the same layer (`Form` suite, `Pagination`, `NavigationMenu`, `DropdownMenu`, `Tabs`, `Alert` family, `Callout`, `Surface`).
- **Organisms**
  - Higher-composition assemblies (`Sidebar` family under `src/app/components/ui/sidebar/*` and feature sections under `src/app/components/**/sections` and `.../panels`).
- **Templates**
  - Layout shells and page chrome (`src/app/marketing/MarketingLayout.tsx`, app-shell sections in `src/app/components/app-shell/sections/*`).

## 6. Layout System

### 6.1 Contracts

Source: `src/design-system/patterns/Layouts/layout-contracts.ts`.

- `container.page`: `mx-auto w-full max-w-7xl`
- `container.content`: `mx-auto w-full max-w-5xl`
- `spacing.pageY`: `py-12 sm:py-16 md:py-20`
- `spacing.pageX`: `px-4 sm:px-6`
- `spacing.sectionFlow`: `flex flex-col gap-14 sm:gap-20 lg:gap-24`

### 6.2 Utility layout classes

Source: `src/styles/utilities.css`.

- Safe-area helpers: `glc-safe-pad-x`, `glc-safe-pad-t`, `glc-safe-pad-b`
- Touch target helper: `glc-touch-target` (uses `--glc-touch-target-min`)
- Page and mobile nav spacing: `glc-page-content`, `glc-main-mobile-nav-pad`

### 6.3 Breakpoint implementation

- CSS token breakpoints: `40rem`, `64rem`, `80rem`.
- Tailwind custom variant: `mobile` (`width < 40rem`).
- Additional explicit media queries in styles: `1024px`, `1280px`, `1023px`.
- Config breakpoint: `UI_BREAKPOINTS.mobile = 768`.

## 7. State Definitions

Observed states by selector/attribute.

- `hover`: `:hover`, `hover:*`, `[a&]:hover`.
- `focus`: `:focus`.
- `focus-visible`: `:focus-visible`, `focus-visible:*` (global and component-level).
- `active`: `:active`, `active:*`, `data-[active=true]`, `data-[state=on/open/active]`.
- `disabled`: `:disabled`, `disabled:*`, `data-[disabled]`, `aria-disabled`.
- `loading`: `Button` only (`loading` prop -> `data-loading`, `aria-busy`).
- `error`: `aria-invalid`, error callout/background tokens, destructive variants.
- `success`: score/success tokens and callout success intent.

Missing as explicit global component state contracts:

- No generic reusable `success`/`error` variant contract across all primitives.
- No generalized shared `loading` prop across primitives (observed in `Button` only).

## 8. Accessibility Signals (Passive)

Observed implementation patterns.

- Focus visibility:
  - global `:focus-visible` in `src/styles/base.css`
  - component rings (`focus-visible:ring-*`, `focus-visible:border-*`) in interactive primitives.
- ARIA attributes in reusable components:
  - `aria-busy` (`Button`)
  - `aria-current` (`PaginationLink`, breadcrumb page)
  - `aria-disabled` handling in sidebar/menu primitives
  - `aria-invalid` styling in multiple form controls
  - `aria-hidden="true"` (drawer handle decoration).
- Screen-reader text:
  - `sr-only` labels in dialog/sheet/pagination/sidebar patterns.
- Keyboard and skip-link signals:
  - skip link and `tabIndex={-1}` main target in `MarketingLayout`.
- Motion preference:
  - `@media (prefers-reduced-motion: reduce)` present in features styles.

## 9. Naming Conventions

### 9.1 Class naming

- Project-prefixed classes: `glc-*`.
- BEM-like modifiers/elements present in feature styles:
  - element: `__` (example pattern `...__rule`)
  - modifier: `--` (example pattern `...--warning`).

### 9.2 Token naming

- CSS variable prefixes:
  - `--glc-*`, `--bg-*`, `--text-*`, `--border-*`, `--score-*`, `--callout-*`, `--ui-*`, `--overlay-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--z-*`, `--breakpoint-*`.
- TS token maps:
  - constant objects in `UPPER_SNAKE_CASE` (`COLOR_TOKENS`, `SPACING_TOKENS`, etc.).

### 9.3 Component naming

- React components/files use `PascalCase` exported symbols.
- Data-slot and data-sidebar attributes are used as internal semantic hooks (`data-slot="button"`, `data-sidebar="menu-button"`, etc.).

## 10. System Rules (Derived)

Derived only from observed implementation.

1. Core visual system is CSS-variable based, with `:root` and `html.dark` token overrides in `tokens.css`.
2. TS design-system token files are wrappers over CSS variables (no separate numeric/color source of truth in TS maps).
3. Visual primitives are largely implemented in `src/app/components/ui/**`, while `src/design-system/ui/**` is mainly a re-export façade.
4. Spacing follows a 4px-rooted scale with intermediate steps (`0.5`, `1.4`, `1.5`, `2.5`, `3.5`, `4.5`) and additional feature-level literals (`clamp`, custom rem values).
5. State expression is mixed: pseudo-classes (`:hover`, `:focus-visible`, `:disabled`) plus data/aria-driven selectors (`data-[state=*]`, `data-[active=true]`, `aria-invalid`).
6. Layout uses both explicit contracts (`LAYOUT_CONTRACTS`) and utility/media usage in component and feature style layers.
7. Legacy compatibility selectors (`glc-*`) coexist with primitive-based class compositions.

## Enforcement Policy Snapshot

- Canonical token source: `src/styles/tokens.css`.
- Canonical TS token façade: `src/design-system/tokens/**`.
- Canonical state policy:
  - `data-[state=*]` for stateful primitives.
  - pseudo-classes (`hover/focus-visible/active/disabled`) for interaction styles.
- Enforcement scripts:
  - `scripts/design-system-raw-values-check.mjs`
  - `scripts/design-system-enforcement-check.mjs`
  - baseline isolation allowlist: `scripts/design-system-baseline.allowlist.txt`

## Target Maturity Rollout Notes

### 2026-04-17 implementation status

- `src/styles/tokens.css` remains the canonical token source, now with shared DS infra tokens:
  - `--border-width-default`
  - `--sidebar-width`, `--sidebar-width-mobile`, `--sidebar-width-icon`
- `src/app/config/sidebar-ui.ts` consumes sidebar sizing via token vars instead of direct rem literals.
- `src/app/config/marketing-surface-tokens.ts` and `src/app/config/package-marketing-ui.ts` consume the shared border width token instead of inline `1px`.
- DS public UI ownership was hardened by exposing all current public primitives through local DS modules under `src/design-system/ui/**`:
  - `Callout`, `Surface`, `Textarea`, `StatusBadge`
- Composition contracts were expanded in `src/design-system/patterns/Layouts/**` with reusable layout presets:
  - `PAGE_SHELL_CONTRACTS`
  - `SECTION_SHELL_CONTRACTS`
  - `CARD_GRID_CONTRACTS`
  - `FORM_SECTION_CONTRACTS`
  - `HEADER_ACTIONS_CONTRACTS`
- CI governance now runs DS checks on both fast and release gates:
  - `.github/workflows/test.yml`
  - `.github/workflows/release-gate.yml`
  - command: `pnpm run audit:ds:ci`

### Utility and legacy policy (target)

- `src/styles/utilities.css` stays layout/runtime-only (safe area, touch target, page spacing).
- Visual utility logic (colors/background/typography/shadows/radius) must remain in tokens + primitives.
- Legacy `glc-*` visual classes are treated as migration-only compatibility and must not be added in new UI changes.
