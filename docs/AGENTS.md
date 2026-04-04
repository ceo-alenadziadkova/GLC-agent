# Agent Architecture

## BaseAgent

Abstract class in `server/src/agents/base.ts`. All 8 domain agents + ReconAgent + StrategyAgent inherit from it.

```typescript
abstract class BaseAgent {
  abstract get phaseNumber(): number;
  abstract get domainKey(): string;
  abstract getCollectors(): BaseCollector[];
  abstract buildInstructions(ctx: AgentContext): string;
  abstract get outputSchema(): ZodSchema;

  async run(): Promise<DomainResult> {
    // Step 1: Collect (no AI)
    await this.emitEvent('collecting');
    const collectedData: Record<string, unknown> = {};
    for (const collector of this.getCollectors()) {
      collectedData[collector.name] = await collector.collect(this.auditId);
    }

    // Step 2: Assemble context
    await this.emitEvent('assembling_context');
    const context = await this.contextBuilder.build(this.auditId, this.domainKey, collectedData);

    // Step 3: One Claude call
    await this.emitEvent('analyzing');
    const response = await this.callClaude(context);

    // Step 4: Fact-check
    const verified = await this.factChecker.verify(response, collectedData);

    // Step 5: Save + emit
    await this.saveDomainResult(verified.result);
    await this.tokenTracker.log(this.auditId, this.phaseNumber, response.usage);
    return verified.result;
  }
}
```

---

## Intake context & question bank

On each brief save and when building agent context, **`mergeLegacyResponsesIntoBankV1`** (`server/src/intake/legacy-to-bank.ts`) fills empty bank slots from legacy ids (`primary_goal`→`f1`, `intake_company_website`→`a5`, …) without overwriting real bank answers; persisted on `saveBriefResponses` / `assertBriefReady`. `ContextBuilder` merges legacy brief fields with **question-bank v1** answers per domain when responses include bank ids (`a1`, …) — mapping in [QUESTION_BANK.md](./QUESTION_BANK.md) §5; implementation in `server/src/intake/` (`DOMAIN_TO_QUESTION_IDS`, `question-bank.v1.json` labels). The formatted prompt adds **Intake AI readiness (heuristic)** (0–100) only for those briefs (`calcAiReadinessScore`, §8 in QUESTION_BANK). Free-text answers validate up to **`BRIEF_ANSWER_STRING_MAX`** (12k chars) in `server/src/schemas/intake-brief.ts`.

---

## Collectors

Data gatherers in `server/src/collectors/`. Run before any AI call. Results cached in `collected_data`.

| Collector | File | Collects |
|---|---|---|
| `CrawlerCollector` | `crawler.ts` | Fetches up to 20 pages; parses HTML with cheerio; returns page tree |
| `ReconCollector` | `recon.ts` | Tech stack detection (80+ patterns), social profiles, contact info, structured data, image analysis |
| `SecurityCollector` | `security.ts` | HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type), SSL validity, cookie flags, CORS config |
| `SeoCollector` | `seo.ts` | Meta title/description, Open Graph tags, canonical URLs, sitemap.xml, robots.txt, JSON-LD schema markup |
| `PerformanceCollector` | `performance.ts` | Page weight (HTML/CSS/JS sizes), image optimisation hints, resource hints, lazy loading |
| `AccessibilityCollector` | `accessibility.ts` | Alt text coverage, ARIA landmark usage, form label associations, color contrast hints (heuristic) |

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

Validates Claude's scored output against raw metrics to prevent hallucinated scores.

**Rules:**
- SEO score ≥ 4 but no sitemap found → max score capped at 3, flag added
- Security score ≥ 4 but CSP header missing → flag for consultant review
- "No SSL" claim but collector found valid cert → override to correct fact
- Score significantly out of range for metric density → log discrepancy

All corrections logged to `pipeline_events` (type: `fact_check`). Frontend shows correction count in phase details.

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
