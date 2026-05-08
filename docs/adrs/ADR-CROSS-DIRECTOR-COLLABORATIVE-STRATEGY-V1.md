# ADR: Collaborative Director Protocol — Multi-director Coalition for Cross-domain Strategy v1

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-05-08 |
| **Scope** | Pipeline phases 0–7; `server/prompts/`; `server/src/agents/`; `server/src/services/context-builder/`; `server/src/services/pipeline/orchestrator/`; new schemas under `server/src/schemas/director-collaboration/`; new instructions canon under `docs/instructions/` |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |
| **Responsible approver** | AI Platform Lead (final technical sign-off) |
| **Consulted** | Security/Compliance (trust-boundary and conflict-resolution sections only) |

### Related decisions

- `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` — meta-orchestrator and three-layer architecture (this ADR extends Layer 2 with collaboration; Layer 3 unchanged).
- `ADR-CONTROL-OBJECT-V2-FULL.md`, `ADR-DECISION-LAYER-GATES.md` — per-phase governance still applies on **Finalize** outputs only.
- `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md` — director two-stage pattern; this ADR slots in **before** finalize.
- `ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-SYSTEM.md`, `ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT.md` — intake/recon snapshot semantics.
- `ADR-CLIENT-PROJECT-CONTEXT-V1.md` — earlier per-client context anchors; superseded by `ClientSituationSnapshot` for runtime LLM reasoning when this ADR is Accepted (existing artifacts retained).
- `ADR-PIPELINE-PROMPTS-AUDIT-V1.md` — prompt audit baseline that motivated this work.
- Follow-up ADR (placeholder, not yet drafted): `ADR-SUBAGENT-PROMPT-DEPTH-V1.md` — sub-agent prompt depth rewrite is **out of scope** of this ADR.
- Rollout/migration plan (separate, living): `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-ROLLOUT.md`.

### ADR lifecycle

This decision record is **immutable** once Accepted. Editorial fixes (typos, links) are acceptable; **changing the architectural decision** requires publishing a **new** ADR that **supersedes** this one. Living rollout state lives in `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-ROLLOUT.md`.

---

## Context

GLC currently runs the pipeline as `recon → 6 domain phases (parallel wings) → strategy → orchestration-pack-synthesis`. Each domain Director executes in isolation against the same crawl/intake snapshot, then the Strategy phase (and the deterministic orchestration pack) reconcile their outputs.

This produces three structural failure modes in cross-domain reasoning:

1. **One-way awareness.** Each next domain receives only `score + summary + strengths[] + weaknesses[]` of prior domains (`server/src/services/context-builder/format-agent-prompt.ts:158-170`, template in `server/src/config/context-builder-prompt.en.json:41`). It does **not** see the other directors' issues, recommendations, baseline actions, dependencies, or trade-offs. Marketing cannot react to Tech's planned roadmap; Automation cannot rely on UX's planned funnel changes.
2. **Mode drift.** Each director self-selects its own operating mode (CMO `DISCOVERY/LAUNCH/GROWTH/AUTHORITY/DEFENSE`, CDO `greenfield/optimization/expansion`, CSO `Case A/B/C/D`, CAO `discovery/deep-audit`). With no shared anchor, two directors can pick incompatible modes for the same client situation.
3. **Late conflict detection.** Cross-domain conflicts surface only in the post-hoc deterministic orchestration pack and the LLM `orchestration-pack-synthesis.conflicts_resolved` block — *after* every domain has already published findings. There is no mechanism for a director to know *during* its own analysis that another director's hypothesis blocks or amplifies its plan.

Additionally, `recon.md` is intentionally observation-only (`server/prompts/recon.md:14-16`), so no diagnostic LLM step today produces a normalized `entity_type / maturity / strategic_mode / dominant_constraint / resource_envelope` snapshot. Each director re-derives this from raw inputs, redundantly and divergently.

The product intent — most clearly expressed by stakeholders in 2026-05 internal review — is for directors to behave as a **coalition**: each understands the others, they jointly diagnose the client situation, and they iteratively reshape their plans until the resulting strategy is internally consistent.

---

## Decision

We introduce the **Collaborative Director Protocol** (alias: *Director Coalition*) as a first-class runtime mechanism inside Layer 2 of the orchestrator architecture defined by `ADR-GLC-ORCHESTRATOR-V1.1`.

### Architecture position

```
Layer 1   Intake & Evidence                    [unchanged]
Layer 2   Director Reasoning (collaborative)   [this ADR]
Layer 3   Orchestration & Synthesis            [unchanged contract; richer input]
```

The protocol does **not** replace the existing pipeline; it inserts new phases **before** the existing domain finalize step and **before** Strategy. When the protocol feature flag is `false`, the runtime path is byte-equivalent to today.

### Four-phase coalition runtime (canonical)

```
Phase 0     Recon                              [unchanged — observation only]

Phase 0.5   Context Director                   [NEW]
            → ClientSituationSnapshot

Phase 1     Hypothesis Round (per domain)      [NEW]
            → DomainHypothesisDraft × 6
            Inputs: ClientSituationSnapshot + recon + intake
            Domains do NOT see each other yet.

Phase 2     Alignment Round (per domain)       [NEW]
            → DomainAlignmentResponse × 6
            Inputs: Phase-1 drafts of all 6 domains
            Each director publishes:
              - acknowledges / blocks / depends_on / enables / duplicates / contradicts
              - self_corrections to their own draft

Phase 3     Conflict Resolution (single call)  [NEW]
            → CrossDomainConflictResolution
            Inputs: snapshot + 6 drafts + 6 alignments
            One LLM step (V1). Iterative variant deferred to V2+ (flag-gated).

──── Approve Coalition gate ────                [NEW; replaces Review Gate 1 logic]

Phase 4     Domain Finalize (per domain)       [REFACTORED current domain.md]
            → DomainResult (issues + recommendations + glc_director_execution)
            Recommendations and baseline.actions reference resolved tradeoffs
            and cross-domain refs.

Phase 5     Strategy                           [REFACTORED]
            Initiative.evidence.cross_domain_dependencies REQUIRED when
            such dependency exists; references resolved conflict ids.

Phase 6     Orchestration Pack Synthesis       [unchanged contract; richer input]
```

Phase 4 receives the **same** input it receives today (recon, intake, collected_data, consultant notes, prior domain summaries) **plus** the Snapshot, the six hypothesis drafts, the six alignment responses, and the conflict-resolution bundle. The Phase 4 output schema is unchanged from the current `submit_analysis` tool — i.e. backward-compatible at the persistence layer.

### Pre-Acceptance Decisions (locked before Status=Accepted)

These resolve the open questions raised during ADR review:

1. **Owners.** `Decision owners` = Product + Consulting + AI Platform. **Responsible approver** = AI Platform Lead (final technical sign-off). **Consulted** = Security/Compliance, scoped to the conflict-resolution and trust-boundary sections only.
2. **Sub-agent prompt rewrite is out of scope.** Sub-agent prompts under `server/prompts/sub-agents/*` remain as today. Their methodological depth rewrite (so they stop being thin schema validators) is tracked in a separate follow-up: `ADR-SUBAGENT-PROMPT-DEPTH-V1.md` (placeholder, not yet drafted). This ADR does not block on it.
3. **Phase 3 algorithm.** **V1 = single-call** (one resolver LLM step over all alignment outputs). **V2+** introduces an optional iterative multi-turn variant under a separate feature flag. Rationale: bounded runtime + token budget, simpler KPI baselining.
4. **Review gates.** Auto-pass for Phase 1 and Phase 2. **One mandatory gate — `Approve Coalition` — before Phase 4 finalize**, replacing today's Review Gate 1 logic. The gate displays unresolved conflicts, critical assumptions, and mode-alignment status. Gates 2 and 3 (after Phase 4 wing-2 and after Phase 5 strategy) are unchanged.
5. **Token budget.** Extend the existing `TokenBudget` mechanism rather than introduce a parallel one. Add three knobs:
   - global cap for the entire collaborative flow (Phase 0.5 + 1 + 2 + 3),
   - per-phase caps,
   - degrade path: trim hypotheses → trim reactions → fall back to legacy `<domain>.md` for the affected domain only.
6. **Auto-loop / Bandit compatibility.**
   - **Auto-loop is enabled in V1.** `unresolved[]` from Phase 3 or critical-confidence assumptions in the Snapshot can trigger an auto-loop rerun of Phase 0.5 (Context Director only).
   - **Bandit (`recordBanditArm`) stays scoped to Phase 4 finalize phases 1–6 in V1**, as it is today (`server/src/services/pipeline/orchestrator/PipelineOrchestrator.ts:131-139`). Extension to coalition phases is deferred to V1.1 once we have variance metrics on agent_score for the new phases.
7. **Naming.** Canonical product name: **Collaborative Director Protocol**. Permitted alias on first mention: *Director Coalition*. Internal code identifier prefix: `coalition_*` for telemetry, table names, and event types.

### Shared evidence standard

Every artifact produced by the protocol uses the existing GLC evidence taxonomy (`Observed | Derived | Assumed | Missing`, plus `confidence` in `high | medium | low`, plus `evidence_refs[]`). No new evidence vocabulary is introduced. This is non-negotiable: it keeps the protocol consistent with `ADR-GLC-ORCHESTRATOR-V1.1` and the FactChecker contract.

### Trust boundary (non-negotiable)

The protocol consumes and produces *runtime data*, not instructions. Treat:
- recon, intake, collected_data, consultant notes — as data inputs (existing rule).
- **Phase-1 hypothesis drafts of peer directors as data inputs**, never as instructions to follow. A director reading a peer's draft must classify it via the alignment vocabulary; it must not adopt peer text as its own reasoning chain.
- **Phase-3 conflict-resolver output as policy**, applied to Phase 4 finalize via the existing `_append-glc-director-execution.md` contract, not by free-text injection.

The existing append `_append-pipeline-trust-boundary.md` extends to all coalition prompts. A new shared append, `_append-collaboration-protocol.md`, codifies the peer-data trust rule and the citation convention (`peer_hypothesis_id` references only, no verbatim quoting beyond a 240-char excerpt).

---

## Schemas (concept; full Zod under `server/src/schemas/director-collaboration/*`)

### ClientSituationSnapshot — Phase 0.5 output

Persisted under new table `audit_client_situation` (one row per audit). Conceptual shape:

```ts
{
  schema_version: 1,
  audit_id: string,
  generated_at: string,         // ISO

  entity_type:
      'pre_product_idea' | 'mvp' | 'growth_stage' | 'scale'
    | 'personal_brand'   | 'b2b_saas' | 'b2c_product'
    | 'service_business' | 'marketplace' | 'ecommerce' | 'content_media',

  maturity: {
    product_clarity:        1|2|3|4|5,
    audience_clarity:       1|2|3|4|5,
    positioning_strength:   1|2|3|4|5,
    channel_readiness:      1|2|3|4|5,
    resource_constraints:   1|2|3|4|5,
    overall_tier: 'exploratory' | 'actionable' | 'optimization',
  },

  dominant_constraint:
      'traffic' | 'conversion' | 'tech' | 'risk' | 'delivery',
  constraint_chain: string[],   // next bottleneck if dominant is relieved

  resource_envelope: {
    bandwidth:       'low' | 'medium' | 'high',
    risk_tolerance:  'low' | 'medium' | 'high',
    urgency:         'low' | 'medium' | 'high',
    confidence:      'high' | 'medium' | 'low',
  },

  strategic_mode:
      'discovery' | 'launch' | 'growth' | 'authority' | 'defense',

  // Computed from constraint+mode via centralized policy lookup.
  // Falls back to per-industry weights when confidence in snapshot is 'low'.
  domain_weights: {
    tech_infrastructure: number,    // 0.5..2.0
    security_compliance: number,
    seo_digital:         number,
    ux_conversion:       number,
    marketing_utp:       number,
    automation_processes: number,
  },

  assumptions: Array<{
    id: 'A1' | 'A2' | ... ,
    statement: string,
    impact: 'high' | 'medium' | 'low',
    validation_method: string,
    invalidates_if_wrong: string[],   // initiative ids when known
  }>,

  clarifying_questions: Array<{
    id: string,
    question: string,
    severity: 'critical' | 'high' | 'medium',
    blocking_phases: number[],        // critical → enforced at Approve Coalition gate
  }>,

  evidence_refs: Array<{
    type: 'recon' | 'intake' | 'collected_data' | 'consultant_note',
    finding: string,
    bank_id?: string,
  }>,
  data_quality_score: number,         // 0..100
  unknown_items: string[],
}
```

### DomainHypothesisDraft — Phase 1 output (one per domain)

Persisted in new table `audit_domain_hypotheses`.

```ts
{
  schema_version: 1,
  audit_id: string,
  domain_key: DomainKey,

  acknowledged_situation: {
    snapshot_id: string,
    domain_mode_mapping: string,        // free-text: how the director maps
                                        // strategic_mode → its own vocabulary
  },

  hypotheses: Array<{
    id: string,                         // '<domain>:H1'
    type: 'risk' | 'opportunity' | 'lever' | 'constraint',
    statement: string,
    rationale: string,
    confidence: 'high' | 'medium' | 'low',
    evidence_refs: Array<{ ... }>,      // existing contract
    data_source: 'auto_detected' | 'from_brief' | 'inferred',

    expected_business_outcomes: string[],
    expected_costs: string[],            // time, budget, tech debt
    expected_dependencies_hints: string[], // free-text; sharpened in Phase 2
  }>,

  raised_questions: Array<{ ... }>,     // additions to clarifying_questions

  analysis_mode: 'researched' | 'deterministic_fallback',
}
```

Cardinality: `MIN_HYPOTHESES_PER_DOMAIN ≤ hypotheses.length ≤ MAX_HYPOTHESES_PER_DOMAIN` — both knobs in `server/src/config/coalition-protocol-policy.ts`.

### DomainAlignmentResponse — Phase 2 output (one per domain)

Persisted in new table `audit_domain_alignments`.

```ts
{
  schema_version: 1,
  audit_id: string,
  domain_key: DomainKey,

  cross_domain_reactions: Array<{
    target_hypothesis_id: string,                         // 'cmo:H3'
    relation: 'acknowledges' | 'blocks' | 'depends_on'
            | 'enables'      | 'duplicates' | 'contradicts',
    rationale: string,
    counter_proposal?: {
      replaces: string,                                   // peer hypothesis id
      reformulation: string,
      why: string,
    },
  }>,

  self_corrections: Array<{
    hypothesis_id: string,                                // own draft id
    change: 'reformulate' | 'lower_confidence' | 'merge' | 'drop' | 'split',
    new_text?: string,
    new_confidence?: 'high' | 'medium' | 'low',
    reason: string,
  }>,

  analysis_mode: 'researched' | 'deterministic_fallback',
}
```

Cardinality: per-peer reaction cap (`MAX_REACTIONS_PER_PEER`), total reaction cap, total self-corrections cap — all in policy.

### CrossDomainConflictResolution — Phase 3 output

Single LLM call. Persisted in new table `audit_conflict_resolutions` (one row per audit).

```ts
{
  schema_version: 1,
  audit_id: string,

  resolved_conflicts: Array<{
    id: string,                                           // 'CONF-1'
    type: 'sequencing' | 'tradeoff' | 'mode_misalignment'
        | 'duplicate'  | 'capacity' | 'compliance_boundary',
    parties: string[],                                    // ['cmo:H3','cto:H1']
    resolution: 'sequenced' | 'merged' | 'phased'
              | 'deferred'  | 'escalated_to_consultant',
    decision: string,
    tradeoffs_accepted: string[],
    affects_actions: Array<{
      domain_key: DomainKey,
      action_constraint:
          'must_precede' | 'must_follow' | 'parallel_ok'
        | 'merged_with'  | 'dropped',
      paired_with?: string,
    }>,
  }>,

  unresolved: Array<{
    id: string,
    parties: string[],
    reason: string,
    recommended_action: 'escalate' | 'defer' | 'gather_data',
  }>,
}
```

When `unresolved.length > 0`, the **Approve Coalition** gate must surface each entry and require consultant acknowledgement before Phase 4 starts. When `unresolved` contains `recommended_action='escalate'` items, the gate is mandatory; for `defer` and `gather_data` it is informational.

### Existing-contract extensions (additive)

- `glc_director_execution.baseline.actions[*]` gains optional `cross_domain_refs: string[]` (peer hypothesis ids and conflict ids). Defined in `_append-glc-director-execution.md` v2 (header `<!-- version: 2.0 -->`); legacy bundles without the field remain valid.
- `Initiative.evidence.sources[*]` (Strategy) gains required-when-applicable `cross_domain_dependencies: Array<{ domain_key, hypothesis_id?, conflict_id? }>`. When a Strategy initiative has no real cross-domain dependency, the field is `[]` (not omitted); fact-checker will flag a non-empty wing-cluster initiative with empty dependencies as a `consistency` warning, not a hard error.

---

## Prompts

| File | Role |
|---|---|
| `server/prompts/context-director.md` | Phase 0.5 — produces `ClientSituationSnapshot`. |
| `server/prompts/<domain>-hypothesis.md` × 6 | Phase 1 — focused on hypothesis drafts; reuses the scoring/heuristic content of the existing `<domain>.md`. |
| `server/prompts/<domain>-alignment.md` × 6 | Phase 2 — peer-reading + self-correction. |
| `server/prompts/cross-domain-conflict-resolver.md` | Phase 3 — single resolver call. |
| `server/prompts/<domain>-finalize.md` × 6 | Phase 4 — alias for the existing `<domain>.md`; receives extended context. |

Append composition (handled by `prompt-loader.ts`):

- All coalition prompts: `_append-collaboration-protocol.md` (NEW) + `_append-runtime-output-contract.md`.
- Phase-0.5 and Phase-3 prompts: `_append-pipeline-trust-boundary.md` + `_append-non-domain-security-core.md`.
- `<domain>-hypothesis.md`, `<domain>-alignment.md`, `<domain>-finalize.md`: existing domain stack — `_append-domain-security-core.md` + `_append-domain-readable-output.md` + `_append-glc-director-execution.md`.

Source-of-truth canon (human-spec):

- `docs/instructions/CONTEXT-DIRECTOR-INSTRUCTIONS.md` (NEW).
- `docs/instructions/CONFLICT-RESOLVER-INSTRUCTIONS.md` (NEW).
- Existing `*-INSTRUCTIONS.md` (CMO/CDO/CSO/CAO/CTO/SEO) gain a short Section §0.5 — *Coalition Protocol Mapping* — describing how their per-director PHASE 0 diagnostic maps to `ClientSituationSnapshot.strategic_mode`. No editorial restructuring of those files.

---

## Implementation hooks

| Layer | File | Change |
|---|---|---|
| Phase agent registry | `server/src/services/pipeline/orchestrator/phase-agent-registry.ts:13` | Add entries for new agents: `ContextDirectorAgent`, `<Domain>HypothesisAgent` ×6, `<Domain>AlignmentAgent` ×6, `ConflictResolverAgent`. Phase numbers introduced as fractional or via a separate `coalitionPhase` slot — final mapping decided in the rollout ADR (Phase 0 of rollout). |
| Pipeline orchestrator | `server/src/services/pipeline/orchestrator/PipelineOrchestrator.ts:46-50` | New `runCoalitionBlock` method; gated by `isCoalitionProtocolEnabled()`. Sequencing inside the block: Phase 0.5 → parallel Phase 1 ×6 → parallel Phase 2 ×6 → Phase 3. |
| Context builder | `server/src/services/context-builder/format-agent-prompt.ts:60-89` | New section `## Client Situation` (rendered when Snapshot exists). New section `## Peer Hypotheses (Phase 2 input)` (only for alignment phase). New section `## Coalition Resolution` (only for finalize phase). |
| Context builder loader | `server/src/services/context-builder/load-context-snapshot.ts:50` | Additionally load: `audit_client_situation`, `audit_domain_hypotheses`, `audit_domain_alignments`, `audit_conflict_resolutions`. |
| Domain weight resolution | `server/src/services/context-builder/context-builder.ts:80` | When a Snapshot row exists with `confidence ≥ medium`, prefer `snapshot.domain_weights[domain]`; otherwise fall back to `getDomainWeight(industry, domain)` (`server/src/config/industry-weights.ts`). |
| Prompt loader | `server/src/agents/base/prompt-loader.ts:130-200` | Extend `PIPELINE_TRUST_BOUNDARY_PROMPT_SET` with `context-director` and `cross-domain-conflict-resolver`. Extend `PROMPT_TOOL_NAME_MAP` with new tool names. Add new `_append-collaboration-protocol.md` to all coalition prompts via a dedicated `COALITION_PROMPT_SET`. |
| Tool contracts | `server/src/config/agent-claude-contract.ts` | New tool names: `submit_client_situation`, `submit_domain_hypothesis`, `submit_domain_alignment`, `submit_conflict_resolution`. |
| Schemas | `server/src/schemas/director-collaboration/{client-situation,hypothesis,alignment,conflict-resolution}.ts` | New Zod schemas; one schema-rigor test per file: `server/src/tests/coalition-<artifact>-schema-rigor.test.ts`. |
| Persistence | `server/migrations/0NN_audit_client_situation.sql`, `..._audit_domain_hypotheses.sql`, `..._audit_domain_alignments.sql`, `..._audit_conflict_resolutions.sql` | One table per artifact; `audit_id` FK with `ON DELETE CASCADE`; RLS policies mirror `audit_recon` / `audit_domains`. |
| Feature flags | `server/src/config/feature-flags.ts` | New facade functions: `isCoalitionProtocolEnabled()`, `getCoalitionProtocolRolloutMode()`, `isCoalitionPhase3IterativeEnabled()` (V2 only). Default off. SPA mirror in `src/app/config/app-feature-flags.ts` — covered by `orchestration-contract-parity.test.ts`. |
| Token budget | `server/src/services/token-budget.ts` (or equivalent) + `server/src/config/coalition-protocol-policy.ts` | Add `COALITION_TOTAL_TOKEN_CAP`, per-phase caps, degrade-path policy. |
| Auto-loop | `server/src/services/pipeline/autoLoop/autoLoopService.ts` | Allow target phase = Context Director when triggered by unresolved conflicts; existing per-phase guards retain. |
| Frontend | `src/app/data/auditTypes.ts`, `src/app/components/ClientSituationCard.tsx` (NEW), `src/app/components/ConflictMatrix.tsx` (NEW), `src/app/pages/PipelineMonitor.tsx`, `src/app/pages/AuditWorkspace.tsx`, copy under `src/app/config/coalition-protocol-copy.en.ts` | Display Snapshot, peer hypotheses, conflict matrix; new Approve-Coalition gate UI. |

The rollout sequence and DoD per item live in `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-ROLLOUT.md`. This ADR fixes only the *contract*.

---

## Backward compatibility and migration

- `FEATURE_COALITION_PROTOCOL_ENABLED=false` → pipeline is byte-equivalent to today. Coalition tables remain empty. No coalition appends are loaded into prompts.
- `_ROLLOUT_MODE=shadow` → coalition phases run, results are persisted, but Phase 4 finalize ignores them. Strategy and orchestration-pack-synthesis use legacy behavior. Used for KPI baselining and offline strategy diff.
- `_ROLLOUT_MODE=internal` → enabled for internal/staff orgs (allowlist).
- `_ROLLOUT_MODE=pilot` → enabled for explicit pilot allowlist.
- `_ROLLOUT_MODE=ga` → enabled for all audits.

Existing `<domain>.md` prompts remain on disk under the same name. The prompt loader treats `<domain>` and `<domain>-finalize` as aliases via `PROMPT_NAME_ALIAS_MAP` (added in rollout Phase 0). Audits started before the flag is flipped continue under legacy semantics until completion.

Existing review gates: Gate 1 logic is replaced by the new Approve-Coalition gate when the protocol is `internal`+; legacy Gate 1 remains active when the protocol is off or in `shadow`. Gate 2 and Gate 3 are unchanged in all modes.

---

## Governance gates (KPI thresholds before GA)

Authoritative thresholds and policy references live in `server/src/config/coalition-protocol-policy.ts` — services must read them from there.

| Gate | Metric | V1 GA target | Source |
|---|---|---|---|
| **Cross-domain density** | median `Initiative.evidence.cross_domain_dependencies.length` per Strategy | ≥ 1.5 | `audit_strategy.initiatives` |
| **Unresolved conflict rate** | share of audits with `audit_conflict_resolutions.unresolved.length > 0` | < 15% | `audit_conflict_resolutions` |
| **Mode alignment** | share of audits where every domain in Phase 4 reflects the snapshot's `strategic_mode` | 100% | mapping check in alignment row |
| **Assumption coverage** | share of `confidence='low'` hypotheses linked to a `clarifying_question` | ≥ 80% | join `hypotheses ↔ clarifying_questions` |
| **Consultant agreement** (gated to internal+pilot) | share of `Approve Coalition` gates closed without consultant override | ≥ 75% | `review_points` |
| **Runtime overhead** | added wall-clock for coalition phases (0.5+1+2+3), p95 | < 60 s | logger metrics |
| **Token overhead** | added token cost vs legacy pipeline, p95 | < 30% | token tracker |

Gates are evaluated against rolling 7-day windows in `internal` and `pilot` modes. Promotion to `ga` requires all seven gates green for two consecutive 7-day windows.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Cascading hallucination** — director B builds on director A's unsound hypothesis. | Phase 2 must classify peer hypotheses via the alignment vocabulary (`acknowledges/blocks/depends_on/enables/duplicates/contradicts`) and provide rationale + evidence refs. The peer-data trust rule in `_append-collaboration-protocol.md` forbids treating peer text as ground truth. |
| **Token blow-up** | Token budget knobs in policy + degrade path: trim hypotheses → trim reactions → fall back to legacy `<domain>.md` for the affected domain only. Per-phase caps tracked via the existing `TokenBudget` mechanism. |
| **Latency doubling** | Phases 1 and 2 are parallel across 6 domains. Phase 3 is the only sequential addition. p95 budget enforced via the runtime overhead gate above; if a single domain stalls, the wing's existing fail-degrade path applies (`PARALLEL_FAILURE_THRESHOLD`). |
| **Snapshot misclassification** (e.g. wrong `strategic_mode`) | Snapshot is presented at the Approve-Coalition gate with a consultant-edit form. If `confidence=low` on `entity_type/maturity/dominant_constraint`, the gate is mandatory regardless of `unresolved.length`. |
| **Per-domain LLM failure during alignment** | Per-domain fallback: persist `analysis_mode='collaboration_degraded'`, continue with a deterministic alignment derived from drafts only (no peer reactions). The directors with degraded alignments are visible in the Approve Coalition gate UI. |
| **Prompt drift between phases** | Anti-drift tests under `server/src/tests/coalition-prompts-consistency.test.ts` enforce: (a) per-domain hypothesis prompt and finalize prompt agree on scoring rubric and provenance contract, (b) instruction-canon links present, (c) shared appends loaded. |
| **Auto-loop loop on unresolved conflicts** | Auto-loop budget capped per audit (`COALITION_AUTO_LOOP_MAX_RUNS`); only Phase 0.5 may be re-run via auto-loop in V1. Phase 1/2/3 auto-loop is deferred to V1.1. |

---

## Out of scope

- **Sub-agent prompt depth rewrite** for `server/prompts/sub-agents/*` — separate follow-up `ADR-SUBAGENT-PROMPT-DEPTH-V1.md`.
- **Iterative Phase 3 multi-turn between directors** — V2+ only, behind a separate flag.
- **Bandit recording on coalition phases** — V1.1 once variance metrics exist.
- **Multi-language LLM output** — coalition prompts emit English-by-default per the existing runtime contract.
- **Dynamic discovery of new domains** — domain set remains fixed at the six current GLC domains.
- **Review-gate UX redesign beyond the new Approve-Coalition gate** — Gates 2 and 3 retain their current UX.

---

## Decision

Accept the Collaborative Director Protocol with the four-phase coalition runtime, the four new artifacts, the Pre-Acceptance Decisions §1–§7, the additive contract extensions, and the rollout/migration controls described above.

Status moves to **Accepted** when:

1. Pre-Acceptance Decisions §1–§7 are confirmed by the Responsible approver.
2. The companion ADR `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-ROLLOUT.md` is published with phased milestones and a verification log.
3. Schemas, prompts, instructions canon, and policy module skeletons are merged behind a default-off feature flag.
4. The KPI gate definitions above are encoded in `server/src/config/coalition-protocol-policy.ts` (no inline literals in services).

Future schema or contract changes require a new ADR superseding this one, per `ADR lifecycle` above.
