# Testing matrix — user flows (Snapshot, auth, routing)

This document tracks coverage for main client journeys. Commands: from repo root `pnpm install` once, then `pnpm test` (Vitest + RTL), `pnpm --filter glc-audit-server test` (or `cd server && pnpm test`), E2E `pnpm run test:e2e` after `pnpm exec playwright install chromium` (see [e2e/README.md](../../e2e/README.md)). Full gate: `pnpm run check` (typecheck + lint + both test suites).

## Strategy: stability, documentation, and dead code

### Why tests exist

- **Regression and stability:** Automated tests catch accidental breaks when refactoring or shipping features. CI runs them on every push (see **CI** below).
- **Logic and edge cases:** Tests encode expected behaviour (happy path, errors, role boundaries). Gaps in the matrix sections A–D highlight where behaviour is still implicit or only verified manually.
- **Security:** Tests are **not** a substitute for threat modeling, dependency review, or penetration testing. They *can* lock down documented contracts (for example, auth headers on protected routes, snapshot access rules) so changes that violate [docs/SECURITY.md](../SECURITY.md) or [docs/AUTH.md](../AUTH.md) fail in CI. Treat security-sensitive logic as explicitly documented first, then tested against that doc.

### Tests as living documentation

- **Canonical behaviour** for the product lives in `/docs` (especially [AUTH.md](../AUTH.md), [API.md](../API.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [PIPELINE.md](../PIPELINE.md)).
- **Convention:** In non-trivial test files, add a short top-of-file comment (or the first `describe` title) pointing to the doc section that defines the behaviour under test, e.g. `// Behaviour: docs/AUTH.md — anonymous snapshot JWT`.
- If a test and a doc disagree, **fix the doc or the code** so they match; the passing test then **confirms** the documented contract until someone intentionally changes both.

### Coverage (V8) and “holes”

- **Line coverage** shows which statements were executed during tests. Low coverage often marks **complex UI**, **orchestration**, or **error paths** that deserve either tests or a conscious decision to rely on E2E / manual QA.
- Coverage is **one signal**, not a score to game: 100% lines does not mean correct product behaviour. Use it to **prioritize** where to add tests next and to spot modules with no execution at all.

### Dead code and redundant logic

Signals that something may be unused or legacy (investigate before deleting):

1. **Coverage report:** file or export consistently **0%** and no test imports it indirectly.
2. **Static analysis (optional):** run `npx knip` from the repo root (no dependency added by default) to list unused files/exports; treat output as hints — false positives happen with dynamic imports.
3. **Documentation:** if you conclude code is dead, deprecated, or kept intentionally for a future feature, record it in **Suspected dead / legacy registry** below and link a GitHub issue or ADR for the final decision.

### Suspected dead / legacy registry (maintainers)

| Path or symbol | Evidence | Canonical doc (if any) | Decision / tracking |
| --- | --- | --- | --- |
| *(add rows as you triage)* | e.g. 0% coverage + knip unused export | — | Issue #… or “keep until …” |

## Legend

- **Yes** — meaningful automated tests exist for the layer.
- **Partial** — some coverage or indirect only.
- **No** — gap (planned or backlog).

## A. Snapshot flow (`/snapshot`, guest cookie + claim, preview API)

| Layer | Status | Notes |
| --- | --- | --- |
| FE unit (libs) | Yes | `snapshot-auth`, `snapshot-diagnostics`, `snapshot-api-errors`, `free-snapshot-preview-from-audit-state` |
| FE unit (page) | Partial | Large `SnapshotLanding`; prefer lib tests + narrow E2E |
| FE integration | Yes | `SnapshotLanding.integration` with mocked fetch / session |
| BE integration | Yes | `server/src/tests/snapshot-route.test.ts` and related |
| BE unit (access flags) | Yes | `snapshot-access-state.test.ts` — `computePublicSnapshotAccessFlags`, `snapshotPayloadToAccessApiFields` |
| E2E | Partial | `e2e/snapshot-public-mocked.spec.ts` — mocked POST 202 → poll → completed preview, `glc_snapshot_guest` on poll, `glc_pending_snapshot_token`; real `POST /api/snapshot/claim` still `e2e/staging-auth-claim.spec.ts` + env |

## B. Register / sign in (`/login`)

| Layer | Status | Notes |
| --- | --- | --- |
| `useAuth` | Yes | `useAuth.test.ts` — `getSession`, PKCE `?code=`, hash tokens, OAuth `?error=`, verify-referrer message, `onAuthStateChange`, `signInWithGoogle` options, `signUp` redirect URL, `signOut` |
| `Login` page | Yes | `Login.test.tsx` — discovery vs `next` redirect, open-redirect guard on `next`, `authError`, email/password submit + signup mode, Google manual-linking copy, API errors |
| `ProtectedRoute` | Yes | Loader until profile loads **only** when `requiredRole` is set (no extra spinner on generic protected routes) |
| `useProfile` | Partial | Mocked Supabase + `/api/profile`; unmount-during-load race |
| BE `/api/profile` | Yes | `profile-route.test.ts` |
| E2E | Partial | Playwright: `/login` visible (see `e2e/smoke.spec.ts`) |

Contract reference: [docs/AUTH.md](../AUTH.md) (roles, snapshot guest cookie, `POST /api/snapshot/claim`).

### Note: unit/RTL vs browser and E2E (sign-in, flicker, races)

Unit and RTL tests with **mocked** Supabase cover logic and contracts but **do not catch**:

- visual **flicker** in a real browser (brief wrong screen before paint);
- subtle **races** with real network and client/Supabase timing;
- full **OAuth redirect** (Google) and behaviour after real `exchangeCodeForSession` on a staging stack.

**Recommendation:** complement matrix B with **Playwright E2E on staging** against real Supabase (test users; optionally anonymous + `linkIdentity`). A future option is an integration-style `Login` test with a thin Supabase wrapper in Vitest; it **does not replace** E2E for UX and redirect flows.

## C. Route guards and post-login UX

| Layer | Status | Notes |
| --- | --- | --- |
| `ProtectedRoute` | Yes | Role, guest, blocked roles |
| `RootRedirect` | Yes | Pure helper `rootRedirectTarget` + component |
| Router map | Partial | `e2e/protected-routes.spec.ts` — unauthenticated hits on consultant/admin + client portal paths → `/login` |

## D. Sign out

| Layer | Status | Notes |
| --- | --- | --- |
| Unit | Partial | `useAuth` signOut; UI depends on shell components |
| E2E | Partial | Staging only: `e2e/staging-auth-claim.spec.ts` asserts post–sign-out URL and login shell copy (requires `E2E_STAGING_*` env) |

## E. Discovery flow (public `/audit/discover`)

| Layer | Status | Notes |
| --- | --- | --- |
| FE unit (`discovery-flow.ts`) | Partial | `discovery-flow.test.ts` — sequence, legacy presence, `computeFindings` / `computeScore` samples |
| E2E | Partial | `e2e/smoke.spec.ts` — step-by-step, back/next, f9 (skips if fragment lacks f9); `e2e/discovery-ui-fragment.spec.ts` — `GET /api/discover/ui-fragment` contract + both `/discovery` and `/audit/discover` |

## E2. Public intake link (`/intake/:token`)

| Layer | Status | Notes |
| --- | --- | --- |
| E2E | Partial | `e2e/intake-public-mocked.spec.ts` — mocked `GET /api/intake/:token` loads `IntakeBrief` shell; submit + real tokens remain integration/staging |

## F. Client portal pipeline gate

| Layer | Status | Notes |
| --- | --- | --- |
| FE unit | Yes | `client-portal-pipeline-access.test.ts` — `clientCanViewPortalPipeline` |

## G. Shared UI helpers

| Layer | Status | Notes |
| --- | --- | --- |
| `relativeTime` | Yes | `relativeTime.test.ts` |
| Intake “specify other” | Yes | Canonical: `@glc/intake-core` (`choice-specify-triggers`); tests: `src/app/lib/choice-specify-triggers.test.ts` + `server/src/tests/choice-specify-triggers.test.ts` |

## H. Questionnaire critical regressions (Step-by-step / Wizard)

This block is mandatory for changes that touch questionnaire UX, answer state wiring, or wizard ordering.

### Why this exists

- The highest-risk UI regression is broken answer interaction: cannot switch option, cannot type, answer disappears after navigation.
- These checks lock down the exact user actions that must never break.

### Required checks before merge

Run all commands from repo root:

- `pnpm vitest "src/app/components/__tests__/BriefField.test.tsx"`
- `pnpm vitest "src/app/components/__tests__/IntakeBankWizard.test.tsx"`
- `pnpm vitest "src/app/pages/__tests__/NewAudit.wizard-state.test.tsx"`
- `pnpm playwright test "e2e/smoke.spec.ts" --grep "discovery step-by-step"`

### Covered failure modes

- **Choice switching works:** user can change selected option after misclick.
- **Typing works:** user can input text in free-text and "Other / specify" fields.
- **Express focus-area lock works:** in `f2` (`Audit focus areas`) the `Marketing` and `Automation` chips are locked (disabled + lock icon) in express mode, and the disclaimer copy is visible.
- **Back/Next persistence:** answer remains after moving forward and back.
- **State wiring safety (`NewAudit`):** wizard next-state is applied directly, not merged in a way that can resurrect stale values.
- **Question-first hierarchy:** "Suggested next" renders below the current question to keep primary action focus.

## CI

GitHub Actions workflow [.github/workflows/test.yml](../../.github/workflows/test.yml) runs root Vitest and `server/` Vitest (plus security gates and conditional question-stack contracts). **Playwright E2E is not run in CI** — run `pnpm run test:e2e` locally when needed (see [e2e/README.md](../../e2e/README.md)).

### CI Gate Policy

- **Fast Gate**: [.github/workflows/test.yml](../../.github/workflows/test.yml)
  - Runs on PR/push.
  - Includes security gates, typecheck, lint, and frontend/backend unit tests.
  - Intended as the default merge blocker.

- **Release Gate**: [.github/workflows/release-gate.yml](../../.github/workflows/release-gate.yml)
  - Runs on `main`/`master` pushes and manual dispatch.
  - Includes Fast Gate–style checks plus migration execution on a clean PostgreSQL service.
  - Intended as the release readiness blocker.

- **Branch protection recommendation**
  - Mark both Fast Gate and Release Gate required in GitHub Branch Protection for release-sensitive branches.

## Code coverage (V8)

Run locally (reports under `coverage/`, ignored by git):

- **Frontend:** `pnpm run test:coverage` from repo root — HTML + text summary in `coverage/frontend/`.
- **Server:** `pnpm --filter glc-audit-server run test:coverage` (or `cd server && pnpm run test:coverage`) — `coverage/server/`.

Open the HTML report and sort by coverage to find **never-executed** modules; combine with the **Suspected dead / legacy registry** and optional `npx knip` (see **Strategy** above).

Approximate **line** coverage when last checked (Vitest v8): frontend **~20%**, server **~42%**. Frontend is dominated by large pages with few tests; extracted libs and snapshot-related code are higher. Server snapshot pipeline and routes have mixed coverage; many pure helpers and types are fully covered.

See also [docs/MASTER.md](../MASTER.md) for architecture links.

---

## Role acceptance scenarios (manual QA)

Below is an ordered checklist for **product admin / QA** on a staging environment (not automated tests). Technical details align with the code and [docs/AUTH.md](../AUTH.md).

### Shared reference

| Topic | Where in the product |
| --- | --- |
| **Admin** label in UI | DB: `profiles.role = 'consultant'`; shell shows **Admin** ([`useProfile`](../../src/app/hooks/useProfile.ts), [`AppShell`](../../src/app/components/AppShell.tsx)). |
| Who counts as consultant (bootstrap) | Server: emails in **`consultant_email_allowlist`** (see migration `048`); case-insensitive. Platform admins manage the table via **`GET` / `POST` / `DELETE /api/platform/consultant-allowlist`**. Must match on `attachProfile` / `GET /api/profile`. |
| Snapshot without password | [`/snapshot`](../../src/app/pages/SnapshotLanding.tsx): `POST /api/snapshot` with **`credentials: 'include'`** (guest cookie); **`glc_pending_snapshot_token`** + **`POST /api/snapshot/claim`** after login ([docs/AUTH.md](../AUTH.md)). |
| Guest upgrade to client | Sign in then **claim** attaches `audits.client_id`. Legacy anonymous/`linkIdentity` paths are optional. |

---

### 1. Administrator (consultant / Admin)

#### Identity and role

- [ ] Admin email is in **`consultant_email_allowlist`** (SQL or platform API).
- [ ] After sign-in (email/password or Google), shell shows **Admin**; DB has `profiles.role = consultant`.

#### Primary product entry (operations)

- [ ] Expected: admin signs in via **normal login** (`/login`), not primarily through public Snapshot — Snapshot/Discovery are for **client** onboarding.
- [ ] After login, **`/dashboard`** opens (`/portfolio` redirect goes there too).
- [ ] Dashboard shows **operational blocks**: KPI strip (`KpiStrip`), action panels / score distribution, activity feed, **audit list**, audit search ([`Dashboard.tsx`](../../src/app/pages/Dashboard.tsx)).

#### Snapshot / Discovery before login (do not mix with admin work context)

- [ ] If admin uses `/snapshot` **while signed out**, then signs in with **full admin account**: consultant data must **not** be lost; snapshot is a separate `free_snapshot` row until **claim** if applicable.
- [ ] After login, admin sees **consultant navigation**: Dashboard, Request queue, Discovery queue, contextual Audit / Pipeline / Reports / Strategy when an audit is selected ([`buildConsultantNav`](../../src/app/components/AppShell.tsx)).

#### Settings, other areas, sign-out

- [ ] **Settings** in sidebar exists for full accounts (not guest) — both Admin and Client ([`AppShell`](../../src/app/components/AppShell.tsx): `!isGuest`).
- [ ] Browse available settings and confirm content matches Admin role (no client `/portal` without an explicit scenario).
- [ ] **Sign out** clears session; visiting `/dashboard` again goes to `/login`.

---

### 2. Client (`profiles.role = client`)

#### Sign-in and registration

- [ ] **Email + password** sign-in; if needed, **register** a new user (respect Supabase email confirmation if enabled).
- [ ] Optionally **Google** sign-in (separate scenario).

#### Portal and audits

- [ ] **New** client: portal has a path to **create an audit** (e.g. `/portal/audit/new`, quick action in shell).
- [ ] **Existing** client: **`/portal`** shows **past audits** / cards per API data.

#### Snapshot or Discovery with an existing account

- [ ] User is already **client**, runs public **Snapshot** or **Discovery**, then **signs in with the same account**; **claim** attaches the snapshot when pending token is present.
- [ ] Confirm: new snapshot/discovery **attaches** to the user / appears in portal, and **previous audits and quick snapshots are not missing** or replaced by a false single-audit state. Backend `user_id` / `client_id` wiring — cross-check [docs/API.md](../API.md) and audit routes.

#### Sign-out

- [ ] Sign out; protected portal routes require login again.

---

### 3. Guest (`profiles.role = guest`, legacy anonymous or post-Snapshot)

#### First visit and role

- [ ] If still using **anonymous** Supabase sessions, profile may be **`guest`**, shell shows **Guest**, **SNAPSHOT** nav ([`buildGuestNav`](../../src/app/components/AppShell.tsx)). Cookie-only snapshot does not require anonymous auth.
- [ ] **Settings** hidden for guest (`isGuest`).

#### Snapshot and Discovery

- [ ] Full public snapshot on `/snapshot` works (**CORS** + **`credentials: 'include'`**; optional **`SNAPSHOT_GUEST_IP_SALT`** on API).
- [ ] **Discovery** from public routes (`/audit/discover`, alias `/discovery`).

#### Registration from Snapshot / Discovery

- [ ] **Google** registration from guest session: after upgrade, **`guest` → `client`** (or consultant if email is allowlisted).
- [ ] **Settings** (after full account): **name** and **email** show where the product collects them (Google usually provides email; name from profile / `full_name`).

#### Snapshot result in "profile"

- [ ] After registration, client sees **recent snapshot result** in portal / audit list (as designed for `free_snapshot`).

#### Visibility and sign-out

- [ ] Before full registration, guest does **not** see full client portal like `client`.
- [ ] After registration — **CLIENT WORKSPACE** nav and client scenarios above.
- [ ] Sign out from user menu; public pages work without session.

---

### Link to automated tests

Partially covered today: tables A–E2 above; Playwright under [e2e/](e2e/) (see [e2e/README.md](../../e2e/README.md)). Full walkthrough of this section needs **staging with real Supabase and consultant allowlist**.

## P0 Quality Policy and Regression Pack

This project follows a risk-based blocking policy.
No change is merge-ready or release-ready unless all P0 checks pass.

### Merge Gate (required)

- Typecheck passes
- Lint passes
- Frontend and backend test suites pass
- Before merge, run Playwright smoke locally (`pnpm run test:e2e`) when changing public routing, marketing pages, or discovery UI covered in [e2e/smoke.spec.ts](../../e2e/smoke.spec.ts) — E2E is not run in CI

### Release Gate (required)

- All merge gate checks are green
- Playwright smoke and/or staging scenarios exercised as needed for the release (no E2E job in GitHub Actions)
- Migrations are validated on a clean database
- Targeted exploratory testing is completed for high-risk flows

Blocking high-risk flows:

- auth and role boundaries
- snapshot and claim
- client portal visibility and access
- pipeline state transitions
- user data isolation

This section defines the minimum blocking quality bar for merge and release.

### PR Gate (required on every pull request)

Run:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm test`
- `pnpm --filter glc-audit-server test`
- Locally before risky UI/routing changes: `pnpm run test:e2e` (Playwright smoke; not in CI)

Goal: catch critical regressions before merge.

### P0 Critical Scenarios (must always pass)

#### Auth and access control

- Unauthenticated users cannot access protected routes.
- Correct redirect behavior after sign-in/sign-out.
- Role boundaries remain correct (`consultant`, `client`, `guest`).

#### Snapshot and claim flow

- Public snapshot creation works end-to-end.
- `claim` correctly links snapshot data to the authenticated user.
- Existing user audits are not lost or replaced after claim.

#### API contracts and isolation

- Critical endpoints preserve expected response contracts.
- User data remains isolated by user identity.
- Authorization failures return stable, expected error responses.

#### Pipeline critical path

- Pipeline start prevents race conditions and duplicate starts.
- Pipeline status transitions remain valid.
- Blocking failures are surfaced and do not fail silently.

#### Migration and RLS safety

- Migrations apply in strict numeric order.
- RLS hardening invariants remain intact.

### Required Backend P0 Tests

- `server/src/tests/require-auth.test.ts`
- `server/src/tests/user-isolation.test.ts`
- `server/src/tests/snapshot-route.test.ts`
- `server/src/tests/discover-route.test.ts`
- `server/src/tests/brief-route.test.ts`
- `server/src/tests/pipeline-route-concurrency.test.ts`
- `server/src/tests/pipeline-start-route-contract.test.ts`
- `server/src/tests/pipeline-status-route-contract.test.ts`
- `server/src/tests/reports-route.test.ts`
- `server/src/tests/question-bank-answer-contract.test.ts`
- `server/src/tests/rls-hardening-migration.test.ts`

### Pre-release Gate (blocking release)

Before release, require:

- Full PR Gate
- Full Playwright regression (not smoke-only)
- Migration execution on a clean database
- Targeted exploratory testing in high-risk zones:
  - auth and roles
  - snapshot and claim
  - portal visibility and client access
  - pipeline state transitions

### Quality Gate Criteria (release readiness)

Release is allowed only if:

- No open P0 defects
- All P0 automated checks are green
- No new flaky tests in required checks
- No auth/data isolation/security regressions
- Critical business flows are validated by automation and targeted exploratory checks
