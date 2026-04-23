# ADR: Intake follow-up policy — runtime semantics (V1)

**Status:** Accepted (documents current behavior)  
**Date:** 2026-04-23  
**Context:** [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md](./ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md)  

## Context

`FollowupPolicy` (contract fields `deeperIf`, `stopIf`, `followupRuleRef`) is fully modeled on each question. Product expectations sometimes assume “the next card changes when follow-up says stop/continue.” The resolver has two different mechanisms: **prune** (affects `nextRecommended`) and **diagnostic** (affects `debugTrace` only).

## Decision

1. **Prune path (affects user-visible queue)**  
   - Implemented in [`followup-policy-executor.ts`](../../packages/intake-core/src/core/followup-policy-executor.ts) as `pruneNextRecommendedAfterFollowupStops`.  
   - Invoked from [`build-intake-plan.ts`](../../packages/intake-core/src/core/build-intake-plan.ts) when `policy.intelligence.followupStopPrunesSameSignalOptional !== false`.  
   - **Effect:** After a follow-up `stop` condition is met for a answered question, **optional** bank ids in `nextRecommended` that map to the same pilot signal can be pruned (required ids preserved). This is the primary **YAGNI**-aligned depth control in production.

2. **Trace path (observability only)**  
   - For a **slice** of the head of `nextRecommended`, `buildIntakePlan` calls `evaluateFollowupPolicy` and appends `debugTrace` entries with code `followup_policy_evaluated`.  
   - **Effect:** **Does not** reorder or remove the next item solely from this evaluation; it records intent for support and product debugging.

3. **If product later requires “branch next question on follow-up outcome”**  
   - That is a **separate** change: either extend the prune rules, or add an explicit “gate” in `plan-next-recommended` / sequencing that consumes `evaluateFollowupPolicy` **outcome** (not only trace). It must be ADR’ed: cost to UX (extra turns), test matrix, and interaction with case overlays.

## Consequences

- **Honest story:** We ship **prune + case overlay + signal reorder**, not a full “dynamic dialogue tree” driven by per-turn `deeperIf` in isolation.  
- **Tests:** `adaptive-intake-prune-behavior.test.ts` is the source of truth for prune behavior.  
- **No** change to `IntakeIntelligenceContract` shape is required for V1; runtime semantics are policy + executor + `buildIntakePlan` composition.

## References

- [`build-intake-plan.ts`](../../packages/intake-core/src/core/build-intake-plan.ts) (followup prune, `followup_policy_evaluated` trace)  
- [`intake-policy.v1.json`](../../packages/intake-core/src/intake-policy.v1.json) (`intelligence.followupRuleDefinitions`, `followupStopPrunesSameSignalOptional`)
