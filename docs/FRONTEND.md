# Frontend Architecture

Product context (modes, deliverables): [PRODUCT.md](./PRODUCT.md). System diagram: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

React 18 + TypeScript + Vite. Deployed to Vercel. Uses Tailwind CSS + glassmorphism design system. Animation via Framer Motion.

**Dark theme:** `html.dark` sets design tokens in `src/styles/theme.css` (canvas `#0d1117`, text `#e6edf3`, borders `#30363d` / `#484f58`, matching the G-Power loader reference). A global vignette lives in `src/styles/index.css`. Initialization: `applyGlcColorScheme()` in `main.tsx` — uses `prefers-color-scheme` until the user changes the toggle (then `localStorage['glc-theme']` is `'dark'` or `'light'`). UI: `ThemeToggle` in `AppShell` **header** (every page with the shell) and sidebar, plus `/login`, `/snapshot`, and `/intake/:token` (`IntakeBrief`). Brand mark: `GlcLogo` (`src/app/components/GlcLogo.tsx`) — `variant="on-dark"` (always `logo-white.svg`) in the ink sidebar; `variant="auto"` elsewhere switches `logo.svg` / `logo-white.svg` with the theme. API: `setGlcColorScheme('dark'|'light'|'system')` and `useGlcTheme()` in `src/app/lib/glc-theme.ts` / `src/app/hooks/useGlcTheme.ts`. Prefer CSS variables for surfaces and accents: `--bg-canvas`, `--bg-surface`, `--text-primary`, `--score-*-bg`, `--primary-foreground` (white on brand gradients); legacy aliases `--surface`, `--surface-elevated`, and `--panel-border` map to the same system in `:root`.

**Narrow-only tweaks:** the `mobile:` variant (`width < 40rem`, same cutoff as Tailwind `sm`) is defined in `src/styles/tailwind.css`. Pair it with base classes aimed at sm+ (e.g. `px-6 mobile:px-4`, `flex-row mobile:flex-col`) so sub-640px adjustments stay isolated and you avoid `sm:` undo chains.

Application UI code must not use emoji characters for status or progress markers. Use icon components (Phosphor React) and semantic color tokens.

**Public pre-brief (`IntakeBrief`, `/intake/:token`):** Clients fill questions, then a **review** step lists all answers with edit shortcuts, then **Confirm and submit**. Success copy uses token `metadata` (`consultant_name`, `expected_contact`, `contact_channel`, `consultant_email`, `consultant_whatsapp`); helpers in `src/app/lib/intake-client-copy.ts`. Consultants optionally set these when creating the link in New Audit. Clients can resubmit on the same URL until `expires_at` (default 7 days).

---

## Pages (7 total)

All routes wrapped in `ProtectedRoute` except `/login`. Route params use `:id` for audit-specific pages.

| Route | Page | Purpose |
|---|---|---|
| `/login` | `Login.tsx` | Magic link + Google OAuth |
| `/` → redirects | — | Redirect to `/portfolio` |
| `/portfolio` | `Portfolio.tsx` | List of all audits, KPI bar |
| `/audit/new` | `NewAudit.tsx` | Create audit form |
| `/pipeline/:id` | `PipelineMonitor.tsx` | Live pipeline progress |
| `/audit/:id` | `AuditWorkspace.tsx` | Domain-by-domain results |
| `/audit/:id/:domainId` | `AuditWorkspace.tsx` | Same page, deep-linked domain |
| `/reports/:id` | `ReportViewer.tsx` | Final audit report |
| `/strategy/:id` | `StrategyLab.tsx` | Strategic roadmap |

---

## Page Descriptions

### `Login.tsx`
- Email input → `supabase.auth.signInWithOtp({ email })` → shows "Check your email" state
- Google OAuth → `signInWithOAuth` with `redirectTo: <origin>/login` (so tokens are not stripped by `/` → `/dashboard` redirect)
- If already authenticated (`useAuth().isAuthenticated`) → redirect to `/portfolio`
- Glassmorphism card, gradient button, GLC logo

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
