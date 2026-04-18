# ADR: Free snapshot — cheap deterministic scanner (website grader)

| Field | Value |
| --- | --- |
| **Status** | Accepted (implementation in progress; catalog and weights evolve) |
| **Date** | 2026-04-05 |
| **Scope** | `product_mode: free_snapshot`, public `/api/snapshot`, `SnapshotLanding`, `server/src/snapshot/*` |
| **Supersedes** | — |
| **Superseded by** | — (when materially changing this decision, add a new ADR that references this file instead of editing history in place) |
| **Decision owners** | Tech Lead + Backend / Platform (TBD) |

### ADR lifecycle

This document follows the usual ADR convention: **the decision record is immutable**. Editorial fixes (typos, links) are fine; **changing the architectural decision** should be done by publishing a **new ADR** that **supersedes** this one. Implementation may lag the ADR; gaps are listed explicitly at the end.

## Context

The free diagnostic must behave as a **mass-market website grader**, not a deep individual audit. Success metrics are **very low marginal cost per request**, **fast time-to-result**, and **enough plausibility** that users either agree with the baseline or see that conclusions are tied to observable signals (not random). Paid modes (`express`, `full`) remain the path to depth, evidence volume, and human-quality synthesis.

Market-standard free tools achieve this with **limited HTTP scope**, **simple DOM signals**, **rule-based scoring**, and **honest framing** (“baseline”, not “final verdict”).

Under **real traffic**, public grader APIs fail without explicit **abuse controls**, **SSRF hardening**, **robots politeness**, **observability**, **failure contracts**, **versioned outputs**, and **retention discipline**. Those are part of the same architectural decision as “cheap scanner”, not follow-up polish.

## Decision

We treat **free snapshot** as a **cheap deterministic scanner**:

- **No LLM** in the snapshot path.
- **No full-site crawl** — bounded same-origin sampling only.
- **No heavy browser work by default** — Playwright is a **conditional tier-3 fallback** when static HTML suggests a client-rendered shell or critically thin content, not a second full audit.
- **Hard caps** on pages, wall time, HTML bytes, and discovery breadth — predictable **cost and latency**.
- **Rule-based scoring** with **machine-readable catalogs** (YAML), **evaluator registry** in TypeScript, and **evidence strings** on every rule result for explainability.
- **Domain-level cache** (TTL hours) to collapse repeat cost on popular URLs.
- **Optional enrichments only on explicit user action** (e.g. competitor comparison after opt-in), not on every completion.

### Product framing (free vs paid)

| Layer | What the user gets | Technical stance |
| --- | --- | --- |
| **Free diagnostic** | Homepage-first + core signals + heuristic 0–100 score, 2 issues, 2 quick wins, advisory site profile | Bounded fetch + rules + cache |
| **Express audit** | More pages, deeper CRO/UX/technical review | Collectors + phased Claude, etc. |
| **Full audit** | Six domains, gates, strategy | Full pipeline |

### Three-tier scan model (normative intent)

| Tier | Name | Behaviour |
| --- | --- | --- |
| **1** | Ultra-cheap | Always: single homepage via HTTP, cheerio extraction (title/meta, headings, CTA, forms, schema, contact, tech fingerprints, nav/footer signals). |
| **2** | Cheap+ | Up to **N** additional same-origin URLs chosen from **nav/footer/body links**, prioritised by path hints (`/contact`, `/pricing`, `/about`, …), within the **same global time budget**. No crawl of the whole site. |
| **3** | Expensive fallback | **At most one** browser-rendered pass (homepage only unless we later extend explicitly), **only if** tier-1 HTML matches **client-shell / thin-content** heuristics. Must remain optional to disable (`SNAPSHOT_PLAYWRIGHT=0`) for hosts without Chromium. |

### Hard limits (targets; tune via env where noted)

| Limit | Target | Notes |
| --- | --- | --- |
| Extra pages after home | **≤ 3** | Implemented as `MAX_EXTRA_PAGES` in `fetch-tiered.ts`. |
| Browser-rendered pages (free) | **≤ 1** | Homepage replacement only in current code. |
| Wall-clock budget | **~8–12 s** | `SNAPSHOT_FETCH_BUDGET_MS` (default **10s** / 10,000 ms in code; override per deploy). |
| HTML per response | **≤ ~2–4 MB** | `MAX_HTML_BYTES` in fetch (currently 3 MB — within range). |
| Discovery link cap | **50–100** | `MAX_DISCOVERY_LINKS` = 80; link slug harvest capped separately (`SNAPSHOT_LINK_SLUG_LIMIT`, default 80). |

### Scoring model (target)

- **Overall**: 0–100, derived from **earned / max** over applicable rules (same formula family as today).
- **Four category scores** (UX clarity, conversion readiness, AI readiness, technical basics) — familiar grader UX.

**Target category weight budget (product intent):**

| Category | Target share of max points |
| --- | --- |
| UX clarity | **30%** |
| Conversion readiness | **30%** |
| AI readiness | **20%** |
| Technical basics | **20%** |

Implementation may **normalize by actual YAML `maxPoints` totals** until the catalog is aligned to these proportions; the **rule catalog should be edited** so category max sums approximate 30/30/20/20.

### Rule catalog (MVP → full)

- **v1 grader**: at least the **12 high-impact** rules (UX02, UX03, UX07, UX08, CV01, CV05, CV07, CV08, AI03, AI04, TB01, TB05 — codes may map to extended set).
- **Full catalog**: **36** checks as in the product spec (UX01–UX10, CV01–CV10, AI01–AI08, TB01–TB08), each with `pass | partial | fail` → score = `maxPoints * (0 | 0.5 | 1)`.

Rules are stored in **`server/config/snapshot/audit-rules.v1.yaml`**; evaluators in **`server/src/snapshot/audit/evaluators.ts`**; messages in **`server/src/snapshot/messages.ts`**. Site-type gating uses **`onlyForSiteTypes` / `skipForSiteTypes`** so free tier does not apply irrelevant checks.

### Top issues and quick wins

- Select **top 2** failing/partial rules by **severity × rule weight** (and similar), not by LLM.
- Quick wins come from a **fixed library** keyed by rule (`quickWinKey`), filtered to **low-effort, high-confidence** fixes (1–7 days narrative).

### Copy and trust policy (free tier)

- Use **observable, soft diagnostic** phrasing: “signals are limited”, “path looks unclear”, not “your site is bad” or “AI cannot find you”.
- **Site profile** (`site_profile`) is **advisory**; UI must surface **classification confidence** and avoid authoritative industry claims when confidence is low.

### Classification layer

- **`classification-rules.v1.yaml`** drives `siteType`, `industry`, `conversionModel`, etc., from the same **`SnapshotFacts`** contract as the auditor.
- **Risks** (wrong industry, conflicting signals, thin/SPA content, multilingual gaps, generic marketing hero) are mitigated by: **tie-break order**, **confidence caps**, **low content quality ceiling**, optional **debug signals** in logs — not by pretending certainty.
- **Explainability:** the API may include **`classification_transparency`** (matched YAML signal payloads, runner-up `siteType` counts, `tie_ambiguous`) alongside **`classification_version`** so clients can show “why we guessed this” without running the full audit pipeline.

### Cost controls (summary)

1. **Domain cache** — `snapshot_domain_cache` + env TTL.
2. **Rule engine** — no ML/LLM in snapshot.
3. **Conditional Playwright** — only when heuristics say raw HTML is insufficient; disable per env.
4. **Lazy extras** — competitor compare only via **`?compare=1`** (or equivalent) after user opt-in.

### Target relationship to full-audit performance (Lighthouse / Unlighthouse)

This ADR remains normative for **free snapshot**: **no Unlighthouse**, and **no mandatory Lighthouse** on the default public snapshot path.

**Shared product target** (see [ARCHITECTURE.md](../ARCHITECTURE.md#target-architecture-lighthouse-and-unlighthouse)): the **full audit** should move toward **multi-URL** Lighthouse coverage using an **Unlighthouse-class** orchestrator with hard caps. The **free snapshot** may, in the future, offer **at most one** programmatic Lighthouse run **only after explicit user opt-in** (or an equivalent paid/upsell gate) — not as an automatic step on every `POST /api/snapshot`. That keeps the mass-market grader cheap and fast while concentrating Chrome-heavy work in modes that expect it.

---

## Non-functional safeguards

### URL hygiene and SSRF controls

The public snapshot endpoint is an **SSRF risk surface**. Normative rules:

| Rule | Requirement |
| --- | --- |
| Schemes | **Only** `http:` and `https:`. |
| Hosts | Reject **localhost**, **loopback**, **link-local**, **private IP ranges** (RFC1918, CGNAT, etc.), **metadata/cloud metadata** hostnames, and ambiguous host forms after IDNA/punycode normalization. |
| Credentials | Reject URLs with **userinfo** (`user:pass@host`). |
| Redirects | **Cap redirect count**; re-validate each hop against the same SSRF rules (host + resolved IP where applicable). |
| DNS | Mitigate **DNS rebinding** by resolving and validating the target IP before fetch where the stack allows, consistent with other outbound collectors. |
| Content | Reject or short-circuit **non-HTML** primary responses for scoring (binary, `application/json` homepage, etc.) with a structured failure / degraded outcome (see Failure-mode policy). |

Implementation should align with existing URL validation used for audit collectors where possible ([SECURITY.md](../SECURITY.md)).

### Abuse protection and rate limiting

Public `/api/snapshot` must assume **abuse as default**. Normative controls:

| Control | Intent |
| --- | --- |
| **Per-IP rate limit** | Throttle anonymous burst traffic; tune for grader UX (human retries) vs cost. |
| **Per-session / per-device** (if available) | Secondary dimension when the client sends a stable anonymous token. |
| **Per-domain cooldown** | Limit how often the **same registrable domain** can trigger **fresh** fetches (distinct from cache TTL — cooldown caps **origin load** and “scan this victim” abuse). |
| **Burst control** | Token bucket or sliding window to avoid synchronized spikes. |
| **Max concurrent snapshot jobs** | Process-wide (or per-instance) limit + **queue shedding** (fast 503/429) under pressure. |
| **`compare=1` tier** | **Stricter** limits than baseline snapshot (extra egress + CPU). |
| **429 strategy** | Stable JSON error body: `retry_after` hint, error code; avoid partial bodies. |
| **CAPTCHA / proof-of-human** | **Optional** later layer for anonymous bursts; not required for MVP if IP + domain limits are sufficient. |

Inventory (env-driven limits, current thresholds) should stay documented in [API.md](../API.md) / [SECURITY.md](../SECURITY.md).

### Robots.txt, user-agent, and crawl politeness

Bounded fetch is not a license to ignore crawler norms. Normative policy:

| Topic | Policy |
| --- | --- |
| **User-Agent** | A **custom, identifying** UA string (product name + contact URL or support email) so operators can recognize traffic and reach out. |
| **robots.txt** | **Fetch and parse** for the target host; **cache** parsed rules with TTL (avoid hammering `robots.txt` on every request). |
| **Disallow** | **Honor `Disallow` for tier-2 extra pages** at minimum. For **homepage**: if policy is **restrictive** (e.g. disallow `/` or all), **do not fetch**; return structured outcome with `limitations` (see Failure-mode). |
| **Crawl-delay** | **Best-effort** delay between same-host requests when `Crawl-delay` is present and time budget allows. |
| **Absent robots** | If `robots.txt` is missing or unreachable, proceed with **conservative** defaults (minimal pages, strict timeouts) — document behavior in API notes. |

`robots.txt` is not a complete legal shield; it is the **standard operational contract** between scanners and site operators.

---

## Public API response contract (normative)

Clients (UI, analytics, integrations) must not infer fields that are not part of the contract. **Minimum** conceptual shape for a successful snapshot payload (names may match existing `API.md` types; evolve via versioning):

| Area | Required / expected fields |
| --- | --- |
| Scores | `overall_score`, `category_scores` (four keys or explicit map) |
| Narrative | `summary` or equivalent short string |
| Action | `issues` (≤2 for free tier), `quick_wins` (≤2) |
| Understanding | `site_profile` (advisory), classification confidence |
| Trust | `confidence` / `scan_confidence_band` for the **scan**, distinct from classification |
| Context | `scan_basis`, `coverage`, `limitations` |
| Provenance | `versions` (see below), `scanned_at`, `cache_hit` |
| Explainability | Per-rule or aggregated `evidence` available to UI where product allows (see Redaction) |

**Versions block (mandatory in API evolution):**

| Field | Meaning |
| --- | --- |
| `ruleset_version` | Audit YAML / packaged rules identity (e.g. `audit-rules.v1` semver or content hash) |
| `classification_version` | Classification rules identity |
| `fetch_strategy_version` | Tiered fetch + Playwright policy version |
| `snapshot_engine_version` | Optional single rollup for support |

Scores **will** change when catalogs change; versions make support and analytics honest.

---

## Coverage semantics and `scan_basis`

**Coverage** (normalized object on the response):

| Field | Semantics |
| --- | --- |
| `pages_requested` | Count of URLs the engine intended to fetch (home + extras). |
| `pages_fetched` | Successfully retrieved HTML (HTTP success + parseable). |
| `pages_rendered` | Count of Playwright-rendered pages (0 or 1 in free tier today). |
| `sampled_paths` | Array of pathnames or full URLs actually used (for transparency). |
| `content_quality` | Enum or band: e.g. `high` / `medium` / `low` (thin shell, etc.). |
| `used_playwright` | Boolean. |

**`scan_basis`** (enum; single string the UI can show):

| Value | Meaning |
| --- | --- |
| `homepage_only` | Only home HTML (by policy or failure). |
| `homepage_plus_core_pages` | Home + at least one extra same-origin page within budget. |
| `homepage_rendered_fallback` | Playwright used for homepage (or replacement) due to shell/thin signals. |
| `degraded` | Partial fetch or blocked path; see `limitations`. |
| `cache_hit` | Served from domain cache without fresh fetch (may still echo last `scan_basis` from stored metadata). |

---

## Failure-mode policy

The API must **not** leave the UI to guess. Normative behavior matrix (implement incrementally; document deltas in Gap list):

| Condition | Outcome |
| --- | --- |
| **Global timeout** | If **some** HTML (e.g. home) exists: **partial score** on available facts, `scan_basis=degraded`, `limitations` includes timeout. If **no** usable HTML: error response with same structured `limitations`, no fabricated score. |
| **robots.txt blocks** | No fetch of disallowed URLs; if home blocked: **no score**, structured error + `limitations`. If only extras blocked: **partial**, `homepage_only` or degraded basis. |
| **Anti-bot / challenge page** (e.g. Cloudflare interstitial) | Treat as **low content quality**; **partial or null score** depending on extractability; `limitations` explains challenge detected; do not bypass CAPTCHAs. |
| **Binary / non-HTML home** | No DOM facts: **error** or empty grader with `limitations`. |
| **Parked / placeholder page** | Heuristics + thin content → **low confidence**, possibly **partial** score with strong `limitations`. |
| **Login wall** | Thin public HTML → **degraded**, low confidence, partial if any signals exist. |
| **Playwright unavailable** (`SNAPSHOT_PLAYWRIGHT=0` or install failure) | **Never** hard-fail the whole product if HTTP home worked; **skip render**, cap classification confidence, set `used_playwright=false`, `limitations` if shell heuristic suggested render. |

**Retry:** 429 and transient 5xx may include `retry_after`; **do not** imply automatic server retry on the same request.

---

## Observability and auditability

Rule YAML and heuristics **cannot** evolve safely without telemetry.

| Area | Requirement |
| --- | --- |
| **Structured logs** | One line (or JSON) per completed snapshot with: `snapshot_id` / `request_id`, domain hash or registrable domain, outcome, duration, cache hit, Playwright used, fetch failure class. |
| **Trace IDs** | Propagate **request id** from edge to fetch to rules; include in support tooling. |
| **Metrics** | At least: **cache hit rate**, **Playwright fallback rate**, **p50/p95 latency**, **fetch failure counts by class**, **rule outcome distribution**, **classification confidence histogram**, **tie / conflict rate** (if logged). |
| **Dashboards** | Product/engineering view for the above (vendor-agnostic: define metric names in runbooks). |
| **Internal debug payload** | Optional admin-only or debug flag: `matchedSignals`, `rejectedSignals`, per-rule evidence — **not** exposed in public JSON by default. |
| **Redaction** | Evidence and stored payloads must apply a **redaction policy** for logs (truncate HTML, strip cookies, limit body snippets); avoid logging full PII from footers. |

---

## Data retention, caching, and PII

| Topic | Policy |
| --- | --- |
| **What is cached** | Normative: **derived artifact** (facts JSON, scores, profile, coverage metadata, versions) keyed by domain; **avoid** storing full raw HTML in long-lived cache unless required for debugging — if stored, **short TTL** and **access restricted**. |
| **TTL** | Domain cache TTL env-driven; document in [API.md](../API.md) / [DATABASE.md](../DATABASE.md). |
| **PII** | Homepage extraction may surface **phones, emails, addresses, names** from schema/footer. **Minimize** persistence: prefer derived signals (“contact present”) over raw strings in cache; if raw strings exist, treat as **sensitive** and apply retention/redaction. |
| **Purge** | Support **operator purge by domain** (and document legal/process owner). |

---

## Shared contract governance (`SnapshotFacts`)

| Rule | Requirement |
| --- | --- |
| **Single canonical contract** | One TypeScript type / schema for **`SnapshotFacts`** (or equivalent) consumed by **classifier** and **auditor**. |
| **Evolution** | **Backward-compatible** field additions preferred; breaking changes bump **`fetch_strategy_version`** or facts schema version and require migration notes. |
| **Extraction** | **Tech fingerprints** and **schema type extraction** live in **shared libs** (`site-html-signals`, extractors), not duplicated in ad-hoc routes. |
| **Changes** | Any extractor change **requires fixture tests** (see Testing strategy). |

---

## Testing strategy

| Layer | Requirement |
| --- | --- |
| **HTML fixtures** | Representative pages per **site type** (SaaS, local business, ecommerce, thin SPA shell, etc.). |
| **Rule regression** | Unit tests per evaluator + golden **rule outcomes** for fixtures. |
| **YAML drift** | When audit or classification YAML changes, run tests that assert **category weight totals** or **max score budgets** against expected bands. |
| **Golden domains** | Optional smoke: 1–3 stable external domains in CI behind feature flag or recorded mocks (avoid flaky network). |
| **SSRF / URL** | Tests for blocked IPs, redirect loops, disallowed schemes. |

---

## UX: disagreement and automation bias

Free graders are **wrong often**; the product should **invite verification**, not authority.

| Rule | Requirement |
| --- | --- |
| **Evidence** | Response and UI should expose **short evidence snippets** tied to issues (what was observed on the page). |
| **Copy** | Encourage users to **check their own hero, forms, and schema**; avoid language that implies final judgment. |
| **Low confidence** | When scan or classification confidence is low, UI **must** state that the result is a **baseline from visible signals** only. |
| **Positioning** | Frame tool as **decision support**, not certification. |

---

## Implementation map (this repo)

| Piece | Location |
| --- | --- |
| Tiered fetch + coverage | `server/src/snapshot/fetch-tiered.ts` |
| Playwright fallback | `server/src/snapshot/playwright-fetch.ts`, gated in `fetch-tiered.ts` |
| Facts extraction | `server/src/snapshot/extract-facts.ts`, shared tech/schema `server/src/lib/site-html-signals.ts` |
| Tech stack fingerprints | `server/src/lib/tech-wappalyzer-detect.ts`, generated `server/src/lib/wappalyzer-imported-rules.ts`, ingest `server/scripts/ingest-webappalyzer.mjs` (`pnpm ingest:wappalyzer` in `server/`) |
| Classification | `server/config/snapshot/classification-rules.v1.yaml`, `server/src/snapshot/classification/*` |
| Audit rules + runner | `server/config/snapshot/audit-rules.v1.yaml`, `server/src/snapshot/audit/*` |
| Pipeline + persistence | `server/src/services/pipeline.ts`, `server/src/snapshot/run-snapshot.ts` |
| Public API | `server/src/routes/snapshot.ts` |
| Domain cache | `server/migrations/020_snapshot_domain_cache.sql`, `server/src/snapshot/cache.ts` |
| Shared cooldown (optional) | `server/migrations/021_snapshot_domain_cooldown.sql`, `server/src/snapshot/abuse-guards.ts` (`SNAPSHOT_SHARED_ABUSE_STORE`) |
| Shared fresh concurrency (optional) | `server/migrations/022_snapshot_fresh_lease.sql`, `acquireSnapshotFreshConcurrency` / `releaseSnapshotFreshConcurrency` in `abuse-guards.ts` |
| Operator shared metrics | `server/src/snapshot/snapshot-operator-metrics-shared.ts` |
| Optional competitor | `server/src/lib/snapshot-competitor.ts` (opt-in on GET) |
| UI | `src/app/pages/SnapshotLanding.tsx` |

---

## Consequences

### Positive

- Predictable **unit economics** and **latency** for a high-volume free funnel.
- **Explainable** output (evidence per rule) supports grader-style trust.
- Clear **upgrade story** to Express/full without duplicating the same work as a “mini full audit”.
- **Operable** product: abuse boundaries, observability, and versioned outputs reduce incident and support load.

### Negative / trade-offs

- Free results are **not exhaustive** and must be **clearly labeled** in UI/API (`scan_basis`, `scan_confidence_band`, coverage metadata).
- **Playwright** increases ops complexity (browser binaries); must remain **skippable** where install is impractical.
- **36-rule catalog** and **30/30/20/20** weight alignment require ongoing YAML/editorial work.
- **Non-functional work** (rate limits, robots, metrics, SSRF tests) is **mandatory surface area**, not optional hardening.
- **Immutable ADRs** mean catalog tweaks that change the *decision* need a **new ADR**; day-to-day YAML updates stay in implementation as long as the decision stands.

---

## Snapshot auth — wow first, then sign-up

**Goal:** Visitors see results **without** a registration wall. **`POST /api/snapshot`** is public: **httpOnly** **`glc_snapshot_guest`** cookie + **`snapshot_guest_sessions`** funnel row; audit starts with **`client_id = null`**. **`POST /api/snapshot/claim`** (JWT) attaches the audit after sign-in. **Supabase Anonymous sign-ins** are optional (legacy only).

**Server:** `POST /api/snapshot` does **not** use `requireAuth`. **`GET /api/snapshot/:token`** and **`GET /quota`** stay public.

**Frontend:** **`SnapshotLanding`** uses **`fetch(..., { credentials: 'include' })`** and stores **`glc_pending_snapshot_token`** for **`/login`** → **`claim`**.

**Upgrade:** Prefer **claim** over **`linkIdentity`** for snapshot saves; optional **`linkIdentity`** remains for narrow flows.

---

## Gap list (explicit)

Normative items above may **outpace** current code. Track at least:

1. **Audit catalog size** — **Done (v4 YAML):** 36-rule grid with evaluators and messages.
2. **Category weight alignment** — **Done:** **30/30/20/20** enforced in catalog + drift test.
3. **Fetch default budget** — **Done:** default **10s** (`SNAPSHOT_FETCH_BUDGET_MS`), ADR-aligned **~8–12s** band.
4. **Classification YAML** — **Improved:** **v5** — title tokens from all sampled pages feed slug signals; **service-business** no longer fires on generic `/contact`/`/about` slugs alone (**`minMatch: 3`**); **`classification_transparency`** in snapshot outputs; banks still evolve with product.
5. **Abuse controls** — **Improved:** optional **shared** cooldown (`snapshot_domain_cooldown`) + **shared fresh concurrency** (`snapshot_fresh_lease` RPCs) with **`SNAPSHOT_SHARED_ABUSE_STORE`**; compare limit remains **per process**.
6. **SSRF parity** — **Improved:** redirect hop re-validation + **per-target-hostname** DNS checks on redirect chains (see `fetch-public-http-url.test.ts`); keep aligned with [SECURITY.md](../SECURITY.md).
7. **Robots.txt** — **Done** in implementation; empty `Disallow:` line and merge behavior covered in tests — re-verify further edge cases if crawlers misbehave in the wild.
8. **Response contract** — **Done** for listed fields; **`scan_coverage`** extended with anomaly flags.
9. **Observability** — **Improved:** [SECURITY.md](../SECURITY.md#snapshot-observability--log-redaction-runbook) runbook (redaction allowlist, Loki example, alerts) + [DEPLOYMENT.md](../DEPLOYMENT.md) hosted-dashboard notes; operator metrics include shared lease headcount when the store is on.
10. **Retention** — **Improved:** cache strips contacts; **`audit_recon.contact_info`** cleared on free-snapshot persist; operator purge API.
11. **Failure-mode matrix** — **Improved:** ordered WAF/challenge taxonomy (`challenge_taxonomy`); parked weak-hint suppression when JSON-LD / tel / mailto / internal path links + visible text suggest a live SMB site; `spa_shell_thin_html` for no-copy root mounts with many scripts; **residual gap:** edge cases that mimic both (e.g. marketing sites with extreme script count and little static text).
12. **CAPTCHA for snapshot** — optional Turnstile (or similar) on **login** or the snapshot form if **anonymous** bursts become an issue; IP/server rate limits for snapshot remain as today.
13. **Lighthouse split (snapshot vs full audit)** — **Target:** [ARCHITECTURE.md](../ARCHITECTURE.md#target-architecture-lighthouse-and-unlighthouse) — full audit evolves toward **multi-URL** (Unlighthouse-class); snapshot stays **without default Lighthouse**, optional **single-URL** only on explicit opt-in. **Today:** pipeline uses **one** Lighthouse URL when deep-scan env is on; snapshot still runs **zero** Lighthouse on the default path.

---

## Related documents

- [API.md](../API.md) — public snapshot contract and env vars.
- [PRODUCT.md](../PRODUCT.md) — `free_snapshot` mode description.
- [DEPLOYMENT.md](../DEPLOYMENT.md) — Playwright on Railway.
- [DATABASE.md](../DATABASE.md) — `snapshot_domain_cache`.
- [SECURITY.md](../SECURITY.md) — SSRF, URL validation, rate limits (align snapshot with platform rules).
