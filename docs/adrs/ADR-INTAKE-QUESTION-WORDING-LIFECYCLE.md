# ADR: Intake question wording lifecycle

Status: Proposed

Date: 2026-04-09

## Decision drivers

1. Reduce time-to-understand for `Intake plan trace` users.
2. Separate troubleshooting workflows from content authoring workflows.
3. Keep resolver behavior deterministic while improving wording ergonomics.
4. Improve reviewability and auditability of wording changes.
5. Lower maintenance cost caused by mixed responsibilities in one UI.

## Context

`Intake plan trace` currently exposes resolver internals (`reasonsById`, `layer/state/code`) and is useful for debugging but hard to use for product editing of question semantics.  
The team needs a controlled path to improve wording while preserving branch logic, ids, and answer contracts.

At the same time, the current `Intake plan trace` UI is overloaded because it combines three different workflows in one place:

1. Resolver diagnostics (`Question trace`, `Trace text`, `Plan JSON`).
2. Product/UX scenario walkthrough (`User journey`, branch dependencies).
3. Content editing (`Wording drafts` and wording BA heuristics inside graph view).

This mixed information architecture makes it unclear which tab should be used first and what each tab is responsible for.

The desired operating model:

1. Start with a human-readable trace view (no engine changes).
2. Enable wording drafts for review and discussion.
3. Introduce a full publication lifecycle with validation, approvals, versioning, and rollback.

## Scope

In scope:

- Information architecture and tab organization of `Intake plan trace`.
- Separation of diagnostics flow and wording workflow.
- Wording lifecycle controls (draft, validation, review, publish, rollback) as product behavior.
- Naming and UX conventions for intent-first navigation.

Out of scope:

- Changes to branch evaluation logic or `buildIntakePlan` decision semantics.
- Changes to question ids, answer contracts, or SLA required-id derivation.
- Re-definition of domain mapping rules in intake policy artifacts.

## Non-goals

- This ADR does not redesign intake policy rules.
- This ADR does not introduce new scoring logic for audit domains.
- This ADR does not mandate a specific persistence schema in this document.

## Decision

Adopt a staged lifecycle for wording changes:

1. **Draft layer** (safe, non-destructive)
   - Draft text is stored separately from canonical bank artifacts.
   - Draft text can be previewed in trace and wizard simulations.
   - Drafts never alter branch conditions, priorities, or answer schema.
2. **Validation layer** (automated quality gates)
   - Check for empty text, excessive length, duplicate labels, and banned placeholders.
   - Run snapshot comparisons for `buildIntakePlan` outputs to confirm no logic drift.
3. **Review and approval layer**
   - Product/content editor proposes changes.
   - Reviewer approves with visible diff (old text vs new text).
4. **Publish layer**
   - Publish creates a new wording version tied to intake tuple metadata.
   - Published wording is immutable; edits require a new version.
5. **Rollback layer**
   - Instant rollback to last known-good published wording set.
   - Rollback event is auditable and linked to operator identity.

Also adopt an explicit information architecture for `Intake plan trace`:

1. **Diagnose mode** (default)
   - Primary troubleshooting flow.
   - Tabs: `Question trace`, `User journey`, `Dependencies graph` (simplified branch map).
2. **Advanced mode**
   - Engineering-only low-level artifacts.
   - Tabs: `Resolver log` (current `Trace text`), `Plan JSON`.
3. **Wording workflow separation**
   - `Wording drafts` and BA wording review heuristics move out of the main diagnostics flow into a dedicated wording workspace.
   - The diagnostics tool may still show effective labels, but drafting/review controls are not mixed with core resolver debugging.

UI naming must be intent-first (question-oriented), not implementation-first:

- `Question trace` -> "Why this question appears"
- `Branch map` -> "Dependencies graph"
- `Trace text` -> "Resolver log"

Advanced controls in graph views must be grouped under an explicit "Advanced controls" section and collapsed by default.

## Options considered

### Option A: Keep current IA, add onboarding text only

- Pros: no refactor cost.
- Cons: does not solve workflow collision; cognitive overload remains.

### Option B: Rename tabs only

- Pros: low implementation effort.
- Cons: helpful but insufficient; core mixing of diagnostics and wording remains.

### Option C (selected): Split IA by intent and separate wording workspace

- Pros: clear user intent per area, lower cognitive load, cleaner ownership boundaries.
- Cons: moderate refactor effort and migration coordination.

## Consequences

Positive:

- Product and content teams can refine question wording safely.
- Resolver behavior remains stable because wording is isolated from branch logic.
- Review and publish history is explicit and auditable.
- `Intake plan trace` becomes easier to learn and use because tabs align with user intent and task type.
- Lower cognitive load for first-time users and QA reviewers.

Costs:

- Additional storage and API surfaces for draft/review/publish states.
- More operational checks in CI for wording publication.
- Refactoring effort for the current trace UI and graph controls.

## Rollout plan

1. Introduce IA split behind a feature flag.
2. Keep compatibility aliases for previous tab names during transition.
3. Migrate wording controls from diagnostics area to dedicated wording workspace.
4. Add telemetry and monitor usage for one release cycle.
5. Remove compatibility aliases after adoption thresholds are met.

## Invariants

- `questionId` remains stable and is the primary key for any wording change.
- Branch conditions (`branchCondition`) and answer contracts are not writable in wording workflow.
- `buildIntakePlan` remains source of truth for visibility and required/deferred state.
- Diagnostics and wording editing remain separate workflows even when rendered from the same dataset.

## Implementation phases

1. **Phase A**: Humanized trace UI with simple/expert modes.
2. **Phase B**: Local draft wording preview (browser-local state).
3. **Phase C**: Information architecture split (`Diagnose` vs `Advanced`) and intent-first tab labels.
4. **Phase D**: Dedicated wording workspace (separate from core trace diagnostics).
5. **Phase E**: Server-side draft persistence and review queue.
6. **Phase F**: Publish API with version tuple integration.
7. **Phase G**: Rollback and audit reporting.

## Validation and tests

- Unit tests for wording validators.
- Snapshot tests for representative intake fixtures before/after wording publish.
- E2E check: `Diagnose` flow (question reason -> journey -> dependency graph) remains coherent.
- E2E check: wording workspace remains isolated from resolver diagnostics controls.

## Success metrics

- Median time to find "why this question appears" in diagnostics <= 2 minutes (internal usability test).
- Reduction in tab-switch count per diagnostics session by at least 30% from baseline.
- At least 80% of sessions use either diagnostics or wording flow without crossing both in the same task.
- Zero resolver regressions in snapshot comparisons for unchanged policy inputs.

## Telemetry

Track at minimum:

- `intake_trace_tab_opened`
- `intake_trace_advanced_toggled`
- `intake_trace_graph_control_used`
- `intake_wording_draft_saved`
- `intake_wording_review_exported`
- `intake_wording_published`
- `intake_wording_rollback`
- `intake_trace_session_completed`

Telemetry must include route, active mode (`diagnose`/`advanced`/`wording`), and anonymized action context.

## Accessibility and performance constraints

- Keyboard navigation is required for all tab and graph controls.
- Interactive controls must expose accessible names/labels.
- Graph interactions must remain responsive with medium-sized plans (virtualized lists on large sets).
- Advanced controls are collapsed by default to reduce visual noise.

## Ownership and approvals

- Product owner: approves IA labels and user-facing workflow boundaries.
- Engineering owner: approves technical implementation and migration strategy.
- Content/BA owner: approves wording review heuristics and publication criteria.
- Final status may move from `Proposed` to `Accepted` only after all three approvals.

## Implementation status (as of 2026-04-09)

**Done (code + migrations):**

- Information architecture v2 on `/admin/intake-trace` with opt-out rollback via **`VITE_INTAKE_TRACE_IA_V2`** (unset defaults to **on**; use `0` / `false` / `off` for legacy flat tabs).
- Dedicated **`/admin/intake-wording`** page and consultant nav entry.
- Client-batched **telemetry** to **`POST /api/intake-trace-tool/analytics-events`** into **`intake_analytics_events`** with **`surface` = `internal_intake_trace`**, **`payload`**, **`user_id`** (migrations `035`, `036`).
- **Server persistence** for draft wording per user: **`GET`/`PUT /api/intake-trace-tool/wording-drafts`** backed by **`intake_question_wording_drafts`** (replace-all supported on PUT).
- **MVP publish + rollback** (migration **`037`**): **`published_text`** / **`published_at`** on drafts; **`POST .../wording-drafts/publish`** and **`POST .../wording-drafts/rollback`**; append-only **`intake_wording_publication_log`** with **`GET .../wording-publication-log`**; UI on **`/admin/intake-wording`** (including publication log panel); trace labels resolve **`draft` > `published` > canon**; BA review uses **`draft || published || canon`** for length heuristics.

**Not done yet (per full ADR):**

- Remote/feature-flag service (env-only kill switch today).
- Automated **success metrics** dashboards (events are stored; reporting is ad hoc SQL / Metabase).
- Full **review queue, multi-version history, approvals, and immutable published bundles** (beyond single-iteration publish + rollback + append-only log).

## Open questions

- Whether wording versions should be global or scoped by product mode/surface.
- Whether review approval requires one or two approvers.
- Whether published wording should be embedded in frozen artifact bundles or resolved at runtime.
