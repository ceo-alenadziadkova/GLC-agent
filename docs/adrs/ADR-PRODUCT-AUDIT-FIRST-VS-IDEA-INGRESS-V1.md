# ADR: Product positioning — audit-first default vs free-form idea ingress

## Status

Accepted (product policy; not a code contract—implementation details live in linked ADRs and `docs/PRODUCT.md`).

## Context

The platform’s primary contract is a **consultant-led site audit** with structured intake, collector-backed domain phases, strategy synthesis, and a deterministic orchestration pack. Stakeholders also ask for a “pitch / idea in natural language” entry path and clarity on what the system can **not** guarantee (e.g. “viral growth plan” from text alone without evidence).

## Decision

1. **Default product contract (audit-first):** Value is delivered when there is a **URL + completed intake (as required)** and a full pipeline run. Roadmaps and execution packs are **downstream of that evidence chain**, not a replacement for it.
2. **Idea / narrative ingress (supplementary):** Optional NL describe (`POST /api/intake/:token/nl-describe`, feature-gated) assists the brief. Engine and API may return **`prefer_explicit_over_inferred: true`** and optional **`authoritative.merged_responses`** for client merge rules—**semantically** the same policy: **explicit user answers and question-bank ordering remain primary**; NL is an assist, not a second source of truth. See [ADR-NL-TO-GRAPH-INGRESS-V1](./ADR-NL-TO-GRAPH-INGRESS-V1.md) and server [`post-intake-nl-describe.controller.ts`](../../server/src/routes/intake/controllers/post-intake-nl-describe.controller.ts). SPA gate: `intakePublicNlDescribeEnabled` in [`app-feature-flags.ts`](../../src/app/config/app-feature-flags.ts) (redeploy to toggle).
3. **Non-goals (explicit):** The product does not promise “best in class viral scaling” for arbitrary pitches; it produces **stage-aware, evidence-linked** plans when the audit contract is met.
4. **Orchestration narrative synthesis:** LLM conflict rows may use `synthesis_pending` when evidence is insufficient. This is **hypothesis, not fact** — see [orchestration-pack-synthesis.md](../../server/prompts/orchestration-pack-synthesis.md) and in-app `ORCHESTRATION_UI_COPY.conflictSynthesisNote`.

## Consequences

- Marketing and in-product copy should default to **audit-first**; “idea mode” is described as an assist, not a parallel product.
- Future “idea-only” product lines require a new ADR and a dedicated validation path. See the **proposed** placeholder track: [ADR-IDEA-ONLY-PRODUCT-LINE-PROPOSED-V1](./ADR-IDEA-ONLY-PRODUCT-LINE-PROPOSED-V1.md) (not accepted product scope).

## References

- [docs/PRODUCT.md](../PRODUCT.md) — product proposition and orchestration vs MVP naming
- [ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md](./ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md) — v9 “full product” planning vs shipped tree (avoids double-scheduling positioning work)
- [docs/API.md](../API.md) — `POST /api/intake/:token/nl-describe` (public intake; diagnostic pilot gating)

## Changelog

- **2026-04-23:** Linked proposed idea-only line ADR (placeholders only; no product commitment).
- **2026-04-23:** Initial ADR (readiness / positioning audit follow-up).
- **2026-04-23:** Pointers to NL controller, `authoritative` semantics, and app flag; **References**; clarified status line.
