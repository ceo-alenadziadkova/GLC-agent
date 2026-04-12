# ADR-MULTIMODAL-TRUTH
## Phase 7 — Multi-Modal Truth Sources: External API and Document Feed Connectors

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-04-12 |
| **Phase** | Phase 7 (Roadmap) |
| **Authors** | Engineering |
| **Implements** | Sprint 3 — Multi-modal truth |
| **Supersedes** | N/A (extends ADR-TRUTH-REGISTRY-ASSUMPTIONS.md) |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Status changes to **Accepted** when Sprint 3 begins.

---

## Context

The Truth Registry (ADR-TRUTH-REGISTRY-ASSUMPTIONS.md, Phase 2) defined a three-tier source priority:

```
internal_metrics > user_brief > external_search
```

`external_search` covers generic web search results but cannot reach:
- Authoritative external APIs (regulatory databases, certification registries, industry data providers)
- Client-uploaded document feeds (SOPs, compliance policies, market research PDFs)

Without these sources, FACT-CHECKER cannot confirm or deny important claims in Security & Compliance (regulatory status), SEO (authoritative search volume data), or Automation (industry process benchmarks). Such claims default to `UNVERIFIED` even when structured external data exists that could resolve them.

Two additions are needed:
1. **`external_api`** tier — structured, programmatic connectors to authoritative data sources
2. **`document_feed`** tier — client-uploaded document corpus that serves as a project-level source of truth

---

## Decision

### 1. Extended Truth Registry Source Tiers

Updated priority ordering (lower number = higher trust):

```
Priority 1: internal_metrics     (system-observed data about the client)
Priority 2: user_brief            (data explicitly provided by the client)
Priority 3: external_search       (general web search; remains as-is)
Priority 4: external_api          (authoritative structured APIs — NEW)
Priority 5: document_feed         (client-uploaded documents — NEW)
```

**Conflict resolution:** The existing `priority_based` conflict resolution policy applies. When two sources disagree, the higher-priority source wins and the lower-priority source is logged as a `conflict_note` on the claim.

---

### 2. Connector Interface

**File:** `server/src/services/truth-connectors/connector.interface.ts` (new)

```typescript
interface TruthConnector {
  id: string;           // unique connector ID matching Truth Registry config
  tier: 'external_api' | 'document_feed';
  timeout_ms: number;   // max 3000ms (enforced by ConnectorRunner)
  check(claim: AtomicClaim, context: CheckContext): Promise<ConnectorResult | null>;
}

interface ConnectorResult {
  status: 'confirmed' | 'contradicted' | 'no_data';
  source_id: string;
  excerpt?: string;     // brief quote or data point used to confirm/contradict
  retrieved_at: string; // ISO timestamp
}
```

Connectors return `null` on any error (timeout, network failure, 4xx/5xx, unexpected response shape). The kernel treats `null` identically to `'no_data'`.

---

### 3. Non-Blocking Contract

**This is a hard architectural requirement, not a preference.**

External connectors enrich claims but do **not** gate the pipeline. The pipeline must continue even when all external connectors are unavailable.

```typescript
// ConnectorRunner in server/src/services/truth-connectors/runner.ts
async function runWithTimeout<T>(
  connector: TruthConnector,
  claim: AtomicClaim,
  context: CheckContext,
): Promise<ConnectorResult | null> {
  try {
    return await Promise.race([
      connector.check(claim, context),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), connector.timeout_ms)),
    ]);
  } catch {
    return null;  // network error, connector bug, etc. — always return null, never throw
  }
}
```

**Behaviour on unavailability:**
- Claim falls back to its status from prior tiers (`UNVERIFIED` if no prior tier confirmed it)
- `CONTROL_OBJECT.human_attention_required.reasons` gets `'external_source_unavailable'` when ≥ 1 high-risk claim could not be checked externally due to connector unavailability
- Pipeline emits a `log` event: `"External connector {id} unavailable — claim {claim_id} marked UNVERIFIED"`
- No pipeline error, no retry, no blocking

**Rationale:** AI governance guidelines (including EU AI Act requirements for high-risk systems) require graceful degradation. A pipeline that fails because a third-party API is down is not production-ready. External data is enrichment, not a prerequisite.

---

### 4. Truth Registry Config Extension

**File:** `server/src/config/truth-registry.ts` (existing — extend)

```typescript
interface TruthRegistryConfig {
  sources: TruthSource[];
  conflict_resolution: 'priority_based';
  connectors: ConnectorConfig[];  // NEW: external_api and document_feed connectors
}

interface ConnectorConfig {
  id: string;
  tier: 'external_api' | 'document_feed';
  enabled: boolean;      // can be toggled without code change
  phases: string[];      // which phase_ids this connector applies to ([] = all)
  timeout_ms: number;    // default: 3000
}
```

Example (first connector):
```typescript
{
  id: 'regulatory_compliance_db',
  tier: 'external_api',
  enabled: false,          // disabled by default until tested
  phases: ['security_compliance'],
  timeout_ms: 3000,
}
```

---

### 5. First Connector (Sprint 3)

**Sprint 3 deliverable:** One working connector implementation to validate the interface.

Candidate options (choose based on data availability and API terms):
- A public regulatory compliance database (e.g. GDPR DPA authority lookup, ISO certification registry)
- A public SEO data API (e.g. search volume / SERP data for `seo_digital` phase)

The connector is shipped with `enabled: false` in all environments until QA validates its output quality against known test cases.

---

### 6. Document Feed Connector

The document feed tier allows clients to upload PDFs or text documents that become project-level truth sources for their audit. This is higher-value than external_api for clients with proprietary market research, internal policies, or SOPs.

**Implementation deferred to Sprint 3 follow-up** — document parsing infrastructure (PDF extraction, chunking, embedding-based retrieval) is a significant independent workstream. Sprint 3 delivers:
- The interface and connector runner (required for external_api anyway)
- The Truth Registry config extension
- A stub `DocumentFeedConnector` that returns `null` (no-op) until the document pipeline is ready

---

## CONTROL_OBJECT Changes: v2.1 → v2.2

| Field | Change |
|---|---|
| `trace.claim_sources[].truth_source` | Extended enum: adds `'external_api'`, `'document_feed'` |
| `human_attention_required.reasons[]` | Adds `'external_source_unavailable'` |
| `context.truth_profile_id` | Now formally references a connector-extended profile |
| `versions.system_version` | `'v2.2'` |

---

## Consequences

**Positive:**
- High-risk claims in Security/Compliance and SEO can now be confirmed or contradicted by authoritative sources, not just brief-matching
- Client document uploads create a personalised, project-specific truth surface
- Non-blocking design ensures no regression in pipeline reliability

**Negative / Risks:**
- Third-party API pricing and rate limits can make individual claim checks expensive at scale. Mitigation: only run connectors for `high_risk` claims (not medium/low) unless budget allows.
- Document feed creates a new data surface with privacy implications: client PDFs may contain sensitive information. Mitigation: document feed is scoped per audit (not shared across clients), and documents are not stored permanently.
- Connector quality varies widely. A low-quality connector that returns `'confirmed'` for everything degrades FACT-CHECKER reliability. Mitigation: each connector requires a QA eval dataset before `enabled: true`.

---

## Alternatives Considered

**Blocking on external verification:** Rejected. Production pipelines cannot depend on third-party uptime. Non-blocking is a hard requirement.

**Merging external_api and document_feed into one tier:** Rejected. They have different trust semantics — a regulatory authority database is more authoritative than a client's own market research document. Separate tiers preserve the priority ordering.

---

## References

- `server/src/services/truth-connectors/connector.interface.ts` — connector interface (Sprint 3, new)
- `server/src/services/truth-connectors/runner.ts` — ConnectorRunner with timeout (Sprint 3, new)
- `server/src/config/truth-registry.ts` — existing config (extend in Sprint 3)
- `server/src/services/fact-checker.ts` — calls ConnectorRunner for high-risk claims
- `server/src/schemas/control-object.ts` — truth_source enum extension
- `docs/adrs/ADR-TRUTH-REGISTRY-ASSUMPTIONS.md` — Phase 2 (original Truth Registry)
- `docs/adrs/ADR-PHASE-PROFILES.md` — external_truth_sources per phase profile
