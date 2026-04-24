# ADR: Intake next-question API (F1 — deterministic floor, V1)

**Status:** Accepted  
**Date:** 2026-04-23  
**Context:** [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md](./ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md) — **F1** in “F1 vs F2”

## Naming: F1 vs F2

- **F1 (this ADR):** Shipped **deterministic** public route — no LLM. Same as legacy wording “Sprint F floor” in code comments.
- **F2 (future):** LLM-orchestrated next step with structured output, suggestion validation, shadow mode — **not** part of this ADR; requires a follow-on ADR when built.

## Context

The product vision includes an F2 LLM “what to ask next” path. The repository must ship **F1** so that:

- `buildIntakePlan` and `nextRecommended` stay authoritative (case overlay, signal reorder, follow-up prune);
- a model (when added) cannot assert “done” without policy checks in `intake-policy.v1.json` → `intelligence.minimumSufficientContext`.

## Relation to follow-up policy (F1)

`evaluateFollowupPolicy` in [`followup-policy-executor.ts`](../../packages/intake-core/src/core/followup-policy-executor.ts) influences **prune** behavior and **trace** in `buildIntakePlan`. **User-visible** “ask deeper” as a per-turn gate is not fully driven by that evaluator alone — see [ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md](./ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md). F1 `next-question` reads the **resulting** `nextRecommended` head and `minimumSufficientContext` stop; it does not replace follow-up ADR semantics.

## Decision

1. **Endpoint:** `POST /api/intake/:token/next-question` (public intake token, rate-limited) behind **`FEATURE_INTAKE_NEXT_QUESTION`** and **`FEATURE_DIAGNOSTIC_INTAKE_PILOT`**.

2. **Implementation:** `decideIntakeNextQuestion` in [`packages/intake-core/src/core/intake-next-question.ts`](../../packages/intake-core/src/core/intake-next-question.ts) — if `nextRecommended[0]` exists → `action: 'ask'`; else evaluate minimum-sufficient policy; returns `action: 'stop'` with a reason code.

3. **Telemetry:** `pipeline_events` with `event_type` **`intake_intelligence_next_question`**.

4. **F2:** any LLM-suggested `questionId` must be validated ⊆ eligible overlay-resolved set; invalid suggestion rate is a KPI — not part of F1 / V1.

## Consequences

- No change to the question bank contract shape; thresholds live in JSON only.
- F2 LLM orchestration remains a separate change set with an additional ADR when introduced.

## References

- [`server/src/routes/intake/controllers/post-intake-next-question.controller.ts`](../../server/src/routes/intake/controllers/post-intake-next-question.controller.ts)
- [`intake-policy.v1.json`](../../packages/intake-core/src/intake-policy.v1.json)
- [ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md](./ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md) — how follow-up policy relates to the queue
