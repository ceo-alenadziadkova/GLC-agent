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

**Text:** `--text-primary` → `--text-quaternary` (strongest → tertiary UI). **Borders:** `--border-subtle` / `--border-default` / `--border-strong`.

### Color — dark theme (`html.dark`)

Dark maps GitHub-style canvas and borders (e.g. canvas `#0d1117`, surface `#161b22`, default border `#30363d`). Brand primaries stay the same; score chips and glass tokens get dark-specific backgrounds. Toggle is `class="dark"` on `<html>` — see [Theme runtime](#theme-runtime).

### Score scale (1–5)

Domain scores use `--score-1` … `--score-5` and paired `--score-*-bg` / `--score-*-border` for badges and rings. Do not invent ad-hoc reds/greens for scores.

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
| UI | `ThemeToggle` in `AppShell` header + sidebar; `/login`, `/snapshot`, `/intake/:token`; `/settings` for explicit System / Light / Dark |
| Canvas polish | Global vignette: `src/styles/index.css` |

### Product flows (UI contracts)

**Public pre-brief (`IntakeBrief`, `/intake/:token`):** Questions from `GET /api/intake/:token` include **`section`** per item; the form and review screens group fields with `groupBriefQuestionsBySection` (adjacent same-title blocks; repeated titles like “Business”/`Goals` may appear as separate blocks following API order). Flow: **review** (edit shortcuts) → **Confirm and submit**. Success copy from token `metadata`; helpers `src/app/lib/intake-client-copy.ts`. Resubmit allowed until `expires_at`.

**Question bank coverage hint:** `IntakeBankCoverageHint` + `useIntakeBankMetrics` on **New Audit** (Brief step), **Audit Workspace** sidebar (when `intake_brief` exists), and **Client portal** pre-audit brief — same branch-aware v1 score as the API after legacy merge.

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
| `/settings` | `SettingsPage.tsx` | Profile, appearance, notifications |

---

## Page Descriptions

### `Login.tsx`
- Email input → `supabase.auth.signInWithOtp({ email })` → shows "Check your email" state
- Google OAuth → `signInWithOAuth` with `redirectTo: <origin>/login` (so tokens are not stripped by `/` → `/dashboard` redirect)
- If already authenticated (`useAuth().isAuthenticated`) → redirect to `/portfolio`
- Glassmorphism card, gradient button, GLC logo

### `SettingsPage.tsx`
- Shared protected route for consultant and client
- Profile save uses `PATCH /api/profile` (editable `full_name`)
- Appearance has explicit `system | light | dark` selection via `useGlcTheme().setMode(...)`
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
Defined in `useIntakeWizard.ts`. **`useIntakeBankMetrics(briefResponses)`** derives branch-aware question-bank v1 coverage (same `mergeLegacyResponsesIntoBankV1` + `calcDataQualityScore` as the API) for UI such as **New Audit** step “Brief”. **`useIntakeWizard`** supports controlled mode (`value` + `onChange`), canonical **`sortStubsByBankOrder`**, and step navigation (`goNext` / `goPrev`, `currentStub`, `totalSteps`). **New Audit → Brief** toggle **“Step-by-step (bank)”** renders **`IntakeBankWizard`**: one question per step over visible bank ids (labels/types from `bankQuestionUiCatalog.ts` + `question-bank.v1.json`), plus **revenue model** (legacy-only required field). Required-field progress uses **`prepareBriefForValidation`** (same as API) so bank answers hydrate legacy gates.

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
