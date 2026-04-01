# Authentication

## Provider

**Supabase Auth.** Handles JWT issuance, session refresh, magic links, and OAuth. No custom auth server needed.

---

## Login Methods

### Magic Link (Passwordless Email)
1. User enters email on `/login`
2. Frontend calls `supabase.auth.signInWithOtp({ email })`
3. Supabase sends a magic link email
4. User clicks link → Supabase redirects to the app with session tokens in URL fragment
5. Supabase JS client picks up tokens automatically → session established

### Google OAuth
1. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/login' } })`
2. Browser redirects to Google
3. After consent → Google → Supabase → browser opens `/login` with `?code=` (PKCE) or hash tokens; `useAuth` exchanges or `setSession`, then UI navigates away

Do not use bare `<origin>` as `redirectTo` when `/` immediately redirects to `/dashboard`: that navigation drops the auth query/hash and the session is never created.

**`Database error saving new user` (Google or first sign-up):** the `on_auth_user_created` trigger inserts into `public.profiles`. On Supabase hosted, that runs as `supabase_auth_admin`; without an INSERT (and SELECT for conflict checks) RLS policy for that role, the insert fails. Apply migration `012_profiles_trigger_auth_admin.sql` (see [DATABASE.md](./DATABASE.md#overview)). The login page surfaces `error_description` from the redirect URL when present.

Both methods produce the same result: a Supabase session with an `access_token` (JWT) and `refresh_token`.

---

## Session Management

The Supabase JS client handles session persistence automatically:
- Stores session in `localStorage`
- Auto-refreshes `access_token` before expiry (using `refresh_token`)
- `supabase.auth.onAuthStateChange(callback)` fires on login, logout, and token refresh

`useAuth()` hook subscribes to this and exposes:
```typescript
{
  user: User | null,
  isAuthenticated: boolean,
  loading: boolean,         // true until first auth state confirmed
  signOut: () => Promise<void>
}
```

`loading: true` prevents flashing the login page on refresh — `ProtectedRoute` shows a spinner until auth state is known.

---

## Roles (Admin vs client)

| Product role | Stored in `profiles.role` | Primary UI |
|--------------|---------------------------|------------|
| **Admin** (GLC staff) | `consultant` | `/portfolio`, `/admin/requests`, full pipeline controls |
| **Client** (company contact) | `client` | `/portal`, linked audits and reports |

The database keeps the legacy value `consultant` for admins; the app may display **Admin** in the shell. Clients only see audits where they are `user_id` **or** `client_id` on the `audits` row (enforced in API queries, not only RLS).

**Public (no auth):** `POST/GET /api/snapshot` for free UX snapshot — `POST` (starts) are rate-limited by IP (see [API.md](./API.md#public-snapshot)); `GET` polling is not counted.

---

## JWT Flow (Frontend → Backend)

```
Browser (supabase client)               Backend (Express)
        │                                       │
        │  GET /api/audits                       │
        │  Authorization: Bearer <access_token>  │
        ├───────────────────────────────────────►│
        │                                        │ auth.ts middleware:
        │                                        │ supabase.auth.getUser(token)
        │                                        │ → verifies JWT, extracts user_id
        │                                        │ → req.userId = user.id
        │◄───────────────────────────────────────┤
        │  200 OK (user's audits only)           │
```

Backend `middleware/auth.ts`:
```typescript
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.userId = user.id;
  next();
}
```

The backend uses the **anon** `supabase` client (not service role) for `getUser()` — this validates the JWT without bypassing RLS.

---

## Row Level Security (RLS)

RLS is the security boundary for the **anon** Supabase client. Policies cover consultant-owned audits, linked clients (`client_id`), intake brief, audit requests, and related rows. **Canonical policies:** `server/migrations/*.sql` and [DATABASE.md](./DATABASE.md).

Threat model and backend verification: [SECURITY.md](./SECURITY.md).

The backend's **service role key** bypasses RLS — intentional. Routes must still enforce access (e.g. `user_id`, `client_id`, role guards).

---

## ProtectedRoute

```tsx
// src/app/components/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

All pages except `/login` are wrapped with this. If a user navigates directly to `/pipeline/some-id` without being logged in, they see the login page. After login, the redirect sends them back to their intended URL (handled by React Router's `location.state`).

---

## Supabase Auth Configuration

In Supabase dashboard (Authentication → Settings):

| Setting | Value |
|---|---|
| Site URL | **Exact URL only** (no `*`): `http://localhost:5173` (dev) / `https://your-app.vercel.app` (prod) |
| Redirect URLs | Prefer **exact** URLs: `http://localhost:5173`, `http://localhost:5173/login`, `http://localhost:5173/login?from_magic=1`, plus production `https://…/login`. OAuth uses `redirectTo: <origin>/login`, so **`/login` must be allowed**. If an auth callback ever lands on `/`, `RootRedirect` forwards `?code` / hash to `/login`. Optional: [Supabase glob patterns](https://supabase.com/docs/guides/auth/redirect-urls) where the dashboard accepts them. |
| Magic Link expiry | 1 hour (default) |
| Google OAuth | Enabled — add Client ID + Secret from Google Cloud Console |

---

## Supabase Client Setup

```typescript
// src/app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

`VITE_SUPABASE_ANON_KEY` is the public anon key — safe to expose in frontend code. It can only access data permitted by RLS policies.

---

## Sign Out

```typescript
// useAuth.ts
const signOut = async () => {
  await supabase.auth.signOut();
  navigate('/login');
};
```

AppShell shows a "Sign Out" button with `LogOut` icon that calls `signOut()`. On sign out, Supabase clears the session from localStorage and fires `onAuthStateChange` with a `SIGNED_OUT` event, which `useAuth()` picks up to reset state.
