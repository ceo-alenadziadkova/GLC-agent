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
1. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. Browser redirects to Google
3. After consent → Google redirects back → Supabase exchanges code for session

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

**Public (no auth):** `POST/GET /api/snapshot` for free UX snapshot — rate-limited by IP.

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

RLS is the security boundary between users. Even if a user guesses another user's audit ID, they cannot read that audit because:

```sql
-- audits table
CREATE POLICY "user_isolation" ON audits
  FOR ALL USING (user_id = auth.uid());

-- related tables
CREATE POLICY "user_isolation" ON audit_domains
  FOR ALL USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid())
  );
```

`auth.uid()` = the user ID from the JWT. This is evaluated by Supabase for every query from the **anon key** client.

The backend's **service role key** bypasses RLS — this is intentional. The backend validates ownership at the route level (`WHERE audit_id = $1 AND user_id = $2`).

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
| Site URL | `http://localhost:5173` (dev) / `https://your-app.vercel.app` (prod) |
| Redirect URLs | `http://localhost:5173/**`, `https://your-app.vercel.app/**` |
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
