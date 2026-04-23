# ADR: NL-to-Graph Ingress V1 (Sprint 5 stub)

## Status

Accepted (stub endpoint + client affordance; orchestration deferred).

## Context

Product wants a “describe your business in natural language” step ahead of structured intake, without letting inferred text override explicit bank answers. **Positioning** relative to the default audit-first contract: [ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1](./ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1.md).

## Decision

1. **Endpoint:** `POST /api/intake/:token/nl-describe` (public, rate-limited like respond). Active only when **`FEATURE_DIAGNOSTIC_INTAKE_PILOT`** is enabled on the server; otherwise responds **404** (feature not advertised).
2. **Payload:** `{ "text": string }` — trimmed, non-empty, max **8000** characters. **No persistence** of body text in this stub; server logs a short structured line (`charCount`, token prefix) for operational visibility only.
3. **Response:** `{ ok, prefer_explicit_over_inferred: true, graphDraft, message }` — `graphDraft` carries **deterministic keyword heuristics** (`inferred[]` with `questionId`, `confidence`, `rationale`); no LLM call and no persistence of raw `text`. A future orchestrator may replace heuristics with model output using the same envelope.
4. **Client:** Optional textarea on `/intake/:token`; copy stresses privacy (no secrets) and that structured answers remain authoritative (`prefer_explicit_over_inferred`).

## Consequences

- **Privacy review (pre-merge checklist):** no retention of raw `text` in this stub; confirm logging redaction in production log sinks; add DPA line when LLM vendor is introduced; document user-facing consent before any persistence.
- Future work: versioned graph draft schema, idempotency keys, consent banner, and merge rules with `buildIntakePlan`.

## Changelog

- **2026-04-23:** Stub route + UI + ADR (no graph merge).
- **2026-04-23:** Phase-1 **heuristic `graphDraft`** from `mapNlDescribeTextToGraphDraft` (keyword → `a2` / `f1` hints); still `prefer_explicit_over_inferred: true`.
