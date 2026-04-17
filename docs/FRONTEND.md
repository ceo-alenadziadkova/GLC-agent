# Frontend Architecture

Product context (modes, deliverables): [PRODUCT.md](./PRODUCT.md). System diagram: [ARCHITECTURE.md](./ARCHITECTURE.md).

**Where frontend fits in configuration:** presentation, routes, and copy live in the UI layer; tunable deployment and API invariants are **not** reimplemented here — see [ARCHITECTURE.md — Configuration layering](./ARCHITECTURE.md#configuration-layering-config-vs-database-vs-services-vs-ui) (§4 UI) and [Strict layer boundaries — FRONT](./ARCHITECTURE.md#strict-layer-boundaries-operational-policy) (`VITE_*` only for browser-safe build-time values).

**Design system (Figma-style guide):** [Design system (style guide)](#design-system-style-guide) — tokens, themes, typography, spacing, components. Canonical CSS: `src/styles/theme.css`.

## Stack

React 18 + TypeScript + Vite. Tailwind CSS v4 (`src/styles/tailwind.css`), glassmorphism and brand gradients where specified in tokens. Animation: Framer Motion. UI primitives: shadcn-style semantic variables mapped in `theme.css` (`--background`, `--primary`, …).

### Build-time configuration (Vite env)

| Variable | Role |
| --- | --- |
| `VITE_API_URL` | Backend origin for `getApiBaseUrl()` — **required in production** (throws if missing when the app runs under `import.meta.env.PROD`). |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase client — **required at module load** in every environment (production build throws if missing; local dev needs `.env.local`; Vitest stubs both in `src/test/setup.ts`). |

The no-public-website sentinel is **`NO_PUBLIC_WEBSITE_URL`** from **`@glc/intake-core`**, sourced from **`no_public_website_sentinel`** in **`@glc/dev-brand-defaults`** `public-brand-defaults.v1.json`, not a `VITE_*` variable.

**Static front config (no `VITE_*`):** feature flags (`app_feature_flags` — includes `publicBriefSessionFlowEnabled` for `/brief` session flow vs legacy `submitMarketingBrief` fallback; change there and redeploy), client analytics batching (`client-analytics-batching.ts`), TanStack Query defaults (`query-client-defaults.ts` + `glc-query-client-defaults.ts`), HTTP timeouts (`http-client-defaults.ts`).

Cross-page persistence keys for consultant flows live in **`storage_keys`** (e.g. `GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY` for post–Discovery login handoff). See [DEPLOYMENT.md](./DEPLOYMENT.md#production-environment-variables) for the full production matrix.

### UI languages (i18n target list)

Planned in-app locales (BCP-47): **English (`en`, default), German (`de`), Spanish (`es`), Catalan (`ca`), Russian (`ru`), Italian (`it`).** Canonical definitions: `supported_ui_locales` (`GlcUiLocale`, labels for choosers). Full message catalogs and runtime i18n are a separate rollout; until then see the **Browser auto-translate vs React** paragraph in the Routing section below.

**Decision record (proposed):** [ADR-FRONTEND-I18N.md](./adrs/ADR-FRONTEND-I18N.md) — stable vs unstable keys, registry as English source for `i18nKey` rows, question-bank rules, fallback UX, SEO vs app routing, observability.

**Translator glossary (living doc):** [GLOSSARY.md](./GLOSSARY.md).

### User-visible strings and API errors (strategy)

**Governance:** copy zones, namespaces (`intake.*`, `api.*`, `app.*`, `brand.public.*`), single-source rules, and PR checklist live in [ARCHITECTURE.md — §6 User-visible copy layering](./ARCHITECTURE.md#6-user-visible-copy-layering-single-source-per-zone).

- **API:** error bodies use `{ "error", "code" }` where possible — see [API.md — Error Responses](./API.md#error-responses). The SPA should prefer **`code`** for branching and localized messages; keep **`error`** as a dev/legacy fallback. Avoid duplicating the same API `error` text in `*_copy.en` unless product requires a different UX string; if you map `code` → message on the client, keep that map in **one** module.
- **Shared domain copy:** `@glc/intake-core` exports stable keys next to English defaults where the server and UI must agree. Example: **`NO_PUBLIC_WEBSITE_DISPLAY_I18N_KEY`** (`glc.audit.noPublicWebsite`) and **`NO_PUBLIC_WEBSITE_DISPLAY_EN`** for the “no public website” label used by **`formatAuditWebsiteDisplay`**. Report/domain/score/marketing-route wording used by PDFs and the SPA is centralized in **`ui-copy-registry.v1.json`** (see [ARCHITECTURE.md — versioned copy](./ARCHITECTURE.md#5-versioned-product-copy-intake-core-json)). Until message catalogs exist, components keep calling **`formatAuditWebsiteDisplay`** (English); when adding i18n, introduce a small mapper `key → string` per locale and use the key for sentinel rows while preserving the same URL logic (**`isNoPublicWebsiteUrl`**).
- **Public brand:** wrap marketing routes with **`PublicBrandProvider`** and use **`usePublicBrand()`** / **`fetchPublicBrandConfig()`** (`public_brand`) for **`brand_name`**, **`footer`**, **`public_site_url`**, and **`support_email`** (from server JSON). `support-email.ts` exposes a dev fallback constant for the brief moment before `GET /api/public/brand` resolves — see [DEPLOYMENT.md — White-label](./DEPLOYMENT.md#white-label-and-dev-defaults-environment-matrix).
- **Page-level copy:** prefer **`*_copy.en`** per flow (e.g. login). Marketing/dashboard strings may stay in components until i18n; group future translations under `` (or a library) rather than scattering literals.
- **Snapshot diagnostics and long explainers:** strings in `snapshot_diagnostics` (and similar “product explanation” modules) should follow the same future layout: **English defaults in code today**, **locale files keyed by stable ids** when i18n ships (avoid duplicating score/domain wording — import **`SCORE_LABELS` / `DOMAIN_DISPLAY_LABELS`** from `@glc/intake-core` / `auditTypes` re-exports so labels stay aligned with PDF and reports).
- **SPA route paths:** public and app paths are centralized in `@glc/intake-core` as **`SPA_ROUTE_SEGMENTS`** (marketing brief) and **`APP_ROUTE_SEGMENTS`** (full router); use these for new links and redirects instead of new string literals in `routes.tsx`.

---

## Design system (style guide)

Single source of truth for **visual language** in code is `src/styles/theme.css` (“GLC Design System v2”). Use **CSS variables** (not hard-coded hex) for surfaces, text, and borders. Tailwind utilities that reference `@theme inline` map to those tokens.

**Specification:** as-is token/component map (§1–10) is in [`docs/design-system/current.md`](./design-system/current.md). Generated inventories, enforcement commands, rollout notes, and **reference stack alignment** vs mature systems (e.g. Material Design / Atlassian DS) are in [`docs/design-system/roadmap-notes.md`](./design-system/roadmap-notes.md).

### Brand and principles

| Token | Role |
| --- | --- |
| Cyan `#1CBDFF` (`--glc-blue` …) | Primary / focus / data accent |
| Orange `#F24F1D` (`--glc-orange` …) | CTA and emphasis (`--text-accent`, primary button utility) |
| Green `#0ECF82` (`--glc-green` …) | Success / positive drift |
| Ink stack (`--glc-ink` … `--glc-ink-4`) | Sidebar and deep surfaces |

**References:** product tone “Linear / Vercel / Stripe” is noted in `theme.css`. **Glass** panels use `--glass-*`; **mesh** backgrounds use `--mesh-brand` / `--mesh-ink`.

### Color — semantic layers (light)

| Layer | Variable | Typical use |
| --- | --- | --- |
| Canvas | `--bg-canvas` | App background |
| Surface | `--bg-surface` | Cards, panels |
| Elevated | `--bg-elevated` | Modals, raised chips |
| Muted | `--bg-muted` | Inputs, subtle bands |
| Sidebar | `--bg-sidebar` | Nav shell (ink in light theme) |

**Text:** `--text-primary` → `--text-quaternary` (strongest → most muted UI). Prefer **`--text-primary` / `--text-secondary`** for body and interactive labels. **`--text-tertiary`** suits captions and secondary hints; **`--text-quaternary`** is the lightest step and is often **below WCAG AA 4.5:1** on typical surfaces — use only for non-critical meta (e.g. timestamps), large type, or when the same information is available in a stronger style elsewhere. See [Contrast and accessibility](#contrast-and-accessibility).

**Borders:** `--border-subtle` / `--border-default` / `--border-strong`.

### Color — dark theme (`html.dark`)

Dark maps GitHub-style canvas and borders (e.g. canvas `#0d1117`, surface `#161b22`, default border `#30363d`). Brand primaries stay the same; score chips and glass tokens get dark-specific backgrounds. Toggle is `class="dark"` on `<html>` — see [Theme runtime](#theme-runtime).

### Score scale (1–5)

Domain scores use `--score-1` … `--score-5` and paired `--score-*-bg` / `--score-*-border` for badges and rings. Do not invent ad-hoc reds/greens for scores.

### Callout tokens (warning, error, info)

Inline banners, interview-mode hints, and status surfaces should use theme-aware variables (values differ in `html.dark` for contrast):

| Token family | Use |
| --- | --- |
| `--callout-warning-fg`, `--callout-warning-fg-emphasis`, `--callout-warning-icon` | Amber/warning text and icons |
| `--callout-warning-bg`, `--callout-warning-bg-subtle`, `--callout-warning-bg-strong` | Warning panel backgrounds |
| `--callout-warning-border`, `--callout-warning-border-strong`, `--callout-warning-border-focus` | Warning borders (focus = strongest, e.g. toggles) |
| `--callout-warning-pill-bg` | Pills such as **Needs Review** (`StatusPill`) |
| `--callout-error-bg`, `--callout-error-border` | Destructive / error banners (with `--score-1` for text where appropriate) |
| `--callout-info-bg`, `--callout-info-border`, `--callout-info-border-strong` | Informational cyan panels |

Avoid hard-coded `#92400E`, `#D97706`, `#F59E0B`, and raw `rgba(245,158,11,…)` on user-facing callouts so dark theme stays readable.

### Contrast and accessibility

- **Design intent** for the muted text steps is documented inline in `theme.css` next to `--text-tertiary` / `--text-quaternary`.
- **Automated check:** Lighthouse 11 accessibility was run on the public **`/login`** route (dev server); category score **1.0** with no failing audits in that run. **Portfolio, New Audit, Audit Workspace, Settings** require an authenticated session for the same automated pass — use Lighthouse/axe in a logged-in browser or CI with a test user when regressing contrast.
- **Gradient-filled text** (`.glc-gradient-text-flow` in `index.css`) can fail contrast in portions of the gradient if the string is essential content; reserve it for decorative/marketing emphasis or provide a plain-text equivalent nearby.

### Typography

| Role | Variable / rule |
| --- | --- |
| Display | `--font-display` (Space Grotesk) — `h1`–`h3` in `@layer base` |
| Body | `--font-sans` (Inter) — `body`, forms |
| Mono | `--font-mono` — metrics, IDs, code |
| Scale | `--text-xs` … `--text-4xl` (see `theme.css`) |
| Tracking | `--tracking-tight` … `--tracking-widest` |
| Label utility | `.glc-label`, `.glc-label-accent` |

Base heading sizes and weights are set globally in `theme.css` (`h1`–`h4`, `label`).

### Spacing and radius

**Spacing scale:** `--space-1` (4px) through `--space-16` (64px).

**Radius:** `--radius-xs` … `--radius-2xl`, `--radius-pill`. **shadcn bridge:** `--radius` (0.5rem) feeds `--radius-sm` / `--radius-md` / … in `@theme inline`.

### Elevation and depth

| Token | Use |
| --- | --- |
| `--shadow-xs` … `--shadow-xl` | Layered depth |
| `--shadow-card` | Default card border + shadow |
| `--glow-blue`, `--glow-orange`, `--glow-green` | Focus / emphasis rings |
| `--gradient-brand`, `--gradient-accent`, `--gradient-success` | Buttons, heroes |
| `--shadow-ink`, `--shadow-swiss` | Sidebar / bold UI |

### Motion and focus

**Easing:** `--ease-fast`, `--ease-base`, `--ease-slow`. **Focus visible:** 2px `--glc-blue` outline + `--shadow-blue` (global `theme.css`).

### Layout and responsive

**`mobile:` variant:** `width < 40rem` (same breakpoint notion as Tailwind `sm`). Define base layout for `sm+`, narrow overrides with `mobile:` — see `src/styles/tailwind.css`.

**App shell (desktop vs narrow viewports):** `AppShell` (`AppShell`) uses a **fixed ink sidebar** from `sm` (`40rem`) upward. Below that breakpoint it switches to a **compact top bar** (logo, page title + subtitle, notifications, theme, menu), **scrollable main** with bottom padding for the tab bar, a **bottom tab row** (up to four primary routes derived from the same nav model as the sidebar), and a **slide-in menu** for the full route list, quick actions (new audit), Settings, and Sign out. Consultant primary tabs are the first four linked destinations (Dashboard + admin queues); clients get portal routes plus **New audit** when it is not already in the first four slots. **Route lists and mobile tab selection** are implemented in `app_shell_nav` (unit tests in `app_shell_nav.test`) so sidebar and mobile chrome stay in sync.

**Manual mobile QA (recommended):** spot-check `/portal` and `/dashboard` at **320 / 375 / 390** px width for horizontal overflow, tap targets (44px utilities in `theme.css`), and that the bottom tab bar does not cover the last lines of scrollable content.

**Mobile layout utilities** (tokens + safe area) live in `src/styles/theme.css`:

| Class | Purpose |
| --- | --- |
| `--glc-mobile-nav-height`, `--glc-mobile-header-height`, `--glc-touch-target-min` | Shell metrics (44px minimum touch target) |
| `.glc-safe-pad-x` / `.glc-safe-pad-t` / `.glc-safe-pad-b` | Combine spacing tokens with `env(safe-area-inset-*)` |
| `.glc-touch-target` | Minimum 44×44px hit area for icon buttons |
| `.glc-page-content` | Standard page padding (tighter horizontal padding under `40rem` + safe area) |
| `.glc-main-mobile-nav-pad` | Extra bottom padding for main content when the mobile tab bar is visible |

**Viewport:** `index.html` uses `viewport-fit=cover` so safe-area insets apply on notched devices.

**Representative responsive pages:** `Dashboard` uses a **card list** for audits below `sm` and keeps the data grid on wider screens; `KpiStrip` is **2×2** then **4×1**. `ClientPortal` reuses **`PortalAuditCard`** (`PortalAuditCard`) for consistent list density. `ActionPanel` row actions use **`mobile:opacity-100`** so deep links stay visible without hover. **`ClientAuditView`** and **`NewAudit`** use **`glc-page-content`**, stacked primary actions on narrow widths, and (for client self-serve) a mobile **Back to portal** link in the page body when the shell action is hidden. Admin queues **`AdminRequestQueue`**, **`AdminSnapshotQueue`**, and **`DiscoveryQueue`** share the same padding utility, **`glc-touch-target`** on filters and primary controls where it helps, and **`DiscoveryQueue`** moves **Copy discover link** / **Refresh** into **`AppShell` actions** so they stay in the top bar on phones.

### Components and patterns

| Pattern | Where |
| --- | --- |
| shadcn semantic tokens | `--background`, `--primary`, `--card`, `--sidebar-*`, `--chart-*` in `:root` and `html.dark` |
| GLC cards | `.glc-card`, `.glc-card-elevated` |
| GLC buttons | `.glc-btn-primary`, `.glc-btn-secondary`, `.glc-btn-ghost` |
| Brand mark | `GlcLogo` — `variant="on-dark"` in ink sidebar; `variant="auto"` elsewhere |

Prefer composing with tokens (`bg-background`, `text-foreground`, `border-border`) where Tailwind maps them; use `.glc-*` when matching existing product chrome.

### Icons and content

**Icons:** [Phosphor React](https://phosphoricons.com/) only for status and affordances. **Do not** use emoji in application UI code (per project rules). **Illustrations / loaders:** loader path colors `--sync-loader-path-idle` / `--sync-loader-path-pulse`.

### Theme runtime

| Concern | Implementation |
| --- | --- |
| Persistence | `localStorage['glc-theme']`: `'dark'`, `'light'`, or omitted = `system` |
| Apply | `applyGlcColorScheme()` in `main.tsx`; API `setGlcColorScheme`, `useGlcTheme()` in `glc_theme`, `useGlcTheme` |
| UI | `ThemeToggle` in `AppShell` header + sidebar; `/login`, `/snapshot`, `/intake/:token`, `/discovery`; `/settings` for explicit System / Light / Dark |
| Toasts | `GlcToaster` (`GlcToaster`) — `sonner` `theme` follows `useGlcTheme().isDark` (not `next-themes`; `sonner` is unused unless wired separately) |
| Canvas polish | Global vignette: `src/styles/index.css` |

### Product flows (UI contracts)

**Public discovery (Mode C):** `DiscoverPage` — routes **`/discovery`** and **`/audit/discover`** (same component). Styling uses **`theme.css` tokens** (`--bg-canvas`, `--text-primary`, `--callout-*`, etc.) so the flow matches light/dark like the rest of the app. **`DiscoveryQueue`** (`/admin/discovery`) uses the same tokens; **Copy discover link** copies `origin + /discovery`. Session **`maturity_level`** (1–5) is an internal triage score from the **count** of generated finding cards in `discovery-flow.ts` (`computeScore`), not from per-card severity labels. Discovery heuristics use shared `@glc/intake-core` normalizers (`normalizeTeamSize`, `normalizeStage`, `normalizePrimaryGoal`, `normalizeOnlinePresence`, `includesCrmTool`) to keep FE findings and BE patch conversion aligned.

**Public pre-brief (`IntakeBrief`, `/intake/:token`):** The API returns **identity first** (`INTAKE_IDENTITY_BRIEF_QUESTIONS` — policy **`identityFieldIds`**, currently bank stubs **`a11`**, **`a12`**, **`a2`**, **`a5`**, plus conditional **`intake_industry_specify`**) and then **`plan.visible`** bank rows; each item may include **`section`** for grouping. The form and review screens use `groupBriefQuestionsBySection` (adjacent same-title blocks; repeated titles like “Business”/`Goals` may appear as separate blocks following API order). Flow: **review** (edit shortcuts) → **Confirm and submit**. Token **`metadata`** pre-fills empty **`a12` / `a11` / `a2`** via `applyIntakeMetadataPrefill` (`intake_client_copy`); success copy uses the same helpers. Resubmit allowed until `expires_at`; the resubmit banner shows the formatted **`expires_at`** from `GET /api/intake/:token` when present. Page code lives under `src/app/pages/intake-brief/` (hook, response reducers, phased components, `WORKSPACE_PAGE_COPY.intakePublicPrebrief`). Free-text fields use friendly placeholders and a helper note that short answers are acceptable (voice input is also supported by the browser).

**Question bank coverage hint:** `IntakeBankCoverageHint` + `useIntakeBankMetrics` on **New Audit** (Brief step), **Audit Workspace** sidebar (when `intake_brief` exists), and **Client portal** pre-audit brief — same branch-aware v1 score as the API (plan + stored **`responses`**; canonical revenue is bank id **`a10`**).

**Client portal — self-serve audits:** **`ClientPortal`** (`/portal`, “My Portal”) lists audits from **`GET /api/audits`** using **`PortalAuditCard`** rows with **`StatusPill`** labels (e.g. **Brief & setup** for `created`), a short next-step hint, optional website line under the company name, and a meta line (industry · express/full · relative `updated_at`). **`ClientAuditView`** at `/portal/audit/:id` loads the audit with **`GET /api/audits/:id`** and renders **`ClientPortalAuditById`** when the caller may access that row; otherwise it shows **not found** (no fallback to `audit_requests` IDs). Flow: **`/portal/audit/new`** → `NewAudit` with `variant="client_self_serve"` → full bank brief; wizard state is mirrored to **`sessionStorage`** (`glc_portal_new_audit_draft_v1`) so a tab refresh restores progress; **Save draft** also persists to the account (**`POST /api/audits`** once, then **`PUT …/brief`**) when Basics validate. **Launch Audit** reuses that draft **`audits.id`** when present, then **`pipeline/start`** and navigation to **`/portal/pipeline/:id`**. Audits left in **`created`** can still be continued from **My Portal** with **Start audit** / **Save Brief** there. **`/portal/pipeline/:id`** and **`/portal/reports/:id`** mirror consultant URLs under the client layout.

**Client portal Pre-Audit Brief** (embedded in `ClientAuditView` for self-serve `created` audits): `BriefLayoutPreferenceCards` lets the client choose **All sections at once** (`BankClassicBriefFields`, compact) or **Step by step** (`IntakeBankWizard`). **Resolution:** per-audit `localStorage` `glc_client_brief_layout_v1:<auditId>` overrides the **default** from Settings (`glc_client_brief_layout_default_v1`); if neither is set, the chooser appears (`resolveClientBriefLayout`). **Change layout** clears the per-audit key only. **Ask each time** in Settings (`applyClientBriefLayoutAskEachTime`) clears the default and **all** `glc_client_brief_layout_v1:*` keys. Same bank v1 branching as consultant flows; `collection_mode === 'discovery'` applies when returned from the API. New answers use `source: 'client'` (and `unknown` for explicit unknown). **`GET /api/audits/:id/brief`** returns **`questions` = `getBriefQuestionsByIds(plan.visible)`** — each row comes from the **classic brief catalog** (`modes.classic_brief.main`); policy **identity** bank stubs (**`a11`**, **`a12`**, etc.) appear in **`questions`** only if that id is in **`plan.visible`**. All values live in **`brief.responses`** (structured `{ value, source }` cells, primarily bank id keys; legacy alias keys may exist on older rows). See [API.md](./API.md) / [QUESTION_BANK.md](./QUESTION_BANK.md). **Save Brief** submits via `PUT /api/audits/:id/brief` (no auto-save debounce in this panel). Brief UI links to **`/settings#brief-layout`**.

**Consultant / admin brief layout:** Same `BriefLayoutPreferenceCards` on **New Audit** (Brief step) and **Audit Workspace** “Edit intake brief”. **Resolution:** per-scope `glc_consultant_brief_layout_v1:new_audit` or `glc_consultant_brief_layout_v1:<auditId>`, then Settings default `glc_consultant_brief_layout_default_v1`, else chooser (`resolveConsultantBriefLayout`). **Change layout** clears the per-scope key. **Settings → All sections / Step by step** sets the default and removes `…:new_audit` so only one key drives the New Audit step. **Ask each time** (`applyConsultantBriefLayoutAskEachTime`) removes the default and **all** `glc_consultant_brief_layout_v1:*` keys so the chooser appears everywhere until the user picks again. Links to **`/settings#brief-layout`**. Prefs sync: `useBriefLayoutPrefsSync` + `glc-brief-layout-prefs-changed` custom event (and `storage` for other tabs).

**Notification center:** `NotificationCenter` + `useNotifications`; API + Realtime on `notifications`. Deep links use `payload.route`, `request_id`, `audit_id`; icons follow `failure_type` / `artifact` in `payload`.

---

## Pages

Only protected app surfaces are wrapped in `ProtectedRoute`. Public pages include `/`, `/login`, `/snapshot`, package landing pages, `/brief`, `/faq`, `/discovery` aliases, and `/intake/:token`.

| Route | Page | Purpose |
| --- | --- | --- |
| `/login` | `Login.tsx` | Email/password + Google OAuth |
| `/` | `RootEntry` | Public marketing home or role-based redirect for authenticated users |
| `/dashboard` | `Dashboard.tsx` | Consultant dashboard (audits + KPI strip) |
| `/portfolio` | — | Legacy alias redirect to `/dashboard` |
| `/audit/new` | `NewAudit.tsx` | Create audit form |
| `/pipeline/:id` | `PipelineMonitor.tsx` | Live pipeline progress |
| `/audit/:id` | `AuditWorkspace.tsx` | Domain-by-domain results |
| `/audit/:id/:domainId` | `AuditWorkspace.tsx` | Same page, deep-linked domain |
| `/reports/:id` | `ReportViewer.tsx` | Final audit report |
| `/strategy/:id` | `StrategyLab.tsx` | Strategic roadmap |
| `/settings` | `SettingsPage.tsx` | Profile, appearance, client self-serve audit owner (consultants), intake brief layout defaults, notifications |
| `/discovery`, `/audit/discover` | `DiscoverPage.tsx` | Public discovery questionnaire (no auth); alias paths are equivalent |
| `/admin/requests` | `pages/admin-request-queue/AdminRequestQueue.tsx` | Consultant: incoming client requests queue with triage/status actions |
| `/admin/snapshots` | `AdminSnapshotQueue.tsx` | Consultant: all free snapshot submissions (`product_mode=free_snapshot`), requested URL, status, and current score/result |
| `/admin/discovery` | `DiscoveryQueue.tsx` | Consultant: Mode C submissions, convert to audit; shareable URL `/discovery` |
| `/admin/intake-wording` | `IntakeWordingWorkspace.tsx` | Consultant: draft wording (local + server sync), publish / rollback, publication log (`GET /api/intake-trace-tool/wording-publication-log`) |
| `/admin/question-bank-studio` | `QuestionBankStudioPage.tsx` | Consultant: bank/policy studio workspace for intake configuration and diagnostics |

---

## Page Descriptions

### `Login.tsx`
- **Sign in** / **Create account** tabs → `signInWithPassword` / `signUp` (see `useAuth`)
- Google OAuth on `/login` → **`signInWithOAuth`** (`redirectTo: <origin>/login`); optional **`preserveGuestSession`** on `signInWithGoogle` for legacy **`linkIdentity`** flows only
- After a full (non-anonymous) session is established, if **`glc_pending_snapshot_token`** is set, calls **`api.claimSnapshot`** then clears it (or clears on **404/409/410**)
- If already authenticated (`useAuth().isAuthenticated`) → redirect to the role landing (`/dashboard` for consultants, `/portal` for clients) or `?next=`, after the claim step above
- Email field is rendered with password-manager-friendly semantics (`name="username"`, sign-in `autoComplete="username"`), while sign-up keeps `autoComplete="email"` for account creation UX.

### `/snapshot` (`SnapshotLanding.tsx`)
- **`POST /api/snapshot`** with **`credentials: 'include'`** (no `Authorization` header); stores **`glc_pending_snapshot_token`** when a run starts
- Polls **`GET /api/snapshot/:token`** with **`credentials: 'include'`**
- Signed-in users see workspace link; guests see **Sign in** to save results via claim
- Glassmorphism card, gradient button, GLC logo

### `SettingsPage.tsx`
- Shared protected route for consultant and client
- **Client portal — audit owner** (consultants): `GET` / `PATCH /api/platform/self-serve-owner` — pick which consultant owns audits started by clients; read-only when the server denies `can_manage` (see **`profiles.is_platform_admin`** / **`platform_settings.legacy_platform_admin_user_ids`** in [API.md](./API.md#platform-consultant))
- Profile save uses `PATCH /api/profile` (editable `full_name`)
- Appearance has explicit `system | light | dark` selection via `useGlcTheme().setMode(...)`
- **Intake brief layout** (`#brief-layout`): clients configure `glc_client_brief_layout_default_v1`; consultants/admins configure `glc_consultant_brief_layout_default_v1` — options **All sections**, **Step by step**, or **Ask each time** (clears defaults and all per-audit/per-scope layout keys on this device). Consultant **All sections / Step by step** also clears `glc_consultant_brief_layout_v1:new_audit` so the New Audit step follows the default without a duplicate key. Scroll-into-view when opened with hash.
- Notification toggles persist locally in `localStorage['glc_notify_prefs_v1']` (no backend sync in MVP)
- Password-change form includes a hidden read-only `username` field to improve browser password-manager autofill behavior for current-password/new-password fields.

### `Dashboard.tsx`
- Calls `useAudits()` → list of audits from `GET /api/audits`
- KPI bar: total audits, completed, avg score, recent activity
- Each card: company name/URL, status badge, overall score, created date
- "New Audit" button → `/audit/new`
- Legacy `/portfolio` path is a redirect alias to `/dashboard`

### `NewAudit.tsx`
- Form: company URL (required), company name (optional), industry dropdown (optional)
- Submit → `api.createAudit(url, name, industry)` → `POST /api/audits`
- On success → `navigate('/pipeline/' + result.id)`
- Loading/error states

### `PipelineMonitor.tsx`
- `useParams<{ id: string }>()` for audit ID
- `usePipeline(id)` → live pipeline events via Supabase Realtime
- `useAudit(id)` → audit meta + domain statuses
- Shows `PhaseView[]` derived from domain statuses + pipeline events
- Phase states: pending / collecting / assembling_context / analyzing / completed / failed
- Token budget bar: `tokens_used / token_budget`
- Review gate: shows `ReviewPointModal` when `event_type === 'review_needed'`
- "Start" button → `startPipeline()` → `POST /api/audits/:id/pipeline/start`
- Review approval → `approveReview(phase, notes)` → `POST /api/audits/:id/reviews/:phase`

### `AuditWorkspace.tsx`
- `useAudit(id)` for full audit data
- Left sidebar: domain list from `DOMAIN_KEYS` (defined in `auditTypes.ts`), shows score badge per domain
- **Edit intake brief** (when `audit.brief` / `intake_brief` exists): `BriefLayoutPreferenceCards` first (or persisted `glc_consultant_brief_layout_v1:<id>`), then **All sections at once** = `BankClassicBriefFields` (compact; same visible bank ids/order as wizard) or **Step by step** = `IntakeBankWizard`. **Change layout** clears the stored choice. `collection_mode === 'discovery'` applies the discovery subset to both modes; debounced `api.saveBrief` like New Audit
- Right panel: selected domain detail — score ring, summary, strengths, weaknesses, issues table, quick wins, recommendations
- Overall score computed from available domains (weighted average)
- Empty state when domain not yet analyzed: "Domain analysis pending"

### `ReportViewer.tsx`
- `useAudit(id)` → full audit including all domains + strategy
- Animated score ring (SVG + Framer Motion) showing `audit.meta.overall_score`
- Executive summary from `audit.strategy.executive_summary`
- Domain scorecard (table: domain, score, label)
- Aggregated issues across all domains, sorted by severity
- Aggregated quick_wins across all domains
- "View Strategy" link → `/strategy/:id` (shown only if `audit.strategy` exists)

### `StrategyLab.tsx`
- `useAudit(id)` → reads `audit.strategy`
- Empty state with illustration if `!audit.strategy` ("No strategy generated yet")
- Three initiative columns: Quick Wins / Core Growth / Strategic
- Each initiative card: title, description, impact badge, effort badge
- Effort mix visualisation (bar showing % low/medium/high effort)
- Industry weights table (shown for transparency)

---

## Hooks

All hooks in ``.

### `useAuth()`
```typescript
const { user, isAuthenticated, loading, signOut } = useAuth();
```
- Subscribes to `supabase.auth.onAuthStateChange`
- `signOut()` → `supabase.auth.signOut()` + redirect to `/login`
- `loading` is true until auth state is confirmed (prevents flash of login page)

### `useIntakeBankMetrics()` / `useIntakeWizard()`
Defined in `useIntakeWizard.ts`. **`useIntakeBankMetrics(briefResponses)`** derives branch-aware question-bank v1 coverage (same `calcDataQualityScore` as the API) for UI such as **New Audit** step “Brief”. **`useIntakeWizard`** supports controlled mode (`value` + `onChange`), canonical **`sortStubsByBankOrder`**, and step navigation (`goNext` / `goPrev`, `currentStub`, `totalSteps`). **New Audit → Brief** and **Audit Workspace** use **`BriefLayoutPreferenceCards`** to choose **`BankClassicBriefFields`** vs **`IntakeBankWizard`** (consultant keys in `client-brief-layout-preference.ts`). Both layouts share visibility rules (`filterVisibleQuestions`); **no public website** sets `collection_mode` to discovery for metrics and for both layouts. Labels/types come from `bankQuestionUiCatalog.ts` + `question-bank.v1.json` (including canonical revenue id `a10`). Canonical list helper: `getVisibleBankBriefSections` in `bankClassicBrief`. Required-field progress on **New Audit** / **Client portal** uses **`pipelineRequiredIdsForProductMode`** + `resolveExpressSlaRequiredIds` / `resolveFullSlaRequiredIds` (same rules as `brief-gates` on the server).

### `useAudit(id: string | undefined)`
```typescript
const { audit, loading, error, refetch } = useAudit(id);
```
- `GET /api/audits/:id` on mount
- Subscribes to Supabase Realtime on `audits` table (filter: `id=eq.${id}`) for status changes
- Returns `AuditFull` shape (meta + recon + domains + strategy)
- Refetches on Realtime `UPDATE` event

### `usePipeline(id: string | undefined)`
```typescript
const {
 events,
 phases,
 currentPhase,
 reviewPending,
 startPipeline,
 approveReview,
} = usePipeline(id);
```
- Subscribes to `pipeline_events` for `audit_id=eq.${id}` via Supabase Realtime
- Accumulates events in local state (never re-fetches full history)
- Derives `phases` and `reviewPending` from event stream
- `startPipeline()` / `approveReview()` call backend endpoints and optimistically update UI

### `useAudits()`
```typescript
const { audits, loading, error } = useAudits();
```
- `GET /api/audits` via **TanStack Query** (`@tanstack/react-query`), keyed by `limit` and `offset`; default **staleTime** 2 minutes (see `glc-query-client.ts`). Returning to Dashboard / Portal reuses in-memory query data and may refetch in the background. `reload()` invalidates all `['glc','audits','list', …]` queries. Cleared on sign-out (`queryClient.clear()` via `invalidateGlcSessionDataCaches`).

### `useDashboard()`
- `GET /api/dashboard` through the same QueryClient (staleTime ~2 minutes). `reloadDashboard()` invalidates the dashboard query.

### Server data caching (overview)
- **Query keys** live in `glc_keys`. **Targeted invalidation** after pipeline steps / brief saves: `invalidateAuditRelatedQueries` in `glc-invalidate-queries.ts` (audit + brief payloads).
- **Admin Request queue** and **Discovery sessions** use a longer stale window (5 minutes).
- **Window focus:** `refetchOnWindowFocus` is off in `glc-query-client.ts` so switching browser tabs does not trigger a blanket refetch; reconnect refetch stays on. **ProtectedRoute** blocks role-gated pages only while `profileLoading && !profile` (first load). **useProfile** treats repeat `SIGNED_IN` for the same user as a background refresh so the shell is not unmounted and local hooks (e.g. pipeline state) are not reset. Use per-page refresh / invalidation when fresh data is required.
- **Admin Snapshot queue** uses a short stale window (3 minutes) and supports manual refresh.

---

## Components

### `AppShell.tsx`
Persistent layout wrapper — sidebar nav + header.

- `useCurrentAuditId()` hook extracts audit ID from current URL path:
 ```typescript
 const match = pathname.match(/^\/(audit|pipeline|reports|strategy)\/([a-f0-9-]+)/);
 return match ? match[2] : null;
 ```
- `buildNav(auditId)` builds nav items; audit-specific links are `null` when no audit in context (rendered as disabled/greyed)
- `useAuth()` provides user email display and `signOut` button

### `ProtectedRoute.tsx`
```tsx
export function ProtectedRoute({ children }) {
 const { isAuthenticated, loading } = useAuth();
 if (loading) return <LoadingSpinner />;
 if (!isAuthenticated) return <Navigate to="/login" replace />;
 return <>{children}</>;
}
```

### `ReviewPointModal.tsx`
Modal shown at review gates in PipelineMonitor.
- Displays generated interview questions (from recon)
- Two textareas: "Consultant Notes" and "Client Interview Answers"
- "Approve & Continue" → calls `approveReview(phase, { consultant_notes, interview_notes })`

---

## Data Layer

### `supabase`
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
 import.meta.env.VITE_SUPABASE_URL,
 import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### `apiService`
Typed fetch wrapper. Adds `Authorization: Bearer <token>` from current Supabase session:
```typescript
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
 const { data: { session } } = await supabase.auth.getSession();
 const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
 ...options,
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${session?.access_token}`,
 ...options?.headers,
 },
 });
 if (!res.ok) throw new Error((await res.json()).error || res.statusText);
 return res.json();
}

export const api = {
 createAudit: (url, name?, industry?) => apiFetch('/api/audits', { method: 'POST', body: JSON.stringify({ company_url: url, company_name: name, industry }) }),
 getAudit: (id) => apiFetch(`/api/audits/${id}`),
 getAudits: () => apiFetch('/api/audits'),
 startPipeline: (id) => apiFetch(`/api/audits/${id}/pipeline/start`, { method: 'POST' }),
 approveReview: (id, phase, notes) => apiFetch(`/api/audits/${id}/reviews/${phase}`, { method: 'POST', body: JSON.stringify(notes) }),
};
```

### `auditTypes`
TypeScript types matching the DB schema. Includes `DOMAIN_KEYS` constant:
```typescript
export const DOMAIN_KEYS = [
 'tech_infrastructure',
 'security_compliance',
 'seo_digital',
 'ux_conversion',
 'marketing_utp',
 'automation_processes',
] as const;
```

---

## Routing (`routes`)

The app uses **`createBrowserRouter`** with a root layout route (`<Outlet />`) and **`errorElement: <RouteErrorPage />`** so route render failures show a neutral recovery screen (`GlcAppErrorScreen`: reference id, copy-for-support, optional `POST /api/log` via `api.reportUiIncident` when signed in). The root **`ErrorBoundary`** in `main.tsx` wraps the same UI for errors outside the router tree. Client navigation from that screen uses plain `<a href>` so it works above `RouterProvider`. Frontend **`logger`** and **`reportUiIncident`** attach a coarse **`client_env`** object (e.g. `os_family` windows/macos/android/ios, `device_class`, `browser_coarse`, short UA excerpt) for triage; copy-for-support text includes the same OS/browser line. In local dev, `logger` keeps events console-only (no remote ingest) and supports `VITE_DEV_CONSOLE_LOG_LEVEL` (`debug|info|warn|error`, default `warn`).

**Public root (`/`):** `RootEntry` mounts **`MarketingHome` immediately**. OAuth query/hash fragments are sent to **`/login`**. Redirects to **`/dashboard`**, **`/portal`**, or **`/login`** run only after **`useAuth`** / **`useProfile`** finish for signed-in, non-anonymous users. The marketing landing is **not** blocked behind **`SyncPathLoader`**, so a normal refresh on `/` does not show the full-screen logo loader.

**Browser auto-translate vs React:** Chrome and other browsers inject wrapper nodes when translating a page; React then loses sync with the DOM (`insertBefore` / `NotFoundError`). There is **no reliable way** to keep a translated DOM and a client-rendered React tree in sync; the real fix is **in-app i18n**. Current policy: browser translation is **allowed** (no hard block in `index.html`), while **`BrowserTranslateGuard`** warns when translation markers appear on `<html>` and explains that some flows may fail. If users cannot continue, guidance is to switch back to the site original language and refresh. **`GlcAppErrorScreen`** still uses **`isLikelyTranslationOrExtensionDomCrash`** on captured error text to show a **prioritized “What to do”** list when the failure matches typical DOM rewrite exceptions.

```tsx
// Simplified current shape (createBrowserRouter):
{ index: true, element: <RootEntry /> }
{ path: "/login", element: <Login /> }
{ path: "/dashboard", element: <Consultant><Dashboard /></Consultant> }
{ path: "/portfolio", element: <Navigate to="/dashboard" replace /> } // legacy alias
{ path: "/audit/new", element: <Consultant><NewAudit /></Consultant> }
{ path: "/pipeline/:id", element: <Consultant><PipelineMonitor /></Consultant> }
{ path: "/portal", element: <ClientPortalShell><ClientPortal /></ClientPortalShell> }
```

---

## Vite Dev Proxy

`vite.config.ts` proxies `/api/*` to the backend during development:
```typescript
server: {
 proxy: {
 '/api': {
 target: 'http://localhost:3001',
 changeOrigin: true,
 },
 },
},
```

This means `fetch('/api/audits')` works in dev without CORS issues. In production, the full `VITE_API_URL` is used.

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `src/app/config/app-feature-flags.ts`
- `src/app/lib/storage-keys.ts`
- `src/app/lib/supported-ui-locales.ts`
- `src/app/config/*-copy.en.ts`
- `src/app/lib/public-brand.ts`
- `src/app/locales/`
- `src/app/lib/snapshot-diagnostics.ts`
- `src/app/components/AppShell.tsx`
- `src/app/lib/app-shell-nav.ts`
- `src/app/lib/__tests__/app-shell-nav.test.ts`
- `src/app/components/PortalAuditCard.tsx`
- `src/app/lib/glc-theme.ts`
- `src/app/hooks/useGlcTheme.ts`
- `src/app/components/GlcToaster.tsx`
- `src/app/components/ui/sonner.tsx`
- `src/app/lib/intake-client-copy.ts`
- `src/app/hooks/`
- `src/app/data/bankClassicBrief.ts`
- `src/app/lib/glc-keys.ts`
- `src/app/lib/supabase.ts`
- `src/app/data/apiService.ts`
- `src/app/data/auditTypes.ts`
- `src/app/routes.tsx`
- `packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json`
- `src/app/lib/support-email.ts`
- `src/app/config/`
