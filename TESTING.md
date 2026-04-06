# Testing matrix — user flows (Snapshot, auth, routing)

This document tracks coverage for main client journeys. Commands: root `npm test` (Vitest + RTL), `cd server && npm test`, E2E `npm run test:e2e` after `npm run test:e2e:install` (see [e2e/README.md](./e2e/README.md)).

## Strategy: stability, documentation, and dead code

### Why tests exist

- **Regression and stability:** Automated tests catch accidental breaks when refactoring or shipping features. CI runs them on every push (see **CI** below).
- **Logic and edge cases:** Tests encode expected behaviour (happy path, errors, role boundaries). Gaps in the matrix sections A–D highlight where behaviour is still implicit or only verified manually.
- **Security:** Tests are **not** a substitute for threat modeling, dependency review, or penetration testing. They *can* lock down documented contracts (for example, auth headers on protected routes, snapshot access rules) so changes that violate [docs/SECURITY.md](./docs/SECURITY.md) or [docs/AUTH.md](./docs/AUTH.md) fail in CI. Treat security-sensitive logic as explicitly documented first, then tested against that doc.

### Tests as living documentation

- **Canonical behaviour** for the product lives in `/docs` (especially [AUTH.md](./docs/AUTH.md), [API.md](./docs/API.md), [ARCHITECTURE.md](./docs/ARCHITECTURE.md), [PIPELINE.md](./docs/PIPELINE.md)).
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

## A. Snapshot flow (`/snapshot`, anonymous JWT, preview API)

| Layer | Status | Notes |
| --- | --- | --- |
| FE unit (libs) | Yes | `snapshot-auth`, `snapshot-diagnostics`, `snapshot-api-errors`, `free-snapshot-preview-from-audit-state` |
| FE unit (page) | Partial | Large `SnapshotLanding`; prefer lib tests + narrow E2E |
| FE integration | Yes | `SnapshotLanding.integration` with mocked fetch / session |
| BE integration | Yes | `server/src/tests/snapshot-route.test.ts` and related |
| BE unit (access flags) | Yes | `snapshot-access-state.test.ts` — `computePublicSnapshotAccessFlags`, `snapshotPayloadToAccessApiFields` |
| E2E | No | `/snapshot` needs real Supabase anon session; use Vitest integration + staging E2E later |

## B. Register / sign in (`/login`)

| Layer | Status | Notes |
| --- | --- | --- |
| `useAuth` | Yes | `useAuth.test.ts` — `getSession`, PKCE `?code=`, hash tokens, OAuth `?error=`, verify-referrer message, `onAuthStateChange`, anonymous → `linkIdentity` vs `signInWithOAuth`, `signUp` redirect URL, `signOut` |
| `Login` page | Yes | `Login.test.tsx` — discovery vs `next` redirect, open-redirect guard on `next`, `authError`, email/password submit + signup mode, Google manual-linking copy, API errors |
| `ProtectedRoute` | Yes | Loader until profile loads **only** when `requiredRole` is set (no extra spinner on generic protected routes) |
| `useProfile` | Partial | Mocked Supabase + `/api/profile`; unmount-during-load race |
| BE `/api/profile` | Yes | `profile-route.test.ts` |
| E2E | Partial | Playwright: `/login` visible (see `e2e/smoke.spec.ts`) |

Contract reference: [docs/AUTH.md](./docs/AUTH.md) (roles, anonymous snapshot, `linkIdentity`).

### Пометка: unit/RTL vs браузер и E2E (вход, мерцание, гонки)

Юнит- и RTL-тесты с **моками** Supabase проверяют логику и контракты, но **не ловят**:

- визуальное **мерцание** в реальном браузере (краткий показ «не того» экрана до paint);
- тонкие **гонки** с настоящей сетью и таймингами клиента/Supabase;
- полный цикл **OAuth redirect** (Google) и поведение после реального `exchangeCodeForSession` на стенде.

**Рекомендация:** дополнять матрицу B **Playwright E2E на staging** с настоящим Supabase (тестовые пользователи, при необходимости — аноним + `linkIdentity`). Отдельный вариант на будущее — интеграционный тест `Login` с тонкой обёрткой над Supabase в Vitest; он **не заменяет** E2E для UX и redirect-флоу.

## C. Route guards and post-login UX

| Layer | Status | Notes |
| --- | --- | --- |
| `ProtectedRoute` | Yes | Role, guest, blocked roles |
| `RootRedirect` | Yes | Pure helper `rootRedirectTarget` + component |
| Router map | No | Optional smoke only |

## D. Sign out

| Layer | Status | Notes |
| --- | --- | --- |
| Unit | Partial | `useAuth` signOut; UI depends on shell components |
| E2E | No | Needs auth fixture or staging Supabase |

## E. Discovery flow (public `/audit/discover`)

| Layer | Status | Notes |
| --- | --- | --- |
| FE unit (`discovery-flow.ts`) | Partial | `discovery-flow.test.ts` — sequence, legacy presence, `computeFindings` / `computeScore` samples |

## F. Client portal pipeline gate

| Layer | Status | Notes |
| --- | --- | --- |
| FE unit | Yes | `client-portal-pipeline-access.test.ts` — `clientCanViewPortalPipeline` |

## G. Shared UI helpers

| Layer | Status | Notes |
| --- | --- | --- |
| `relativeTime` | Yes | `relativeTime.test.ts` |
| Intake “specify other” | Yes | `choice-specify-triggers.test.ts` (FE) + `server/.../choice-specify-triggers.test.ts` |

## CI

GitHub Actions workflow [.github/workflows/test.yml](.github/workflows/test.yml) runs root Vitest, `server/` Vitest, then Playwright smoke on Chromium (`npx playwright install chromium --with-deps` on Ubuntu).

## Code coverage (V8)

Run locally (reports under `coverage/`, ignored by git):

- **Frontend:** `npm run test:coverage` from repo root — HTML + text summary in `coverage/frontend/`.
- **Server:** `cd server && npm run test:coverage` — `coverage/server/`.

Open the HTML report and sort by coverage to find **never-executed** modules; combine with the **Suspected dead / legacy registry** and optional `npx knip` (see **Strategy** above).

Approximate **line** coverage when last checked (Vitest v8): frontend **~20%**, server **~42%**. Frontend is dominated by large pages with few tests; extracted libs and snapshot-related code are higher. Server snapshot pipeline and routes have mixed coverage; many pure helpers and types are fully covered.

See also [docs/MASTER.md](./docs/MASTER.md) for architecture links.

---

## Приёмочные сценарии по ролям (ручная проверка)

Ниже — упорядоченный список того, что должен проверить **администратор продукта / QA** на стенде (не автотесты). Язык сценариев совпадает с постановкой; технические детали даны для сверки с кодом и [docs/AUTH.md](./docs/AUTH.md).

### Общие опоры

| Тема | Где в системе |
| --- | --- |
| Роль **Admin** в UI | В БД: `profiles.role = 'consultant'`; в шелле подпись **Admin** ([`useProfile`](src/app/hooks/useProfile.ts), [`AppShell`](src/app/components/AppShell.tsx)). |
| Кто считается админом | Сервер: [`CONSULTANT_EMAILS`](server/src/middleware/auth.ts) (список email через запятую, без учёта регистра). Email пользователя должен совпасть при `attachProfile` / `GET /api/profile`. |
| Snapshot без пароля | [`/snapshot`](src/app/pages/SnapshotLanding.tsx): анонимная сессия Supabase + JWT на `POST /api/snapshot` ([docs/AUTH.md](./docs/AUTH.md)). |
| Upgrade guest → client | Google с гостя: `linkIdentity`, стабильный `user.id`. Email/password с гостя — **другой** сценарий слияния (см. AUTH.md). |

---

### 1. Администратор (консультант / Admin)

**Идентичность и роль**

- [ ] Email админа перечислен в **`CONSULTANT_EMAILS`** на Railway (или в `.env` сервера).
- [ ] После входа (email/password или Google) в профиле в шелле отображается роль **Admin**, в БД `profiles.role = consultant`.

**Основной вход в продукт (операционный сценарий)**

- [ ] Ожидаемое поведение продукта: админ заходит **через обычный логин** (`/login`), а не как основной путь через публичный Snapshot — Snapshot/Discovery для **клиентского** онбординга.
- [ ] После логина открывается **`/dashboard`** (редирект с `/portfolio` ведёт туда же).
- [ ] На дашборде видны **операционные блоки**: KPI strip (`KpiStrip`), панели действий / распределение оценок, лента активности, **список аудитов**, поиск по аудитам ([`Dashboard.tsx`](src/app/pages/Dashboard.tsx)).

**Snapshot / Discovery до логина (не смешивать с «рабочим» контекстом админа)**

- [ ] Если админ **по ошибке** прошёл `/snapshot` или Discovery **будучи не залогиненным** (анонимная сессия), затем входит **полным аккаунтом админа**: проверить политику продукта — **не должны теряться или затираться** его обычные консультантские данные (списки аудитов, очереди). Уточнение: при **Google + linkIdentity** с того же анонимного сеанса `user.id` сохраняется; при **только email/password** после анона возможен **другой** `user.id` — отдельный набор строк в `audits` (зафиксировать ожидаемое поведение для команды).
- [ ] После входа админ видит **навигацию консультанта**: Dashboard, Request queue, Discovery queue, контекстные Audit / Pipeline / Reports / Strategy при выбранном аудите ([`buildConsultantNav`](src/app/components/AppShell.tsx)).

**Настройки, остальные разделы, выход**

- [ ] Пункт **Settings** в сайдбаре **есть** у полного аккаунта (не guest) — и у Admin, и у Client ([`AppShell`](src/app/components/AppShell.tsx): `!isGuest`).
- [ ] Пройти по доступным разделам настроек и убедиться, что содержимое соответствует роли Admin (без доступа к клиентскому `/portal` без явного сценария).
- [ ] **Sign out** очищает сессию; повторный заход на `/dashboard` ведёт на `/login`.

---

### 2. Клиент (`profiles.role = client`)

**Вход и регистрация**

- [ ] Вход **email + password**; при необходимости — **регистрация** нового пользователя (учесть подтверждение email в Supabase, если включено).
- [ ] При желании — вход через **Google** (отдельный сценарий).

**Портал и аудиты**

- [ ] **Новый** клиент: в портале есть путь **создать аудит** (например `/portal/audit/new`, quick action в шелле).
- [ ] **Существующий** клиент с историей: на **`/portal`** виден **список прошлых аудитов** / карточки, согласно данным API.

**Snapshot или Discovery при уже существующем аккаунте**

- [ ] Сценарий: пользователь уже **client**, выполняет публичный **Snapshot** или **Discovery**, затем **логинится тем же аккаунтом** (особенно Google + `linkIdentity` с гостевой сессии).
- [ ] Проверить: **новый** snapshot/discovery **прикрепляется** к пользователю / появляется в портале, при этом **предыдущие аудиты и «быстрые» снапшоты не пропадают** и не перезаписываются (нет ложного «один аудит вместо списка»). Детали привязки `user_id` / `client_id` на бэкенде — сверка с [docs/API.md](./docs/API.md) и маршрутами аудитов.

**Выход**

- [ ] Sign out; защищённые маршруты портала снова требуют логин.

---

### 3. Гость (`profiles.role = guest`, анонимный или только что со Snapshot)

**Первый визит и роль**

- [ ] После анонимного snapshot в профиле **`guest`**, в шелле роль **Guest**, навигация **SNAPSHOT**: ссылка на Free snapshot ([`buildGuestNav`](src/app/components/AppShell.tsx)).
- [ ] **Settings** у гостя **скрыт** (`isGuest`).

**Snapshot и Discovery**

- [ ] Можно пройти **полный публичный snapshot** на `/snapshot` (при включённом Anonymous в Supabase).
- [ ] Можно пройти **Discovery** flow с публичных маршрутов (`/audit/discover`, алиас `/discovery`).

**Регистрация из Snapshot / Discovery**

- [ ] Регистрация **через Google** с гостевой сессии: после апгрейда проверить **`guest` → `client`** (или консультант, если email в `CONSULTANT_EMAILS`).
- [ ] В **Settings** (после перехода в полный аккаунт): отображаются **имя** и **email** там, где продукт их собирает (Google обычно заполняет email; имя — из профиля / `full_name`).

**Результат snapshot в «профиле»**

- [ ] После регистрации клиент видит **результат недавнего snapshot** в портале / списке аудитов (как задумано продуктом для `free_snapshot`).

**Видимость и выход**

- [ ] До полной регистрации гость **не** видит полноценный client portal как у `client`.
- [ ] После регистрации — навигация **CLIENT WORKSPACE**, доступны сценарии клиента выше.
- [ ] Sign out доступен из блока пользователя; после выхода публичные страницы доступны без сессии.

---

### Связь с автотестами

Автоматически сейчас покрыты частично: см. таблицы A–D выше и [e2e/smoke.spec.ts](e2e/smoke.spec.ts). Полное прохождение чеклистов этого раздела — **на стенде с реальным Supabase и `CONSULTANT_EMAILS`**.
