# Design system — governance and reference notes

Date: 2026-04-17

**Audience:** engineering governance, enforcement tooling, rollout status, and comparison to vendor design-system maturity models.

**Related:** the strict **as-is** specification (§1–10) is [`current.md`](./current.md).

---

## Enforcement Policy Snapshot

- Canonical token source: `src/styles/tokens.css`.
- Canonical TS token façade: `src/design-system/tokens/**`.
- Canonical state policy:
  - `data-[state=*]` for stateful primitives.
  - pseudo-classes (`hover/focus-visible/active/disabled`) for interaction styles.
- **As-is inventory (mirror of repo):**
  - `pnpm run audit:ds:inventory-dump` — regenerates [`docs/design-system/inventory-dump.md`](./inventory-dump.md) (full token-name list from `tokens.css` + deduplicated literals under `src/`).
  - `pnpm run audit:ds:export-violations` — regenerates [`docs/design-system/violations-export.md`](./violations-export.md): merged output of raw-values and enforcement audits **with allowlist disabled**, for tracking remaining drift; not a “clean” checklist.
- Enforcement scripts:
  - `scripts/design-system-raw-values-check.mjs`
  - `scripts/design-system-enforcement-check.mjs` (inline visual detection spans multiline `style={{ ... }}` blocks, not single-line only)
  - `scripts/design-system-ts-color-literals-check.mjs` — fails on `#hex`, `rgb(a)(...)`, `hsl(a)(...)` in `src/**` and `server/src/**` TypeScript; TS should reference `var(--*)` only. Allowlist: `scripts/design-system-ts-color-allowlist.txt` (PDF/report bridge files until codegen).
  - baseline isolation allowlist: `scripts/design-system-baseline.allowlist.txt`
- Reporting / allowlist maintenance:
  - `pnpm run audit:ds:refresh-allowlist` — regenerates `scripts/design-system-baseline.allowlist.txt` from current audit output after migrations (line-accurate signatures).
- TSX token bridge: prefer `.ds-*` classes in `src/styles/components.css` over inline visual `style={{...}}` where enforcement flags `color` / `background` / etc. (same CSS variables as before).

### HomeHeroCockpit (frozen)

- **`src/app/marketing/blocks/HomeHeroCockpit.tsx` must not be edited** for design-system refactors, token passes, or “cleanup” (see the `@file` banner in source). Visual parity of the marketing hero cockpit is intentional.
- **`inline-visual-style`:** enforcement flags **four** multiline `style={{...}}` blocks (line numbers drift if anything above them changes). **`pnpm run audit:ds:refresh-allowlist`** rewrites [`scripts/design-system-baseline.allowlist.txt`](../../scripts/design-system-baseline.allowlist.txt) with line-accurate signatures **without** modifying this TSX file.
- An additional `style={{ transform, zIndex }}` block is **not** classified as `inline-visual-style` (those keys are outside [`INLINE_STYLE_VISUAL_KEYS`](../../scripts/design-system-enforcement-check.mjs)); [`violations-export.md`](./violations-export.md) still reports only the four flagged rows.

### Vendor primitives vs literal-zero (explicit gate)

- **`src/app/components/ui/**`:** Tailwind + CVA class strings contain many `unit-literal` matches (e.g. `h-8`, `p-3`). CI does **not** require literal-zero there today; a dedicated epic would narrow `DS_RAW_SCOPE` or adjust the checker for that tree.
- **Baseline allowlist (`scripts/design-system-baseline.allowlist.txt`):** as of the last sync, **4** `inline-visual-style` signatures — all in `HomeHeroCockpit.tsx` (decorative cockpit parity). After each inline migration batch, run `pnpm run audit:ds:refresh-allowlist` to rewrite line-accurate signatures.
- **Product / feature / marketing layers:** migrate literals to `tokens.css` + `.ds-*`, then refresh the allowlist. No-allowlist drift tracking: [`violations-export.md`](./violations-export.md) (currently **4** deduped rows, same file).

## Target Maturity Rollout Notes

### 2026-04-17 implementation status

- **Vendor primitives token pass:** `src/app/components/ui/**` class strings now reference `--primitive-*` and spacing/border tokens where the no-allowlist export listed `unit-literal` findings; `audit:ds:ci` (app scope) stays green. Follow-up: optional MEDIUM waves for any new `style={{` drift outside the cockpit allowlist.
- **Safe inline purge (product + marketing):** remaining low-risk `inline-visual-style` blocks were moved to `.ds-*` in `components.css` (intake brief / wizard, activity feed, score distribution + chart legend via CSS custom properties, workspace sidebar, portal mirror, question-bank studio, login anonymous hint, full-audit domain chips). Dynamic width/% and data-driven colors use `style` with non-visual keys or `--*` bridges only. **`HomeHeroCockpit.tsx`** stays inline with a **4-line** allowlist; `violations-export.md` / `compliance-findings.full.txt` match that footprint.
- **MEDIUM wave (ongoing):** `CollapsibleSection`, `MobileHeader`, `GlcAppErrorScreen`, `AdminRequestQueueErrorBanner` — visual props moved to token-backed classes where safe; `current.md` §6.3 + `ui-breakpoints.ts` document **640px (`40rem`) vs 768px (`UI_BREAKPOINTS.mobile`)** coexistence.
- **DS refactor program (SAFE wave):** additional `.ds-*` bridges in `src/styles/components.css` (snapshot score badge sizes, next-steps rail width, marketing header shell, home display H2, intake form section heading, tentative tech pills, letter-spacing utility). Product TSX prefers `var(--border-width-default)` instead of `1px` in inline borders, `text-[length:var(--text-base)]` instead of raw `rem` in Tailwind arbitrary font sizes, and CSS-only motion/sizing where the raw-values checker flags literals. After each batch: `pnpm run audit:ds:export-violations`, `pnpm run audit:ds:refresh-allowlist`, `pnpm run audit:ds:ci`. Mapping table: [`token-replacement-matrix.md`](./token-replacement-matrix.md) (Wave SAFE — product bridge).
- **Phase 1 (token pass — app shell, policies, marketing/report):** `APP_SHELL_UI_POLICY` uses `BREAKPOINT_TOKENS` and shell tokens (`--app-shell-drawer-width`, `--shadow-mobile-bottom-nav`, `--app-shell-sidebar-narrow-width`, border width vars). Desktop/mobile shell chrome moved to `.ds-desktop-header*`, `.ds-mobile-bottom-nav`, tokenized overlays (`--overlay-white-75`, etc.). Client audit and settings UI policies use `var(--border-width-default)` and `var(--callout-info-bg)` where literals were flagged. `AuditCompare` and `ReportHeroCard` use `.ds-audit-compare-*` / `.ds-report-hero-*` in `components.css` instead of inline visual styles. Regenerate allowlist after pull: `pnpm run audit:ds:refresh-allowlist`. Remaining no-allowlist `inline-visual-style` drift: **4** rows (`HomeHeroCockpit` only); broader literal inventory still in [`inventory-dump.md`](./inventory-dump.md).
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
  - command: `pnpm run audit:ds:ci` (includes `audit:ds:ts-color`)

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
- **Inline style purge:** batch-migrate remaining `style={{ ... }}` in `src/app/pages`, `marketing`, `features` to `.ds-*` / token-backed classes where safe; **`HomeHeroCockpit`** may stay inline (allowlisted). Use CSS variable bridges for data-driven colors; inventory via search.

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
