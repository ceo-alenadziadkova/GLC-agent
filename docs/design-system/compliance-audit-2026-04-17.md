# Design system compliance audit (factual)

Date: 2026-04-17  
**SSOT (target specification):** [current.md](./current.md) (as-is §1–10).  
**Method:** No redesign; detection only. Findings derive from `design-system-raw-values-check` + `design-system-enforcement-check` with **allowlist disabled** (same as [violations-export.md](./violations-export.md)), plus repository facts referenced below.

**Exhaustive machine list:** [compliance-findings.full.txt](./compliance-findings.full.txt) (deduped lines: `file:line [type] value`).

---

## 1. HARD VIOLATIONS (CRITICAL)

### 1.1 Hardcoded values instead of tokens

Policy reference: canonical CSS variables in `src/styles/tokens.css`; TS maps in `src/design-system/tokens/**` (see [current.md](./current.md) §1, [roadmap-notes.md](./roadmap-notes.md)).

**Quantitative summary (no allowlist, deduped merge):**

| Metric | Value |
| --- | ---: |
| Deduped findings | 488 |
| `unit-literal` | 337 |
| `inline-visual-style` | 101 |
| `rgb-color` | 44 |
| `hex-color` | 6 |

Raw audit rows (pre-dedupe): 393 + 101 from the two scripts (see [violations-export.md](./violations-export.md)).

**Expected token:** Not inferred in bulk. Each literal would need manual or heuristic mapping to `var(--*)`; this report does not assign replacements.

**Sample rows (first 10 lines of `compliance-findings.full.txt`):**

| File | Line | Type | Value |
| --- | ---: | --- | --- |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 3 | `unit-literal` | `640px` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 19 | `unit-literal` | `1px` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 22 | `unit-literal` | `1px` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 28 | `unit-literal` | `20rem` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 30 | `unit-literal` | `12px` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 30 | `unit-literal` | `4px` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 34 | `unit-literal` | `9px` |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 35 | `unit-literal` | `10px` |
| `src/app/components/app-shell/sections/DesktopHeader.tsx` | 20 | `unit-literal` | `1px` |
| `src/app/components/app-shell/sections/DesktopHeader.tsx` | 21 | `unit-literal` | `56px` |

Full trace: [compliance-findings.full.txt](./compliance-findings.full.txt).

**Scope note:** `design-system-raw-values-check` scans TS/TSX under configured app trees (see script header). `design-system-enforcement-check` flags inline visual `style={{...}}` keys, config token-like raw values (with documented basename skips), `utilities.css` visual rules, and optional legacy button classes.

### 1.2 Token duplication across layers

**Observed architecture (factual):**

- Values are defined in `src/styles/tokens.css` and referenced as `var(--...)` from TS token maps and CSS.
- The same **numeric/color literal** can still appear in TSX/TS (listed in §1.1) **in addition** to tokens — that is duplication of *expression*, not necessarily duplicate token definitions.
- TS maps in `src/design-system/tokens/**` are wrappers over CSS variables per [current.md](./current.md) §1.8 / [roadmap-notes.md](./roadmap-notes.md).

No single automated diff of “same hex in tokens.css and in file X” is attached; the raw-value audit is the primary detector for literals outside token usage.

### 1.3 Theme bypass

**Factual patterns in findings:**

- `inline-visual-style` and `hex-color` / `rgb-color` in feature and page TSX bypass semantic theme variables for those lines.
- `rgba(...)` and fixed hex in components (e.g. app shell, discover, marketing) appear in [compliance-findings.full.txt](./compliance-findings.full.txt); whether `html.dark` is bypassed per surface requires line-level review (not asserted here as pass/fail).

---

## 2. STRUCTURAL VIOLATIONS

### 2.1 Mixed styling paradigms

Documented coexistence: Tailwind utilities, `src/styles/components.css` / `features.css`, legacy `glc-*`, bridge `ds-*` classes ([roadmap-notes.md](./roadmap-notes.md), [current.md](./current.md) §2, §10).

**Quantitative signal:** 101 `inline-visual-style` rows indicate React `style={{...}}` with visual keys alongside class-based styling in scoped files.

### 2.2 Component boundary violations

Not exhaustively enumerated file-by-file. **Signal:** policy and UI literals live in `src/app/pages/**/config/*.ts` and feature components (see top files in [violations-export.md](./violations-export.md)).

### 2.3 Inconsistent component usage

**Recorded product fact:** multiple score/snapshot badge implementations called out as parallel patterns in [roadmap-notes.md](./roadmap-notes.md) (“Score / badge widgets” deferred epic).

---

## 3. TOKEN SYSTEM ISSUES

### 3.1 Unused tokens

`src/styles/tokens.css` defines **290** custom property names (see [inventory-dump.md](./inventory-dump.md)).  
**Unused-token set:** not computed in this audit run (would require each `--name` searched against `src/**`).

### 3.2 Missing tokens (inferred)

**Signal:** 337 deduped `unit-literal` + 44 `rgb-color` + 6 `hex-color` findings indicate repeated literals in audited files without going through token variables on those lines.

Full literal sets: [inventory-dump.md](./inventory-dump.md) (deduplicated repo literals).

### 3.3 Token fragmentation

**As documented:** multiple semantic families (`--glc-*`, `--bg-*`, `--text-*`, `--callout-*`, `--ui-*`, score scale, etc.) listed in [current.md](./current.md) §1.1; same section notes light/dark overrides in `tokens.css`.

---

## 4. STATE SYSTEM ISSUES

Per [current.md](./current.md) §7 (State Definitions) and §10 (System Rules):

- Interaction states use a **mix** of pseudo-classes (`:hover`, `:focus-visible`, `:disabled`) and data/ARIA-driven selectors (`data-[state=*]`, `aria-invalid`, etc.).
- **Documented gaps:** no generic shared `loading` across all primitives (Button implements `loading`); no universal `success`/`error` variant contract across primitives.

**Inconsistency (factual):** same section notes differing state expression between primitives vs feature-built UI; feature files in §1 top list should be assumed heterogeneous unless proven otherwise.

---

## 5. LAYOUT SYSTEM VIOLATIONS

**Declared contracts:** `LAYOUT_CONTRACTS` in [`src/design-system/patterns/Layouts/layout-contracts.ts`](../../src/design-system/patterns/Layouts/layout-contracts.ts):

- `container.page`: `max-w-7xl`
- `container.content`: `max-w-5xl`
- Section rhythm: `gap-14 sm:gap-20 lg:gap-24` (see file).

**Ad hoc usage:** multiple marketing and page modules use Tailwind `max-w-*` directly (non-exhaustive grep shows hits across `PublicBriefPage`, `DiscoverResultsView`, `MarketingHeader`, `FaqPage`, `audit-workspace/config/ui.ts`, etc.). This coexists with contracts — **pattern multiplicity** without judging correctness.

---

## 6. NAMING VIOLATIONS

Formal patterns: [current.md](./current.md) §9 (`glc-*`, `--*` families, `PascalCase` components, `data-slot` / `data-sidebar`).

**Factual drift signal:** legacy `glc-btn-*` detection exists in enforcement script; current deduped export shows **zero** `legacy-button-class` rows (informational path may still apply when findings exist).

---

## 7. ACCESSIBILITY GAPS (FACTUAL ONLY)

Signals documented in [current.md](./current.md) §8: global `:focus-visible` in `base.css`, `aria-*` usage in primitives, `sr-only` patterns, skip link in `MarketingLayout`, `prefers-reduced-motion` in feature styles.

**This audit does not** scan every interactive element for missing `aria-*` or focus rings. Rows in §1.1 do not imply a11y failure; they only flag styling implementation.

---

## 8. DUPLICATION MAP

**By violation density (top areas from [violations-export.md](./violations-export.md) top files):**

| Area / pattern | Signal |
| --- | --- |
| `pages/discover/**` | High finding count in multiple components |
| `marketing/blocks/**` | High finding count (e.g. AuditCompare, DecisionPath, heroes) |
| `pages/snapshot-landing/**` | Forms, results, CTAs |
| `pages/intake-brief/**` | Multiple phases |
| `features/report-viewer/**` | Hero card, tabs, findings |
| `components/ui/**` | Raw `unit-literal` in shared primitives (audit flags vendor-style literals) |
| `components/app-shell/**` | Policy TS + chrome sections |
| `pages/client-audit-view/**` | Config + sections |

**By finding type:** see §1.1 table (`unit-literal` dominates).

---

## 9. SYSTEM FRAGMENTATION SUMMARY

| Region | Observation |
| --- | --- |
| **Cohesive** | Central token file `tokens.css`; TS token façade; shared UI primitives under `src/app/components/ui/**`; layout contracts under `src/design-system/patterns/Layouts/**`. |
| **Fragmented** | Product pages, marketing, discover, intake, snapshot, report viewer concentrate literals and inline styles (§1, [violations-export.md](./violations-export.md)). |
| **Bypassed most often** | Highest file-level counts: marketing blocks, report viewer, snapshot landing, discover, intake brief (see top files table). |
| **CI vs truth** | `pnpm run audit:ds:ci` uses [scripts/design-system-baseline.allowlist.txt](../../scripts/design-system-baseline.allowlist.txt); **this audit** mirrors **no-allowlist** exports. |

---

## Regeneration

```bash
pnpm run audit:ds:inventory-dump
node scripts/design-system-export-violations.mjs
```

Then update this narrative if counts or governance change materially.
