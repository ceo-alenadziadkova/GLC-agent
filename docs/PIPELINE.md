# AI Pipeline

## Phase Map

```
Phase 0  Recon             ──┐
                              │ Review Gate 1 (after recon)
Phase 1  Tech Infrastructure ─┤
Phase 2  Security & Compliance│  Auto Wing (phases 1–4 in parallel)
Phase 3  SEO & Digital        │
Phase 4  UX & Conversion    ──┤
                              │ Review Gate 2 (after auto wing)
Phase 5  Marketing & UTP    ──┤  Analytic wing (5–6 in parallel)
Phase 6  Automation & Processes│  then Phase 7 Strategy (sequential; no gate between 6 and 7)
Phase 7  Strategy Synthesis ──┘
                              │ Review Gate 3 (after strategy; full mode only)
```

---

## Per-Phase Execution Model

Every phase runs the same 5-step sequence:

```
COLLECT (no AI) → ASSEMBLE CONTEXT → CALL CLAUDE (1 call) → FACT-CHECK → SAVE + EMIT
```

### Step 1: Collect
Programmatic data gathering — no API calls to Claude. Collectors use `cheerio` + `fetch` to extract structured data from the target site. Results cached in `collected_data` table. If a phase is retried, collectors are skipped and cached data is reused.

### Step 2: Assemble Context
`ContextBuilder` compiles a briefing for Claude:
- Raw collector output for this phase
- Recon profile (company, industry, tech stack)
- Results of all previously completed domains
- Review notes from any approved review gates
- Industry benchmarks for the domain
- Domain-specific analysis instructions
- Expected JSON output schema

### Step 3: Call Claude
Single `claude-sonnet-4-20250514` call using `tool_use` with a strict JSON schema. Claude **analyses and scores** — it does not collect data. Token usage is logged to `pipeline_events` (type: `token_usage`).

### Step 4: Fact-Check
`FactChecker` validates Claude's output against raw metrics:
- If Claude scores SEO 4/5 but sitemap is missing → flag + request score adjustment
- If Claude says "no SSL" but collector found valid cert → override to accurate value
- Corrections are logged in `pipeline_events` (type: `fact_check`)

### Step 5: Save + Emit
- Writes result to `audit_domains` (or `audit_recon` / `audit_strategy`)
- Updates `audits.status` and `audits.tokens_used`
- Emits events to `pipeline_events` which Supabase Realtime pushes to the frontend

---

## Review Gates

Review gates pause the pipeline and let the consultant enrich the context before the next block of phases.

| Gate | After Phase | Before / notes |
|---|---|---|
| Gate 1 | Phase 0 (Recon) | Auto wing (phases 1–4) |
| Gate 2 | Phase 4 (last of auto wing) | Analytic wing (phases 5–6) then Strategy (phase 7) |
| Gate 3 | Phase 7 (Strategy) | Report / delivery (no further automated phases) |

**Full mode** uses review phases `[0, 4, 7]` (`server/src/types/audit.ts`). **Express** uses `[0, 4]`. **Free snapshot** uses no review gates.

Approve with `POST /api/audits/:id/reviews/:phase` where `phase` matches the completed block (`0`, `4`, or `7`). See [API.md](./API.md).

When a gate is reached:
1. Backend emits `review_needed` event to `pipeline_events`
2. Frontend `PipelineMonitor` shows the `ReviewPointModal`
3. Consultant optionally adds:
   - **Consultant notes** — observations not visible on the website (e.g. "recently migrated to Shopify")
   - **Interview notes** — client's answers to generated questions
4. Approval → `POST /api/audits/:id/reviews/:phase` → notes stored in `review_points` table
5. Backend includes notes in context for all subsequent phases
6. Pipeline resumes with next phase

---

## Retry & Recovery

- **Phase-level retry**: A failed phase can be re-run without re-running previous phases
- Cached `collected_data` is reused on retry — only the Claude call is repeated
- **Exponential backoff**: 3 retries on Claude API errors (429, 500, timeout), delays: 1s → 4s → 16s
- If all retries fail, phase status → `failed`, audit status → `failed`, error logged in `pipeline_events`
- Frontend shows "Retry Phase" button for failed phases

---

## Token Tracking

Every Claude call logs token usage via `TokenTracker`:

```typescript
// Written to pipeline_events (event_type: 'token_usage')
{
  input_tokens: 4200,
  output_tokens: 850,
  model: 'claude-sonnet-4-20250514',
  cost_usd: 0.018
}
```

- `audits.tokens_used` is updated after each phase
- Before each phase: `if (tokens_used + estimated_phase_tokens > token_budget) → abort`
- Default budget: **200,000 tokens** per audit (~$3 at current rates)
- Budget is configurable per audit via `audits.token_budget`
- Frontend shows running token total in PipelineMonitor

---

## Orchestrator (`services/pipeline.ts`)

The orchestrator manages the full lifecycle:

```typescript
class PipelineService {
  async startPipeline(auditId: string): Promise<void>    // Phase 0
  async runNextPhase(auditId: string): Promise<void>     // Next pending phase
  async retryPhase(auditId: string, phase: number): Promise<void>
  async getStatus(auditId: string): Promise<PipelineStatus>
}
```

Phase sequencing logic:
1. Determine next phase from `audit_domains` statuses
2. Check for pending review gate — if yes, emit `review_needed` and stop
3. Check token budget
4. Instantiate correct agent for the phase
5. Run agent (collect → assemble → call → verify)
6. Update `audits.status` based on completed phases
7. If all phases complete → compute weighted overall score → set `audits.status = 'completed'`

---

## Weighted Overall Score

Computed after Phase 7 completes:

```typescript
overallScore = domainScores.reduce((sum, { key, score }) => {
  return sum + score * industryWeights[industry][key];
}, 0) / totalWeight;
```

See [AGENTS.md#industry-weights](./AGENTS.md#industry-weights) for weight tables.
