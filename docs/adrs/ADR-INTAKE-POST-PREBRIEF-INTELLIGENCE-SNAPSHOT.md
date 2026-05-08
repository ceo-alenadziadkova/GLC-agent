# ADR: Post–pre-brief intelligence snapshot (Lighthouse + LLM) and fork: bank vs “smart” questions

**Status:** Proposed (product + engineering)  
**Date:** 2026-04-24  
**Relates to:** [ADR-INTAKE-PERSONALIZATION-PRODUCT-SCOPE.md](./ADR-INTAKE-PERSONALIZATION-PRODUCT-SCOPE.md) (§3 baseline, §5.6 two-phase), [ADR-INTAKE-NEXT-QUESTION-V1](./ADR-INTAKE-NEXT-QUESTION-V1.md) (F2 bounds), [ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1](./ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1.md) (NL assist)

## 1. Problem

We want a **short starter** that still feels *smart*: after the **pre-brief / thin capture**, enrich context with **objective** signals (Lighthouse) and a **model pass** that infers *what kind of company or idea* this is, then let the user **confirm or fix** before the rest of intake.

We must also decide what happens **next**:

- **A — Deterministic follow-through:** keep showing **question-bank** items in planner order (`buildIntakePlan` / tailored tail) — the shipped two-phase path.  
- **B — “Specialized pleasant” wording:** the experience reads like bespoke dialogue while **ground truth** for the pipeline stays **known `questionId`s** and validated values.

A third option — **open-ended generated audit questions** not backed by the bank — is *not* equivalent to A/B without new product and engineering contracts (analytics, SLA, submit schema, eval).

## 2. Terminology (avoid “control object” confusion)

- **Plan / pipeline `ControlObjectV1`:** stage governance inside orchestration (see `FEATURE_PLAN_CONTROL_OBJECT`, pack schema). It is **not** the public intake’s editable response map.  
- **This ADR’s “mapping” target:** **authoritative brief responses** — `Record<questionId, BriefAnswerCell>` (same contract as `POST /api/intake/:token/respond` and [nl-describe merge](../../server/src/services/intake/intake-nl-authoritative.service.ts)). The composed **client project** view (bank cells + narrative + later audit enrichment) is [`ClientProjectContextV1`](./ADR-CLIENT-PROJECT-CONTEXT-V1.md). If the product later needs a *preview* of downstream plan control object fields, that is a **separate** projection from confirmed bank answers, not a substitute for them.

## 3. Proposed user journey (high level)

1. **Pre-brief / baseline** — user completes the **link-capture minimum** (see `INTAKE_MINIMUM_CONTEXT_BANK_IDS` / policy `pre_brief`).  
2. **Optional Lighthouse** — if a **valid public site URL** exists in responses (and policy allows), run **one** `runLighthouseAuditSummary` (see [`lighthouse-audit.ts`](../../server/src/lib/lighthouse-audit.ts); same family as the performance collector, but **gated** for intake: budget, feature flag, abuse limits). If **no URL** or URL invalid → **skip**; do not block the flow.  
3. **LLM snapshot (special prompt)** — input: **minimal** answered fields (PII-scrubbed as in NL ingress) + **Lighthouse summary** (if any) + optional case hints. Output split into:  
   - **Human card:** short “we understood you as …” (company / idea / stage) in **our voice** (copy system + review).  
   - **Machine hints:** `inferred[]` of `{ questionId, suggestedValue, confidence, rationale }` only for **known bank ids** — same pattern as [`nl-describe-llm-mapper.ts`](../../server/src/services/intake/nl-describe-llm-mapper.ts), merged with **explicit-over-inferred** rules ([`post-intake-nl-describe`](../../server/src/routes/intake/controllers/post-intake-nl-describe.controller.ts)).  
4. **Confirm / edit** — user accepts, edits free text where allowed, or overrides per-field. Persist like any draft merge, then **continue**.

### 3.1 Empty or duplicate-only mapping (expected case)

**Yes —** this can and will happen. If the client only completed **pre-brief** answers, the text may be too thin, already explicit, or PII-stripped, so the model’s **`inferred[]`** is **empty** or only repeats what is already in `responses`. The merge path must **not** treat “no new `questionId` cells” as a failure, and the UI must **not** present a fake “we filled this for you” when nothing new merged.

**Product behavior (normative):**

1. **Narrative card** may still be useful if the model can summarize **Lighthouse** + pre-brief into a *short* “we heard …” with **no** new bank cells, or the card is **omitted** / replaced by a one-line “continue” if there is no additive content (avoid an empty confirmation step).  
2. **No echo-as-mapping:** the API does not return the client’s raw answers *as if* they were model-inferred cells; an empty `inferred` list is a valid `200`.  
3. **Fallback when the client should still be “unlocked” in one step:** the model (or a separate tool call) returns a **suggested follow-up** that stays inside the **bank + eligibility** contract:  
   - **Ordered list of `questionId`s** — only from **`eligible` ∩ unanswered`** (e.g. head of `nextRecommended`, case overlays) — this is the **F2** shape bounded by [ADR-INTAKE-NEXT-QUESTION-V1](./ADR-INTAKE-NEXT-QUESTION-V1.md).  
   - Optional **per-`questionId` display string** (paraphrase / “specific” wording) for UI only — the persisted answer still uses the **canonical** bank id and cell schema.  
   So the client sees *specific, revealing* prompts, but the pipeline only records **known** questions.

**Out of scope for this fallback (still):** new question text **without** a backing bank id in `question-bank` (see B2 in §4).

**Implemented (2026-04-24):** `POST /api/intake/:token/intelligence-snapshot` — [`intake-intelligence-snapshot.service.ts`](../../server/src/services/intake/intake-intelligence-snapshot.service.ts), [`post-intake-intelligence-snapshot.controller.ts`](../../server/src/routes/intake/controllers/post-intake-intelligence-snapshot.controller.ts); client flag `intakeIntelligenceSnapshotEnabled` + server `FEATURE_INTAKE_INTELLIGENCE_SNAPSHOT_LLM` (off by default). KPI: `pipeline_events` `intake_intelligence_snapshot`.

**Authenticated audit (consultant / portal) mirror — two LLM rounds for New Audit:**  
1. **`POST /api/audits/:id/brief/intelligence-snapshot`** — [`post-brief-intelligence-snapshot.controller.ts`](../../server/src/routes/audits/controllers/brief/post-brief-intelligence-snapshot.controller.ts) uses **`intelligenceLlmMode: 'understanding'`** (LLM-1: narrative, `inferred` preview, F2; **no** B1 `label_overrides` from the model in this call).  
2. After the user **confirms** and the client has **`PUT /brief`**, **`POST /api/audits/:id/brief/intelligence-wording`** — [`post-brief-intelligence-wording.controller.ts`](../../server/src/routes/audits/controllers/brief/post-brief-intelligence-wording.controller.ts) runs LLM-2: **B1 only** (same `questionId` keys, same canonical **answer values** persisted) with client-facing:
   - `label_overrides` — one-line **question** text;
   - `hint_overrides` — short **nudge** under the title (where hints apply in the bank UI);
   - `option_display_overrides` — for `single_choice` / `multi_choice` only, an array **parallel to canonical `options`** (same order and length): **UI labels only**; stored answers remain the canonical option strings.  
   Unanswered follow-up bank ids (subset of the same tailored tail as F2; capped). Feature flag: **`FEATURE_INTAKE_INTELLIGENCE_WORDING_LLM`**. KPI: `pipeline_events` **`intake_intelligence_wording`**. The end user must not need to see internal bank ids in product UI; display copy is surface-only.

**Public token route** (unchanged default): `POST /api/intake/:token/intelligence-snapshot` remains a **single** `full` pass (narrative + F2 + optional `label_overrides` in one tool) unless product later adds an explicit `phase` — parity is optional.

Uses **saved** `intake_brief.responses` (with the same `recon_prefills` merge as `GET /brief`); call **`PUT /brief` first** when the client has unsaved wizard state. Optional **`lighthouseSummary`** (trimmed from `collected_data` via [`getLighthouseSummaryForIntelligenceSnapshot`](../../server/src/services/client-project/client-project-collected-enrichment.ts)) is passed to the LLM when enabled.

## 4. Decision: what happens after confirm?

| Option | Description | Pros | Cons / guardrails |
| --- | --- | --- | --- |
| **A (default)** | Continue **deterministic** intake: `nextRecommended` tail, overlays, F1 if pilot — [§5.6 personalization ADR](./ADR-INTAKE-PERSONALIZATION-PRODUCT-SCOPE.md#56-public-two-phase-flow-mvp-shipped) | Testable, one schema, no invented questions | “Template” *feel* mitigated by copy layer A (lead-ins) + confirmed snapshot card |
| **B1 — Constrained “smart”** | **Same bank ids**; only **order** (F2) or **label paraphrase** for display — still validated ⊆ eligible | Feels personal; pipeline unchanged | F2/paraphrase cost, QA, [ADR-INTAKE-PERSONALIZATION](./ADR-INTAKE-PERSONALIZATION-PRODUCT-SCOPE.md) §1.1 layer C |
| **B2 — Generative new questions** | Model writes **new** questions not in `question-bank` | Maximum “conversation” | Breaks single bank contract; needs new artifact type, eval, legal, merge into audit — **out of scope** for first slice unless product explicitly greenlights a **separate** “interview” track not mixed with `respond` without design review |

**Normative recommendation for v1 after this ADR:** ship **A + B1’s display polish** (lead-ins / optional paraphrase **after** user confirms the snapshot) before **B2**. Any move toward B2 requires a new ADR (schema, storage, analyst workflow).

## 5. Engineering notes (non-normative)

- **Lighthouse in intake** is **not** the same as deep-audit collection: cap runtime, use existing URL validation, consider async job + poll if needed so the client is not stuck on a 55s run.  
- Reuse **idempotency** and **PII** patterns from `nl-describe`.  
- **KPIs:** `snapshot_started`, `snapshot_confirmed`, `lighthouse_skipped_no_url`, `lighthouse_error`, `merge_applied_count`.

### 5.1 Lighthouse timing vs the LLM (product default, 2026-04-24)

- **Normative for v1:** the intelligence snapshot **does not** wait for a new blocking Lighthouse run. The model receives a **trimmed** `LIGHTHOUSE_SUMMARY` **only if** a performance/bootstrap row already exists in `collected_data` when the route runs.  
- **Asynchronous** site checks (e.g. new-audit site pre-check, bootstrap) may complete **after** the first snapshot; v1 does **not** require a second automatic snapshot pass. Later narrative refreshes (if any) are a separate product choice; **`GET /api/audits/:id/client-project-context`** remains the read model for “what we know now” as collectors finish.  
- **Rationale:** keep UX off long-running **55s-class** runs while still using objective signals when available (same family as the read-path enrichment in [ADR-CLIENT-PROJECT-CONTEXT-V1](./ADR-CLIENT-PROJECT-CONTEXT-V1.md)).

## 6. References

- [`runLighthouseAuditSummary`](../../server/src/lib/lighthouse-audit.ts)  
- [SETUP — Lighthouse / deep scan](../SETUP.md)  
- [API.md — intake routes](../API.md)  
- [QUESTION_BANK.md — diagnosis](../QUESTION_BANK.md)
