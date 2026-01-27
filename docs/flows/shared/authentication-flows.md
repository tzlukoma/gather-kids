# Shared Authentication Flows

## Overview

This document describes common authentication patterns shared across all user roles. It covers demo mode, password authentication, magic link authentication, session management, and role assignment.

## Authentication Methods

### 1. Demo Mode Authentication

**Use Case**: Development, testing, and preview environments

**Flow:**
1. Feature flag `isDemoMode` enabled
2. Login page shows demo account options
3. User selects demo account or enters demo credentials
4. Credentials matched against `DEMO_USERS` object
5. User data stored in localStorage as `gatherkids-user`
6. Session persists across page refreshes
7. Logout clears localStorage

**Key Components:**
- `src/app/login/page.tsx` - Demo user matching
- `src/contexts/auth-context.tsx` - localStorage session management

### 2. Password Authentication

**Use Case**: Production environment with Supabase

**Flow:**
1. Feature flag `loginPasswordEnabled` enabled
2. User enters email and password
3. Calls `supabase.auth.signInWithPassword({ email, password })`
4. Supabase validates credentials
5. Returns session with user data
6. Session stored in Supabase (cookies/localStorage)
7. Auth state change listener updates AuthContext

**Key Components:**
- `src/app/login/page.tsx` - Password form submission
- `src/lib/supabaseClient.ts` - Supabase client
- `src/contexts/auth-context.tsx` - Session management

### 3. Magic Link Authentication (Feature-flagged)

**Use Case**: Passwordless authentication (when enabled)

**Flow:**
1. Feature flag `loginMagicEnabled` enabled
2. User enters email on a supported screen (e.g. registration)
3. System sends magic link email via Supabase
4. User clicks link in email
5. Redirects to `/auth/callback` with code
6. Callback exchanges code for session
7. Session established

**Key Components:**
- `src/app/api/auth/magic-link/route.ts` - Magic link API endpoint
- `src/app/auth/callback/page.tsx` - Callback handler
- `src/app/register/page.tsx` - Triggers magic-link flow when `loginMagicEnabled` is on

## Session Initialization

### AuthContext Initialization

The AuthContext initializes on app load:

1. **Check Mode**
   - Demo mode: Check localStorage for `gatherkids-user`
   - Production: Check Supabase session

2. **Load User**
   - Demo: Parse localStorage user data
   - Production: Get session from Supabase

3. **Ministry Access Check**
   - If user has email and no role/GUEST role:
     - Call `listAccessibleMinistriesForEmail(email)`
     - If ministries found, assign MINISTRY_LEADER role
     - Set `assignedMinistryIds`

4. **Set User State**
   - Update `user` state
   - Update `userRole` state
   - Set `loading` to false

### Role Assignment Logic

> **Security Note:** For Supabase-authenticated users, `user.user_metadata.role` is client-writable via `supabase.auth.updateUser` and **must not** be trusted for authorization or routing decisions. The current implementation uses this metadata for front-end routing, but this is a security risk. Any authenticated user can self-assign privileged roles (e.g., `ADMIN` or `GUARDIAN`) by tampering with `user_metadata.role`. That metadata is then trusted by front-end guards like `ProtectedRoute` and by server APIs such as `/api/children/[childId]/photo` and `canEditHousehold`, enabling escalation to admin/guardian capabilities.
>
> **Recommended Solution:** Move all authorization decisions to roles stored and enforced server-side (e.g., via a dedicated roles table or Supabase `app_metadata` plus RLS) and stop using client-controlled `user_metadata.role` for access control or routing decisions. The frontend must consume an **effective role** returned by secure APIs (for example, `/api/me`) and use that for `userRole` and `getPostLoginRoute`. Any value in `user.user_metadata.role` / `user.metadata.role` should be treated as untrusted and used only for non-security-sensitive display or debugging.
>
> **Ideal Implementation:** Roles should be assigned based on **server-side data**, and the frontend only consumes the computed effective role:
> 1. **Server-assigned Role**: Derived from a secure source such as Supabase `app_metadata` or a dedicated roles table behind RLS-protected APIs (e.g., ADMIN, MINISTRY_LEADER, GUARDIAN, VOLUNTEER).
> 2. **Ministry Access**: Server determines ministry access (e.g., via group memberships or ministry leader mappings) → contributes to MINISTRY_LEADER effective role and `assignedMinistryIds`.
> 3. **Household Access**: Server links the authenticated user to one or more households → contributes to GUARDIAN effective role and accessible household IDs.
> 4. **Default**: If no server-assigned privileged role or relationships are found, the effective role is `GUEST` (unregistered or not yet onboarded users).
> 5. **Demo Mode Exception**: In demo mode only, roles may be set directly in localStorage via the `DEMO_USERS` configuration for testing; this path must not be used in production and does not rely on Supabase user metadata.

**Current Implementation (Security Risk):**

Roles are currently assigned based on:
1. **User Metadata**: `user.metadata.role` (from database or demo config) - **Note: Client-writable in Supabase, not secure for authorization**
2. **Ministry Access**: Email matching ministry groups → MINISTRY_LEADER
3. **Household Access**: User linked to household → GUARDIAN
4. **Default**: GUEST (unregistered users)

## Post-Login Redirect

After successful authentication, the frontend calls a secure backend endpoint (for example, `/api/me`) to retrieve the **effective role** for the current session. Users are then redirected based on that effective role:

```typescript
getPostLoginRoute(effectiveRole):
  ADMIN → /dashboard
  MINISTRY_LEADER → /dashboard/rosters
  GUARDIAN → /household
  VOLUNTEER → /dashboard
  GUEST → /register
  null → /register
```

> **Note:** In the current implementation, `getPostLoginRoute` uses `user.metadata.role` which is client-writable and insecure. The recommended approach is to use an effective role returned by a secure backend API.

## Session Persistence

### Demo Mode
- User stored in `localStorage` as `gatherkids-user`
- Persists across page refreshes
- Cleared on logout

### Production Mode
- Session stored by Supabase (cookies/localStorage)
- Auto-refreshed by Supabase
- Cleared on logout via `supabase.auth.signOut()`

## Auth State Changes

### Supabase Auth State Listener

In production mode, AuthContext subscribes to Supabase auth state changes:

- **SIGNED_IN**: User logged in, update AuthContext
- **TOKEN_REFRESHED**: Session refreshed, update AuthContext
- **SIGNED_OUT**: User logged out, clear AuthContext

## Error Handling

### Login Errors
- **Invalid Credentials**: Show user-friendly error message
- **Email Not Confirmed**: Prompt user to verify email
- **Too Many Requests**: Show rate limit message
- **Network Error**: Show connection error, allow retry

### Session Errors
- **Session Expired**: Redirect to login
- **Invalid Session**: Clear session, redirect to login
- **Ministry Access Error**: Log error, don't block authentication

## Related Flows

- [New User Account Creation](./new-user-account-creation.md) - Account creation flow for users without roles
- [Admin Authentication](../admin/authentication.md) - Admin-specific auth flow
- [Ministry Leader Authentication](../ministry-leader/authentication.md) - Ministry leader auth flow
- [Guardian Registration](../guardian/registration.md) - Registration flow (creates GUARDIAN role)
