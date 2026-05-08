# ADR: Client project context (rolling intake + audit picture)

**Status:** Accepted (model); persistence **v1 = composed in app** (no dedicated DB column yet)  
**Date:** 2026-04-24  
**Relates to:** [DATABASE.md — `intake_brief`](../DATABASE.md), [ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT](./ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT.md), [AGENTS.md — Intake context](../AGENTS.md)

**Implementation (read path):** `buildClientProjectContextV1FromBriefRow` / `loadClientProjectContextForAuditId` in [`client-project-context.service.ts`](../../server/src/services/client-project/client-project-context.service.ts); **HTTP** `GET /api/audits/:id/client-project-context` (same auth as `GET /api/audits/:id/brief`) — [`get-client-project-context.controller.ts`](../../server/src/routes/audits/controllers/get-client-project-context.controller.ts), helper [`apiAuditsClientProjectContext`](../../packages/glc-api-paths/src/index.ts).

## 1. Problem

We need a **single product concept** for “what the client’s project is” that **accumulates** structured answers, optional **narrative** (e.g. LLM/confirm snapshot), and **audit-time** findings — without duplicating the meaning of the question bank or the pipeline control object.

## 2. Concept: `ClientProjectContextV1`

A **versioned** object (`version: 1`) that represents the **client project context**:

| Part | Role |
| --- | --- |
| **`bankResponses`** | Question-bank answers in the same **cell shapes** as `intake_brief.responses` (`responses_format` = 2). This is the **structured** description of the project. |
| **`projectNarrative`** | Optional human-readable **synthesis** (“what we think this company/idea is”) with provenance (`source`, `updatedAt`). |
| **`auditEnrichment`** | **Append-friendly** bag for post-intake signal (Lighthouse summary, domain highlights, later — phase-scoped keys). Intentionally loose (`byKey`) until specific keys stabilize. |
| **`auditId` / `intakeVersionTuple`** | Linking and **resolver** parity with stored intake versions. |

**Normative — single source of truth (SSOT):**

- **Authoritative storage** for bank cells remains **`intake_brief` rows** (and, before link, the **intake token** / session payload). `ClientProjectContextV1` does **not** replace those tables; it is a **composed view** for APIs, agents, and UI that need one object.
- **Pipeline `ControlObjectV1`**, recon rows, and **domain results** stay where they are today; `auditEnrichment` may hold **references** or **denormalized snippets** for convenience, not a second orchestration contract.

**Evolution:** v1 is **type-only** in code ([`client-project-context.ts`](../../server/src/types/audit/client-project-context.ts)). A future migration may add e.g. `audits.client_project_context jsonb` or a small side table; until then, services **build** this object from existing tables + events.

## 3. Build order (suggested)

1. Load **`intake_brief`** (or token row) → `bankResponses` + `intakeVersionTuple`.  
2. Attach **`projectNarrative`** if produced by [intelligence snapshot](./ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT.md) or consultant tools.  
3. Merge **audit** outputs into `auditEnrichment.byKey` as phases complete. **Implemented (read path):** `loadClientProjectContextForAuditId` pulls a **public-safe** subset of **`collected_data`** — e.g. **`performance_lighthouse`** from the `performance` row when `lighthouse` is present — via [`client-project-collected-enrichment.ts`](../../server/src/services/client-project/client-project-collected-enrichment.ts) (`includeCollectedDataEnrichment` defaults to **true**; optional callers may set `false`).

**Deterministic follow-up bank ids (LLM F2 default):** use [`buildDeterministicIntakeFollowupBundle`](../../server/src/services/intake/intake-followup-candidates.service.ts) (alias of the tailored-questions builder) for the same `nextRecommended` tail as the public two-phase flow.

**Consultant `audit/new` (New Audit wizard):** the product path matches **bank + B1 (F2 / label paraphrase)**, not **B2** off-bank generative questions. The UI calls **`PUT /api/audits/:id/brief`** then **`POST /api/audits/:id/brief/intelligence-snapshot`**, reusing the same engine as public `POST /api/intake/:token/intelligence-snapshot` ([`post-brief-intelligence-snapshot.controller.ts`](../../server/src/routes/audits/controllers/brief/post-brief-intelligence-snapshot.controller.ts)). **Lighthouse** is folded into the LLM **only if** a trimmed summary already exists in `collected_data` (see [ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT](./ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT.md) §5.1) — the wizard does not block on a full synchronous run.

## 4. References

- Types: [`server/src/types/audit/client-project-context.ts`](../../server/src/types/audit/client-project-context.ts), [`client-project-context.types.ts`](../../src/app/data/audit/contracts/client-project-context.types.ts) (SPA)  
- [ADR-CONTROL-OBJECT-V1](./ADR-CONTROL-OBJECT-V1.md) — pipeline governance (distinct from this **client** context)
