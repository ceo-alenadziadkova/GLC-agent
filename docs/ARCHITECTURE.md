# System Architecture

## Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              React 18 SPA  (Vite + TypeScript)              │
│                  Deployed on Vercel                         │
└───────────────┬─────────────────────┬───────────────────────┘
                │  REST API calls      │  Supabase Realtime
                │  /api/*              │  (WebSocket)
                ▼                     ▼
┌───────────────────────┐   ┌─────────────────────────────────┐
│   Express Backend     │   │         Supabase Cloud          │
│  Node.js + TypeScript │   │   PostgreSQL + Auth + Realtime  │
│   Deployed on Railway │   │     EU Frankfurt (GDPR)         │
└───────────┬───────────┘   └─────────────────────────────────┘
            │                         ▲
            │  Service role key        │  Reads/writes DB
            └─────────────────────────┘
            │
            │  Anthropic API
            ▼
┌───────────────────────┐
│   Claude API          │
│  claude-sonnet-4-     │
│  20250514             │
└───────────────────────┘
```

## Component Responsibilities

### Frontend (React/Vite → Vercel)

- Renders all UI surfaces: public, protected, and admin routes with reusable components
- Manages auth state via `useAuth()` (Supabase JS client)
- Submits audit creation and pipeline actions to backend via `apiService.ts`
- Subscribes to `pipeline_events` and `audits` tables via Supabase Realtime for live updates
- **Never** calls Claude directly — all AI goes through the backend

### Backend (Express → Railway)

- Validates Supabase JWT on every protected request (`middleware/auth.ts`)
- Owns the full pipeline orchestration contract; API routes enqueue pipeline jobs and worker processes execute phases
- Uses Supabase **service role key** to bypass RLS for server-side reads/writes
- One Claude API call per pipeline phase; never streams to frontend (Realtime handles progress)
- Enforces rate limits and token budget

#### Queue-backed execution state

Pipeline execution now uses a queue + worker runtime for durability:

- enqueue path: `server/src/routes/pipeline.ts` → `server/src/services/pipeline-jobs.ts`
- worker path: `startPipelineWorker()` in `server/src/index.ts`
- persistent execution state in DB: `job_runs` and `phase_runs` (migration `039_pipeline_runs_and_rls_hardening.sql`)

`job_runs` and `phase_runs` track status (`queued`/`running`/`completed`/`failed`/`dead_letter`), lease owner, lease expiry, and heartbeat timestamps so stuck/failing jobs can be diagnosed without relying on process memory.

#### Public routes, abuse control, and scaling

Unauthenticated surfaces (Discover, tokenized pre-brief intake, marketing brief) rely on **split per-route limiters** in `server/src/middleware/rate-limit.ts` (see env vars in [ADR-INTAKE-UNIFIED-QUESTION-BANK](./adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md) operational notes). That mitigates abuse but is **not** a full product security boundary by itself.

**Horizontal scale:** public limiters use `**RedisStore`** when `**RATE_LIMIT_REDIS_URL**` is set. Snapshot quota (`GET /api/snapshot/quota` and `POST /api/snapshot`) shares the same distributed store when Redis is configured. If Redis is unset, fallback is process-local memory and counters do not aggregate across instances.

**Authenticated brief writes (`intake_versions`):** supported artifact tuples are validated on **PUT**; unsupported → **400**, mismatch with stored row → **409** (except allowed upgrades). The **server** persists answers and the effective tuple — clients cannot force an unsupported bundle or skip validation by tuple alone. See [API.md](./API.md).

**SPA vs API releases:** the stored **version tuple** and PUT rules reduce “client rendered one bank snapshot, server validated another” drift; they do **not** remove every UX edge case if the SPA and API ship incompatible `@glc/intake-core` resolver changes out of sync. Prefer **aligned** frontend and backend releases when changing intake semantics.

### Supabase (PostgreSQL + Auth + Realtime)

- PostgreSQL stores all persistent state (audits, domains, strategy, events, intake brief, client portal tables — see [DATABASE.md](./DATABASE.md))
- Auth issues JWTs for frontend users; backend verifies them
- Realtime publishes row changes from `pipeline_events` and `audits` to subscribed frontend clients
- RLS enforces data isolation; consultants and linked clients have distinct access patterns — policies evolve with migrations ([DATABASE.md](./DATABASE.md))

### Anthropic Claude

- Called exclusively from backend agents (one call per phase)
- Uses `tool_use` with JSON schema to guarantee structured output
- Model: `claude-sonnet-4-20250514`

---

## Configuration layering (config vs database vs services vs UI)

Use this split when adding a new “setting” so it lands in the right place and can be unified later instead of spreading literals.

### 1. Deploy-time config (environment variables + config modules)

**What belongs here:** values that apply to **the whole backend or frontend build**, differ by **environment** (dev / staging / production), and do **not** need to vary per audit, user, or row in Postgres. Secrets and rate-limit numbers stay in env — never in source.

**Where it lives:** `server/.env` (+ `server/.env.example`), root `.env` for `VITE_*`, and TypeScript readers under `**server/src/config/`** (single place per concern). Shared non-secret defaults used by both app and tooling may live in `**packages/glc-dev-brand-defaults**` (dev ports/origins) or `**packages/intake-core**` when the contract must be identical on server and SPA (e.g. `ensureHttpsUrl`, `**INTAKE_UI_CONFIG**` in `packages/intake-core/src/config/intake-ui-config.ts` for intake UX toggles and caps — read via `intake-flags.ts` with **no** `INTAKE_*` / `VITE_INTAKE_*` env overrides; use DB/feature flags when runtime toggles are needed, **marketing brief → recommended route**). When `**PORT`** is unset, the Express entrypoint uses `**GLC_DEV_API_PORT**` from `@glc/dev-brand-defaults` (same default the Vite proxy documents) instead of a second magic number in `server/src/index.ts`.

**Rule of thumb:** one value for the entire deployed **server instance** → **env + `server/src/config/*`**. Public build-time values for the browser → `**VITE_***` + small modules under `src/app/lib/`.

### 2. Database-backed state and policy

**What belongs here:** anything that must **differ per persisted entity** at the same time (audits, briefs, clients, future org/tenant rows), participate in **RLS**, or be **audited / migrated** with data. Examples: `audits.company_url`, `intake_brief` payloads, pipeline status, `job_runs` / `phase_runs`, notification rows.

**Rule of thumb:** if two customers could need **different** values **simultaneously**, store policy or state in **Postgres** (and enforce access in migrations / RLS), not in a single global env var.

**Optional pattern:** env provides **global defaults**; a future `org_settings` (or similar) table holds **overrides** per tenant — services merge DB over config.

### 3. Service layer (orchestration)

**What belongs here:** **how** the system combines config, DB, and external APIs: `PipelineOrchestrator`, brief validation, snapshot runner, notifications delivery. Services **read** policies; they should not introduce new product constants that belong in §1 or §2.

**Rule of thumb:** if it is “glue code” or a deterministic algorithm with **no** tunable product parameter, keep it in the service; if it is a **tunable threshold or string** reused across routes, move it to `**server/src/config/`** or the DB.

### 4. UI layer (React SPA)

**What belongs here:** presentation, routing, loading states, and **user-visible copy**. The SPA uses `**VITE_*`** only for values that are safe to expose and fixed at build time (API base URL, public support email, optional feature flags).

**Rule of thumb:** the **server remains the source of truth** for data invariants (e.g. stored sentinel URLs, validation). The UI displays what the API returns; avoid duplicating server-only rules in the client except for UX hints — and keep those hints aligned with `**@glc/intake-core`** where the contract is shared.

### Strict layer boundaries (operational policy)

Tightening boundaries is **rules + structure + checks**, not one large refactor. Env allowlist lives in `[server/.env.example](../server/.env.example)` (secrets + deploy wiring + integrations); product numerics belong in **`SYSTEM_DEFAULTS`**. See [DEPLOYMENT.md — Environment layers](./DEPLOYMENT.md#environment-layers-infrastructure-vs-ops-overrides).

#### ENV (infrastructure and secrets)

**Allowed:** service URLs, API keys, connection strings, `NODE_ENV`, host/port when the platform injects it, public URLs for CORS and brand/sentinel parity (as in production today).

**Do not use env for:** product limits as the *primary* source, alert thresholds, industry weights, or consultant allowlist membership (source of truth: **`consultant_email_allowlist`** in Postgres; platform admin ACL: **`profiles.is_platform_admin`** plus optional **`platform_settings.legacy_platform_admin_user_ids`** — **`PLATFORM_ADMIN_USER_IDS`** is deprecated and ignored; see `docs/DEPLOYMENT.md`).

**Process:** do not add a new `process.env.FOO` without documenting it in `**server/.env.example`** (or the ops-tuning tables in [DEPLOYMENT.md](./DEPLOYMENT.md)) with a one-line purpose.

#### Documented ops exceptions (env overrides for incidents)

These variables tune **product-adjacent** behaviour without a deploy when operations need a quick lever. Defaults remain in **`SYSTEM_DEFAULTS`** or focused config modules; env wins when set. Prefer **database-backed feature flags** or admin settings for anything that should change often, differ per tenant, or be owned by product — treat the list below as **escape hatches**, not the primary configuration model.

| Variable | Purpose | Default when unset |
| -------- | ------- | ------------------ |
| **`PIPELINE_CLAUDE_MODEL_ID`** / **`ANTHROPIC_MODEL`** | Override the pipeline Claude model id (`PIPELINE_CLAUDE_MODEL_ID` wins if set; else `ANTHROPIC_MODEL`). | `SYSTEM_DEFAULTS.pipelineModel.claudeModelId` (see `server/src/config/model.ts`) |
| **`SENTRY_TRACES_SAMPLE_RATE`** | Traces sampling rate for Sentry (`0.0`–`1.0`). | `SYSTEM_DEFAULTS.observability.sentryTracesSampleRateDefault` (see `server/src/config/sentry.ts`) |
| **`SENTRY_TRACE_LINK_TEMPLATE`** | Optional deep-link template for alert copy; `{trace_id}` placeholder. | No link; raw `trace_id` in text |
| **`TRACE_LINK_TEMPLATE`** | Optional second trace URL template for alerts; `{trace_id}` placeholder. | Omitted |
| **`ANTHROPIC_BASE_URL`** | Anthropic-compatible API base (proxy / regional gateway). | SDK default |

**`SENTRY_DSN`**, **`TELEGRAM_BOT_TOKEN`**, **`TELEGRAM_CHAT_ID`**, Redis URLs, and similar entries are **infrastructure**, not ops exceptions — they belong in env as the normal case.

#### CONFIG (`server/src/config/*.ts`)

Non-secret values that define **default product behavior**: timeouts, limits, fact-checker thresholds, pagination defaults, observability trimming, etc.

**Policy:** add new numeric defaults to `**SYSTEM_DEFAULTS`** / focused config modules; **do not** add env reads for product limits/thresholds unless there is an explicit infra reason (documented in `server/.env.example`).

#### SERVICES (`server/src/services/*.ts`)

**Orchestration only:** combine config, DB, and external APIs. Avoid long user-facing strings and magic limit/threshold literals.

**Review rule:** a new limit or threshold literal in `services/*.ts` belongs in `**server/src/config/`**.

#### DB

Runtime policy and operational data that can change without a code release: roles, `**consultant_email_allowlist**`, `**platform_settings**`, user and audit rows. Prefer tables over env for allowlists and operator-tunable policy.

#### CMS (intake-core JSON / registry)

Product questionnaire content and discovery/intake answer text: `**packages/intake-core**` JSON and registry modules. Stable HTTP `**code**` values and typed error bodies live in `**server/src/config/api-error-codes.ts**`; default English `**error**` strings for those codes live in `**server/src/config/api-user-messages.en.json**` (loaded via `**api-user-messages.en.ts**`, re-exported from `api-error-codes.ts`). Dynamic messages (interpolated role, phase, Zod text, etc.) stay as small functions in `**api-error-codes.ts**`. **Do not** fold API error contract copy into the question bank.

#### FRONT (Vite SPA)

`**VITE_*`:** only what must be embedded in the browser build (public API base URL, public support email, sentinel parity, feature flags).

Other UI strings: modules such as `src/app/config/*-copy.en.ts`, or server-driven / brand fetch where the product already uses that path.

#### Enforcement mechanics

- **ESLint rule or script (optional, not implemented today):** forbid `process.env` under `services/` except a small whitelisted adapter (e.g. a future `server/src/config/load-env.ts`).
- **CI:** [release-gate](../.github/workflows/release-gate.yml) runs `**scripts/hardcode-inventory.sh`** (report-only) to surface new URL literals and large numeric literals.
- **PR checklist:** see [§6 — PR checklist (layers and env)](#pr-checklist-layers-and-env) below.

**Optional follow-up:** a single env-read adapter so all `process.env` access goes through one module — a separate, small change when you want it.

### 5. Versioned product copy (intake-core JSON)

Some strings are **not** “SPA-only copy”: they must match across **Express (PDF, reports)**, **public APIs**, and the **React app**. Those live as **versioned JSON** next to the resolver, not scattered in services:

- **Questionnaire and logic:** `[question-bank.v1.json](../packages/intake-core/src/question-bank.v1.json)`, `[intake-policy.v1.json](../packages/intake-core/src/intake-policy.v1.json)`, branch/layout artifacts — single source for stems, options, visibility rules.
- **Shared UI labels + future i18n keys:** `[ui-copy-registry.v1.json](../packages/intake-core/src/ui-copy-registry.v1.json)` (loaded by `[ui-copy-registry.ts](../packages/intake-core/src/ui-copy-registry.ts)`) — domain names, 1–5 score labels/colors, report profile titles/descriptions, marketing-brief route labels; each row includes an `**i18nKey`** for later catalogs.
- **Discovery → brief edge cases:** `[discovery-brief-fallbacks.v1.json](../packages/intake-core/src/discovery-brief-fallbacks.v1.json)` — regex/fallback option text and legacy `c_nosite_1` labels so TS does not hardcode drift-prone literals.
- **Synthetic brief cells from Discovery:** `[discovery-brief-contract.v1.json](../packages/intake-core/src/discovery-brief-contract.v1.json)` defines **stored** `uses_crm` tokens (`uses_crm:yes` / `uses_crm:no`, locale-agnostic), **English labels**, and `**glc.brief.usesCrm.*` i18n keys**. New conversions write the stored tokens; readers should use `**normalizeUsesCrmBriefStoredValue`** so legacy rows that still hold `Yes` / `No` stay valid.

**Rule of thumb:** if marketing, reporting, and the API must show the **same English** (or the same **stable key**), put it in **intake-core JSON** (or env for secrets), not in a random route handler. Page-only marketing prose can stay in components until i18n; then prefer keys that map to the same registry where possible.

### 6. User-visible copy layering (single source per zone)

Intake JSON, server modules, and the SPA all contain strings. Treat that as **three coordinated zones**, not one mega-file. **One semantic phrase → one owning module**; other layers link, fetch, or import — they do not paraphrase the same product meaning twice without a reason.

#### Copy zones (ownership)


| Zone                                | Owner                    | Where it lives                                                                                                                                                                                                    | Examples                                                                                        |
| ----------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Intake / Discovery**              | Question bank + resolver | `packages/intake-core` (`*.json`, `ui-copy-registry`, discovery brief artifacts)                                                                                                                                  | Question stems, options, branch labels, shared score/domain labels for PDF + API + UI           |
| **Public brand (runtime)**          | Deploy / white-label     | `GET /api/public/brand` — `[server/src/config/public-brand-config.ts](../server/src/config/public-brand-config.ts)`; dev defaults in `[@glc/dev-brand-defaults](../packages/glc-dev-brand-defaults/src/index.ts)` | Product name, public support email (optional in payload), legal line, marketing footer template |
| **HTTP API errors**                 | Backend contract         | `[api-error-codes.ts](../server/src/config/api-error-codes.ts)` (`API_ERROR_CODES`, dynamic `*Message` helpers), `[api-user-messages.en.json](../server/src/config/api-user-messages.en.json)` / `[api-user-messages.en.ts](../server/src/config/api-user-messages.en.ts)` (static English `*_MESSAGE`, including `COMPANY_URL_VALIDATION_EXAMPLE` for URL hint placeholder `{example}`) | Stable `code` + English `error` for clients                                                     |
| **Operational / consultant alerts** | Ops                      | e.g. `[server/src/config/alert-messages.en.ts](../server/src/config/alert-messages.en.ts)`                                                                                                                        | Telegram / in-app pipeline alerts (not end-user marketing)                                      |
| **Payload hints (server-authored)** | Backend feature          | e.g. `[upgrade-free-snapshot-context.en.json](../server/src/config/upgrade-free-snapshot-context.en.json)` (+ `[upgrade-free-snapshot-context.ts](../server/src/config/upgrade-free-snapshot-context.ts)`); numeric caps in `SYSTEM_DEFAULTS.upgradeFreeSnapshotPrefill` | Strings embedded in persisted or API payload shapes                                             |
| **SPA-only UX**                     | Frontend                 | `src/app/config/*-copy.en.ts` (e.g. `[login-copy.en.ts](../src/app/config/login-copy.en.ts)`), then components                                                                                                    | Login tabs, placeholders, client-side validation messages before a request                      |


#### Namespace convention (documentation + future keys)

Use these **logical prefixes** in docs and in future i18n catalogs (no requirement to rename existing exports today):

- `intake.bank.*` / `intake.ui.*` — from intake-core JSON / registry (`i18nKey` rows where present).
- `api.<ERROR_CODE>` or `api.validation.*` — server error surface.
- `app.auth.login.*`, `app.settings.*`, … — SPA page modules.
- `ops.alert.*` — alert copy.
- `brand.public.*` — values exposed via `GET /api/public/brand` (not duplicated as marketing literals when the page can fetch brand).

#### Cross-cutting brand and support email

- **Marketing shell / public pages** should prefer `**fetchPublicBrandConfig()`** (`[src/app/lib/public-brand.ts](../src/app/lib/public-brand.ts)`) for `**brand_name**`, `**footer**`, and `**public_site_url**` instead of hardcoding the product name in every route.
- **Support email (marketing SPA):** canonical value is `**support_email**` in `[packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json](../packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json)` (package **`@glc/dev-brand-defaults`**), exposed by `**GET /api/public/brand**` and consumed via `[PublicBrandContext](../src/app/marketing/PublicBrandContext.tsx)`. `[src/app/lib/support-email.ts](../src/app/lib/support-email.ts)` re-exports **`GLC_DEV_SUPPORT_EMAIL`** (from that JSON) as a synchronous placeholder before the brand request resolves. Do not introduce a divergent contact string without documenting precedence — see [DEPLOYMENT.md — White-label and dev defaults](./DEPLOYMENT.md#white-label-and-dev-defaults-environment-matrix).

#### API errors vs SPA copy

- Prefer `**code**` from JSON error bodies for branching and future localization; treat `**error**` as a safe English fallback ([API.md — Error responses](./API.md#error-responses)).
- **Do not** duplicate the same API `error` string in SPA config “for nicer wording” unless product explicitly wants two variants; if both must exist, centralize a **single client map** keyed by `code` in one module.

#### Anti-patterns

- Same legal or product disclaimer pasted in footer, login, and email templates with small edits.
- Intake question text retyped in the server or SPA instead of using bank ids / registry keys.
- New user-visible string added in a **service** file — belongs in config copy or intake JSON.

#### PR checklist (copy)

- New string has a **named zone** (table above) and a **single source** file.
- No second source for the **same user-visible meaning** unless intentional (document why).
- Public marketing uses **brand fetch** where `brand_name` / footer should follow white-label.

#### PR checklist (layers and env)

- New **server env** vars are **infrastructure or documented ops override** only; product defaults for numbers live in `**server/src/config/`** (e.g. `**SYSTEM_DEFAULTS**`) first — env overrides, not invents, behavior (see [Strict layer boundaries](#strict-layer-boundaries-operational-policy)).

### Decision checklist (where does this new knob go?)


| Question                                               | If **yes** → prefer                                                                                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same for entire deployment; no per-row variance?       | `**server/src/config/`** defaults first; **env** only for secrets or documented ops overrides (and `VITE_*` when the browser must know) — [strict boundaries](#strict-layer-boundaries-operational-policy) |
| Must differ per audit, user, org, or need RLS?         | **Database** (+ migration)                                                                                                                                                                                 |
| Secret or must not ship to the client?                 | **Server env only**                                                                                                                                                                                        |
| Pure “how we wire steps” with no new tunable constant? | **Service** module                                                                                                                                                                                         |
| Wording, layout, i18n?                                 | **UI** (`src/app/config/*-copy.en.ts` or components; see **§6 User-visible copy layering**)                                                                                                                |
| Same copy for PDF + API + SPA (scores, domains, bank)? | **intake-core JSON** (§5)                                                                                                                                                                                  |
| Stable HTTP error `code` + default English message?      | `**server/src/config/api-error-codes.ts**` + `**server/src/config/api-user-messages.en.json**` (re-exported together — see §6 table **HTTP API errors**)                                                     |


**Inventory of server config modules:** see [DEPLOYMENT.md — Configuration centralization](./DEPLOYMENT.md#configuration-centralization-avoid-drift).

### Hardcode inventory (repeatable audit)

Run `[scripts/hardcode-inventory.sh](../scripts/hardcode-inventory.sh)` for a heuristic pass over URLs, env reads, and large numeric literals. The script **skips** paths treated as library- or vendor-scale so audits focus on product code:

- `server/src/snapshot/`** (snapshot engine, including fetch-tiered / heuristics under that tree)
- `server/src/lib/wappalyzer-imported-rules.ts`
- `server/src/lib/site-html-signals.ts`
- `**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**`, `server/scripts/seed-demo.ts`

---

## Data Flow: Creating and Running an Audit

```
1. User submits URL in NewAudit.tsx
2. Frontend → POST /api/audits → backend creates audit row (status: 'created')
3. Frontend navigates to /pipeline/:id, subscribes to pipeline_events via Realtime
4. User clicks "Start" → POST /api/audits/:id/pipeline/start
5. Backend:
   a. Runs ReconAgent (Phase 0):
      - CrawlerCollector fetches up to the configured page limit (no AI; see [AGENTS.md](./AGENTS.md))
      - ReconCollector extracts tech stack, social profiles, structured data (no AI)
      - ContextBuilder assembles briefing
      - One Claude call → company profile JSON
      - FactChecker validates result
      - Saves to audit_recon + audit_domains
      - Emits pipeline_events rows
6. Supabase Realtime → frontend receives events → PipelineMonitor updates UI
7. Review gate: frontend shows "Approve" button
8. User approves → POST /api/audits/:id/reviews/0 with optional notes
9. Backend runs Auto Wing (Phases 1–4) **in parallel**, then emits review gate 2 if configured for the product mode
10. User approves gate 2 → Analytic Wing (Phases 5–6) **in parallel**, then Phase 7 (Strategy) **without** a gate between 6 and 7
11. After Strategy completes, review gate 3 (phase `7` in the reviews API) when in full mode
12. audit.status → `completed`, overall_score set
13. User navigates to /reports/:id and /strategy/:id
```

Details: [PIPELINE.md](./PIPELINE.md). API: [API.md](./API.md).

---

## Decision Layer and CONTROL_OBJECT (Phase 1)

**FactChecker** (`server/src/services/fact-checker.ts`) corrects domain output and builds **CONTROL_OBJECT v1** (structured counts, confidence, errors, trace, assumptions). It does not own phase routing.

**DecisionLayer** (`server/src/services/decision-layer.ts`) reads the CONTROL_OBJECT and returns `accept`, `accept_with_warnings`, or `refine` using configurable thresholds (`DECISION_LAYER_THRESHOLDS`). The orchestrator sets the canonical `decision_hint` on the object and persists:

- `pipeline_events.event_type = 'control_object'` — full snapshot under `data.control_object`.
- `pipeline_events.event_type = 'refine_recommended'` — when `refine` (advisory; pipeline does not block or auto-rerun in Phase 1).

**ConsistencyChecker** (`server/src/services/consistency-checker.ts`) remains a separate post-wing mechanism; it emits `quality_gate` and must not be confused with CONTROL_OBJECT.

ADR: [ADR-CONTROL-OBJECT-V1](./adrs/ADR-CONTROL-OBJECT-V1.md), [ADR-DECISION-LAYER-GATES](./adrs/ADR-DECISION-LAYER-GATES.md).

---

## ADR — TypeScript-first (v1)


| Field           | Decision                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Status**      | Accepted                                                                                                                  |
| **Context**     | Ship snapshot, express, and full audit flows on the existing Node/TypeScript stack and Supabase.                          |
| **Decision**    | Orchestration, collectors, agents, API, and reports stay **TypeScript** (Express, Zod, Anthropic SDK).                    |
| **Consequence** | Optional Python (heavy crawl, OCR, ML) is **out of scope** for v1 unless promoted later with explicit ADR and infra work. |


---

## Monorepo Layout

```
/                        ← Git root
├── src/                 ← Frontend source
│   └── app/
├── public/
├── index.html
├── vite.config.ts
├── package.json         ← Root workspace package (pnpm)
├── pnpm-workspace.yaml  ← Workspace packages
├── docs/                ← All documentation (this folder)
├── packages/
│   └── intake-core/     ← Shared intake runtime (`@glc/intake-core`)
├── server/              ← Backend source
│   ├── src/
│   ├── migrations/
│   └── package.json     ← Backend package (pnpm workspace member)
├── CLAUDE.md            ← Claude Code context file
└── README.md
```

---

## Open-source collector libraries

Server-side crawling still uses Cheerio and custom BFS; the following libraries extend **robots.txt**, **sitemap XML**, and optional **deep audits**:


| Concern                                                       | Package                                                                                                                   | Notes                                                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| robots.txt (Allow/Disallow, wildcards, crawl-delay, Sitemap:) | [robots-parser](https://www.npmjs.com/package/robots-parser) ([repo](https://github.com/samclarke/robots-parser))         | Used for snapshot policy (`server/src/snapshot/robots-guard.ts`) and SEO collector checks (`server/src/collectors/seo.ts`).                                                           |
| Sitemap urlset + sitemap index                                | [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)                                                          | Bounded recursive fetch in `server/src/lib/sitemap-discovery.ts`.                                                                                                                     |
| Programmatic Lighthouse                                       | [lighthouse](https://www.npmjs.com/package/lighthouse) + [chrome-launcher](https://www.npmjs.com/package/chrome-launcher) | Gated by `AUDIT_LIGHTHOUSE` / `AUDIT_DEEP_SCAN`; see [Using Lighthouse programmatically](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md#using-programmatically). |
| Accessibility rules in a real browser                         | [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) + [Playwright](https://playwright.dev/)        | Gated by `AUDIT_AXE_PLAYWRIGHT` / `AUDIT_DEEP_SCAN`.                                                                                                                                  |
| Multi-URL Lighthouse orchestration (target full audit)        | [Unlighthouse](https://github.com/harlan-zw/unlighthouse) (MIT)                                                           | **Not integrated yet.** Preferred direction for **capped** site sampling + Lighthouse runs across multiple URLs (see subsection below). Context7: `/harlan-zw/unlighthouse`.          |


### Target architecture: Lighthouse and Unlighthouse

**Goal:** separate **marginal-cost-sensitive** paths (free snapshot) from **depth-first** paths (full audit) for all Chrome-heavy performance work.


| Mode                                 | Target direction                                                                                                                                                                                                                                                                                                                      | Where we are today                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Full audit** (consultant pipeline) | **Multi-URL performance sampling**: run Lighthouse across a **bounded** set of URLs derived from the crawl (key templates, not the whole site). Implement as an **Unlighthouse-class** flow (Unlighthouse itself or equivalent orchestration), with strict caps on URL count, wall time, and concurrency so deploys stay predictable. | **Interim:** `PerformanceCollector` runs **one** programmatic Lighthouse pass on the submitted `companyUrl` via `server/src/lib/lighthouse-audit.ts`, gated by `AUDIT_LIGHTHOUSE` / `AUDIT_DEEP_SCAN`. |
| **Free snapshot** (`/api/snapshot`)  | **No Unlighthouse.** Stay within [ADR-FREE-SNAPSHOT-SCANNER.md](adrs/ADR-FREE-SNAPSHOT-SCANNER.md): tiered HTTP + cheerio, optional Playwright for thin homepage only. **Optional future product:** at most **one** **explicit opt-in** programmatic Lighthouse (single URL) — never a default on every anonymous completion.         | **Matches target for “no Lighthouse default”:** snapshot does not call Lighthouse; snapshot Playwright stays scoped to the ADR.                                                                        |


**Rationale:** Full audit promises depth across real pages; snapshot promises speed and low marginal cost. A multi-page Chrome farm on default snapshot traffic would break latency and cost SLOs unless it is strictly opt-in and separately budgeted.

**Context7 library IDs** (for `query-docs` when the MCP is available): `/googlechrome/lighthouse`, `/naturalintelligence/fast-xml-parser`, `/microsoft/playwright`, `/dequelabs/axe-core`. The npm `robots-parser` project is not indexed on Context7; use the [package README](https://github.com/samclarke/robots-parser/blob/master/README.md) or npm page.

---

## Key Architectural Decisions


| Decision                                                | Rationale                                                                                     |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Supabase Realtime instead of SSE/WebSocket from Express | Realtime is already available via Supabase; avoids maintaining a separate event stream server |
| Service role key only on backend                        | Anon key on frontend can only access rows permitted by RLS — prevents data leaks              |
| One Claude call per phase                               | Maximises context quality, minimises token waste from intermediate calls                      |
| Collectors separated from agents                        | Allows retrying analysis without re-crawling; raw data cached in `collected_data` table       |
| Railway for backend                                     | Zero-config Node.js deployment; easy env var management; no cold starts on hobby tier         |
| EU Frankfurt Supabase region                            | GDPR compliance for EU clients                                                                |


---

## Logical audit state

There is no single `audit_state.json` file in production. Persistent state is normalised across PostgreSQL tables listed in [DATABASE.md](./DATABASE.md). A JSON “document” shape is useful for exports and debugging only.

**Intake contract:** progressive layers, collection modes, and field semantics are defined in product terms in [PRODUCT.md](./PRODUCT.md#intake-experience-progressive-model) (`intake_brief` table plus derived readiness fields — see [DATABASE.md](./DATABASE.md)).

**Unified intake resolver (ADR):** Runtime entry point `buildIntakePlan()` ships in the workspace package `**@glc/intake-core`** (`[packages/intake-core](../packages/intake-core/src/index.ts)`). Canon rules: `[branch-rules.ts](../packages/intake-core/src/branch-rules.ts)` + `[question-bank.v1.json](../packages/intake-core/src/question-bank.v1.json)`. Policy artifact: `[intake-policy.v1.json](../packages/intake-core/src/intake-policy.v1.json)`. Layout artifact: `[layout-rules.v1.json](../packages/intake-core/src/layout-rules.v1.json)`. The SPA imports `**@glc/intake-core**` (e.g. `[src/app/hooks/useIntakeWizard.ts](../src/app/hooks/useIntakeWizard.ts)`, `[src/app/lib/discovery-flow.ts](../src/app/lib/discovery-flow.ts)`). Server build compiles the package to `packages/intake-core/dist` before `tsc`. Full decision record: [ADR-INTAKE-UNIFIED-QUESTION-BANK.md](adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md).

**Classic consultant brief catalog:** Rows for the “all sections” / interview UI are built in `**intake-brief-catalog-meta.ts`** from policy `**modes.classic_brief.main**` (export `**BRIEF_QUESTIONS**`). `**GET /api/audits/:id/brief**` returns `**getBriefQuestionsByIds(plan.visible)**` — only ids present in `**plan.visible**`, not the whole catalog. **Pre-brief public link** (`GET /api/intake/:token`) prepends `**INTAKE_IDENTITY_BRIEF_QUESTIONS`** (`**modes.pre_brief.identityFieldIds**` as bank stems + conditional `**intake_industry_specify**`) before the same `**plan.visible**` slice. Details: [QUESTION_BANK.md](./QUESTION_BANK.md), [API.md](./API.md).