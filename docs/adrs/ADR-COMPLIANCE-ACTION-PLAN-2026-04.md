# ADR Compliance Action Plan (Phase-based)


| Field   | Value                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------- |
| Status  | In progress (Phases A–D delivered; Phase E baseline expanded)                                 |
| Date    | 2026-04-19                                                                                      |
| Scope   | `docs/adrs/*`, `server/src/**`, `src/app/**`, `packages/intake-core/**`, `server/migrations/**` |
| Purpose | Close remaining gaps between accepted ADR decisions and production behavior                     |


---

## 1. Context and objective

This document defines a phase-by-phase execution plan to reach a stable end-state where:

1. Accepted ADRs are reflected in runtime behavior, not only code paths behind disabled flags.
2. Documentation claims match the actual implementation.
3. Governance-critical contracts (CONTROL_OBJECT, Decision Layer, pipeline events) are resilient under failure paths.

The plan is derived from:

- `docs/adrs/GAP-ANALYSIS-PHASE0.md`
- ADR set in `docs/adrs/`
- current implementation state in server/frontend/shared packages.

---

## 2. Current gap baseline (audit snapshot)

### Confirmed high-impact gaps

1. **Feature-gated ADR capabilities not guaranteed in runtime (P1/P2):**
  - `FEATURE_CAUSAL_DAG`, `FEATURE_AUTO_REMEDIATION`, `FEATURE_BENCHMARKS`, `FEATURE_BANDITS`, `AUTO_LOOP_ENABLED` depend on env/defaults.
  - Impact: environment drift vs accepted ADR expectations.
2. **Proposed-but-not-implemented ADR scope (P2/P3):**
  - Frontend i18n ADR is explicitly proposed; runtime i18n stack not deployed.
  - Impact: no functional mismatch with ADR status, but clear implementation backlog remains.

### Resolved since 2026-04-19 (keep for audit trail)

1. **Decision fallback safety ambiguity (was P1):** fixed — configured safe fallback + event metadata + tests.
2. **Documentation drift in gap analysis (was P2):** fixed — `GAP-ANALYSIS-PHASE0.md` updated to match code.
3. **Operationalization gap for `evaluation_datasets` TTL cleanup (was P2):** fixed — background cleanup + tests + runbook notes.

---

## 3. End-state definition (target compliance)

A phase is considered complete only when all criteria are true:

- **Contract parity:** ADR normative decisions are represented in code/contracts/events.
- **Runtime parity:** required ADR behavior is enabled in target environments (or explicitly documented as staged rollout).
- **Evidence parity:** tests/diagnostics prove behavior.
- **Doc parity:** ADR and gap-analysis statements are current and non-contradictory.

---

## 4. Execution roadmap by phases

## Phase A — Governance correctness hardening (Priority: P1) — **Done**

### Goal

Eliminate false governance states and make Decision Layer failure behavior explicit and safe.

### Delivered

- Configured fallback via `SYSTEM_DEFAULTS.decisionLayer.onErrorFallback`.
- `publishControlObjectGovernanceCore` applies fallback + emits `control_object` with `decision_fallback_*` metadata.
- Tests updated in `server/src/tests/pipeline-governance-events.test.ts`.

---

## Phase B — Runtime rollout contract for feature-gated ADRs (Priority: P1/P2) — **Done (baseline)**

### Goal

Convert ADR-dependent features from "available in code" to "predictably enabled by policy" per environment.

### Delivered

- Runtime matrix + verification checklist in `docs/DEPLOYMENT.md`.
- Recommended env profiles in `server/.env.example`.
- Startup snapshot log `feature_flags.effective_snapshot` via `server/src/config/feature-flags-snapshot.ts` + tests.

### Remaining (optional hardening)

- Add CI job that asserts expected flag profile for a named deploy tier (requires explicit org policy).

---

## Phase C — Documentation reconciliation (Priority: P2) — **Done (baseline)**

### Goal

Remove stale statements and make gap-analysis an accurate planning artifact.

### Delivered

- `docs/adrs/GAP-ANALYSIS-PHASE0.md` updated (marketing/automation checks + Decision Layer fallback + retention cleanup).
- `docs/PIPELINE.md` updated (Decision Layer failure safety note).

### Remaining

- Optional: reconcile `ADR-CONTROL-OBJECT-V2-FULL.md` example `versions.*` strings with shipped tags (cosmetic unless consumers depend on exact strings).

---

## Phase D — Data lifecycle and ops completion (Priority: P2) — **Done**

### Goal

Close operational ADR-adjacent gaps for storage hygiene and long-running governance data.

### Delivered

- Periodic TTL delete for `evaluation_datasets` (`expires_at < now()`), integrated with the existing background worker in `server/src/services/alerts.ts`.
- Tunable interval: `SYSTEM_DEFAULTS.evaluationDatasets.cleanupIntervalMs` (exported via `EVALUATION_DATASETS_CLEANUP_INTERVAL_MS`).
- Tests: `server/src/tests/evaluation-datasets-retention.test.ts`.
- Runbook notes: `docs/DEPLOYMENT.md`.

---

## Phase E — Domain readiness closure and regression control (Priority: P2)

### Goal

Move domain "final-ready" ADRs from implementation-complete to regression-safe baseline.

### Actions

1. Expand deterministic scenario coverage per domain (`tech`, `security`, `seo`, `ux`, `marketing`, `automation`).
2. Add cross-domain integration tests for strategy synthesis under mixed-quality upstream signals.
3. Lock error taxonomy contract tests (`FactChecker -> CONTROL_OBJECT -> Decision -> adjustment/remediation`).

### Regression coverage matrix (minimum CI set)

| Area | Test file(s) | What it protects |
| --- | --- | --- |
| Governance events + Decision Layer | `server/src/tests/pipeline-governance-events.test.ts` | `control_object` emissions, refine routing, mixed upstream hints, Decision Layer failure path |
| Decision thresholds | `server/src/tests/decision-layer.test.ts` | accept / accept_with_warnings / refine routing invariants |
| CONTROL_OBJECT contract | `server/src/tests/control-object-contract.test.ts` | schema-ish invariants for emitted objects |
| Strategy persistence / packs | `server/src/tests/strategy-*.test.ts` | strategy outputs and optional execution-pack behavior |
| Marketing + automation fact checks | `server/src/tests/marketing-automation-fact-checks.test.ts` | numeric/overclaim guardrails for phases 5–6 |
| Marketing + automation verify wiring | `server/src/tests/marketing-automation-verify-kernel.test.ts` | end-to-end `FactChecker.verify()` → `verifyKernel` domain hook coverage |
| Evaluation datasets retention | `server/src/tests/evaluation-datasets-retention.test.ts` | TTL cleanup correctness + failure safety |

### Files to update

- `server/src/tests/*domain*`
- `server/src/tests/strategy-*.test.ts`
- `server/src/tests/control-object-contract.test.ts`
- `server/src/tests/pipeline-governance-events.test.ts`
- `server/src/tests/marketing-automation-fact-checks.test.ts`
- `server/src/tests/marketing-automation-verify-kernel.test.ts`

### Exit criteria

- Domain-level and strategy-level regressions are caught by CI before release.
- "Final-ready" claims in ADRs are test-backed, not prose-only.

---

## Phase F — Proposed ADR track (i18n) with explicit scope boundary (Priority: P3)

### Goal

Treat proposed ADRs as managed roadmap items without conflating them with accepted-compliance debt.

### Actions

1. Keep `ADR-FRONTEND-I18N.md` status as proposed until runtime library and migration plan are approved.
2. Create implementation tranche plan:
  - key registry integration,
  - error localization by `code`,
  - locale formatting and routing policy.
3. Define readiness gate for status transition Proposed -> Accepted.

### Files to update

- `docs/adrs/ADR-FRONTEND-I18N.md`
- `docs/FRONTEND.md`
- `src/app/lib/supported-ui-locales.ts` (if policy updates required)

### Exit criteria

- i18n roadmap has clear acceptance gate and ownership.
- No ambiguity between "planned" and "committed/implemented".

---

## 5. Sequencing and timeline recommendation

1. **Sprint 1 (done):** Phase A + Phase B baseline + Phase C baseline + Phase D
2. **Sprint 2 (current):** Phase E expansion (domain scenario depth + strategy integration coverage)
3. **Sprint 3+:** Phase F (i18n) per product priority + optional CI hardening for deploy-tier flag profiles (Phase B remainder)

---

## 6. Risk register


| Risk                                                         | Severity | Mitigation                                    |
| ------------------------------------------------------------ | -------- | --------------------------------------------- |
| Env drift disables accepted ADR behavior                     | P1       | Phase B runtime matrix + startup diagnostics  |
| Planning based on stale docs                                 | P3       | Keep `GAP-ANALYSIS-PHASE0.md` updated whenever governance paths change |
| Domain regressions unnoticed                                 | P2       | Phase E contract + integration test hardening |


---

## 7. Ownership model

- **Pipeline/Governance:** backend platform owners
- **Flags/Runtime policy:** backend + devops
- **Docs reconciliation:** architecture owner + module owners
- **Retention/ops jobs:** platform/infra owner
- **Domain tests:** domain maintainers
- **i18n track:** frontend lead + product owner

---

## 8. Definition of done (global)

The compliance program is complete when:

1. All accepted ADR behaviors have verified runtime parity in target environments.
2. Critical governance failure modes are safe and tested.
3. Gap-analysis and architecture docs are current.
4. Compliance status can be regenerated from tests + docs without tribal knowledge.