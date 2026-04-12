# ADR-FACT-CHECKER-UNIFIED-KERNEL
## Domain-Agnostic Fact-Checker Kernel for All GLC Audit Phases

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Scope** | All 6 GLC domain phases (Tech, Security, SEO, UX, Marketing, Automation) |
| **Authors** | Engineering |
| **Implements** | Sprint 1 — ADR Authoring + Schema Freeze |
| **Supersedes** | Implicit CMO-specific fact-checker design (undocumented) |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Subsequent changes require a new ADR that supersedes or amends this one. The decision described here establishes the canonical architecture; implementation details are in referenced source files.

---

## Context

The FACT-CHECKER layer was originally designed with marketing/CMO vocabulary: agents 1–12, CMO Director, BRIEF/OUTPUT terminology, market/audience/positioning as the primary claim categories. As GLC expanded to cover 6 distinct audit domains (Tech Infrastructure, Security & Compliance, SEO & Digital, UX & Conversion, Marketing & UTP, Automation & Processes), the conceptual design was applied implicitly to each domain without a formal architectural record.

This created two gaps:

1. **No unified taxonomy.** Claim types, status codes, and error classes were described separately for each domain rather than as instances of a shared kernel. Domain-specific language masked the fact that the core mechanics are identical across all phases.

2. **No phase-profile abstraction.** Domain-specific behaviour (high-risk claim types, approved evidence sources, error subtypes, confidence weights, feasibility templates) was either inlined into `FactCheckerService` conditionals or undocumented. There was no clean injection point for adding a new domain or modifying an existing one without changing the kernel.

---

## Decision

### 1. One FactCheckerService Kernel

A single `FactCheckerService` at `server/src/services/fact-checker.ts` handles validation for **all 6 GLC domain phases**. It does not know about marketing, SEO, or security specifically — it operates on an abstract claim graph and a phase profile injected at runtime.

**The kernel is responsible for:**
- Decomposing domain agent output into atomic claims
- Classifying each claim by type and risk level
- Assigning status to FACT claims based on DOMAIN_BRIEF and external sources
- Computing per-dimension confidence scores
- Building CONTROL_OBJECT (counts, errors, assumptions, trace)
- Evaluating cost_control guardrail state
- Computing per-run agent_performance metrics

**The kernel is NOT responsible for:**
- Knowing which facts are "important" for a given domain
- Knowing which external sources are authoritative for a given domain
- Knowing the feasibility risk templates for a given domain

All domain-specific knowledge is injected via a **PhaseProfile** (see ADR-PHASE-PROFILES.md).

---

### 2. Universal Claim Taxonomy

All GLC phases use an identical four-way claim taxonomy. This taxonomy does not change by domain; only the relative frequency of each type varies.

| Type | Definition | Checked strictly? |
|---|---|---|
| `FACT` | Verifiable statement (numbers, market data, causal claims, compliance assertions, SLA commitments) | Yes — with status assignment |
| `STRATEGIC_HYPOTHESIS` | A bet or directional assumption ("this channel may work", "this architecture should scale") | Only for STRATEGIC_INCONSISTENCY flag |
| `OPINION` | Subjective interpretation without specific data ("this is a weak segment", "this UX is confusing") | Not checked |
| `ASSUMPTION` | An explicit premise that underpins other claims but cannot currently be verified | Logged with risk level |

**Strict fact-checking applies only to `FACT` claims.** `STRATEGIC_HYPOTHESIS` and `OPINION` are exempt from status assignment unless they contradict other parts of the output (`STRATEGIC_INCONSISTENCY`).

---

### 3. Universal Status Taxonomy

All six statuses apply to FACT claims regardless of domain. The status describes the **verifiability of the claim**, not its subject matter.

| Status | Meaning |
|---|---|
| `CONFIRMED_BRIEF` | Claim matches the DOMAIN_BRIEF and does not conflict with external sources |
| `CONFIRMED_EXTERNAL` | Claim confirmed by a source in the Truth Registry |
| `UNVERIFIED` | No explicit confirmation or contradiction found; claim is plausible but unsubstantiated |
| `LIKELY_HALLUCINATION` | Claim contradicts DOMAIN_BRIEF or authoritative external data, or contains overly-specific detail with no source |
| `RISKY_PROMISE` | Claim asserts a deterministic outcome with specific figures or guarantees ("will increase by 3×", "guaranteed compliant") |
| `DEPENDENT_ON_BRIEF_ASSUMPTION` | Claim is derivable from DOMAIN_BRIEF but that BRIEF data is itself flagged as uncertain or potentially stale |

Cross-claim flag (any type):

| Flag | Meaning |
|---|---|
| `STRATEGIC_INCONSISTENCY` | Claim conflicts with another claim in the same output (audience mismatch, positioning conflict, contradicting architectures) |

---

### 4. Universal Error Classes

Errors produced by FACT-CHECKER are classified into three universal classes. All Rule Engine entries and Decision Layer routing use these classes regardless of domain.

| Class | Definition | Decision Layer behaviour |
|---|---|---|
| `fixable` | Correctable by prompt patching: tone, modal language, removing absolutes | Triggers `refine` + Rule Engine patches |
| `structural` | Requires upstream regeneration: fundamental conflict in positioning, audience, architecture | Triggers `restart` or hard `refine` of early agents |
| `data_gaps` | Model cannot fix: DOMAIN_BRIEF is missing critical fields, no external source available | Sets `human_attention_required.required = true`; no auto-loop |

---

### 5. Phase Profile Injection

Domain-specific behaviour is provided to the kernel as a `PhaseProfile` object. The kernel never branches on `phase_id` internally — it uses the injected profile.

```typescript
// Simplified injection at call site (pipeline.ts)
const profile = PHASE_PROFILES[domainKey]; // from server/src/config/phase-profiles.ts
const co = await factChecker.check(domainResult, collectedData, auditBrief, profile);
```

The PhaseProfile defines (see ADR-PHASE-PROFILES.md for full spec):
- `high_risk_fact_types` — which FACT subtypes get deep-checked
- `external_truth_sources` — ordered list from Truth Registry
- `error_types` — domain-specific `error_type` codes fed to Rule Engine
- `confidence_weights` — per-dimension weighting for `confidence.overall`
- `feasibility_risk_templates` — rule-based delivery risk checks

**What this enables:**
- Adding a new domain = add a PhaseProfile, no kernel changes
- Changing Security domain's risk model = update `security_compliance` profile, no kernel changes
- A/B testing confidence weights per domain = swap profiles, no kernel changes

---

### 6. CONTROL_OBJECT as the Sole Machine Interface

CONTROL_OBJECT (see ADR-CONTROL-OBJECT-V2-FULL.md) is the **only structured output** the FACT-CHECKER kernel passes to the Decision Layer. The Decision Layer never parses the FACT-CHECK SUMMARY text or CLAIMS ANALYSIS text for routing decisions.

This contract is domain-agnostic: same CONTROL_OBJECT schema, same Decision Layer logic, regardless of whether we're checking a security audit or a marketing strategy.

---

### 7. Unified System Flow (All Phases)

```
INPUT (Phase Template / DOMAIN_BRIEF)
    │
    ▼
PHASE DIRECTOR (diagnostics + orchestration)
    │
    ▼
DOMAIN AGENTS (generation — phase-specific)
    │
    ▼
FACT-CHECKER (kernel + injected PhaseProfile)
    ├── FACT-CHECK SUMMARY     (human-readable)
    ├── CLAIMS ANALYSIS        (human-readable, high-risk facts only)
    ├── CLEANED OUTPUT         (human-readable, corrected document)
    └── CONTROL_OBJECT         (machine-readable — primary interface)
    │
    ▼
DECISION LAYER (reads CONTROL_OBJECT only)
    │
    ├── [accept] ──────────────────────────────────► FINAL OUTPUT
    ├── [accept_with_warnings] ────────────────────► FINAL OUTPUT + warning flags
    └── [refine] ──► RULE ENGINE ──► DYNAMIC ADJUSTMENT ──► TARGETED RERUN
                                                              │
                                              (max 2 iterations)
                                                              │
                                              ──► [accept] ──► FINAL OUTPUT
                                              ──► [refine] ──► HUMAN REVIEW
```

---

## Consequences

**Positive:**
- Single codebase for all 6 domains — bug fixes and improvements apply everywhere
- Clear extension point: new domain = new PhaseProfile, no kernel risk
- Universal claim taxonomy enables cross-domain quality comparison (Phase 10 benchmarks)
- Uniform CONTROL_OBJECT contract simplifies dashboard, reporting, and observability

**Negative / Risks:**
- If PhaseProfile injection is not enforced, kernel will silently use defaults and miss domain-specific high-risk claims. Mitigation: require PhaseProfile at TypeScript compile time (non-optional parameter).
- The four-way taxonomy (FACT / HYPOTHESIS / OPINION / ASSUMPTION) may be too coarse for some domains. Future refinement possible at sub-type level without changing the top-level taxonomy.

---

## Alternatives Considered

**Domain-specific FactChecker subclasses:** Rejected. Would duplicate 80% of the logic; cross-domain improvements would require changes in 6 places. Phase profiles achieve the same customization without inheritance.

**Keeping the CMO-specific vocabulary:** Rejected. Marketing terms (BRIEF, AGENTS 1–12, CMO Director) are not meaningful for an infrastructure audit. Universal vocabulary improves team alignment and documentation.

---

## Implementation

**Already delivered (Phases 1–5):**
- `server/src/services/fact-checker.ts` — kernel (confirm phase-specific coupling is removed in Sprint 1)
- `server/src/schemas/control-object.ts` — CONTROL_OBJECT v2.0

**Sprint 1 deliverables:**
- Confirm or refactor `fact-checker.ts` so it accepts a `PhaseProfile` parameter (no inline `phase_id` conditionals)
- Create `server/src/config/phase-profiles.ts` with 6 profiles (see ADR-PHASE-PROFILES.md)
- Wire profile injection in `server/src/services/pipeline.ts`
- Unit tests per profile's high-risk claim detection

---

## References

- `server/src/services/fact-checker.ts` — FactCheckerService kernel
- `server/src/config/phase-profiles.ts` — 6 domain phase profiles (Sprint 1)
- `server/src/services/pipeline.ts` — injection site
- `server/src/schemas/control-object.ts` — CONTROL_OBJECT schema
- `docs/adrs/ADR-PHASE-PROFILES.md` — per-domain profile specifications
- `docs/adrs/ADR-CONTROL-OBJECT-V2-FULL.md` — full schema ADR
- `docs/adrs/ADR-AUTO-LOOP-RULE-ENGINE.md` — Phase 5 (auto-loop, agent performance)
