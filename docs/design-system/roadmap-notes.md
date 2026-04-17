# Design system — governance and reference notes

Date: 2026-04-17

**Audience:** engineering governance, enforcement tooling, rollout status, and comparison to vendor design-system maturity models.

**Related:** the strict **as-is** specification (§1–10) is [`current.md`](./current.md).

---

## §4.1 Migration pipeline vs §4.2 Runtime governance

### §4.2 Runtime governance (merge / release gate)

- **Command:** `pnpm run audit:ds:ci` (same as `pnpm run audit:ds:runtime`) — orchestrator [`scripts/design-system-runtime-ci.mjs`](../../scripts/design-system-runtime-ci.mjs).
- **Policy:** **0** violations. Baseline and primitive-boundary **grandfather allowlists are not applied** (subprocess env sets missing paths). [`scripts/design-system-ts-color-allowlist.txt`](../../scripts/design-system-ts-color-allowlist.txt) remains the **only** intentional suppression (PDF / report bridge on `server/src/**`).
- **Checks (order):** raw-values (app scope), enforcement (app), ts-color, primitive-boundary, patterns-lock.

### §4.1 Migration pipeline (drift tracking and allowlist hygiene)

- **Drift report:** `pnpm run audit:ds:migration-report` (alias: `pnpm run audit:ds:export-violations`) — regenerates [`violations-export.md`](./violations-export.md) and `compliance-findings.full.txt` with baseline/PB allowlists disabled in captured subprocess output (same shape as runtime, for visibility when re-introducing grandfather rows).
- **Optional soft gate (grandfather on disk):** `pnpm run audit:ds:migration-gate` — runs the five checks **with** normal `scripts/design-system-baseline.allowlist.txt` and `scripts/design-system-primitive-boundary.allowlist.txt` resolution (use locally if you temporarily re-add grandfather lines during a migration branch).
- **Refresh after shrinking drift:** `pnpm run audit:ds:refresh-allowlist`, `pnpm run audit:ds:refresh-primitive-boundary-allowlist`.

---

## Enforcement Policy Snapshot

- Canonical token source: `src/styles/tokens.css`.
- Canonical TS token façade: `src/design-system/tokens/**`.
- Canonical state policy:
  - `data-[state=*]` for stateful primitives.
  - pseudo-classes (`hover/focus-visible/active/disabled`) for interaction styles.
- **As-is inventory (mirror of repo):**
  - `pnpm run audit:ds:inventory-dump` — regenerates [`docs/design-system/inventory-dump.md`](./inventory-dump.md) (full token-name list from `tokens.css` + deduplicated literals under `src/`).
  - `pnpm run audit:ds:migration-report` / `pnpm run audit:ds:export-violations` — **§4.1** drift mirror (see section above); not the merge gate.
- Enforcement scripts:
  - `scripts/design-system-raw-values-check.mjs`
  - `scripts/design-system-enforcement-check.mjs` (inline visual detection spans multiline `style={{ ... }}` blocks, not single-line only; shared parser: `scripts/design-system-jsx-style-blocks.mjs`)
  - `scripts/design-system-ts-color-literals-check.mjs` — fails on `#hex`, `rgb(a)(...)`, `hsl(a)(...)` in `src/**` and `server/src/**` TypeScript; TS should reference `var(--*)` only. Allowlist: `scripts/design-system-ts-color-allowlist.txt` (PDF/report bridge files until codegen).
  - `scripts/design-system-primitive-boundary-check.mjs` — **primitive boundary (P0):** same multiline inline visual keys as enforcement, but only **outside** `src/app/components/ui/**` and `src/design-system/ui/**` (scans `src/app/**` and `src/design-system/**` TSX except those islands and `*.test.*`). Violation type `primitive-boundary-inline`. Optional grandfather file: `scripts/design-system-primitive-boundary.allowlist.txt` (**ignored in §4.2 runtime**; used only by `audit:ds:migration-gate` if populated).
  - `scripts/design-system-patterns-lock-check.mjs` — **`src/design-system/patterns/**` composition-only:** forbids inline `style=`, raw `#hex` / `rgb` / `hsl`, and Tailwind visual cues (`bg-*`, `rounded-*`, `shadow-*`, semantic `border-*`, palette `text-*`, `font-*`, `glc-*` in class strings, etc.). Surface visuals for shared pattern shells live in `.ds-pattern-*` classes in `components.css`. **No allowlist**; part of **§4.2** runtime.
  - **P1 (optional):** `DS_PRIMITIVE_BOUNDARY_TAILWIND=1` enables heuristics for Tailwind **palette** utilities (`text-red-500`, `from-sky-400`, …) and arbitrary bracket color literals on lines that look like `className` / `cn(`; semantic classes (`bg-background`, `bg-[var(--*)]`) are not targeted. Not part of default CI until drift is reduced.
  - baseline grandfather file (optional): `scripts/design-system-baseline.allowlist.txt` — **ignored in §4.2 runtime**; consumed by `audit:ds:migration-gate` when non-empty.
- Reporting / allowlist maintenance:
  - `pnpm run audit:ds:refresh-allowlist` — regenerates `scripts/design-system-baseline.allowlist.txt` from current audit output after migrations (line-accurate signatures).
  - `pnpm run audit:ds:refresh-primitive-boundary-allowlist` — same for `scripts/design-system-primitive-boundary.allowlist.txt` (boundary audit only, default P0; run with `DS_PRIMITIVE_BOUNDARY_TAILWIND=1` if refreshing P1 signatures).
- TSX token bridge: prefer `.ds-*` classes in `src/styles/components.css` over inline visual `style={{...}}` where enforcement flags `color` / `background` / etc. (same CSS variables as before).

### HomeHeroCockpit (product freeze)

- **`src/app/marketing/blocks/HomeHeroCockpit.tsx`:** still **frozen for layout, motion, and decorative structure** without product approval. Cockpit **surface visuals** live in [`src/styles/components.css`](../../src/styles/components.css) under `.ds-home-hero-cockpit-*` so **§4.2 runtime** stays at zero inline visual violations; only non-visual `style={{ width }}` remains on skeleton lines.

### Vendor primitives vs literal-zero (explicit gate)

- **`src/app/components/ui/**`:** Tailwind + CVA class strings contain many `unit-literal` matches (e.g. `h-8`, `p-3`). CI does **not** require literal-zero there today; a dedicated epic would narrow `DS_RAW_SCOPE` or adjust the checker for that tree.
- **Baseline / primitive-boundary allowlists:** may stay **empty** while runtime is strict; re-populate only if you intentionally use `audit:ds:migration-gate` during a branch and need grandfather lines, then shrink via migration and refresh scripts.
- **Product / feature / marketing layers:** migrate literals to `tokens.css` + `.ds-*`. Drift tracking: [`violations-export.md`](./violations-export.md) (**§4.1**).

## Target Maturity Rollout Notes

### 2026-04-17 implementation status

- **Vendor primitives token pass:** `src/app/components/ui/**` class strings now reference `--primitive-*` and spacing/border tokens where the §4.1 export listed `unit-literal` findings; `audit:ds:ci` (app scope) stays green. Follow-up: optional MEDIUM waves for any new `style={{` drift outside primitives / approved bridges.
- **Safe inline purge (product + marketing):** low-risk `inline-visual-style` blocks were moved to `.ds-*` in `components.css` (intake brief / wizard, activity feed, score distribution + chart legend, workspace sidebar, portal mirror, question-bank studio, login anonymous hint, full-audit domain chips, **HomeHero cockpit**). Dynamic skeleton widths use `style={{ width }}` only (non-visual key).
- **MEDIUM wave (ongoing):** `CollapsibleSection`, `MobileHeader`, `GlcAppErrorScreen`, `AdminRequestQueueErrorBanner` — visual props moved to token-backed classes where safe; `current.md` §6.3 + `ui-breakpoints.ts` document **640px (`40rem`) vs 768px (`UI_BREAKPOINTS.mobile`)** coexistence.
- **DS refactor program (SAFE wave):** additional `.ds-*` bridges in `src/styles/components.css` (snapshot score badge sizes, next-steps rail width, marketing header shell, home display H2, intake form section heading, tentative tech pills, letter-spacing utility). Product TSX prefers `var(--border-width-default)` instead of `1px` in inline borders, `text-[length:var(--text-base)]` instead of raw `rem` in Tailwind arbitrary font sizes, and CSS-only motion/sizing where the raw-values checker flags literals. After each batch: `pnpm run audit:ds:migration-report`, `pnpm run audit:ds:refresh-allowlist` (if using migration-gate grandfather), `pnpm run audit:ds:ci`. Mapping table: [`token-replacement-matrix.md`](./token-replacement-matrix.md) (Wave SAFE — product bridge).
- **Phase 1 (token pass — app shell, policies, marketing/report):** `APP_SHELL_UI_POLICY` uses `BREAKPOINT_TOKENS` and shell tokens (`--app-shell-drawer-width`, `--shadow-mobile-bottom-nav`, `--app-shell-sidebar-narrow-width`, border width vars). Desktop/mobile shell chrome moved to `.ds-desktop-header*`, `.ds-mobile-bottom-nav`, tokenized overlays (`--overlay-white-75`, etc.). Client audit and settings UI policies use `var(--border-width-default)` and `var(--callout-info-bg)` where literals were flagged. `AuditCompare` and `ReportHeroCard` use `.ds-audit-compare-*` / `.ds-report-hero-*` in `components.css` instead of inline visual styles. **§4.2** runtime expects **zero** `inline-visual-style` drift; broader literal inventory still in [`inventory-dump.md`](./inventory-dump.md).
- Allowlist shrink + bridge classes: batch migrations removed many inline styles (marketing, portal mirror notice, process timeline, score bar track, theme toggle icon colors via custom properties on wrapper, etc.). Legacy CTA styling: `.ds-cta-primary` shares rules with `.glc-btn-primary` in `components.css`; marketing heroes use `ds-cta-primary` on `<Button>` instead of the `glc-btn-primary` class name.
- `src/styles/tokens.css` remains the canonical token source, now with shared DS infra tokens:
  - `--border-width-default`
  - `--sidebar-width`, `--sidebar-width-mobile`, `--sidebar-width-icon`
- `src/app/config/sidebar-ui.ts` consumes sidebar sizing via token vars instead of direct rem literals.
- Marketing comparison / package hero surfaces use `.ds-marketing-*` classes in `src/styles/components.css` (values via `var(--*)` from `tokens.css`); `src/app/config/package-marketing-ui.ts` remains for non-color layout/copy where needed.
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
  - command: `pnpm run audit:ds:ci` (**§4.2** strict runtime; includes ts-color with PDF allowlist only)

### PDF / server color literals (intentional duplicate, temporary)

- `@react-pdf/renderer` does not consume browser CSS. Until a build-time step emits a shared palette from `tokens.css` (or a generated `theme.json`), `server/src/config/pdf-theme.ts` and `server/src/config/system-defaults/reports.ts` **duplicate** a subset of token hex values. Those paths are **`@allow-file` entries** in `scripts/design-system-ts-color-allowlist.txt`. Removing the allowlist is a **separate epic**: palette codegen or shared artifact consumed by both the SPA and the PDF pipeline.

### Utility and legacy policy (target)

- `src/styles/utilities.css` stays layout/runtime-only (safe area, touch target, page padding).
- Visual utility logic (colors/background/typography/shadows/radius) must remain in tokens + primitives.
- Legacy `glc-*` visual classes are treated as migration-only compatibility and must not be added in new UI changes.

### Deferred epics (not in routine DS migration PRs)

- **DS convergence (RISKY tier):** full single-import surface, unified interactive state model across the entire Radix/shadcn catalog, and literal-zero inside `src/app/components/ui/**` are **program-level** efforts. Routine PRs should only shrink drift in pages, marketing, features, and app components outside the vendor kit unless a PR is explicitly scoped to primitives.
- **Score / badge widgets:** consolidating `ScoreBadge`, `SnapshotScoreBadge`, `SnapshotScoreDonut`, and similar into one component is a separate epic (API + visual regression budget).
- **Import surface:** mass migration of imports from `src/app/components/ui/*` to `src/design-system/ui` is a separate codemod pass.
- **Legacy `glc-*` removal:** only after consumers are on primitives / `.ds-*` bridge classes.
- **PDF palette SSOT:** replace server-side hex duplicates with generated exports from `tokens.css` (or shared JSON) and drop `design-system-ts-color-allowlist.txt` entries for `pdf-theme.ts` / `reports.ts`.
- **Primitives / unified state / full literal zero:** `src/app/components/ui/**` remains largely vendor-style (CVA + Tailwind); a single `data-state` vs pseudo-class model across the whole catalog is explicitly out of scope for routine PRs (see DS refactor program RISKY tier).
- **FormField collision:** resolve duplicate export name between `form-field.tsx` and `form.tsx` (rename + codemod or namespaced imports; breaking-change coordination).
- **CTA class consolidation:** converge `.ds-cta-primary` and `.glc-btn-primary` usage to one documented pattern.
- **Breakpoint semantics:** document and gradually align new code on when to use `UI_BREAKPOINTS.mobile` (768px) vs CSS `40rem` / Tailwind `mobile` variant.
- **Inline style purge:** batch-migrate remaining `style={{ ... }}` in `src/app/pages`, `marketing`, `features` to `.ds-*` / token-backed classes where safe. Use CSS variable bridges for data-driven colors; inventory via search.

## Reference stack alignment (engineering assessment)

*This section is **not** part of the as-is extraction in [`current.md`](./current.md) §1–10. It maps the repository’s **target** four-layer stack — Design Tokens → Primitive components → Composition (patterns/layouts) → Utilities (limited) — to mature public systems such as **Material Design 3** and the **Atlassian Design System**, for roadmap and governance context.*

### Layer-by-layer summary

| Layer | Fit vs MD3 / ADS-style maturity | Notes |
| --- | --- | --- |
| **Design tokens** | Strong foundation; not full enterprise SSOT | Canonical CSS variables live in [`src/styles/tokens.css`](../../src/styles/tokens.css); TS mirrors in [`src/design-system/tokens/**`](../../src/design-system/tokens) use `var(--...)`. In practice, Tailwind, [`src/styles/components.css`](../../src/styles/components.css), [`src/styles/features.css`](../../src/styles/features.css), and legacy literals still coexist — see §2 in [`current.md`](./current.md), [`inventory-dump.md`](./inventory-dump.md), and [`violations-export.md`](./violations-export.md) (allowlist-bypass export for drift tracking). |
| **Primitives** | Deep catalog; narrow official façade | Implementation depth matches production shadcn/Radix-style libraries under [`src/app/components/ui/**`](../../src/app/components/ui). The design-system entrypoint [`src/design-system/ui/**`](../../src/design-system/ui) re-exports a **small** set of primitives (see §3.1 in `current.md`); vendor-grade systems usually expose **one** canonical import surface for the whole kit. |
| **Composition / patterns** | Partial: layout contracts + product composition | [`src/design-system/patterns/**`](../../src/design-system/patterns) focuses on **layout contracts** (containers, section rhythm). Named product patterns (page headers, empty states, messaging) more often live in feature `sections`, marketing blocks, and app shell — thinner **pattern package** than ADS/Material. |
| **Utilities (limited)** | Well aligned with the target model | [`src/styles/utilities.css`](../../src/styles/utilities.css) stays layout/runtime-oriented (safe area, touch targets, page padding). Enforcement rules in [`.cursor/rules/design-system-enforcement.mdc`](../../.cursor/rules/design-system-enforcement.mdc) forbid growing visual utilities there. **Note:** Tailwind utility classes are used app-wide; that is a separate utility layer to keep bounded if treating “utilities” as layout-only. |

### Gaps typical of vendor systems but not required here

- **Design ops pipeline** (e.g. Figma Variables → Style Dictionary → multi-platform artifacts): web SSOT is the repo; there is no separate design-to-code export chain.
- **Single versioned consumer package** for all primitives and patterns: the app today mixes direct `src/app/components/ui` imports with the thin `src/design-system` façade.
- **Exhaustive pattern library** in `design-system/patterns`: vendor systems ship many named patterns as stable APIs; this repo prefers feature-local composition for speed.

### Overall positioning

The **documented target architecture** (tokens → primitives → patterns → layout utilities) **matches** the same mental model as MD3 / ADS. **Implemented maturity** is closer to a **strong mid-tier product design system**: rich tokens and primitives, explicit audits and baselines, with ongoing convergence of screens toward token SSOT and a growing but still **layout-centric** pattern layer.
