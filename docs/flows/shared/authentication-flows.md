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

### 3. Magic Link Authentication (Future)

**Use Case**: Passwordless authentication

**Flow:**
1. User enters email
2. System sends magic link email via Supabase
3. User clicks link in email
4. Redirects to `/auth/callback` with code
5. Callback exchanges code for session
6. Session established

**Key Components:**
- `src/app/api/auth/magic-link/route.ts` - Magic link API endpoint
- `src/app/auth/callback/page.tsx` - Callback handler

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

Roles are assigned based on:
1. **User Metadata**: `user.metadata.role` (from database or demo config)
2. **Ministry Access**: Email matching ministry groups → MINISTRY_LEADER
3. **Household Access**: User linked to household → GUARDIAN
4. **Default**: GUEST (unregistered users)

## Post-Login Redirect

After successful authentication, users are redirected based on role:

```typescript
getPostLoginRoute(role):
  ADMIN → /dashboard
  MINISTRY_LEADER → /dashboard/rosters
  GUARDIAN → /household
  VOLUNTEER → /dashboard
  GUEST → /register
  null → /register
```

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
