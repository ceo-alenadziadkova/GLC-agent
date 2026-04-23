# ADR: Rollout plan — Orchestrator, roadmap manifest, multi-lane timeline (phased, code-grounded)


| Field                      | Value                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                 | Accepted (living plan — update milestones in follow-up commits when scope completes)                                                                                                                     |
| **Date**                   | 2026-04-19                                                                                                                                                                                               |
| **Scope**                  | Phased delivery of orchestration + client roadmap UX aligned with `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`                                |
| **Engineering principles** | KISS, DRY, SOLID; policy/copy/thresholds in config modules and feature-flag facade — **no new inline business literals in services or UI** (see `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`) |


**No-hardcode (concrete):** extend `server/src/config/orchestration-*-policy.ts`, `director-orchestration-policy.ts`, `orchestration-telemetry-policy.ts`, `orchestration-roadmap-presets.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, `orchestration-graph-policy.ts`, `orchestration-client-contract.ts`; app copy and UI caps in `src/app/config/orchestration-*.ts` / `orchestration-roadmap-ui-copy.en.ts` / `portal-manifest-wizard-copy.en.ts` / `orchestration-ui-limits.ts` / `orchestration-pack-graph-flow.config.ts` / `strategy-execution-pack-api-error-codes.ts` (as applicable); server flags via `server/src/config/feature-flags.ts`, SPA via `src/app/config/app-feature-flags.ts` (parity tests where applicable). **KISS / DRY / SOLID:** one Zod SSOT per contract under `server/src/schemas/`; services orchestrate and compose; avoid duplicate DTOs or magic numbers in TSX/routes.

### Canonical product docs

- `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`
- `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`
- `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`
- `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`

### Product vs engineering naming (authoritative)

| Term | Meaning |
| --- | --- |
| **Orchestration foundation** | **Phases 0–7** in this ADR: manifest → pack → timeline, director merge, flags, tests. This stack is **~100% complete** in repo (see **Progress snapshot**). This ADR previously called this scope “MVP”; **product** now reserves **MVP** for the row below. |
| **Product MVP** | The **north-star** client experience: `ADR-CLIENT-UNIFIED-ROADMAP` (including *Current UX gaps*), plus prioritized **V1–V12** and meta-phases **P / Q / R** in this file. |

**Git / tickets:** history may still say “MVP” for Phases 0–7 — interpret as **Orchestration foundation** unless the issue explicitly targets **Product MVP**.

---

## Map — product/architecture themes → this plan

Use this table to connect **north-star discussions** (orchestrator, client timeline, quality gates, manifest-first UX) to **concrete work** already tracked below. It does not replace **Foundation** (Phase 0–7) or the **Product MVP** (V1–V12) backlog; it routes readers to the right row.


| Theme                                                                                                            | Product / architecture anchor                                                    | Where it lands here                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta-orchestrator: single plan, weighted graph, conflict matrix, critical path                                   | `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`                                     | **Foundation:** pack build + merge + graph (`server/src/services/orchestration/`*). **Product MVP depth:** backlog **V3** (full ADR field parity in persisted pack). |
| Orchestrator **complements** FactChecker + `CONTROL_OBJECT` + Decision Layer (per-domain), does not replace them | `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` (relationship section)              | No duplicate domain CO; optional future **plan-level** gate → backlog **V4** only after `ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md` Accepted.             |
| Client: seasons, multi-lane timeline, marketing ∥ delivery sync, lab vs timeline                                 | `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`                           | **Phases 2–4** (manifest flow, lane fidelity, Lab IA). **Product MVP track:** **V1** (calendar horizon), **V5–V8**, **V7** (cross-lane narrative).                  |
| User **commits manifest** (coverage + change scenario + horizon) **before** roadmap; versions vN / vN+1          | Same + `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`                            | **Phase 2** + backlog **V2** (wizard), **V11** (revision story).                                                                                           |
| Director two-stage + machine-readable slice merged into pack                                                     | `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`, `director-orchestration-policy.ts` | **Phase 5** + services `director-orchestration-persistence.service.ts`, `map-domain-director-bundle-to-action-nodes.ts`.                                   |
| Flags, caps, copy — **no** inline business literals in services/UI                                               | `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`                          | **Phase 0–1** + header **No-hardcode** list above; any new limit → config module.                                                                          |


**How to read the rest of this ADR:** execute **Phased rollout** Phase 0–7 in order to close **Orchestration foundation**; use meta-phases **P / Q / R** and rows **V1–V12** for **Product MVP** (north star). Implementation traceability: `server/src/services/orchestration/README.md` (DoD matrix, **no** duplicated % tables).

---

## Progress snapshot (evidence-based)

**Orchestration foundation (Phases 0–7 in this ADR): ~100% complete in repo** as of 2026-04-20 — phased checklists below are **closed**; evidence: `server/src/services/orchestration/README.md` (DoD matrix), migrations `069`–`071`, Vitest (see **Verification log** below), E2E `e2e/orchestration-*.spec.ts` when `E2E_ORCHESTRATION_`* is set.

**Product MVP (north star):** track via **V1–V12**, meta-phases **P / Q / R**, and *Current UX gaps* in `ADR-CLIENT-UNIFIED-ROADMAP` — **not** the Foundation % above; that percentage measures engineering delivery of Phases 0–7 only.

### Verification log (rolling)

Re-run and append a row when orchestration, timeline, manifest, graph, or governance behavior changes materially.


| Date       | Check                                                                                           | Result                                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-20 | `cd server && pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts` | **23** test files, **140** tests, all **passed**                                                                                                                                                                                                         |
| 2026-04-20 | SQL migrations in tree (orchestration pack + revision metadata)                                 | `069_glc_orchestration_pack.sql`, `070_glc_orchestration_last_revision_diff.sql`, `071_glc_orchestration_revision_history.sql`                                                                                                                           |
| 2026-04-20 | E2E specs present                                                                               | `e2e/orchestration-timeline-manifest.spec.ts`, `orchestration-snapshot-regenerate.spec.ts`, `orchestration-depth-lanes-sync.spec.ts`, `orchestration-governance-conflicts.spec.ts` — gated by documented `E2E_ORCHESTRATION_`* env (see `DEPLOYMENT.md`) |
| 2026-04-21 | `cd server && pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts` | **23** test files, **140** tests, all **passed**                                                                                                                                                                                                         |
| 2026-04-21 | App Vitest (pack graph + portal timeline + Strategy Lab orchestrator UI)                      | `build-orchestration-pack-flow-graph.test.ts`, `build-orchestration-pack-dot-export.test.ts`, `PortalTimelinePage.test.tsx`, `strategy-lab-orchestrator-ui.test.tsx` — **4** files, **21** tests, all **passed**                                         |
| 2026-04-22 | v2 implementation slice (Phase A/B/C scaffolding + flags + docs sync)                         | Added additive timeline DTO (`milestones`, `top_priorities`), deep-dive routes/services, CMO sub-agent scaffold, and rollout docs updates (`API` / `ARCHITECTURE` / `DEPLOYMENT`) under default-off flags.                                                |
| 2026-04-22 | Director deep-dive queue + CMO orchestrator deterministic dispatch smoke                        | `cd server && pnpm vitest run src/tests/director-deep-dive-jobs.test.ts src/tests/director-deep-dive-controllers.test.ts src/tests/director-cmo-orchestrator.test.ts` — **3** files, **4** tests, all **passed**                                            |
| 2026-04-22 | P0 deep-dive contract hardening + portal timeline regression smoke                              | Added dedicated deep-dive API error-code namespace, `job status` ownership scope (`audit_id + user_id + job_id`), dialog polling/error mapping, and roadmap copy centralization; smoke: `cd server && pnpm vitest run src/tests/director-deep-dive-controllers.test.ts src/tests/director-deep-dive-jobs.test.ts src/tests/director-cmo-orchestrator.test.ts` and `pnpm vitest run src/app/pages/__tests__/PortalTimelinePage.test.tsx` — all passed. |
| 2026-04-22 | CMO sub-agent consistency hardening (registry-typed request + deterministic prompt refs)        | Tightened deep-dive request validation so `sub_agent_ids` must match registry ids, switched orchestrator metadata `prompt_ref` to stable file paths, and expanded anti-drift tests (`director-sub-agents-consistency.test.ts`). Smoke: `cd server && pnpm vitest run src/tests/director-sub-agents-consistency.test.ts src/tests/director-deep-dive-jobs.test.ts src/tests/director-cmo-orchestrator.test.ts` and `pnpm vitest run src/app/pages/__tests__/PortalTimelinePage.test.tsx` — all passed. |
| 2026-04-22 | v2 gap-closing pass (A/B/C): mobile dependency cards, token-budget contract, CMO materialization | Added explicit mobile dependency card-mode on portal timeline; introduced `DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_EXCEEDED`; materialized CMO sub-agent outputs into persisted director deep slice with `source: sub_agent:*` propagation path; surfaced deep-dive `qa_block` in realtime dialog completion. Smoke: `cd server && pnpm vitest run src/tests/director-cmo-orchestrator.test.ts src/tests/director-deep-dive-jobs.test.ts src/tests/director-deep-dive-controllers.test.ts src/tests/orchestration-merge-director.test.ts src/tests/director-sub-agents-consistency.test.ts` and `pnpm vitest run src/app/pages/__tests__/PortalTimelinePage.test.tsx src/app/components/__tests__/DirectorDeepDiveDialog.test.tsx` — all passed. |
| 2026-04-22 | v2 hardening pass: idempotency mismatch contract + bounded status fallback polling               | Added `409 IDEMPOTENCY_PAYLOAD_MISMATCH` handling for deep-dive retries with changed payloads, centralized minute/status copy in UI, added bounded status polling fallback on top of realtime updates, and added parity tests for deep-dive error codes + sub-agent registry IDs. Smoke: `cd server && pnpm vitest run src/tests/director-deep-dive-controllers.test.ts src/tests/director-deep-dive-jobs.test.ts src/tests/director-cmo-orchestrator.test.ts src/tests/director-sub-agents-consistency.test.ts` and `pnpm vitest run src/app/components/__tests__/DirectorDeepDiveDialog.test.tsx src/app/config/orchestration-contract-parity.test.ts src/app/pages/__tests__/PortalTimelinePage.test.tsx` — all passed. |
| 2026-04-22 | v2 rollout gate hardening: staged flag modes + domain-scoped fallback + UI test gap closure     | Added staged rollout mode defaults/facades (`shadow/internal/pilot/ga`) for roadmap narrative/deep-dive/sub-agents on server+SPA, removed hardcoded sub-agent domain branch via `DIRECTOR_SUB_AGENTS_ENABLED_DOMAINS`, and expanded UI tests for `operating_mode` + `sub_agent_ids` + realtime completion transitions; added `StrategyRoadmap` outcome coverage. Smoke: `pnpm vitest run src/app/components/__tests__/DirectorDeepDiveDialog.test.tsx src/app/components/__tests__/StrategyRoadmap.test.tsx src/app/config/orchestration-contract-parity.test.ts` and `cd server && pnpm vitest run src/tests/director-deep-dive-jobs.test.ts src/tests/director-deep-dive-controllers.test.ts` — all passed. |
| 2026-04-22 | Internal rollout step + server/client parity for staged deep-dive                         | Default rollout modes set to `internal` (SPA + `SYSTEM_DEFAULTS`); added `server/src/config/orchestration-rollout-gates.ts` so POST/GET deep-dive and quota honor the same allowlist as `orchestration-client-feature-gates.ts`; jobs carry `subAgentsEntitled` for CMO multi-agent path when allowlisted. Base product flags remain `false` until GA. Smoke: `cd server && pnpm vitest run src/tests/director-deep-dive-controllers.test.ts src/tests/director-deep-dive-jobs.test.ts` and `pnpm vitest run src/app/config/orchestration-contract-parity.test.ts src/app/config/orchestration-client-feature-gates.test.ts`. |
| 2026-04-22 | v4 closure pass — doc parity, report cockpit gates, CDO/CAO/CSO orchestrator shells | `DEPLOYMENT.md` ADR matrix updated: rollout code defaults `internal` (not `shadow`) for deep-dive/sub-agents, added `FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ROLLOUT_MODE` + CDO/CAO/CSO env rows, documented allowlist SSOT. `ReportRoadmapCockpitSection` uses `getEffectiveDirectorDeepDiveOnDemandEnabled` + `useAuthEmail` (aligns with portal timeline). Non-CMO deep-dive paths delegate to `director-cdo/cao/cso-orchestrator.service` (router + stub bundle; replaces inline `buildDirectorDomainStubBundle` in worker). Re-run smokes: server director tests + `orchestration-client-feature-gates.test.ts` + `director-domain-deep-dive-dispatch.test.ts` after change. |
| 2026-04-22 | v4 implement pass — narrative server gate, materialized CDO/CAO/CSO waves, intake coverage+10, UX | Added `FEATURE_ORCHESTRATION_ROADMAP_NARRATIVE_ENABLED` + `redactOrchestratorTimelineNarrativeIfDisabled` on `GET /timeline` (staged allowlist vs SPA). CDO/CAO/CSO orchestrators emit deterministic multi-action `sub_agent:*` waves (`director-domain-materialized-bundles.service.ts`). Intake: +10 P0 `required_now` metadata rows (`b2`–`b4`, `c1`, `c3`–`c7`, `d1`); `fullyCoveredQuestions` 38/78. UI: deep-dive agent list scroll, report cockpit “Set next step” anchor, milestone card chrome. Smokes: `orchestrator-timeline-narrative-gate`, `director-domain-materialized-bundles`, `intake-intelligence-contract`, `orchestration-contract-parity`, portal/dialog tests. |
| 2026-04-22 | v4 verify pass — allowlist parity test, CMO fallback counts, UI dictation test harness, ADR non-CMO epics, intake +7 | `orchestration-contract-parity.test.ts` asserts client/server staged rollout allowlists match. `director-cmo-orchestrator.test.ts` covers deterministic fallback sizes (50 ideas / 20 hypotheses). `DirectorDeepDiveDialog` tests wrap `DictationProvider` (design-system `Textarea`). ADR: new **Non-CMO director epics** section. Intake: P0 metadata for `a10`–`a12`, `b7`, `b10`, `c8`, `c9` (`fullyCoveredQuestions` 45/78); `DEEP_DIVE_CONTEXT_BY_DOMAIN` for `automation_processes` + `security_compliance`. Smokes: `pnpm vitest run` for parity, portal/dialog, director batch, `packages/intake-core` intelligence + extract tests. |
| 2026-04-23 | v5 Phase 1 — GA rollout activation + initiative CTA endpoint | `orchestrationRoadmapNarrativeEnabled`, `directorDeepDiveOnDemandEnabled`, and `directorSubAgentsEnabled` set to **true** with rollout modes **ga** in `src/app/config/app-feature-flags.ts` and `server/src/config/system-defaults/feature-flags-defaults.ts` (server env overrides unchanged). Added dedicated CTA alias `POST /api/audits/:id/orchestration/selected-initiative` (internally forwards to pack persistence with `selected_action_ids`) and switched cockpit/timeline **Mark as my next step** to this route. `docs/API.md` updated with contract + error modes. Re-run: `pnpm vitest run src/app/config/orchestration-contract-parity.test.ts` and targeted server director/orchestration tests after merge. |
| 2026-04-23 | v5 reconcile — Non-CMO LLM deep-dive rollout order + docs | Documented staged activation for **`FEATURE_CDO_DEEP_DIVE_LLM` → `FEATURE_CAO_DEEP_DIVE_LLM` → `FEATURE_CSO_DEEP_DIVE_LLM`** (server-authoritative; SPA mirrors `cdoDeepDiveLlmEnabled` / `caoDeepDiveLlmEnabled` / `csoDeepDiveLlmEnabled` in `app-feature-flags.ts` must stay default-aligned with `SYSTEM_DEFAULTS` — CI: `orchestration-contract-parity.test.ts`). Rollback: set each env to `false` (or unset to inherit default **off**). Materialized stub domains remain on `FEATURE_DIRECTOR_CDO_SUB_AGENTS` / CAO / CSO when LLM is off. `docs/DEPLOYMENT.md` matrix extended with the three env keys. E2E: `e2e/orchestration-deep-dive.spec.ts` adds `ux_conversion` quota smoke under the same `E2E_ORCHESTRATION_DEEP_DIVE` gate. Initiative reorder remains **SSOT** on orchestration-pack persistence; dedicated alias `POST …/orchestration/selected-initiative` forwards to the same pack flow. Intake: +4 `required_now` rows (`d3`, `d4`, `e1`, `e2`) — `fullyCoveredQuestions` **58**/78. |
| 2026-04-23 | v6 execute — remaining-work closure pass (stability + consistency + intake metadata) | Revalidated staged/GA flag parity with `orchestration-contract-parity.test.ts` + `orchestration-client-feature-gates.test.ts`; re-ran server director dispatch/orchestrator consistency suite (`director-domain-deep-dive-dispatch`, `director-sub-agents-consistency`, `director-cdo/cao/cso-orchestrator`). Added stricter non-CMO orchestrator tests for dependency-preserving requested subsets and CDO `solution_options` presence. Intake intelligence metadata now covers remaining non-gated ids (`c_nosite_*`, `d*` tails, `e4`), raising deterministic baseline to **78/78** `fullyCoveredQuestions` in `intake-intelligence-contract.test.ts` and baseline report constants. |
| 2026-04-23 | v5.1 execute — rollout docs parity + regression hardening | Synced runtime defaults in docs with shipped code (`orchestrationRoadmapNarrativeEnabled`, `directorDeepDiveOnDemandEnabled`, `directorSubAgentsEnabled` now documented as default **true** with env override rollback), added explicit staged promotion checklist (`internal -> pilot -> ga`) in `DEPLOYMENT.md`, and aligned API contract notes for `sub_agent_ids` to include CDO/CAO/CSO MVP ids. Expanded test coverage for non-CMO dependency-order invariants and selected-initiative API smoke path in `e2e/orchestration-deep-dive.spec.ts`. |
| 2026-04-23 | v6.1 execute — non-CMO LLM GA defaults promoted | Promoted `cdoDeepDiveLlmEnabled`, `caoDeepDiveLlmEnabled`, `csoDeepDiveLlmEnabled` to **true** in both SPA static flags (`src/app/config/app-feature-flags.ts`) and server defaults (`server/src/config/system-defaults/feature-flags-defaults.ts`) while preserving Railway env override rollback path (`FEATURE_{CDO,CAO,CSO}_DEEP_DIVE_LLM=false`). Updated `docs/DEPLOYMENT.md` ADR matrix + runtime note to reflect GA defaults and operator rollback procedure. |
| 2026-04-23 | v7 execute — scope lock on remaining work | Confirmed `R1` activation state and synced docs for non-CMO LLM defaults; extended prompt content polish with additional CMO quality guidance (`agent-1-market`, `agent-4-voice`) while preserving anti-drift invariants. Explicitly locked `R3` as **DEFER** (post-GA + 1-week stability gate) and `R4` as **BLOCKED** until approved `CTO/SEO` source-of-truth instructions exist; no registry/runtime expansion started for these tracks. |
| 2026-04-23 | v7 execute — verification pass + R3/R4 governance freeze | Re-ran v7 verification suites for non-CMO deep-dive and intake intelligence contracts (`orchestration-contract-parity`, `director-domain-deep-dive-dispatch`, `director-cdo/cao/cso-orchestrator`, `director-sub-agents-consistency`, `intake-intelligence-contract`, `lint-intelligence-contract`) and kept non-CMO defaults aligned in SPA/server. Recorded governance stance: **R3 deferred** until first production stability window for non-CMO LLM directors, **R4 blocked** until `docs/instructions/CTO-INSTRUCTIONS.md` and `docs/instructions/SEO-INSTRUCTIONS.md` are maintained as SSOT before multi-agent implementation. |
| 2026-04-23 | v7.1 execute — CTO/SEO deterministic multi-agent runtime wiring | Refactored `director-cto-orchestrator.service.ts` and `director-seo-orchestrator.service.ts` to execute registered CTO/SEO sub-agents through wave/dependency order (`sub-agent-wave-executor`) with deterministic fallback per sub-agent; wired requested sub-agent filtering into deep-dive worker path and added token-budget guard branches for `tech_infrastructure` and `seo_digital` keyed to `FEATURE_CTO_DEEP_DIVE_LLM` / `FEATURE_SEO_DEEP_DIVE_LLM`. Validation: `pnpm --filter glc-audit-server test -- src/tests/director-sub-agents-consistency.test.ts src/tests/director-cto-seo-ssot-instructions.test.ts` and `pnpm --filter glc-audit-server typecheck` passed. |
| 2026-04-23 | v7.2 execute — regression alignment for CTO/SEO wave ids + deployment matrix sync | Updated `director-cto-seo-orchestrator.test.ts` to assert current wave ids (`cto.readiness_baseline`, `seo.visibility_baseline`) instead of legacy single-agent ids; re-ran server orchestration test matrix (`director-domain-deep-dive-dispatch`, `director-sub-agents-consistency`, `director-cdo/cao/cso/cto/seo-orchestrator`, `director-cto-seo-ssot-instructions`) and app parity test (`orchestration-contract-parity`) + intake contracts. Synced `DEPLOYMENT.md` ADR matrix and SPA mirror note to include `FEATURE_CTO_DEEP_DIVE_LLM` / `FEATURE_SEO_DEEP_DIVE_LLM` and `ctoDeepDiveLlmEnabled` / `seoDeepDiveLlmEnabled`. |
| 2026-04-23 | v7.3 execute — R3-only expansion for CDO/CAO/CSO registry and waves | Expanded non-CMO sub-agent coverage beyond MVP with new CDO/CAO/CSO registry entries, schemas, agent classes, prompt contracts, routing depth matrices, and orchestrator runtime maps (dependency-preserving run order + deterministic fallbacks). Synced SPA sub-agent options/UI copy and deep-dive prompt refs, refreshed per-director orchestrator regressions, and validated anti-drift consistency. Verification: `pnpm --filter glc-audit-server test -- src/tests/director-cdo-orchestrator.test.ts src/tests/director-cao-orchestrator.test.ts src/tests/director-cso-orchestrator.test.ts src/tests/director-sub-agents-consistency.test.ts` — **4** files, **19** tests, all **passed**. |
| 2026-04-23 | Product MVP roadmap sync (v8) — docs + V3 Zod/ADR test + read-model + cockpit rebuild | Added [`ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md`](./ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md) (code vs plan). Server: `glc-orchestration-pack-adr-v1-1-parity.test.ts` (ADR v1.1 top-level pack keys ⊆ Zod v2). SPA: `useOrchestrationReadModel` uses `glcKeys.orchestrationPack.detail` + `getOrchestrationPackConditional` (ETag); portal timeline uses shared hook with `includePack: false`. Consultant cockpit: rebuild via `POST /orchestration/pack` from latest manifest. `docs/DEPLOYMENT.md` Grafana row checklist for DoD-4. Re-run: `pnpm verify:orchestration-contract`, `pnpm vitest run src/app/pages/__tests__/PortalTimelinePage.test.tsx` (if touched). |
| 2026-04-23 | v8 critical review → doc + code alignment | Extended sync ADR (Φ1/V5.4/Φ6 reality check, V8 row, `useOrchestrationReadModel` rationale). `ADR-ORCHESTRATION-PLAN-GOVERNANCE-CANON.md` § Product MVP: no `govern_action` endpoint, link to DoD-6. `PRODUCT.md` pointer: §5 gap closers not blocking MVP. Strategy Lab: `StrategyLabOrchestratorListBody` uses `PackGraphConsultantCanvas` when `packGraphConsultantCanvasEnabled` (DRY; lazy xyflow unchanged). |


**Note:** Later migrations (e.g. `072_`*) may exist for unrelated product concerns; they do not replace the orchestration baseline above unless they alter pack/manifest schema — then update this ADR and `server/src/services/orchestration/README.md` in the same change.

### Non-CMO director LLM deep-dive — staged activation (v5 reconcile)

Orchestrators for CDO / CAO / CSO already ship in `server/src/services/orchestration/director-{cdo,cao,cso}-orchestrator.service.ts` and are selected by `resolveDirectorDeepDiveHandler` when the matching `*DeepDiveLlmEnabled` flag is **true** (`director-domain-deep-dive-dispatch.ts` + `run-director-deep-dive.service.ts`).

**Recommended promotion order (ops):**

1. **CDO** — set `FEATURE_CDO_DEEP_DIVE_LLM=true` on staging; redeploy SPA with `cdoDeepDiveLlmEnabled=true` in `app-feature-flags.ts` if UI gating should reflect it (dispatch remains server-authoritative). Soak token budget for `ux_conversion` + `pro`/`complete` packages.
2. **CAO** — `FEATURE_CAO_DEEP_DIVE_LLM=true` for `automation_processes` after CDO is stable.
3. **CSO** — `FEATURE_CSO_DEEP_DIVE_LLM=true` for `security_compliance` after CAO is stable.

**Rollback:** set the env var to `false` (or remove override); worker falls back to deterministic stub/materialized paths per domain.

### Continuous work (G4 / G6 / G7 — does not block LLM rollout)

- **G4:** Additional sub-agents beyond the per-director initial trio (registry baseline): follow the existing checklist (registry in `director-sub-agents.ts` → Zod schema → `DirectorSubAgentBase` class → `server/prompts/sub-agents/*` → Vitest + `director-sub-agents-consistency.test.ts`).
- **G6:** Intake P0 `whyAsked` / `semanticDomain` / `decisionImpact` coverage for remaining bank ids — extend `intake-intelligence-gate-metadata.ts` / `P0_METADATA_OUT_OF_GATE` in `intake-intelligence-contract.ts`; update `intake-intelligence-contract.test.ts` baseline counts when coverage changes.
- **G7:** Prompt files under `server/prompts/sub-agents/` — keep anti-drift headers aligned with `docs/instructions/*-INSTRUCTIONS.md` § references in the same PR as instruction edits.

### v7 execution policy status (2026-04-23)

- **R3 freeze policy:** keep beyond-Foundation (registry) expansion deferred until the first promoted non-CMO LLM director completes at least one production week without incidents; add new sub-agents only via per-agent PRs (no batch expansion).
- **R4 blocked policy:** keep CTO/SEO orchestrators on current single-agent fallback until full source-of-truth instruction docs are approved; do not ship speculative multi-agent orchestration logic before SSOT sign-off.

### Already implemented (non-exhaustive, verify in tree)


| Area                           | Fact in repo                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persistence**                | `audit_strategy.glc_orchestration_pack`, `orchestration_pack_version`, `glc_orchestration_last_revision_diff`, `glc_orchestration_revision_history` (migrations `069`–`071`); `audit_roadmap_manifest_snapshots` table                                                                                                                                                                                                                                                                  |
| **Manifest**                   | POST preview, POST/GET snapshots, GET latest (`server/src/routes/audits/index.ts`)                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Pack build & merge**         | Services under `server/src/services/orchestration/` (e.g. `build-glc-orchestration-pack`, `merge-orchestration-action-inputs`, `map-strategy-initiative-to-action-node`, `map-domain-director-bundle-to-action-nodes`, graph builder, dedupe)                                                                                                                                                                                                                                           |
| **Director slice persistence** | `director-orchestration-persistence.service.ts`, `GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY`, Zod slices                                                                                                                                                                                                                                                                                                                                                                                      |
| **HTTP API**                   | POST/GET orchestration pack, regenerate, pack-diff, pack-diff-history; commercial-offer path; `GET /api/audits/:id/timeline` → `buildClientTimelineReadModel`                                                                                                                                                                                                                                                                                                                           |
| **Consultant + client UI**     | `PortalTimelinePage.tsx`; **portal manifest wizard** `PortalRoadmapManifestWizardPage.tsx` (route `portal/audit/:id/roadmap-manifest`, flags `clientRoadmapManifestWizardEnabled` ∧ `orchestrationRoadmapUiEnabled`); Strategy Lab `StrategyLabOrchestrationPanel.tsx` / `StrategyLabOrchestratorListBody.tsx`; client nav timeline ordering via `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled`; `ClientPostAuditCockpitSection.tsx`, `NavigationLinksSection.tsx` (flagged) |
| **Config SSOT**                | `orchestration-*-policy.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, `orchestration-ui-limits.ts`, copy modules — aligns with no-hardcode rule                                                                                                                                                                                                                                                                                                                    |
| **Tests / E2E**                | `server/src/tests/orchestration/*.test.ts` (**22** files) + `glc-orchestration-pack.test.ts`; recommended gate: `pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts` — see **Verification log**; `e2e/orchestration-*.spec.ts` (**4** files)                                                                                                                                                                                                              |


### Gaps vs Product MVP (north star)

Remaining **Product MVP** work — preset polish, *ADR-CLIENT* *Current UX gaps*, and rows **V1–V12** not yet **Done** — is tracked here and in the backlog table below, not in the **Foundation** phase %.

- **Seasonal UX**: preset-driven partitions and optional `plan_horizon` are in policy + read model; **quarter-only anchors** or **explicit TZ display rules** for client copy remain optional follow-ups.
- **Manifest-first wizard**: **standalone portal route ships** (`PortalRoadmapManifestWizardPage.tsx`, cockpit + timeline CTAs); optional polish (stepper UX, richer empty states) remains product-dependent.
- **Lab vs timeline**: Foundation ship uses flag-driven IA; **incremental copy polish** in Lab sections may continue toward **Product MVP**.
- **Director coverage**: persistence exists; **uniform deep bundles** across all domains and pipeline hooks are product-dependent.
- **Optional LLM conflict synthesis**: gated by flags/policies — completeness depends on product activation.
- **Plan-level CONTROL_OBJECT** (separate from domain CO): **not** required to close **Foundation**; future ADR if introduced for **Product MVP**-level governance.

---

## Phased rollout (execution order)

Each phase ends with a **cumulative % toward Product MVP (final client vision)** — **Foundation** (Phases 0–7) is the engineering staircase; 100% here means the shipped stack, not the full *ADR-CLIENT* north star.

### Phase 0 — Baseline & flags (complete when safe defaults documented)

**Goal:** Operators know which flags turn on timeline-primary UX and pack API for each environment.

- Confirm `isOrchestrationPackApiEnabled`, `isOrchestrationTimelinePrimaryUxEnabled`, `APP_FEATURE_FLAGS.clientTimelineEnabled` (and related) are documented in `DEPLOYMENT.md` / env matrix — **no new hardcoded toggles in components**.
- **Done (2026-04-20):** `DEPLOYMENT.md` matrix includes `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` and `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT`; SPA `APP_FEATURE_FLAGS` documented in `DEPLOYMENT.md` + `FRONTEND.md` (no `VITE`_*).

**Cumulative ~63%**

### Phase 1 — Harden read paths & DRY (server)

**Goal:** Single read path for pack + manifest + execution plan (avoid duplicate loaders).

- Audit `orchestration-read.service.ts`, `orchestrator-timeline-read.service.ts`, report routes for **one abstraction** for “authenticated audit strategy row + plan” where duplication hurts (extract only if measured duplication).
- Ensure all limits (graph nodes, history length) remain in **policy modules** (already pattern: `ORCHESTRATION_GRAPH_MAX_NODES`, etc.).

**Cumulative ~68%**

### Phase 2 — Client manifest → pack flow (product closure)

**Goal:** User never hits an empty timeline without understanding **why** (`missing_pack`, `stale_manifest`, `draft`).

- **Reuse** existing preview + snapshot APIs; **client** copy and CTA routing from `PortalTimelinePage` and `ClientPostAuditCockpitSection` (copy in config only).
- **Done (2026-04-20):** dedicated **manifest wizard** route under portal — `PortalRoadmapManifestWizardPage.tsx` composes POST preview, POST snapshot, POST orchestrator run; **no** duplicate manifest schema.

**Cumulative ~74%**

### Phase 3 — Timeline fidelity (seasons & lanes)

**Goal:** Align `ADR-CLIENT-UNIFIED-ROADMAP` seasonal language with data: manifest presets drive **labels** and bucket boundaries via **config** (`orchestration-roadmap-presets` / timeline policy), not inline TSX.

- Replace or augment heuristic partitioning when manifest provides explicit horizon.
- Cross-lane dependency emphasis already partially in DTO — extend **tests** for regression.

**Cumulative ~80%**

### Phase 4 — Strategy Lab repositioning (IA)

**Goal:** Lab is **detail**; timeline is **primary** when flag on.

- Navigation labels and tab order: config/copy + `buildClientNav` / `buildConsultantNav` already pattern — extend consistently.
- Deprecate “only quick/medium/strategic” as **primary** mental model in user-facing copy (keep data for backward compatibility).

**Cumulative ~86%**

### Phase 5 — Director bundle coverage

**Goal:** Each domain that ships Director deep **persists** a valid slice for merge; integration tests per domain.

- Follow `director-orchestration-policy.ts`; no ad-hoc keys in agents.
- **Does not** replace domain `CONTROL_OBJECT` / Decision Layer.

**Cumulative ~92%**

### Phase 6 — Optional synthesis & governance polish

**Goal:** If product enables LLM conflict synthesis, ensure token phase, telemetry (`ORCHESTRATION_TELEMETRY_POLICY`), and failure fallback **deterministic pack** remain KISS.

- Governance reasons stay in `orchestration-plan-governance-policy` / messages modules.

**Cumulative ~96%**

### Phase 7 — “Final” product definition gate

**Goal:** Sign-off checklist: client + consultant happy path E2E, diff/history UX, consultant commercial-offer flow if in scope, accessibility spot-check on timeline.

- Any **new** plan-level quality gate → **new ADR**, not scope creep here.
- **Automation (partial):** `e2e/orchestration-timeline-manifest.spec.ts` covers manifest preview + `GET /api/audits/:id/timeline` when `E2E_ORCHESTRATION`_* env is set; Vitest covers timeline season partition, director phase contract, timeline controller.
- **Manual:** keyboard tab order through timeline CTAs; screen reader spot-check on `near` / `mid` / `later` bucket headings (`PortalTimelinePage`).

**Cumulative ~100%**

---

## Product MVP backlog (north star) (V1–V12) and meta-phases P / Q / R

Previously titled *Post-MVP ideal backlog*. **Product** now calls this scope **MVP** (north star). Track it here; do **not** merge into **Foundation** (Phase 0–7) % above. Full row definitions stay concise; expand in product planning when needed.


| #   | Theme                                                                                           | Status (rolling)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Calendar-native `plan_horizon` on manifest + timeline partition                                 | **Done (Foundation — calendar horizon on manifest + timeline partition)**                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V2  | Manifest-first wizard (portal): coverage → scenario → horizon → preview → snapshot → build pack | **Done (Foundation — portal manifest wizard)** — `PortalRoadmapManifestWizardPage.tsx`, `portal-manifest-wizard-copy.en.ts`                                                                                                                                                                                                                                                                                                                                                                               |
| V3  | Full orchestrator ADR v1.1 formula parity in pack fields                                        | Partial                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V4  | Plan-level governance / `CONTROL_OBJECT`                                                        | Backlog — gate: [ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md](./ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md)                                                                                                                                                                                                                                                                                                                                                                       |
| V5  | Client-grade dependency graph UX                                                                | Partial — portal timeline **Plan dependency map** (`PortalTimelinePackGraphPanel`: critical path + dependency list **sync with map** — node or **edge** focus, **fitView** on edge endpoint pair, canvas **edge click**; `PortalPackGraphFlowCanvas.tsx` + `ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT` min/max zoom + fit padding; **expanded map** budgets, **fit-to-view** control, `@xyflow/react` + Dagre, DOT export; `build-orchestration-pack-flow-graph.ts`; caps in `orchestration-ui-limits.ts` / `orchestration-pack-graph-flow.config.ts`); deeper canvas polish / consultant parity / full-graph modes still backlog |
| V6  | Evidence taxonomy UX (`Observed` / `Derived` / `Assumed` / `Missing`)                           | Partial — counts on pack graph nodes from director actions (`evidence_taxonomy`); badges on portal timeline, pack graph panel, Strategy Lab orchestrator lists (`OrchestrationEvidenceTaxonomyBadges`*); full initiative-level drill-down / report surfacing still incremental                                                                                                                                                                                                   |
| V7  | Cross-lane narratives (marketing × delivery)                                                    | Partial — portal timeline **Sync markers** intro copy when blocking cross-lane deps exist (`ORCHESTRATION_UI_COPY.timelineCrossLaneNarrative`*); richer lane stories / consultant cockpit parity still backlog                                                                                                                                                                                                                                                                   |
| V8  | Execution packs in journey                                                                      | Partial — client **Detail pack** CTA on timeline top 7d/30d → `POST .../strategy/execution-pack`, invalidate pack list, **mapped API error toasts** (`format-execution-pack-timeline-request-error.ts`), **busy state** on active row (`PortalTimelinePage.tsx`); Lab remains multi-select / path options                                                                                                                                                                        |
| V9  | Expansion directors / lanes                                                                     | Backlog                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V10 | Consultant parity cockpit                                                                       | Backlog                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V11 | Human-readable vN→vN+1 revision story                                                           | Partial — `ClientPostAuditCockpitSection`, `PortalTimelinePage` (same copy + `buildOrchestrationRevisionStorySummary`); Strategy Lab history remains detailed view                                                                                                                                                                                                                                                                                                               |
| V12 | Prompt / synthesis quality loop                                                                 | Ongoing                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |



| Meta-phase                               | Rows                                                   | Intent                                                                                   |
| ---------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **P** — Client & consultant experience   | V2, V5, V6, V7, V8, V11 (+ optional V1 display policy) | Wizard shipped; graph, evidence, lanes narrative, execution packs, revision story remain |
| **Q** — Orchestration depth & governance | V3, V4                                                 | ADR field parity; plan-level quality only after V4 ADR Accepted                          |
| **R** — Ecosystem & quality loop         | V9, V10, V12                                           | New lanes/directors, cockpit parity, telemetry iteration                                 |


### Recommended next engineering slice (sprint anchor)

**Selected meta-phase:** **P** — **V2** **Done**; **V11** on timeline; **V5** **partial** (panel + DOT); **V6** **partial** (evidence taxonomy); **V7** **partial** (sync-marker narrative); **V8** **partial** (one-click pack + error mapping + row busy UI).

**Current engineering default (until product says otherwise):** continue **V5** — consultant **parity** for the dependency map / full-graph modes, and any remaining canvas polish (panel already supports node+edge selection sync, viewport policy in `ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT`). **Alternates:** richer **V7** (lane-by-lane cross-lane stories; copy/policy only in config modules) or **V8** (execution-pack lists, repeat flows, shared error formatters / API error codes). Reprioritize by editing this paragraph in the **same commit** as the code.

**Product MVP PR ritual:** (1) ship code + Vitest (`pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts`; app `orchestration-contract-parity.test.ts` when the contract moves; optional `e2e/orchestration-*.spec.ts` with `E2E_ORCHESTRATION`_* when warranted); (2) update the **Status** cell for the touched **V1–V12** row in the table above; (3) if sprint focus changes, update this **Recommended next engineering slice** section; (4) if orchestration/timeline/manifest/graph/evidence behavior changed, update the DoD matrix in `server/src/services/orchestration/README.md` and append **Verification log**; (5) do **not** add a parallel rollout doc — progress stays here and in that README only. **Foundation** phase % and history stay only in this ADR; the README does not duplicate phase percentages ([see “How to update”](#how-to-update-this-adr)).

---

## Risk register (short)


| Risk                      | Mitigation                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Timeline feels empty      | Strong empty states + link to manifest (already partially in DTO `waiting_list_domains`) |
| Flag matrix confusion     | Single env table in `DEPLOYMENT.md`                                                      |
| Over-engineering graph UI | Textual critical path first (already); fancy viz only after API stable                   |


---

## Non-CMO director epics (CDO / CAO / CSO) — after deterministic bundles

The repo already ships **deterministic** deep-dive waves for `ux_conversion` (CDO), `automation_processes` (CAO), and `security_compliance` (CSO) via `director-cdo/cao/cso-orchestrator.service.ts`, `director-domain-materialized-bundles.service.ts`, and `FEATURE_DIRECTOR_CDO/CAO/CSO_SUB_AGENTS` (see `server/src/config/feature-flags.ts`). The following are **separate product/engineering epics** — not a single “Phase 4” PR — to reach full instruction parity:

| Epic | Intent | Primary modules / contracts |
| ---- | ------ | ----------------------------- |
| **CDO-LLM** | LLM sub-agents for funnel / friction / experimentation per `CDO-INSTRUCTIONS.md`; access-aware depth matrix. | `director-cdo-router.service`, new sub-agent classes + Zod, prompts under `server/prompts/sub-agents/cdo/` |
| **CDO-DTO** | Optional **three solution options (A/B/C)** on action nodes where ADR requires it; keep backward-compatible graph merge. | `glc-director-orchestration-slice` / `map-domain-director-bundle-to-action-nodes` |
| **CAO-ZONES** | Map CAO “zones” and two-stage (discovery → deep-audit) to registry + orchestrator (single `director-sub-agents` discriminator pattern). | `director-cao-orchestrator.service`, `director-sub-agents.ts` metadata |
| **CSO-CASES** | Case classification (A/B/C/D) before depth; threat model + compliance map as lead zones. | `director-cso-orchestrator.service`, `director-cso-router` (or dedicated classifier) |
| **Rollout** | Per-domain flags already exist; promote **shadow → internal → pilot → ga** independently per `DEPLOYMENT.md` matrix. | Same allowlist + staged mode pattern as CMO deep-dive |

**Explicit non-scope (YAGNI):** cross-director LLM conflict synthesis, parallel sub-agent fan-out inside one domain, CTO/SEO deep-dive lanes (separate epics once CDO/CAO/CSO are stable).

---

## How to update this ADR

When a phase completes, adjust **Progress snapshot** percentages and tick milestones in git with a short commit message. After meaningful merges to `main` (or before a release), append a row to **Verification log** with the exact Vitest command and pass counts. Do not rewrite historical decisions in other ADRs; supersede only when contracts change.

**Meta Q (V3 / V4):** **V3** (full orchestrator ADR v1.1 field parity) ships only through `**server/src/schemas/`** as the single Zod SSOT, version/migration discipline, and regression tests (`orchestration-*.test.ts`, `glc-orchestration-pack.test.ts` as applicable) — no shadow DTOs in services. **V4** (plan-level quality / plan-level `CONTROL_OBJECT`) is **blocked** until `ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md` is **Accepted**; do not expand domain `CONTROL_OBJECT` or domain agents to compensate.

### Documentation split (single source of truth)

- **Rollout progress** — **Foundation** phase %, cumulative table, **Product MVP** (V1–V12) status: **this ADR only**.
- **Implementation map / DoD traceability** — module pointers, flags, telemetry: `server/src/services/orchestration/README.md` (update when shipped behavior changes; **do not** paste rollout % tables there).