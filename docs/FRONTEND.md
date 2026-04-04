# Frontend Architecture

Product context (modes, deliverables): [PRODUCT.md](./PRODUCT.md). System diagram: [ARCHITECTURE.md](./ARCHITECTURE.md).

**Design system (Figma-style guide):** [Design system (style guide)](#design-system-style-guide) — tokens, themes, typography, spacing, components. Canonical CSS: `src/styles/theme.css`.

## Stack

React 18 + TypeScript + Vite. Tailwind CSS v4 (`src/styles/tailwind.css`), glassmorphism and brand gradients where specified in tokens. Animation: Framer Motion. UI primitives: shadcn-style semantic variables mapped in `theme.css` (`--background`, `--primary`, …).

---

## Design system (style guide)

Single source of truth for **visual language** in code is `src/styles/theme.css` (“GLC Design System v2”). Use **CSS variables** (not hard-coded hex) for surfaces, text, and borders. Tailwind utilities that reference `@theme inline` map to those tokens.

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
| Apply | `applyGlcColorScheme()` in `main.tsx`; API `setGlcColorScheme`, `useGlcTheme()` in `src/app/lib/glc-theme.ts`, `src/app/hooks/useGlcTheme.ts` |
| UI | `ThemeToggle` in `AppShell` header + sidebar; `/login`, `/snapshot`, `/intake/:token`, `/discovery`; `/settings` for explicit System / Light / Dark |
| Toasts | `GlcToaster` (`src/app/components/GlcToaster.tsx`) — `sonner` `theme` follows `useGlcTheme().isDark` (not `next-themes`; `src/app/components/ui/sonner.tsx` is unused unless wired separately) |
| Canvas polish | Global vignette: `src/styles/index.css` |

### Product flows (UI contracts)

**Public discovery (Mode C):** `DiscoverPage` — routes **`/discovery`** and **`/audit/discover`** (same component). Styling uses **`theme.css` tokens** (`--bg-canvas`, `--text-primary`, `--callout-*`, etc.) so the flow matches light/dark like the rest of the app. **`DiscoveryQueue`** (`/admin/discovery`) uses the same tokens; **Copy discover link** copies `origin + /discovery`.

**Public pre-brief (`IntakeBrief`, `/intake/:token`):** Questions from `GET /api/intake/:token` include **`section`** per item; the form and review screens group fields with `groupBriefQuestionsBySection` (adjacent same-title blocks; repeated titles like “Business”/`Goals` may appear as separate blocks following API order). Flow: **review** (edit shortcuts) → **Confirm and submit**. Success copy from token `metadata`; helpers `src/app/lib/intake-client-copy.ts`. Resubmit allowed until `expires_at`.

**Question bank coverage hint:** `IntakeBankCoverageHint` + `useIntakeBankMetrics` on **New Audit** (Brief step), **Audit Workspace** sidebar (when `intake_brief` exists), and **Client portal** pre-audit brief — same branch-aware v1 score as the API after legacy merge.

**Client portal — self-serve audits:** **`ClientPortal`** (`/portal`, “My Portal”) lists audits from **`GET /api/audits`** with **`StatusPill`** labels (e.g. **Brief & setup** for `created`), a short next-step hint, optional website line under the company name, and a meta line (industry · express/full · relative `updated_at`). **`ClientAuditView`** at `/portal/audit/:id` loads the audit with **`GET /api/audits/:id`** and renders **`ClientPortalAuditById`** when the caller may access that row; otherwise it shows **not found** (no fallback to `audit_requests` IDs). Flow: **`/portal/audit/new`** → `NewAudit` with `variant="client_self_serve"` → full bank brief; wizard state is mirrored to **`sessionStorage`** (`glc_portal_new_audit_draft_v1`) so a tab refresh restores progress; **Save draft** also persists to the account (**`POST /api/audits`** once, then **`PUT …/brief`**) when Basics validate. **Launch Audit** reuses that draft **`audits.id`** when present, then **`pipeline/start`** and navigation to **`/portal/pipeline/:id`**. Audits left in **`created`** can still be continued from **My Portal** with **Start audit** / **Save Brief** there. **`/portal/pipeline/:id`** and **`/portal/reports/:id`** mirror consultant URLs under the client layout.

**Client portal Pre-Audit Brief** (embedded in `ClientAuditView` for self-serve `created` audits): `BriefLayoutPreferenceCards` lets the client choose **All sections at once** (`BankClassicBriefFields`, compact) or **Step by step** (`IntakeBankWizard`). **Resolution:** per-audit `localStorage` `glc_client_brief_layout_v1:<auditId>` overrides the **default** from Settings (`glc_client_brief_layout_default_v1`); if neither is set, the chooser appears (`resolveClientBriefLayout`). **Change layout** clears the per-audit key only. **Ask each time** in Settings (`applyClientBriefLayoutAskEachTime`) clears the default and **all** `glc_client_brief_layout_v1:*` keys. Same bank v1 branching as consultant flows; `collection_mode === 'discovery'` applies when returned from the API. New answers use `source: 'client'` (and `unknown` for explicit unknown). **Save Brief** submits via `PUT /api/audits/:id/brief` (no auto-save debounce in this panel). Brief UI links to **`/settings#brief-layout`**.

**Consultant / admin brief layout:** Same `BriefLayoutPreferenceCards` on **New Audit** (Brief step) and **Audit Workspace** “Edit intake brief”. **Resolution:** per-scope `glc_consultant_brief_layout_v1:new_audit` or `glc_consultant_brief_layout_v1:<auditId>`, then Settings default `glc_consultant_brief_layout_default_v1`, else chooser (`resolveConsultantBriefLayout`). **Change layout** clears the per-scope key. **Settings → All sections / Step by step** sets the default and removes `…:new_audit` so only one key drives the New Audit step. **Ask each time** (`applyConsultantBriefLayoutAskEachTime`) removes the default and **all** `glc_consultant_brief_layout_v1:*` keys so the chooser appears everywhere until the user picks again. Links to **`/settings#brief-layout`**. Prefs sync: `useBriefLayoutPrefsSync` + `glc-brief-layout-prefs-changed` custom event (and `storage` for other tabs).

**Notification center:** `NotificationCenter` + `useNotifications`; API + Realtime on `notifications`. Deep links use `payload.route`, `request_id`, `audit_id`; icons follow `failure_type` / `artifact` in `payload`.

---

## Pages

All routes wrapped in `ProtectedRoute` except `/login`. Route params use `:id` for audit-specific pages.

| Route | Page | Purpose |
| --- | --- | --- |
| `/login` | `Login.tsx` | Magic link + Google OAuth |
| `/` → redirects | — | Redirect to `/portfolio` |
| `/portfolio` | `Portfolio.tsx` | List of all audits, KPI bar |
| `/audit/new` | `NewAudit.tsx` | Create audit form |
| `/pipeline/:id` | `PipelineMonitor.tsx` | Live pipeline progress |
| `/audit/:id` | `AuditWorkspace.tsx` | Domain-by-domain results |
| `/audit/:id/:domainId` | `AuditWorkspace.tsx` | Same page, deep-linked domain |
| `/reports/:id` | `ReportViewer.tsx` | Final audit report |
| `/strategy/:id` | `StrategyLab.tsx` | Strategic roadmap |
| `/settings` | `SettingsPage.tsx` | Profile, appearance, client self-serve audit owner (consultants), intake brief layout defaults, notifications |
| `/discovery`, `/audit/discover` | `DiscoverPage.tsx` | Public discovery questionnaire (no auth); alias paths are equivalent |
| `/admin/discovery` | `DiscoveryQueue.tsx` | Consultant: Mode C submissions, convert to audit; shareable URL `/discovery` |

---

## Page Descriptions

### `Login.tsx`
- Email input → `supabase.auth.signInWithOtp({ email })` → shows "Check your email" state
- Google OAuth → `signInWithOAuth` with `redirectTo: <origin>/login` (so tokens are not stripped by `/` → `/dashboard` redirect)
- If already authenticated (`useAuth().isAuthenticated`) → redirect to `/portfolio`
- Glassmorphism card, gradient button, GLC logo

### `SettingsPage.tsx`
- Shared protected route for consultant and client
- **Client portal — audit owner** (consultants): `GET` / `PATCH /api/platform/self-serve-owner` — pick which consultant owns audits started by clients; read-only when `PLATFORM_ADMIN_USER_IDS` excludes the current user
- Profile save uses `PATCH /api/profile` (editable `full_name`)
- Appearance has explicit `system | light | dark` selection via `useGlcTheme().setMode(...)`
- **Intake brief layout** (`#brief-layout`): clients configure `glc_client_brief_layout_default_v1`; consultants/admins configure `glc_consultant_brief_layout_default_v1` — options **All sections**, **Step by step**, or **Ask each time** (clears defaults and all per-audit/per-scope layout keys on this device). Consultant **All sections / Step by step** also clears `glc_consultant_brief_layout_v1:new_audit` so the New Audit step follows the default without a duplicate key. Scroll-into-view when opened with hash.
- Notification toggles persist locally in `localStorage['glc_notify_prefs_v1']` (no backend sync in MVP)

### `Portfolio.tsx`
- Calls `useAudits()` → list of audits from `GET /api/audits`
- KPI bar: total audits, completed, avg score, recent activity
- Each card: company name/URL, status badge, overall score, created date
- "New Audit" button → `/audit/new`
- `mapStatus()` helper converts DB status strings (`created`, `auto`, `completed`, etc.) to UI status types

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

All hooks in `src/app/hooks/`.

### `useAuth()`
```typescript
const { user, isAuthenticated, loading, signOut } = useAuth();
```
- Subscribes to `supabase.auth.onAuthStateChange`
- `signOut()` → `supabase.auth.signOut()` + redirect to `/login`
- `loading` is true until auth state is confirmed (prevents flash of login page)

### `useIntakeBankMetrics()` / `useIntakeWizard()`
Defined in `useIntakeWizard.ts`. **`useIntakeBankMetrics(briefResponses)`** derives branch-aware question-bank v1 coverage (same `mergeLegacyResponsesIntoBankV1` + `calcDataQualityScore` as the API) for UI such as **New Audit** step “Brief”. **`useIntakeWizard`** supports controlled mode (`value` + `onChange`), canonical **`sortStubsByBankOrder`**, and step navigation (`goNext` / `goPrev`, `currentStub`, `totalSteps`). **New Audit → Brief** and **Audit Workspace** use **`BriefLayoutPreferenceCards`** to choose **`BankClassicBriefFields`** vs **`IntakeBankWizard`** (consultant keys in `client-brief-layout-preference.ts`). Both layouts share visibility rules (`filterVisibleQuestions`, `mergeLegacyResponsesIntoBankV1`); **no public website** sets `collection_mode` to discovery for metrics and for both layouts. Labels/types from `bankQuestionUiCatalog.ts` + `question-bank.v1.json`; **revenue model** is appended (not in bank JSON). Canonical list helper: `getVisibleBankBriefSections` in `src/app/data/bankClassicBrief.ts`. Required-field progress uses **`prepareBriefForValidation`** (same as API) so bank answers hydrate legacy gates.

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
- `GET /api/audits` on mount
- No Realtime subscription (Portfolio is a summary view; user navigates away when audit is running)

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

### `src/app/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### `src/app/data/apiService.ts`
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

### `src/app/data/auditTypes.ts`
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

## Routing (`src/app/routes.tsx`)

```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<ProtectedRoute><Navigate to="/portfolio" /></ProtectedRoute>} />
  <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
  <Route path="/audit/new" element={<ProtectedRoute><NewAudit /></ProtectedRoute>} />
  <Route path="/pipeline/:id" element={<ProtectedRoute><PipelineMonitor /></ProtectedRoute>} />
  <Route path="/audit/:id" element={<ProtectedRoute><AuditWorkspace /></ProtectedRoute>} />
  <Route path="/audit/:id/:domainId" element={<ProtectedRoute><AuditWorkspace /></ProtectedRoute>} />
  <Route path="/reports/:id" element={<ProtectedRoute><ReportViewer /></ProtectedRoute>} />
  <Route path="/strategy/:id" element={<ProtectedRoute><StrategyLab /></ProtectedRoute>} />
</Routes>
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
