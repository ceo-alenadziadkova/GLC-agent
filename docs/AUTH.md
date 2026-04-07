# Authentication

## Provider

**Supabase Auth.** Handles JWT issuance, session refresh, email/password and OAuth. No custom auth server needed.

---

## Login Methods

### Email and password
1. User chooses **Sign in** or **Create account** on `/login`
2. Frontend calls `supabase.auth.signInWithPassword({ email, password })` or `supabase.auth.signUp({ email, password, options: { emailRedirectTo: '<origin>/login' } })`
3. If **Confirm email** is enabled in the Supabase project, new users may need to confirm via email before the session is fully active — align dashboard settings with product expectations.

### Google OAuth
1. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/login' } })` (or **`linkIdentity`** when the current session is anonymous — see free snapshot below).
2. Browser redirects to Google
3. After consent → Google → Supabase → browser opens `/login` with `?code=` (PKCE) or hash tokens; `useAuth` exchanges or `setSession`, then UI navigates away

Do not use bare `<origin>` as `redirectTo` when `/` immediately redirects to `/dashboard`: that navigation drops the auth query/hash and the session is never created.

**`Database error saving new user` (Google or first sign-up):** the `on_auth_user_created` trigger inserts into `public.profiles`. On Supabase hosted, that runs as `supabase_auth_admin`; without an INSERT (and SELECT for conflict checks) RLS policy for that role, the insert fails. Apply migration `012_profiles_trigger_auth_admin.sql` (see [DATABASE.md](./DATABASE.md#overview)). The login page surfaces `error_description` from the redirect URL when present.

**Free snapshot (`/snapshot`):** **`SnapshotLanding`** calls **`ensureSnapshotSession()`** — reuses any existing session, then (for **anonymous** sessions only) a second **`localStorage`** copy of the tokens (`glc_preview_guest_session_v1`) so the same **`user.id`** can be restored after **`setSession`** if the default `sb-*-auth-token` row was cleared or raced; otherwise **`signInAnonymously()`**. Signing out or upgrading to a full account clears that backup. Same **browser profile** only — incognito or another browser still yields separate guests. Supabase must have **Anonymous sign-ins** enabled. **`POST /api/snapshot`** still sends a JWT; **`attachProfile`** creates **`profiles.role = 'guest'`** for anonymous users until they complete a full sign-in (then **`guest` → `client`/`consultant`**). For **Google**, **`useAuth.signInWithGoogle`** uses **`linkIdentity`** while anonymous so **`user.id`** stays stable when upgrading. **Email/password** from a guest session does not auto-merge the same `user.id` in Supabase; prefer Google from `/login` after a quick scan, or sign in first if using password-only accounts.

**Manual linking (required for `linkIdentity`):** In the Supabase Dashboard, enable **Allow manual linking** under [Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration) (same area as anonymous sign-ins). If it stays off, the API returns **`Manual linking is disabled`** and `GET /auth/v1/user/identities/authorize` may appear as **404** in the browser network tab. See [Identity linking — Manual linking](https://supabase.com/docs/guides/auth/auth-identity-linking#manual-linking-beta).

All methods produce the same end state for full accounts: a Supabase session with an `access_token` (JWT) and `refresh_token`.

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

**Public snapshot reads (no JWT):** `GET /api/snapshot/quota` and **`GET /api/snapshot/:token`** (poll / result). **`POST /api/snapshot`** requires a JWT (normal user or anonymous); rate limits apply (see [API.md](./API.md#public-snapshot)).

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

`requireAuth` reads `Authorization: Bearer`, calls `supabase.auth.getUser(token)` on the **server** Supabase client, and sets `req.userId`, `req.userEmail`, and **`req.userIsAnonymous`** from the returned user. Invalid or expired tokens yield **401**.

The server client is created with the **service role** key (see `server/src/services/supabase.ts`): DB queries bypass RLS by design. **JWT verification** is still done via `getUser(token)`; isolation is enforced in route handlers (`user_id` / `client_id` filters, `rejectGuestFromPortal`, `requireRole`). This matches [SECURITY.md](./SECURITY.md).

---

## Guest vs client (isolation and concurrency)

- **Identity:** Each Supabase user has a stable `user.id`. Snapshot **guests** are either anonymous JWTs (`is_anonymous`) or `profiles.role = 'guest'`. Full accounts are `client` or `consultant`. There is no shared profile row between users; `profiles.id` is the auth user UUID.
- **Promotion:** When the user is no longer anonymous, `attachProfile` upgrades `guest` → `client`/`consultant` on the **same** row. Parallel requests after sign-up can both try the first `INSERT` into `profiles`; the loser receives Postgres **23505** (unique violation), then **refetches** the winner’s row so role resolution stays correct (no duplicate users, no wrong role).
- **Portal block:** `rejectGuestFromPortal` runs after `attachProfile` on portal APIs (and on **notifications** and **`POST /api/log`**): **403** if `req.userRole === 'guest'` **or** `req.userIsAnonymous === true`. **Preview logging** uses **`POST /api/log/snapshot`** (`allowGuestSnapshotLogIngest`, tighter rate limit) so snapshot telemetry does not require a full account.

### Phased hardening (reference)

| Phase | Scope | Outcome |
|-------|--------|---------|
| **1** | Middleware + routes | `attachProfile` + `rejectGuestFromPortal` on all non–free-snapshot product APIs that should not serve guests; JWT + `userIsAnonymous` on every protected handler. |
| **2** | DB + `attachProfile` | Migration **023** (`guest` in `profiles_role_check`); unique-violation refetch on profile **INSERT**; trigger `handle_new_user` aligns new rows with `is_anonymous`. |
| **3** | Frontend | `ProtectedRoute` + `useProfile` sync with `GET /api/profile` when `role` is still `guest` after OAuth `linkIdentity`; `USER_UPDATED` refreshes profile. |
| **4** | Ops / tests | CI covers auth middleware; production must apply migrations **012** + **023**; Supabase flags: Anonymous sign-ins, **Allow manual linking** for Google on snapshot flow. |

---

## Row Level Security (RLS)

RLS is the security boundary for the **anon** Supabase client. Policies cover consultant-owned audits, linked clients (`client_id`), intake brief, audit requests, and related rows. **Canonical policies:** `server/migrations/*.sql` and [DATABASE.md](./DATABASE.md).

Threat model and backend verification: [SECURITY.md](./SECURITY.md).

The backend's **service role key** bypasses RLS — intentional. Routes must still enforce access (e.g. `user_id`, `client_id`, role guards).

---

## ProtectedRoute

Consultant and client routes use `ProtectedRoute` with **`useAuth`** + **`useProfile`**: load auth first, then (when `requiredRole` is set) wait for profile; **guest** users are redirected to **`/snapshot`** or blocked routes per `blockedForRoles`. Unauthenticated users go to `/login`. See `src/app/components/ProtectedRoute.tsx` and `src/app/routes.tsx` (`Consultant`, `Client`, `PNoGuest`).

Public paths stay outside `ProtectedRoute`: `/` (marketing), `/login`, `/snapshot`, `/express-audit`, `/audit` (marketing page), `/discovery`, `/brief`, `/faq`, intake discover aliases, etc.

---

## Supabase Auth Configuration

In Supabase dashboard (Authentication → Settings):

| Setting | Value |
|---|---|
| Site URL | **Exact URL only** (no `*`): `http://localhost:5173` (dev) / `https://your-app.vercel.app` (prod) |
| Redirect URLs | Prefer **exact** URLs: `http://localhost:5173`, `http://localhost:5173/login`, plus production `https://…/login`. OAuth uses `redirectTo: <origin>/login`, so **`/login` must be allowed**. Email sign-up uses `emailRedirectTo: <origin>/login` when confirmation links are enabled. If an auth callback ever lands on `/`, `RootEntry` forwards `?code` / hash to `/login` (same behaviour as the legacy `RootRedirect` helper). Signed-in users: consultants are redirected from `/` to `/dashboard`, clients to `/portal`; guests see the public marketing home. Optional: [Supabase glob patterns](https://supabase.com/docs/guides/auth/redirect-urls) where the dashboard accepts them. |
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
