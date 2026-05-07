# ADR: Frontend source layout — page slices vs `features/`


| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-05-07 |
| **Scope** | React SPA under `src/app/` — folder conventions for `pages/`, `features/`, and `components/` |
| **Supersedes** | — (informal / undocumented patterns) |
| **Superseded by** | — (publish a new ADR if the team adopts a different top-level structure) |
| **Decision owners** | Engineering (frontend + platform) |

---

## 1. Context

The repository had a **partial** Feature-Sliced / `features/` layout: a `src/app/features/` tree existed, but most UI still lived in `src/app/pages/` and `src/app/components/`. That created **onboarding cost** (unclear where new code belongs) and **inconsistent** placement (e.g. a page-specific module under `features/` with a single consumer).

## 2. Decision

### 2.1 Primary slice: `src/app/pages/<route>/`

- Each **route or cohesive page family** owns its code: entry TSX, `sections/`, `hooks/`, local-only components, and `types.ts` where useful.
- This matches existing patterns (e.g. `pages/new-audit/`, `pages/pipeline-monitor/`, `pages/portal-plan/`, `pages/strategy-lab/`).

### 2.2 Shared cross-page modules: `src/app/features/<name>/`

Place code under `features/` **only** when it is imported from **two or more** distinct **page areas** (separate top-level pages under `pages/` or clearly separate `pages/<area>/` subtrees that represent different products flows).

**Canonical example (keep):** `src/app/features/report-viewer/` — consumed by consultant report viewing and client portal post-audit surfaces (multiple page entry points).

**Rule of thumb:** if only **one** page family imports the module, it belongs under that page’s folder (`pages/<owner>/`), not under `features/`.

Document **exceptions** (if any) in this ADR or a follow-up ADR; do not leave ambiguity in PR review.

### 2.3 Global UI shell: `src/app/components/`

- Layout, navigation, route guards, error boundaries, and **reusable** widgets without a single page owner stay here.
- Further domain grouping under `components/` (e.g. `audit/`, `portal/`) is incremental hygiene; it does not replace §2.1–2.2.

### 2.4 Inventory / cleanup (this ADR)

| Change | Rationale |
| --- | --- |
| **Moved** `PackGraphConsultantCanvas`, `RevisionHistoryPanel` (and its a11y test) from `src/app/features/strategy-lab/` → `src/app/pages/strategy-lab/` | Only used under the Strategy Lab / orchestration page tree; not cross-page shared. |
| **Removed** `src/app/features/portal-timeline/` (`NowNextLaterBoard`, `ConsultantTimelineDiagnostics`, `PortalTimelinePageBlocks`) | No imports from outside that folder in `src/` at time of removal — dead code. |

## 3. Consequences

- **Positive:** Clear rule for new code; `features/` signals **intentional shared** UI/domain for multiple pages.
- **Neutral:** Some large pages remain under `pages/<name>/` with many files at the top level; decomposition is handled per feature, not by renaming the whole tree.
- **Follow-up (out of scope here):** grouping loose files in `src/app/components/`, server `services/` file-vs-folder normalization, god-component splits.

## 4. References

- Developer-oriented summary: [FRONTEND.md](../FRONTEND.md) — **Source layout: `pages` vs `features`**.
- Master index link: [MASTER.md](../MASTER.md).
