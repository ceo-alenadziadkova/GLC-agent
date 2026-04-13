# ADR-AUTO-REMEDIATION
## Phase 9 — Automated Self-Correction of Fixable Errors Without Human Approval

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Phase** | Phase 9 (Roadmap) |
| **Authors** | Engineering |
| **Implements** | Sprint 5 — Auto-remediation |
| **Supersedes** | N/A |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Status is **Accepted** as of Sprint 5 implementation (2026-04-13).

---

## Context

The current auto-loop (Phase 5, ADR-AUTO-LOOP-RULE-ENGINE.md) handles `refine` decisions by patching the agent's instruction prompt and rerunning. This addresses errors at the **generation** level — it produces a better output from the model.

However, many fixable errors are deterministic and well-understood: absolute language (`guaranteed`, `always`, `100%`), risky promises with specific figures and no data source, overly assertive tone. For these patterns, a targeted text correction to the CLEANED OUTPUT is safer, cheaper, and faster than a full agent rerun.

Phase 9 introduces **auto-remediation**: applying known-safe text corrections directly to CLEANED OUTPUT for `fixable` errors where:
1. The correction is low-risk (tone / absolute language only)
2. The pipeline is in a clean state (no structural errors, no data gaps requiring human)
3. The phase profile permits content-level corrections (or only tone corrections if not)

---

## Decision

### 1. Rule Engine Extension: `auto_remediate` Flag

**File:** `server/src/config/rule-engine.ts` (existing — extend)

Each Rule Engine entry gains an optional `auto_remediate` flag:

```typescript
interface RuleEngineEntry {
  error_type: string;
  applies_to_agents: number[];
  instruction_append: string;
  auto_remediate?: boolean;           // NEW (Phase 9)
  remediation_type?: 'tone' | 'content'; // NEW: 'tone' = always safe; 'content' = phase-gated
  suggested_fix_pattern?: {           // NEW: what to find and replace
    match: RegExp;
    replacement: string;
  };
}
```

Example entries with auto-remediation:
```typescript
{
  error_type: 'tone_overpromise',
  applies_to_agents: [4, 5, 6, 8],
  instruction_append: 'Avoid absolute guarantees...',
  auto_remediate: true,
  remediation_type: 'tone',
  suggested_fix_pattern: {
    match: /\b(guaranteed|always|100%|never fails|zero risk)\b/gi,
    replacement: '(phrase softened — see original for full context)',
  },
},
{
  error_type: 'risky_promise',
  applies_to_agents: [4, 5, 6, 8],
  instruction_append: 'Use probabilistic language...',
  auto_remediate: true,
  remediation_type: 'tone',
  // No suggested_fix_pattern — risky promises are too context-specific for regex
  // For these, auto-remediation appends a disclaimer: "[Hypothesis — verify with data]"
},
```

---

### 2. RemediationService

**File:** `server/src/services/remediation.ts` (new)

Applies auto-remediations to CLEANED OUTPUT when preconditions pass.

**Preconditions (all must be true):**

```typescript
function canAutoRemediate(co: ControlObject, profile: PhaseProfile): boolean {
  return (
    co.errors.structural.length === 0 &&
    co.confidence.overall >= 70 &&
    !co.human_attention_required.required
  );
}
```

**Phase-gated content scope:**

```typescript
function isRemediationAllowed(
  entry: RuleEngineEntry,
  profile: PhaseProfile,
): boolean {
  if (entry.remediation_type === 'tone') return true;  // always allowed
  if (entry.remediation_type === 'content') {
    return profile.auto_remediation_scope === 'tone_and_content';
  }
  return false;
}
```

**Security & Compliance exception:**
`security_compliance` profile has `auto_remediation_scope: 'tone_only'`. Any `content` remediation in this phase sets `human_attention_required.required = true` instead of applying the fix. See ADR-PHASE-PROFILES.md Section 3 for full rationale.

---

### 3. Audit Trail

Every auto-remediation is logged to a new table `audit_remediations` before the corrected output is saved.

```sql
CREATE TABLE audit_remediations (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id                 uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  phase_id                 text NOT NULL,
  error_type               text NOT NULL,
  remediation_type         text NOT NULL,  -- 'tone' | 'content'
  original_excerpt         text NOT NULL,  -- up to 500 chars of original text
  applied_fix              text NOT NULL,  -- what was substituted/appended
  preconditions_snapshot   jsonb NOT NULL, -- { confidence.overall, errors.structural, human_attention_required }
  created_at               timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_remediations_audit_id ON audit_remediations(audit_id);
```

`preconditions_snapshot` records the state at the moment auto-remediation was triggered, enabling post-hoc review of whether the conditions were appropriate.

---

### 4. Human Override

Auto-remediation can be disabled per-request:

```
POST /api/audits/:id/pipeline/start
{ "disable_auto_remediate": true }
```

Or globally per environment:
```
FEATURE_AUTO_REMEDIATION=false   // default; enable after Sprint 5 QA
```

When disabled, the pipeline behaves as Phase 5 — `refine` decisions trigger instruction-patch reruns only, no direct output corrections.

---

### 5. Frontend Indicator

**PipelineMonitor** displays a badge when auto-remediation was applied:

```
"Auto-corrected 3 issues (tone)"
```

Clicking the badge opens a detail panel listing each remediation: error_type, original excerpt, applied fix. This is read-only — consultants can see what was changed but cannot undo individual remediations from the UI (they can request a full pipeline rerun with `disable_auto_remediate: true`).

---

## CONTROL_OBJECT Changes (v2.3 → v2.4)

| Field | Change |
|---|---|
| `errors.fixable[]` | Each entry may now carry `auto_remediated: boolean` annotation |
| `human_attention_required.reasons[]` | Adds `'content_remediation_blocked_by_phase_profile'` |
| `versions.system_version` | `'v2.4'` |

---

## Consequences

**Positive:**
- Deterministic, low-risk fixes are applied instantly without burning auto-loop iterations
- Cost guardrail improves: fewer reruns needed for purely tonal issues
- Audit trail provides full transparency — no silent model edits
- Phase-gated scope enforces safety boundaries without per-error code branching

**Negative / Risks:**
- Regex-based fixes can be brittle for nuanced language. Mitigation: scope `suggested_fix_pattern` only to clear-cut absolute language; complex cases use disclaimer appending instead of substitution.
- A consultant who sees "Auto-corrected 3 issues" may over-trust the output, not realising the underlying claim is still unverified. Mitigation: remediations are visible and the original excerpt is shown; UNVERIFIED claims are still flagged in the output.
- The `audit_remediations` table grows unboundedly. Mitigation: apply the same retention policy as `pipeline_events` (configurable, default 90 days).

---

## Alternatives Considered

**Apply remediations silently without logging:** Rejected. Any model-driven output change must be traceable. Silent edits undermine consultant trust and auditability requirements.

**Auto-remediate structural errors too:** Rejected. Structural errors require upstream regeneration, not text correction. Auto-remediating a structural error would produce a cosmetically fixed document with a fundamentally broken premise.

---

## References

- `server/src/services/remediation.ts` — RemediationService (Sprint 5, new)
- `server/src/config/rule-engine.ts` — auto_remediate flag addition
- Supabase migration: `audit_remediations` table (Sprint 5)
- `server/src/services/pipeline.ts` — calls `applyAutoRemediation` after Decision Layer inside `publishControlObjectGovernance` (and after auto-loop reruns), before evaluation dataset write and `control_object` emit
- `src/app/pages/PipelineMonitor.tsx` — auto-remediation badge in governance summary (Sprint 5)
- `docs/adrs/ADR-PHASE-PROFILES.md` — auto_remediation_scope per domain
- `docs/adrs/ADR-AUTO-LOOP-RULE-ENGINE.md` — Phase 5 (instruction-patch auto-loop, predecessor)
