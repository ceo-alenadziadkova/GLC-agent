# Agent Architecture

## BaseAgent

Abstract class in `server/src/agents/base.ts`. All domain agents plus `ReconAgent` and `StrategyAgent` inherit from it (currently 8 agents total: 6 domain + recon + strategy).

High-level flow (domain agents, after collect):

1. **Assemble context** → `ContextBuilder.build(auditId, domainKey, collectedData)` (typed collector map).
2. **Claude** → `callClaudeWithRetry` (single tool-use call, Zod-validated).
3. **Fact-check** → `FactChecker.verify(result, domainKey, collectedData)` returns corrected `DomainResult`, corrections, and scalar confidence.
4. **CONTROL_OBJECT v1** (domain phases only) → `FactChecker.buildControlObject(...)` stores advisory structured governance on `lastControlObject` (no `decision_hint` from FactChecker; the orchestrator’s **Decision Layer** sets the final hint before `control_object` is written to `pipeline_events`).
5. **Return** corrected result; **persist** domain row happens in `PipelineOrchestrator` via `saveDomainResult` after governance events.

Recon and Strategy skip the FactChecker / CONTROL_OBJECT path (no collector-vs-output verification in the same shape).

See [PIPELINE.md](./PIPELINE.md) (Fact-Check, Decision Layer, event types) and [ADR-CONTROL-OBJECT-V1](./adrs/ADR-CONTROL-OBJECT-V1.md).

---

## Intake context & question bank

**Package:** Shared intake (question bank JSON, resolver, SLA gates, `choiceValueNeedsSpecify` / `choiceSpecifyResponseKey`, `@glc/intake-core`) — import by package name only; decision record [ADR-INTAKE-UNIFIED-QUESTION-BANK](./adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md).

**Canonical documentation:** Bank ids, branching, mapping into agent context, AI readiness heuristic → [QUESTION_BANK.md](./QUESTION_BANK.md). **HTTP contracts** for brief/version tuples and errors → [API.md](./API.md). **Diagnostic adaptive intake — roadmap vs implementation (G1–G13, F1/F2, KPI wire-up):** [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md](./adrs/ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md).

**Pipeline-relevant summary:** `ContextBuilder` maps question-bank answers into domain prompts when responses use bank ids. Persisted **`intake_versions`** must match what the client rendered; server validates on write (**server is source of truth**). **Public intake / Discover** rate limits: `server/src/middleware/rate-limit.ts` — use **`RATE_LIMIT_REDIS_URL`** when running multiple API instances. Prefer **aligned** SPA + API releases when changing `@glc/intake-core` semantics.

### Legacy removal guardrail (semantic parity)

Before removing a legacy compatibility branch (key alias, old payload shape, fallback mapper), verify semantic parity with the current canonical flow:

1. **Meaning parity:** canonical path carries the same business signal and intent (not just a similarly named field).
2. **Direction parity:** downstream behavior is equivalent in outcome (visibility, gates, policy decisions, persisted cells).
3. **Coverage proof:** targeted tests and contract docs are updated in the same change; if parity cannot be proven, narrow legacy path with explicit guardrails instead of deleting blindly.

---

## Collectors

Data gatherers in `server/src/collectors/`. Run before any AI call. Results cached in `collected_data`.

| Collector | File | Collects |
|---|---|---|
| `CrawlerCollector` | `crawler.ts` | Fetches up to **`CRAWLER_MAX_PAGES`** pages (default 20, clamped 1–100 via `server/src/config/crawler-limits.ts`); parses HTML with cheerio; returns page tree |
| `SecurityCollector` | `security.ts` | HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type), SSL validity, cookie flags, CORS config |
| `SeoCollector` | `seo.ts` | Meta title/description, structured data from crawl; **robots-parser** for robots.txt; **fast-xml-parser** for sitemap urlset/index (bounded) |
| `PerformanceCollector` | `performance.ts` | Page weight from crawl, response headers; optional **Lighthouse** (today: **single-URL** on `companyUrl`) when `SYSTEM_DEFAULTS.auditDeepScan.lighthouseEnabled` (or umbrella `deepScanEnabled`) is enabled — **target:** multi-URL / Unlighthouse-class sampling; see [ARCHITECTURE.md](./ARCHITECTURE.md#target-architecture-lighthouse-and-unlighthouse) |
| `AccessibilityCollector` | `accessibility.ts` | Alt text, headings, structured-data heuristics; optional **axe-core + Playwright** when `SYSTEM_DEFAULTS.auditDeepScan.axePlaywrightEnabled` (or umbrella `deepScanEnabled`) is enabled |
| `MarketingCollector` | `marketing.ts` | Marketing copy and positioning signals from crawl + lightweight extraction for `marketing_utp` |

### BaseCollector interface

```typescript
interface BaseCollector {
  name: string;
  collect(auditId: string): Promise<Record<string, unknown>>;
}
```

---

## Agent Roster

### ReconAgent — Phase 0

**Collectors:** `CrawlerCollector`

**Claude task:** Interpret crawled data → produce:
- Company name, industry, location, business model
- Technology stack summary
- Social profiles and contact info
- Value proposition (inferred)
- Suggested interview questions for the consultant

**Output saved to:** `audit_recon`

---

### TechAgent — Phase 1

**Domain key:** `tech_infrastructure` | **Collectors:** `CrawlerCollector`, `PerformanceCollector`

**Claude task:** Evaluate hosting infrastructure, framework choices, CDN usage, dependency hygiene, performance signals, technical debt indicators.

---

### SecurityAgent — Phase 2

**Domain key:** `security_compliance` | **Collectors:** `SecurityCollector`

**Claude task:** Score security posture — SSL config, HTTP security headers, cookie security, CORS policy, known vulnerability signals.

**Prompt contract (baseline vs deep):**

- **Baseline (pipeline default):** `server/prompts/security_compliance.md` — externally observable security signals + intake-driven compliance scoping.
- **Deep (optional, not part of the default single-phase call):** **CSO Director** — a separate two-stage deep audit pattern documented in `docs/adrs/ADR-CSO-DIRECTOR-V1.1-THREAT-PROGRAM.md` (client-selected “zones” split across **Compliance & privacy governance** vs **Security operations & engineering**, access-aware internal evidence depth).

---

### SeoAgent — Phase 3

**Domain key:** `seo_digital` | **Collectors:** `SeoCollector`, `CrawlerCollector`

**Claude task:** Evaluate SEO completeness — meta tag quality, sitemap presence, structured data coverage, robots.txt correctness, internal linking, page title patterns.

---

### UxAgent — Phase 4

**Domain key:** `ux_conversion` | **Collectors:** `CrawlerCollector`, `AccessibilityCollector`

**Claude task:** Evaluate UX and conversion optimisation — navigation clarity, CTA presence and quality, mobile viewport, form usability, accessibility basics.

**Prompt contract (baseline vs deep):**

- **Baseline (pipeline default):** `server/prompts/ux_conversion.md` — structured `DomainOutputSchema` output from crawl + accessibility/UX signals, with lightweight **conversion economics** framing (directional only; no fabricated financial precision).
- **Deep (optional, not part of the default single-phase call):** **CDO Director** — a separate two-stage deep audit pattern documented in `docs/adrs/ADR-CDO-DIRECTOR-TWO-STAGE.md`, with orchestration rubric in `docs/instructions/CDO-INSTRUCTIONS.md` (client-selected “zones”, access-aware analytics depth, prioritization + dependency graph + experimentation backlog).

---

### MarketingAgent — Phase 5

**Domain key:** `marketing_utp` | **Collectors:** `MarketingCollector` (+ recon/review context)

**Claude task:** Evaluate marketing positioning and messaging — value proposition clarity, differentiation from competitors, target audience alignment, brand voice consistency. Heavily relies on consultant + interview notes from Gate 2.

---

### AutomationAgent — Phase 6

**Domain key:** `automation_processes` | **Collectors:** *(none — uses recon + tech data)*

**Claude task:** Evaluate operational automation — existing integrations detected, manual process signals, CRM/email/booking tool presence, automation gaps and opportunities.

**Prompt contract (baseline vs deep):**

- **Baseline (pipeline default):** `automation_processes` domain phase — intake/recon-driven diagnosis of operational bottlenecks and automation readiness.
- **Deep (optional, not part of the default single-phase call):** **Automation & Processes Director** — a separate two-stage deep audit pattern documented in `docs/adrs/ADR-AUTOMATION-DIRECTOR-V1.1-OPERATIONAL-NERVOUS-SYSTEM.md` (client-selected zones split across **Process governance & operating design** vs **Automation operations & implementation**, with access-aware depth, prioritization, dependency graph, build-vs-buy paths, and operational economics + risk/observability discipline).

---

### StrategyAgent — Phase 7

**Domain key:** `strategy` | **Collectors:** *(none — reads all domain results)*

**Claude task:** Synthesise all 6 domain analyses + all review notes into:
- Executive summary
- Weighted overall score
- Quick wins (≤1 week, €0–500)
- Medium-term initiatives (1–3 months, €1K–6K)
- Strategic initiatives (3–6 months, €6K–20K)
- Cross-domain dependencies

**Output saved to:** `audit_strategy`

**Orchestration note (product direction, not the default pipeline call today):**

- **GLC Orchestrator (Meta-Director)** is the cross-domain “decision graph engine” contract for turning multiple Director outputs into **one** dependency-aware execution plan (conflict resolution + global prioritization). See `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and the human prompt canon in `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`.
- **Pipeline today:** Phase 7 remains `StrategyAgent` synthesis into `audit_strategy`. The Orchestrator is the intended evolution once Director outputs are normalized into the machine-readable action graph contract.

## Director Prompt Governance

- Director sub-agent prompts are treated as deep-research contracts and must remain analytically strong and progressive by default.
- This applies to all director tracks (CMO, CTO, and any future director families).
- Prompt maintenance must not lower investigation depth, scope coverage, evidence standards, or reasoning strictness.
- If contracts diverge, align implementation to the prompt intent by strengthening schema constraints, deterministic fallbacks, and regression tests instead of simplifying prompt requirements.
- New director-family onboarding is complete only when prompt, schema, fallback, and schema-rigor tests are added together; partial onboarding is not allowed.
- Coverage gate is enforced by `server/src/tests/director-schema-rigor-coverage.test.ts`, which requires one `director-<family>-schema-rigor.test.ts` per `server/src/schemas/sub-agents/<family>`.

---

## Fact Checker (`services/fact-checker.ts`)

Validates Claude's scored output against raw metrics to prevent hallucinated scores. User-visible correction strings and score band labels load from `server/src/config/fact-checker-copy.v1.json` (thresholds stay in `fact-checker-thresholds.ts`).

**Rules:**
- SEO score ≥ 4 but no sitemap found → max score capped at 3, flag added
- Security score ≥ 4 but CSP header missing → flag for consultant review
- "No SSL" claim but collector found valid cert → override to correct fact
- Score significantly out of range for metric density → log discrepancy

All corrections logged to `pipeline_events` (type: `fact_check`). Frontend shows correction count in phase details.

**CONTROL_OBJECT v1:** `buildControlObject()` derives counts, confidence dimensions, errors, assumptions, and trace from the verified result (issues, recommendations, corrections). **Routing** (`accept` / `accept_with_warnings` / `refine`) is owned by `DecisionLayer` in `server/src/services/decision-layer.ts`, not duplicated inside FactChecker.

---

## Industry Weights

Defined in `server/src/config/industry-weights.ts`.

Each industry has a multiplier per domain (default 1.0). Overall score = weighted average.

Weights are versioned in code and may change over time; use `server/src/config/industry-weights.ts` as canonical source, and Strategy Lab as runtime display.

---

## Structured Output Enforcement

All Claude calls use `tool_use` with a JSON schema. Zod schemas in `server/src/schemas/domain-output.ts` validate the response:

```typescript
const DomainOutputSchema = z.object({
  score: z.number().int().min(1).max(5),
  label: z.enum(['Critical', 'Needs Work', 'Moderate', 'Good', 'Excellent']),
  summary: z.string().min(50),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  issues: z.array(IssueSchema),
  quick_wins: z.array(QuickWinSchema),
  recommendations: z.array(RecommendationSchema),
});
```

If validation fails: retry with a corrective prompt appended ("Your previous response did not match the required schema. Please fix: ..."). Max 2 validation retries per phase.
