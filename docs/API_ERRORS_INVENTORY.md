# API error strings inventory (`routes`)

**Maintenance:** After changing route `error` literals, run `./scripts/api-errors-inventory.sh` (prints `rg` matches to **stdout**) and update the grouped tables (**Group A** onward) from that output — avoid letting tables drift from code. You may hand-edit the **`## Stable code field`** summary when codes change, but keep it aligned with `api-error-codes.ts`.

**Contract and SoT:** Stable `code` values and default messages → `api_error_codes` and `api-user-messages.en.json`. Human overview → [API.md — Error Responses](./API.md#error-responses).

## Stable `code` field (TypeScript source of truth)

Some responses add a machine-readable **`code`** next to **`error`** (client branching / future i18n). **`code`** values and types live in `api_error_codes`; user-safe English defaults for those codes live in `api_user_messages.en` (re-exported via `api-error-codes.ts` and `api-user-messages.en.ts`).

| `code` | Typical HTTP | `error` (English) | Routes |
|--------|--------------|-------------------|--------|
| `IDEMPOTENCY_PAYLOAD_MISMATCH` | 409 | `This idempotency key was already used with a different request body.` | `POST /api/audits`, `POST /api/audit-requests/:id/approve` |
| `AUDIT_INITIALIZATION_FAILED` | 500 | `Failed to create audit` | `POST /api/audits` (child row init rollback), `POST /api/audit-requests/:id/approve` (same) |
| `AUDITS_DPA_REQUIRED` | 403 | `Accept the Data Processing Agreement before creating this audit.` | `POST /api/audits` (consultant without DPA), `POST /api/audit-requests/:id/approve` (same) |
| `AUTH_*` | 401 / 403 / 500 | See `api-user-messages.en.json` | `requireAuth`, `attachProfile`, `requireRole`, `rejectGuestFromPortal`, `allowGuestSnapshotLogIngest` |
| `DISCOVER_*` | 400 / 403 / 404 / 409 / 500 | Same JSON | `discover` |
| `PUBLIC_URL_*` | 400 | Same JSON | SSRF-safe URL validation (`public_http_url`) — returned by audits, audit-requests, snapshot when `company_url` / `url` fails checks |
| `INTERNAL_SERVER_ERROR` | 500 | Same JSON | Express global error handler (`index`) — includes optional `request_id` (trace id) when request context exists |
| `MARKETING_*` | 400 / 500 | Same JSON | `POST /api/marketing/brief` |
| `PLATFORM_*` | 400 / 403 / 409 / 500 | Same JSON | `platform` (consultant allowlist duplicate → **409** `PLATFORM_CONSULTANT_ALLOWLIST_DUPLICATE`) |
| `AUDIT_CREATE_RATE_LIMITED`, `PIPELINE_RATE_LIMITED`, `GENERAL_API_RATE_LIMITED`, `REPORT_PDF_RATE_LIMITED`, `COMPARE_RATE_LIMITED`, `RATE_LIMITED`, `INTAKE_LEGACY_RATE_LIMITED`, `LOG_INGEST_RATE_LIMITED`, `SNAPSHOT_LOG_RATE_LIMITED`, `DISCOVER_*`, `INTAKE_*`, `MARKETING_BRIEF_RATE_LIMITED` | 429 | See `message.error` in `rate_limit` | `express-rate-limit` middleware |
| `AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID`, `AUDITS_STRATEGY_LAB_CONTEXT_FAILED` | 400 / 500 | Same JSON | `PATCH /api/audits/:id/strategy/lab-context` |
| `AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID`, `AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH`, `AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED` | 400 / 500 | Same JSON | `POST /api/audits/:id/roadmap/manifest-snapshots` |
| `AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED` | 500 | Same JSON | `POST /api/audits/:id/roadmap/manifest-preview` |
| `AUDITS_ROADMAP_MANIFEST_LIST_FAILED` | 500 | Same JSON | `GET /api/audits/:id/roadmap/manifest-snapshots` |
| `AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID`, `AUDITS_ORCHESTRATION_PACK_NOT_READY`, `AUDITS_ORCHESTRATION_PACK_FAILED` | 400 / 409 / 500 | Same JSON | `POST /api/audits/:id/orchestration/pack` |
| `ORCHESTRATION_PACK_API_DISABLED` | 403 | Same JSON | `POST /api/audits/:id/roadmap/manifest-preview`, `POST/GET /api/audits/:id/roadmap/manifest-snapshots`, `POST/GET /api/audits/:id/orchestration/pack` when **`FEATURE_ORCHESTRATION_PACK_API=false`** |
| `AUDITS_NOT_FOUND`, `AUDITS_FETCH_FAILED` | 404 / 500 | Same JSON | `GET /api/audits/:id/orchestration/pack` |

---

This document groups **literal** `error` message strings returned by Express routes (mostly `res.status(...).json({ error: '...' })`). Dynamic or forwarded values (`snapResult.error`, `resolved.error`, `` `Phase ${n}...` ``, Zod `flatten()`, etc.) are listed under a separate section.

## Group A — Auth / access

| Message | Typical status | Routes |
|--------|----------------|--------|
| `Forbidden` | 403 | audits, pipeline |
| `Access denied` | 403 | audits, pipeline, audit-requests |
| `Only platform administrators can change this setting` | 403 | platform |
| `Complete registration (email or Google) to use the client portal.` | 403 | audit-requests |
| `Not allowed` | 403 | intake |
| `Only clients can request brief help from this endpoint` | 403 | audits |
| `Invalid or missing contact edit key` | 403 | discover |
| `Contact update not allowed for this session` | 403 | discover |
| `Session is assigned to another consultant` | 403 | discover |

## Group B — Not found

| Message | Typical status | Routes |
|--------|----------------|--------|
| `Audit not found` | 404 | audits, pipeline, reports |
| `Audit request not found` | 404 | audit-requests |
| `Notification not found` | 404 | notifications |
| `Session not found` | 404 | discover |
| `Snapshot not found` | 404 | snapshot |
| `Token not found` | 404 | intake |
| `Link not found` | 404 | intake |
| `Not found` | 404 | snapshot |

## Group C — Validation (client input)

| Message | Typical status | Routes |
|--------|----------------|--------|
| `company_url is required` | 400 | audits, snapshot |
| `company_url must be a valid URL (e.g. https://company.com)` | 400 | audits |
| `company_url is not allowed` (legacy copy; live responses use `PUBLIC_URL_*` codes + catalog strings) / granular `PUBLIC_URL_*` `error` text | 400 | audits, audit-requests, snapshot |
| `Omit company_url when no_public_website is true` | 400 | audits |
| `Leave the website field empty when you have no public website.` | 400 | audit-requests |
| `Enter your website URL, or indicate that you have no public website.` | 400 | audit-requests |
| `product_mode must be "express" or "full"` | 400 | audit-requests |
| `Invalid payload — need coverage_package and use_scraped_context` | 400 | audits |
| `responses must be an object` | 400 | audits |
| `Invalid collection_mode` | 400 | audits |
| `intake_versions must include all of ...` | 400 | audits |
| `Help request is only available before the pipeline has started` | 400 | audits |
| `owner_user_id is required (UUID string or null)` | 400 | platform |
| `owner_user_id must be a string UUID or null` | 400 | platform |
| `owner_user_id must be an active consultant profile` | 400 | platform |
| `Invalid profile payload` | 400 | profile |
| `Name is required` | 400 | marketing-brief |
| `Provide a website URL or mark no website` | 400 | marketing-brief |
| `snapshot_token is required` | 400 | snapshot |
| `host is required` | 400 | snapshot |
| `Invalid snapshot token` | 400 | snapshot |
| `answers object is required` | 400 | discover |
| `maturity_level must be an integer 1–5` | 400 | discover |
| `findings must be an array` | 400 | discover |
| `Invalid token` | 400 | discover, intake |
| `At least one contact field must be non-empty` | 400 | discover |
| `audit_id must be a string UUID when provided` | 400 | intake |
| `audit_id is required` | 400 | intake |
| `responses object is required` | 400 | intake |
| `phase is required (number)` | 400 | pipeline |
| `phase must be an integer between 0 and 7` | 400 | pipeline (bounds from `PIPELINE_MIN_PHASE` / `PIPELINE_MAX_PHASE_INDEX` in `pipeline_phases`) |
| `Invalid analytics payload` | 400 | discover, audits, intake-trace-tool |
| `Invalid wording drafts payload` | 400 | intake-trace-tool |
| `Invalid publish payload` | 400 | intake-trace-tool |
| `Invalid rollback payload` | 400 | intake-trace-tool |
| `Invalid query` | 400 | intake-trace-tool |

## Group D — State / conflicts (409)

| Message | Routes |
|--------|--------|
| `Pipeline start already claimed by another request` | pipeline |
| `Next phase request already claimed by another request` | pipeline |
| `Retry request already claimed by another request` | pipeline |
| `A phase is already in progress` | pipeline |
| `This link is already linked to another audit` | intake |
| `Session already converted` | discover |
| `Session was claimed or converted by another request` | discover |
| `Session conversion conflict. Please retry.` | discover |
| `Approve request already claimed by another request` | audit-requests |
| `Approve request is already in progress` | audit-requests |

## Group E — Pipeline / token budget

| Message | Routes |
|--------|--------|
| `Pipeline already started` | pipeline |
| `Token budget exceeded` | pipeline |
| `All phases completed` | pipeline |
| `Review point pending` | pipeline |
| `This review gate has quality warnings. Add consultant notes to acknowledge them before approving.` | pipeline |

## Group F — Gone / expired (410)

| Message | Routes |
|--------|--------|
| `Snapshot token expired` | snapshot |
| `This link has expired` | intake |

## Group G — Audit requests workflow

| Message | Routes |
|--------|--------|
| `Only draft or submitted requests can be updated` | audit-requests |
| `Only draft requests can be submitted` | audit-requests |
| `Request must be submitted or under review to approve` | audit-requests |
| `Only submitted/under_review requests can be rejected` | audit-requests |
| `Only approved or running requests can be marked as delivered` | audit-requests |
| `Request is missing a valid website or no-public-website flag.` | audit-requests |

## Group H — Generic / operational failures (500)

Repeated patterns: `Failed to create audit`, `Failed to list audits`, `Failed to fetch audit`, `Failed to start pipeline`, `Failed to save responses`, `Failed to store analytics events`, `Failed to accept analytics events`, `Failed to generate report`, `Failed to load platform settings`, etc. See script output for full list.

When audit child rows fail to initialize after insert, **`POST /api/audits`** and **`POST /api/audit-requests/:id/approve`** may return **`500`** with `{ "code": "AUDIT_INITIALIZATION_FAILED", "error": "Failed to create audit" }` (details only in server logs).

## Group I — Dynamic or non-literal `error` field

- **Forwarded:** `snapResult.error`, `resolved.error`, `updated.error`, `result.error`, `e.message || 'Upgrade failed'`. Raw `(err as Error).message` is **not** returned for idempotency payload mismatch or audit child-row init rollback (see stable `code` table above).
- **Interpolated:** `` `Phase ${phase} is not available for product_mode '${retryMode}'` ``, `` `Invalid productMode "${rawMode}"...` ``, `` `Invalid responses: ${parsed.error.message}` ``, etc.
- **Structured:** `{ error: '...', details: parsed.error.flatten() }`, `{ error: '...', code: 'AUDITS_BRIEF_COLLECTION_MODE_INVALID' }` (and other `API_ERROR_CODES`), token budget responses with extra fields.

## Next steps (refactor)

Extend stable **`code`** + optional **`messageKey`** (and fallback **`error`**) using `api_error_codes` as the code catalog and `api_user_messages.en` for default English copy, then migrate routes incrementally without breaking clients that only read the `error` string.

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `server/src/routes`
- `server/src/config/api-error-codes.ts`
- `server/src/config/api-user-messages.en.json`
- `server/src/routes/discover.ts`
- `server/src/lib/public-http-url.ts`
- `server/src/index.ts`
- `server/src/routes/platform.ts`
- `server/src/middleware/rate-limit.ts`
- `server/src/config/pipeline-phases.ts`
