# Diagnostic Adaptive Intake — roadmap audit vs repository (2026-04-23+)

**Status:** canonical sync for gap matrix G1–G13 and sprint labels  
**Audience:** product + engineering (replaces stale “31 without contract” / “Sprint B not started” narratives)

**Source of truth:** Treat this file as the **only** normative “roadmap vs repo” matrix. Long-form product narratives, Notion plans, or chat exports that still claim **“case patterns not shipped”**, **“G14 no runtime”**, **“G15 no admin graph”**, **“G5 no KPI read path”**, or **“NL ingress is regex-only”** are **stale** unless they explicitly defer here. For bank mechanics and id lists, [QUESTION_BANK.md](../QUESTION_BANK.md) remains authoritative.

This document aligns the **Diagnostic Adaptive Intake** roadmap with the **current tree**. Source-of-truth implementations are linked inline.

### Retired external gap labels (reconciliation)

| Old label | Use instead |
| --- | --- |
| **G14** “no case-aware runtime” | **Shipped:** case catalog + `buildIntakePlan` overlay — see [Sprint B](#sprint-b--case-patterns--graph-runtime). Remaining product work is **depth** (overlay content, UX wiring), not missing modules. |
| **G15** “no dependency graph in admin” | **Shipped:** [StudioDependencyGraphSection.tsx](../../src/app/components/question-bank-studio/sections/StudioDependencyGraphSection.tsx) — static edge **lists** (not force-directed). |
| **G16** “dictation-first without stop criterion” | Partially shipped: `DictationProvider` + NL ingress + **F1** [`next-question`](./ADR-INTAKE-NEXT-QUESTION-V1.md) (deterministic stop). **Client:** `useIntakeBriefController` debounces **`POST /api/intake/:token/next-question`** when `APP_FEATURE_FLAGS.diagnosticIntakePilotEnabled && intakeNextQuestionClientEnabled` (defaults **on**, parity with `FEATURE_INTAKE_NEXT_QUESTION` / `SYSTEM_DEFAULTS`). Public `/intake/:token` UI does **not** surface technical readiness / trace (consultant surfaces only). **Not shipped:** F2 LLM orchestrator; auto-snapping the progressive step to F1’s head is still optional product follow-up. |

**Related ADRs (post-audit):**

- Follow-up policy runtime semantics (diagnostics vs queue control): [ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md](./ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md)
- NL LLM ingress operations (rollout, consent, DPA hand-offs): [ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md](./ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md)

---

## Sprint A — Bank coverage + editorial governance

| Claim (older roadmap) | Fact in repo |
| --- | --- |
| “31 questions without contract / todo stubs” | All **78** bank questions must pass `isIntakeIntelligenceSprint2Complete` with **no** `contract.todo` — see [`packages/intake-core/src/tests/intake-intelligence-contract.test.ts`](../../packages/intake-core/src/tests/intake-intelligence-contract.test.ts). |
| “47/78 = incomplete” | **47** is the size of the **Sprint 2 gate subset** (`INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS`); **31** is `INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE` (same 78 bank, different *product* grouping) — [`packages/intake-core/src/config/intake-intelligence-sprint2.ts`](../../packages/intake-core/src/config/intake-intelligence-sprint2.ts). |
| Anti-pattern warn → error (generic / low-gain / outside-scope) | Many such heuristics are already **`severity: 'error'`** in [`packages/intake-core/src/core/lint-bank-policy/lint-intelligence-contract.ts`](../../packages/intake-core/src/core/lint-bank-policy/lint-intelligence-contract.ts); treat remaining warns as a delta list, not a greenfield toggle. |

---

## Sprint B — Case patterns + graph runtime

| Area | Status |
| --- | --- |
| `intake-case-patterns.v1.json` + matcher | **Shipped** — [`packages/intake-core/src/artifacts/intake-case-patterns.v1.json`](../../packages/intake-core/src/artifacts/intake-case-patterns.v1.json), [`case-matcher.ts`](../../packages/intake-core/src/core/case-matcher.ts), [`lint-case-patterns.ts`](../../packages/intake-core/src/core/lint-bank-policy/lint-case-patterns.ts). |
| Overlay merge + `reorder-next-recommended` | **Shipped** — [`build-intake-plan.ts`](../../packages/intake-core/src/core/build-intake-plan.ts) applies overlay then signal reorder. |
| Follow-up policy | **Executable** — `evaluateFollowupPolicy` in [`followup-policy-executor.ts`](../../packages/intake-core/src/core/followup-policy-executor.ts) + policy keys in [`intake-policy.v1.json`](../../packages/intake-core/src/intake-policy.v1.json). When `followupStopPrunesSameSignalOptional` is true, **prunes** subsequent same-signal optional ids from `nextRecommended` after a follow-up `stop`. |
| Case stop vs queue | **`stopConditionMetByCase` on `IntakePlan`** — when `caseStopPrunesOptionalOverlay` is true, optional unanswered overlay ids are removed from `nextRecommended` after stop + `minOverlayAnswered` (required ids preserved). |
| `evaluateFollowupPolicy` in `buildIntakePlan` | **Trace-only** for the first slice of `nextRecommended` (observability). **User-visible** depth control is primarily **prune**-based; see [ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md](./ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md). |
| Admin “Dependency Graph” | **Static edge lists** (question→signal, question→impact, case keys) — [`src/app/components/question-bank-studio/sections/StudioDependencyGraphSection.tsx`](../../src/app/components/question-bank-studio/sections/StudioDependencyGraphSection.tsx). Not a force-directed graph; call it “dependency lists” unless a layout epic is funded. |

---

## Sprint D — NL ingress + brief observability (condensed)

| Area | Status |
| --- | --- |
| `PUT /api/audits/:id/brief` trace | **Shipped (pilot):** `trace: { code, questionId }[]` when `isDiagnosticIntakePilotEnabled()` — [`server/src/routes/audits/controllers/brief/put-brief.controller.ts`](../../server/src/routes/audits/controllers/brief/put-brief.controller.ts). No `semanticCause` in JSON body (minimal payload). |
| `POST /api/intake/:token/nl-describe` | Heuristic + optional **LLM** draft merge, PII scrub, idempotency — [`server/src/routes/intake/controllers/post-intake-nl-describe.controller.ts`](../../server/src/routes/intake/controllers/post-intake-nl-describe.controller.ts). Ops checklist: [ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md](./ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md). |

---

## Gap matrix G1–G13 (condensed)

| ID | Update |
| --- | --- |
| **G1** “31 outside gate” | **Not missing contracts.** 31 = [`INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE`](../../packages/intake-core/src/config/intake-intelligence-sprint2.ts) (grouping for prioritization). All 78 questions still require `isIntakeIntelligenceSprint2Complete` in [`intake-intelligence-contract.test.ts`](../../packages/intake-core/src/tests/intake-intelligence-contract.test.ts). |
| **G2** Editorial owners | `contract.todo` is disallowed for bank rows in tests; `ownerDomain` + stewardship are enforced. **G2′:** named humans + overdue review — optional registry [`intake-editorial-owners.v1.json`](../../packages/intake-core/src/artifacts/intake-editorial-owners.v1.json); CI for past `reviewByIsoDate` is **governance** backlog unless implemented. |
| **G3** NL = regex only | **Stale.** LLM path exists behind flags (see Sprint D and NL ops ADR). |
| **G4** Privacy / consent for NL | **Partial.** `useIntakeBriefController` stores NL consent; DPA + legal sign-off are **outstanding** (see [ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md](./ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md)). |
| **G5** KPI dashboard | Server: [`intake-intelligence-kpi-dashboard.service.ts`](../../server/src/services/intake/intake-intelligence-kpi-dashboard.service.ts). Admin: [`QuestionBankStudioContainer.tsx`](../../src/app/components/question-bank-studio/containers/QuestionBankStudioContainer.tsx) → `GET /api/intake/intelligence-kpi/dashboard`. |
| **G6** Embeddings / dedup | **Phase (a) shipped:** `cosineDuplicateThreshold` + deterministic token vectors in contract lint from [`bank-embeddings.v1.json`](../../packages/intake-core/src/artifacts/bank-embeddings.v1.json) (`model: deterministic-token-vector-v1`). **Phase (b):** real embedding vectors if KPI/cost justify. |
| **G7 / G8** SaaS + Retail | **`active`** in [`intake-vertical-expansion-roadmap.v1.json`](../../packages/intake-core/src/artifacts/intake-vertical-expansion-roadmap.v1.json). |
| **G9** Cross-source cascade | `resolveSignalFromSources` + `hypothesisCrossCheckByQuestionId` in [`intake-readiness-envelope.ts`](../../packages/intake-core/src/core/intake-readiness-envelope.ts). Remaining work: **wiring** all sources at call sites, not a new algorithm. |
| **G10** `uncertainty_closed` | Emitted in envelope; tests: [`intake-readiness-hypothesis-trace.test.ts`](../../packages/intake-core/src/tests/intake-readiness-hypothesis-trace.test.ts). Any gap is **UI/badge** polish, not core emission. |
| **G11** put-brief trace | See Sprint D table (`put-brief.controller.ts`). |
| **G12** warn → error | Generic / low-gain / outside-scope heuristics are already **`error`** in [`lint-intelligence-contract.ts`](../../packages/intake-core/src/core/lint-bank-policy/lint-intelligence-contract.ts) (plus exemptions). |
| **G13** Stage-specific content | Prefer **case overlays** over duplicating `branch-rules.v1.json`. |

---

## Sprint C — Bank expansion via cases (scope note + inventory)

- **Overlay vs new bank ids:** Case patterns **reorder or surface** existing bank rows via `overlayQuestionIds`. Net-new bank **rows** are tracked in `question-bank.v1.json` + contract lint, not by overlay alone.
- **KPI “+N questions”** should mean **net new question stubs** (or new optional paths), not “ids listed in overlay” when those ids pre-existed.
- **Current catalog** ([`intake-case-patterns.v1.json`](../../packages/intake-core/src/artifacts/intake-case-patterns.v1.json)) uses a **mix**:
  - **Shared core ids** (examples): `b1`–`b3`, `a8`, `d2`, `b7`, `c2`, `c3`, `c8`, `a11`, `e2`, `e3`, `e4`, `d1`, `d6` — reused across multiple product surfaces; overlay **prioritizes** them, does not create new bank rows.
  - **Vertical / slice-specific ids** (suffix-style): `b_hotel_1`, `b_hotel_2`, `d_hotel_1` (Hospitality); `b_health_1` (Healthcare); `f_idea_1`–`f_idea_3` (early validation). These **are** first-class bank rows in [`question-bank.v1.json`](../../packages/intake-core/src/question-bank.v1.json); the case key selects when they float into `nextRecommended`.
- **Sprint C acceptance** (when funded): for each new business case, add **new** bank rows only when existing semantics are insufficient; otherwise reference existing ids in `overlayQuestionIds` and measure KPI delta, not card count.

---

## NL ingress LLM (roadmap “Sprint D” fragment)

Implementation is **beyond regex-only** — see Sprint D table and [ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md](./ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md). **Default** remains LLM off at the feature-flag layer; **Privacy / consent / DPA** are product+legal follow-ups, not implied by the mapper alone.

---

## Sprint E — Embeddings

- **Phase (a) — done:** `cosineDuplicateThreshold` in [`bank-embeddings.v1.json`](../../packages/intake-core/src/artifacts/bank-embeddings.v1.json) + **deterministic** token-vector similarity in [`lint-intelligence-contract.ts`](../../packages/intake-core/src/core/lint-bank-policy/lint-intelligence-contract.ts) (CI fails on new near-duplicate intent without merge/exemption).  
- **Phase (b) — optional:** Replace or augment with provider **embedding** vectors; rebuild artifact generation + CI; justify cost with duplicate-rate KPIs from Phase (a).

---

## Verification

- Resolver + adaptive pruning: `pnpm vitest run packages/intake-core/src/tests/adaptive-intake-prune-behavior.test.ts` (and `case-matcher.test.ts`).
- Playwright (Node-side contract): `e2e/intake-case-patterns-plan.spec.ts` imports `buildIntakePlan` to assert different `casePatternMatch` for different starter answers (no browser bundle of `@glc/intake-core` required).

---

## F1 vs F2 (next-question / orchestration)

| Id | What | Status |
| --- | --- | --- |
| **F1** | Deterministic `POST /api/intake/:token/next-question`: `buildIntakePlan` head / `minimumSufficientContext` stop; `pipeline_events` **`intake_intelligence_next_question`**. | **Shipped** — [ADR-INTAKE-NEXT-QUESTION-V1.md](./ADR-INTAKE-NEXT-QUESTION-V1.md) |
| **F2** | LLM suggests next `questionId` (validated ⊆ overlay-resolved set); shadow/canary; invalid-suggestion KPI. | **Not shipped** — future ADR when prioritized |

**Naming:** Code comments and flags may still say “Sprint F floor”; that means **F1**. Do not assume **F2** exists because the route exists.

---

## Measurable product KPIs (wire-up anchors)

Use these to score “adaptive depth” and dictation-first **without** inventing new event types.

| Target | How to measure (existing plumbing) |
| --- | --- |
| **Median questions to readiness / stop** | Per `client_session_id` on public intake: count **`question_shown`** events (`POST /api/intake/:token/intelligence-kpi`) until `drop_off` or end-of-flow; join with `audit_readiness` from brief/pipeline if needed. Optional: count **`intake_intelligence_next_question`** with `action: 'ask'` (requires `FEATURE_INTAKE_NEXT_QUESTION` + pilot). |
| **Case-key coverage** | **`case_key_coverage_rate`** (and `case_key_distribution`) on `GET /api/intake/intelligence-kpi/dashboard` — derived from KPI payloads with `case_keys`. Same keys on `next-question` pipeline rows when F1 is used. |
| **Confidence movement** | **`confidence_moved_rate`** on the dashboard; client sets `confidence_moved` on `question_shown` beacons when weakest pilot-signal tier increases ([API.md](../API.md) `intelligence-kpi` section). |
| **F1 stop vs queue** | Inspect `intake_intelligence_next_question` rows: `action` `ask` vs `stop`, `reason`, `case_keys` — for funnel analysis when the route is enabled. |

**Preconditions:** `FEATURE_DIAGNOSTIC_INTAKE_PILOT` and relevant write paths enabled; F1 also requires `FEATURE_INTAKE_NEXT_QUESTION`. KPI inserts need a linked `audit_id` for `persisted: true` on intelligence-kpi ([API.md](../API.md)).

---

## References

- Next-question **F1** (deterministic): [ADR-INTAKE-NEXT-QUESTION-V1.md](./ADR-INTAKE-NEXT-QUESTION-V1.md)
- Orchestration product sync (sibling doc): [ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md](./ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md)
- Intake question bank: [QUESTION_BANK.md](../QUESTION_BANK.md)
