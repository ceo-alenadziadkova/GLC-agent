# ADR: Rollout — Collaborative Director Protocol (phased delivery, code-grounded)

| Field | Value |
|---|---|
| **Status** | Proposed (living plan — update milestones in follow-up commits when scope completes) |
| **Date** | 2026-05-08 |
| **Scope** | Phased delivery of the Collaborative Director Protocol defined in `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md` |
| **Engineering principles** | KISS, DRY, SOLID; policy / copy / thresholds in config modules and feature-flag facade — **no new inline business literals in services or UI** (see `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`) |
| **Decision owners** | Product + Consulting + AI Platform |
| **Responsible approver** | AI Platform Lead |
| **Consulted** | Security/Compliance |

**No-hardcode (concrete):** new policy module `server/src/config/coalition-protocol-policy.ts` (constraint→domain_weights, mode→agent priorities, hypothesis caps, reaction caps, token caps, degrade thresholds, GA gate thresholds); SPA copy `src/app/config/coalition-protocol-copy.en.ts`; SPA mirror flags `src/app/config/app-feature-flags.ts` (parity tested via `orchestration-contract-parity.test.ts`); server flags via `server/src/config/feature-flags.ts`. **KISS / DRY / SOLID:** one Zod SSOT per artifact under `server/src/schemas/director-collaboration/`; services orchestrate and compose; avoid duplicate DTOs or magic numbers in TSX/routes.

### Canonical product docs

- `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md` (concept, immutable contract)
- `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` (Layer 3 contract)
- `docs/instructions/CONTEXT-DIRECTOR-INSTRUCTIONS.md` (NEW)
- `docs/instructions/CONFLICT-RESOLVER-INSTRUCTIONS.md` (NEW)

### Product vs engineering naming (authoritative)

| Term | Meaning |
|---|---|
| **Coalition foundation** | Phases 0–2 in this rollout: schemas, migrations, flags, Context Director shadow run. Closes when Snapshot is read-only-visible to consultants on internal-flagged audits. |
| **Coalition v1** | Phases 3–6 in this rollout: hypothesis + alignment + resolver + finalize integration + UI. Closes when KPI gates are green for two consecutive 7-day windows. |
| **Coalition GA** | Phase 7 in this rollout: rollout mode `ga` flipped after KPI gates pass. |

---

## Map — themes → this plan

| Theme | Anchor | Where it lands here |
|---|---|---|
| Single client situation snapshot anchor for all directors | `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md` §`ClientSituationSnapshot` | **Rollout Phase 1** (Context Director alone, shadow). |
| Hypothesis-first directors with explicit cross-domain reactions | Same ADR §`DomainHypothesisDraft`, §`DomainAlignmentResponse` | **Rollout Phase 2 + 3**. |
| Conflict resolver as policy artifact, not free-text | Same ADR §`CrossDomainConflictResolution` + Approve-Coalition gate | **Rollout Phase 4 + 6**. |
| Strategy initiatives reference resolved conflicts | Same ADR §extensions | **Rollout Phase 5**. |
| Token budget reuse, no new mechanism | Same ADR Pre-Acceptance §5 | **Rollout Phase 0**. |
| Auto-loop on Context Director only (V1) | Same ADR Pre-Acceptance §6 | **Rollout Phase 7 (post-internal-bake)**. |

---

## Progress snapshot (evidence-based)

This is a **living** ADR. Update the verification log below when each rollout phase closes; do **not** rewrite milestones once accepted — append.

Initial state (2026-05-08): no phases completed. Concept ADR `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md` is **Proposed**, not yet Accepted.

### Verification log (rolling)

| Date | Check | Result |
|---|---|---|
| 2026-05-08 | Concept ADR `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md` published (Proposed) | published; awaiting AI Platform Lead sign-off |
| 2026-05-08 | Rollout Phase 0 close — schemas + migrations + flags merged default-off | complete in code: schemas, policy, tool constants, prompt-loader scaffolding, feature flags, SPA mirrors, migrations `088..091`; targeted Vitest `48/48` passed on prompt/context/schema rigor |
| 2026-05-08 | Rollout Phase 1–4 backend shadow runtime implementation | implemented behind `FEATURE_COALITION_PROTOCOL_ENABLED=false` default: Context Director persistence, hypothesis/alignment wings, bounded peer hypothesis formatting, `collaboration_degraded` alignment fallback, resolver persistence, unresolved-conflict escalation event, anti-drift tests |
| 2026-05-08 | Rollout Phase 5+ follow-up boundary | kept as post-shadow release block: finalize prompt alias flip, UI matrix/snapshot editing, staged activation, and post-GA hardening remain guarded by KPI evidence from shadow audits |
| YYYY-MM-DD | Rollout Phase 1 close — Context Director shadow on staging | TBD |
| ... | ... | ... |

---

## Phased rollout

### Rollout Phase 0 — Foundation (no behavior change)

| # | Item | Files / Path |
|---|---|---|
| 0.1 | New Zod schemas per coalition artifact | `server/src/schemas/director-collaboration/{client-situation,hypothesis,alignment,conflict-resolution}.ts` |
| 0.2 | Schema-rigor tests (one per artifact) | `server/src/tests/coalition-{client-situation,hypothesis,alignment,conflict-resolution}-schema-rigor.test.ts` |
| 0.3 | Policy module: constraint→weights, mode→priorities, caps, GA-gate thresholds, degrade path constants | `server/src/config/coalition-protocol-policy.ts` |
| 0.4 | Tool-name constants | `server/src/config/agent-claude-contract.ts` (extend) |
| 0.5 | Server feature flag facade additions | `server/src/config/feature-flags.ts` (`isCoalitionProtocolEnabled`, `getCoalitionProtocolRolloutMode`, `isCoalitionPhase3IterativeEnabled` — V2 only) |
| 0.6 | SPA mirror flags (parity-tested) | `src/app/config/app-feature-flags.ts`; `orchestration-contract-parity.test.ts` extended |
| 0.7 | Migrations | `server/migrations/0NN_audit_client_situation.sql`, `0NN_audit_domain_hypotheses.sql`, `0NN_audit_domain_alignments.sql`, `0NN_audit_conflict_resolutions.sql` (sequential numbers from current head) |
| 0.8 | Prompt-loader scaffolding (no new prompts wired yet) | extend `COALITION_PROMPT_SET`, `PIPELINE_TRUST_BOUNDARY_PROMPT_SET`, `PROMPT_TOOL_NAME_MAP` in `server/src/agents/base/prompt-loader.ts` |
| 0.9 | Token-budget knob hookup | extend existing token budget service per concept ADR §Pre-Acceptance #5 |

**DoD (Phase 0):**

- All Vitest suites green (schema rigor, parity, baseline pipeline tests).
- Migrations apply and roll back cleanly on a clean DB.
- `FEATURE_COALITION_PROTOCOL_ENABLED` and `_ROLLOUT_MODE` default off; pipeline behavior is byte-equivalent to today.
- `coalition-protocol-policy.ts` exposes every threshold from concept ADR §Governance gates as a named export — services do not duplicate them.

### Rollout Phase 1 — Context Director (shadow)

| # | Item | Files / Path |
|---|---|---|
| 1.1 | Prompt | `server/prompts/context-director.md` (PoC draft attached to this ADR; see appendix in concept ADR companion artifacts) |
| 1.2 | Instructions canon (source of truth) | `docs/instructions/CONTEXT-DIRECTOR-INSTRUCTIONS.md` |
| 1.3 | Agent class | `server/src/agents/context-director.ts` (extends `BaseAgent`) — tool: `submit_client_situation` |
| 1.4 | Persistence | `audit_client_situation` row written via existing `audit_domain_persistence.ts`-style helper |
| 1.5 | Pipeline insertion (shadow only) | extend `server/src/services/pipeline/orchestrator/PipelineOrchestrator.ts` — when rollout mode ∈ {shadow, internal, pilot, ga}, run Context Director after Phase 0 recon and before Gate 1 |
| 1.6 | Frontend read-only display (under flag) | `src/app/components/ClientSituationCard.tsx` rendered in `AuditWorkspace.tsx` and `PipelineMonitor.tsx` |
| 1.7 | Anti-drift test | `server/src/tests/coalition-context-director-anti-drift.test.ts` — verifies prompt loads required appends, tool name matches, schema-rigor edge cases |

**DoD (Phase 1):**

- Shadow runs on ≥ 10 staging audits succeed and produce a schema-valid Snapshot.
- Snapshot is human-readable in the consultant UI when the flag is on for staff orgs.
- No regression on legacy pipeline KPIs (token spend, p95 latency on phases 0–7).
- KPI baseline collected: median `data_quality_score`, distribution of `dominant_constraint`, distribution of `strategic_mode`, share of audits with `confidence='low'` on snapshot.

### Rollout Phase 2 — Hypothesis Round (shadow)

| # | Item | Files / Path |
|---|---|---|
| 2.1 | Six prompts | `server/prompts/{tech_infrastructure,security_compliance,seo_digital,ux_conversion,marketing_utp,automation_processes}-hypothesis.md` |
| 2.2 | Six agent classes | `server/src/agents/<domain>-hypothesis.ts` |
| 2.3 | Pipeline wiring | run six in parallel after Context Director (shadow only); use existing `parallel-block.ts` pattern |
| 2.4 | Context-builder section: `## Client Situation` (always when snapshot exists) | `server/src/services/context-builder/format-agent-prompt.ts` |
| 2.5 | Persistence | `audit_domain_hypotheses` row per (audit, domain) |
| 2.6 | Anti-drift tests | one per domain — `coalition-<domain>-hypothesis-anti-drift.test.ts` |

**DoD (Phase 2):**

- ≥ 80% of shadow runs produce ≥ 3 hypotheses per domain with at least one `confidence='high'` and one `data_source='auto_detected'`.
- Latency p95 for the parallel hypothesis wing ≤ 1.5× the legacy domain wing on the same crawl.
- Token spend p95 within budget defined in `coalition-protocol-policy.ts`.

### Rollout Phase 3 — Alignment Round (shadow)

| # | Item | Files / Path |
|---|---|---|
| 3.1 | Six prompts | `server/prompts/<domain>-alignment.md` |
| 3.2 | Peer-hypotheses formatting helper | new `server/src/services/context-builder/format-peer-hypotheses.ts` (called from `format-agent-prompt.ts` only when phase = alignment) |
| 3.3 | Six agent classes | `server/src/agents/<domain>-alignment.ts` |
| 3.4 | Cap enforcement | reactions per peer / total reactions / total self-corrections — read from `coalition-protocol-policy.ts` |
| 3.5 | Per-domain fallback | when LLM call fails, write `analysis_mode='collaboration_degraded'` and synthesize a minimal alignment from drafts only |
| 3.6 | Persistence | `audit_domain_alignments` |
| 3.7 | Anti-drift tests | one per domain |

**DoD (Phase 3):**

- ≥ 80% of shadow runs produce ≥ 3 cross-domain reactions per domain with a balanced distribution across `relation` types (no single relation > 70% of all reactions).
- ≤ 5% of audits hit the `collaboration_degraded` fallback.
- Token spend p95 within phase cap.

### Rollout Phase 4 — Conflict Resolver (shadow)

| # | Item | Files / Path |
|---|---|---|
| 4.1 | Prompt | `server/prompts/cross-domain-conflict-resolver.md` (PoC draft attached) |
| 4.2 | Instructions canon | `docs/instructions/CONFLICT-RESOLVER-INSTRUCTIONS.md` |
| 4.3 | Agent class | `server/src/agents/cross-domain-conflict-resolver.ts` |
| 4.4 | Pipeline wiring | single sequential call after the alignment wing |
| 4.5 | Persistence | `audit_conflict_resolutions` |
| 4.6 | Escalation event | when `unresolved.length > 0` with `recommended_action='escalate'`, emit pipeline event `coalition_unresolved_escalation` (taxonomy mirrors existing `refine_recommended`) |
| 4.7 | Anti-drift test | `coalition-conflict-resolver-anti-drift.test.ts` |

**DoD (Phase 4):**

- ≥ 90% of shadow audits produce ≥ 1 resolved conflict.
- `unresolved` rate ≤ 15% across shadow audits.
- p95 wall-clock for Phase 4 ≤ 25 s on average crawl size.

### Rollout Phase 5 — Finalize integration (internal allowlist)

| # | Item | Files / Path |
|---|---|---|
| 5.1 | Prompt alias map: `<domain>` → `<domain>-finalize` | `server/src/agents/base/prompt-loader.ts` (`PROMPT_NAME_ALIAS_MAP`) |
| 5.2 | Context-builder sections for finalize: `## Client Situation`, `## Coalition Resolution`, `## Peer Final Drafts` (peer drafts are the alignment-corrected hypotheses, not raw Phase-1 drafts) | `format-agent-prompt.ts` |
| 5.3 | Domain weights from snapshot when `confidence ≥ medium`; fallback to `industry-weights.ts` otherwise | `server/src/services/context-builder/context-builder.ts:80` |
| 5.4 | `_append-glc-director-execution.md` v2 — adds optional `actions[*].cross_domain_refs` | `server/prompts/_append-glc-director-execution.md` |
| 5.5 | Strategy prompt update — require `Initiative.evidence.cross_domain_dependencies[]` (empty array when no real dep) | `server/prompts/strategy.md` |
| 5.6 | Strategy schema update | `server/src/schemas/domain-output.ts` (Initiative shape) |
| 5.7 | Fact-checker rule: warn when a wing-cluster initiative has empty `cross_domain_dependencies` and the alignment row indicates ≥ 1 `depends_on` peer reaction | `server/src/services/fact-checker/verify/verify-kernel.ts` |

**DoD (Phase 5):**

- ≥ 95% of internal-allowlist audits in coalition mode emit ≥ 1 cross_domain_ref in their finalize bundle.
- Strategy initiatives carry `cross_domain_dependencies[]` per the schema (rate ≥ 95%).
- KPI baseline updated: cross-domain density vs legacy.

### Rollout Phase 6 — Frontend & UX

| # | Item | Files / Path |
|---|---|---|
| 6.1 | Pipeline monitor surfaces 4 new phases with realtime updates | `src/app/hooks/usePipeline.ts`; `src/app/pages/PipelineMonitor.tsx` |
| 6.2 | Approve-Coalition gate | new component `src/app/components/ApproveCoalitionGate.tsx` — replaces Gate 1 logic when coalition is `internal+`; legacy Gate 1 remains active when off or in `shadow` |
| 6.3 | Conflict matrix UI on Strategy page | `src/app/components/ConflictMatrix.tsx` |
| 6.4 | Domain card shows hypothesis → alignment → finalize chain | `src/app/pages/AuditWorkspace.tsx` |
| 6.5 | Copy in EN | `src/app/config/coalition-protocol-copy.en.ts` |
| 6.6 | E2E spec | `e2e/coalition-protocol-flow.spec.ts` (gated by `E2E_COALITION_PROTOCOL`) |

**DoD (Phase 6):**

- Approve-Coalition gate flows end-to-end on internal allowlist.
- Snapshot is consultant-editable from the gate (essential fields: `entity_type`, `maturity.*`, `dominant_constraint`, `strategic_mode`); edits write a verified-override correction with `verified_by_server=true` per the existing trust-boundary contract.
- E2E green on staging.

### Rollout Phase 7 — GA activation

| Stage | Mode | Default flag | Promotion requires |
|---|---|---|---|
| 7.1 Shadow | `shadow` | server `false`; staging `true` | KPI baseline collected for ≥ 30 audits |
| 7.2 Internal | `internal` | env `true` for staff orgs only | concept-ADR Governance gates green for one rolling 7-day window |
| 7.3 Pilot | `pilot` | env `true` for explicit allowlist | gates green for two rolling 7-day windows; consultant agreement ≥ 75% |
| 7.4 GA | `ga` | env `true` everywhere | full review of unresolved-conflict patterns and degrade incidents; explicit AI Platform Lead sign-off |

Promotion ceremonies and rollback procedure mirror those documented for `directorDeepDiveOnDemandEnabled` in `docs/DEPLOYMENT.md`.

### Rollout Phase 8 — Post-GA hardening (V1.x scope)

| # | Item |
|---|---|
| 8.1 | Iterative Phase 3 multi-turn — opt-in flag `isCoalitionPhase3IterativeEnabled()`; up to N turns; KPI re-baselined |
| 8.2 | Auto-loop trigger expansion — Phase 1 / Phase 2 loops under separate flag with hard cap on attempts |
| 8.3 | Bandit recording on coalition phases — V1.1 once variance metrics for `agent_score` exist; respects existing per-phase guards in `PipelineOrchestrator.ts:131-139` |
| 8.4 | Causal DAG snapshots for cross-domain dependencies (`isCausalDagEnabled`) |
| 8.5 | Sub-agent prompt depth rewrite — picks up `ADR-SUBAGENT-PROMPT-DEPTH-V1.md` |

---

## CI regression checklist

Validate these invariants whenever coalition prompts, schemas, or loader files change:

1. `prompt-loader` append ordering for coalition prompts:
   - hypothesis/alignment/finalize: domain security → domain readability → director execution → coalition protocol → runtime output contract.
   - context-director / conflict-resolver: pipeline trust boundary → non-domain security → coalition protocol → runtime output contract.
2. Strict/best-effort semantics inherited from concept ADR — finalize phases keep the existing strict/best-effort pattern; coalition phases are best-effort with degrade path.
3. Every coalition artifact retains provenance keys (`confidence`, `evidence_refs`, `data_source` where applicable).
4. SPA / server feature-flag parity for the four coalition flags.
5. Anti-drift coverage: every domain has hypothesis + alignment + finalize prompts and matching agent classes.
6. Schema-rigor coverage gate: every `server/src/schemas/director-collaboration/<artifact>.ts` has `server/src/tests/coalition-<artifact>-schema-rigor.test.ts`.
7. KPI threshold constants live exclusively in `coalition-protocol-policy.ts` — grep gate for inline literals in services.

---

## Rollback procedure

1. Set server env `FEATURE_COALITION_PROTOCOL_ENABLED=false` (and SPA mirror) — pipeline reverts to legacy on the next audit; in-flight audits with active coalition rows continue to completion using their persisted state.
2. If a hard rollback is required mid-audit, set `_ROLLOUT_MODE=shadow` — coalition phases keep persisting but the finalize phase ignores them (legacy semantics).
3. Migrations are additive (new tables only); no destructive rollback needed. Tables can remain in place across rollback cycles.

---

## Open dependencies

- Concept ADR `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md` must reach Status=Accepted before Rollout Phase 5 starts (Phase 0–4 may proceed in shadow with Concept = Proposed).
- `docs/instructions/CONTEXT-DIRECTOR-INSTRUCTIONS.md` and `CONFLICT-RESOLVER-INSTRUCTIONS.md` must be merged before their respective rollout phases (own-doc anti-drift tests fail otherwise).
- `_append-glc-director-execution.md` v2 must be released alongside Rollout Phase 5; cannot ship earlier (changes the action contract).
