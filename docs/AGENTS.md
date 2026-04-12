# Agent Architecture

## BaseAgent

Abstract class in `server/src/agents/base.ts`. All 8 domain agents + ReconAgent + StrategyAgent inherit from it.

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

Shared runtime (resolver, gates, bank JSON, choice “specify other” helpers) ships as the **`@glc/intake-core`** workspace package under `packages/intake-core`. Import it from app and server code by package name; the old `server/src/intake` tree is removed, and ESLint blocks importing it from `src/`. Decision record: [ADR-INTAKE-UNIFIED-QUESTION-BANK](./adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md).

Brief responses use **question-bank v1** ids (`a1`, `f1`, …). **Pre-brief / classic “identity”** is driven by **`modes.pre_brief.identityFieldIds`** in `intake-policy.v1.json` (currently bank stubs **`a11`**, **`a12`**, **`a2`**, **`a5`**) and built into **`INTAKE_IDENTITY_BRIEF_QUESTIONS`** / **`INTAKE_IDENTITY_FIELD_IDS`** in `@glc/intake-core` (`intake-brief-catalog-meta.ts`), plus conditional **`intake_industry_specify`** when industry is **Other**. Legacy alias keys (e.g. `intake_industry`) may still appear in stored rows; resolution projects them onto bank ids in-memory. **Revenue** is canonical bank id **`a10`**. SLA gates (`saveBriefResponses` / `assertBriefReady`) use **`resolveFullSlaRequiredIds` / `resolveExpressSlaRequiredIds`** from `@glc/intake-core` (visible stubs + branch + `collection_mode`). `ContextBuilder` maps **question-bank v1** answers per domain when responses include bank ids — mapping in [QUESTION_BANK.md](./QUESTION_BANK.md) §5; implementation via **`QUESTION_FEED_ROLES`** → domain maps in `@glc/intake-core`, `question-bank.v1.json` labels and per-id **`answer`** contract (`getQuestionBankAnswerContract`). The formatted prompt adds **Intake AI readiness (heuristic)** (0–100) when bank ids are present (`calcAiReadinessScore`, §8 in QUESTION_BANK). Choice options that need a follow-up text field use **`choiceValueNeedsSpecify` / `choiceSpecifyResponseKey`** from `@glc/intake-core` only (no duplicate SPA module). Free-text answers validate up to **`BRIEF_ANSWER_STRING_MAX`** (12k chars) in `server/src/schemas/intake-brief.ts`.

**Version tuple (`intake_versions`):** Persisted `{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }` should match the tuple the client used to render. Rows with **`NULL`** pre-date the matrix; the server validates those briefs with the **current** artifact bundle and resolver (see [API.md](./API.md)). On `PUT`, unsupported tuples → **400**; supported tuples are reconciled with the stored row — **the server is the source of truth** on save.

**Public intake / Discover rate limits:** Split per-route limiters live in `server/src/middleware/rate-limit.ts`. Without **`RATE_LIMIT_REDIS_URL`**, limiters use an **in-process** store, so counts do not aggregate across multiple server instances — use Redis-backed limits in horizontally scaled production.

**Deploy coordination:** Shipping mismatched SPA and API builds can still confuse UX even when `intake_versions` catches artifact drift on write; prefer aligned releases for `@glc/intake-core` behaviour.

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
| `ReconCollector` | `recon.ts` | Tech stack detection (80+ patterns), social profiles, contact info, structured data, image analysis |
| `SecurityCollector` | `security.ts` | HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type), SSL validity, cookie flags, CORS config |
| `SeoCollector` | `seo.ts` | Meta title/description, structured data from crawl; **robots-parser** for robots.txt; **fast-xml-parser** for sitemap urlset/index (bounded) |
| `PerformanceCollector` | `performance.ts` | Page weight from crawl, response headers; optional **Lighthouse** (today: **single-URL** on `companyUrl`) when `AUDIT_LIGHTHOUSE` or `AUDIT_DEEP_SCAN` is set — **target:** multi-URL / Unlighthouse-class sampling; see [ARCHITECTURE.md](./ARCHITECTURE.md#target-architecture-lighthouse-and-unlighthouse) |
| `AccessibilityCollector` | `accessibility.ts` | Alt text, headings, structured-data heuristics; optional **axe-core + Playwright** when `AUDIT_AXE_PLAYWRIGHT` or `AUDIT_DEEP_SCAN` is set |

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

**Collectors:** `CrawlerCollector`, `ReconCollector`

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

---

### SeoAgent — Phase 3

**Domain key:** `seo_digital` | **Collectors:** `SeoCollector`, `CrawlerCollector`

**Claude task:** Evaluate SEO completeness — meta tag quality, sitemap presence, structured data coverage, robots.txt correctness, internal linking, page title patterns.

---

### UxAgent — Phase 4

**Domain key:** `ux_conversion` | **Collectors:** `CrawlerCollector`, `AccessibilityCollector`

**Claude task:** Evaluate UX and conversion optimisation — navigation clarity, CTA presence and quality, mobile viewport, form usability, accessibility basics.

---

### MarketingAgent — Phase 5

**Domain key:** `marketing_utp` | **Collectors:** *(none — uses recon + review notes)*

**Claude task:** Evaluate marketing positioning and messaging — value proposition clarity, differentiation from competitors, target audience alignment, brand voice consistency. Heavily relies on consultant + interview notes from Gate 2.

---

### AutomationAgent — Phase 6

**Domain key:** `automation_processes` | **Collectors:** *(none — uses recon + tech data)*

**Claude task:** Evaluate operational automation — existing integrations detected, manual process signals, CRM/email/booking tool presence, automation gaps and opportunities.

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

| Industry | tech | security | seo | ux | marketing | automation |
|---|---|---|---|---|---|---|
| E-commerce | 1.2 | 1.1 | 1.4 | 1.5 | 1.3 | 1.0 |
| Hospitality | 0.9 | 0.9 | 1.3 | 1.5 | 1.2 | 0.8 |
| Healthcare | 1.1 | 1.5 | 1.0 | 1.1 | 0.9 | 1.1 |
| SaaS / Tech | 1.4 | 1.3 | 1.0 | 1.2 | 1.2 | 1.3 |
| Professional Services | 1.0 | 1.1 | 1.2 | 1.1 | 1.3 | 1.1 |
| Default | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |

Weights shown in the Strategy Lab for transparency.

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
