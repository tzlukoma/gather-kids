<!-- a82065a0-78d5-4be3-9eae-130e6afd2c78 bc6983b0-550c-451f-b512-e6f1fea1078c -->
# Magic Link Registration Flow + Prior Registration Lookup

## Overview

Connect the existing Magic Link email verification to the household/registration lookup system. The flow authenticates users via magic link, finds their household by email, determines registration status (none/prior cycle/current cycle), and branches the registration form accordingly.

## Current State Analysis

**What Already Exists:**

- Magic link API endpoint: `/api/auth/magic-link` (sends OTP via Supabase)
- Auth callback handler: `/auth/callback/page.tsx` (exchanges code for session)
- Registration page: `/register/page.tsx` with email lookup (`findHouseholdByEmail`)
- Onboarding page: `/onboarding/page.tsx` (password setup for new guardians)
- Household portal: `/household/page.tsx` (parent dashboard)
- `findHouseholdByEmail()` function that returns: `{ isCurrentYear, isPrefill, data }`
- Prepopulation logic and overwrite banner in registration form
- Demo mode and live mode support with proper branching

**What Needs Work:**

- `/auth/callback` currently redirects to `/register` with `verified_email` param for **new registrations only**
- Need to add household lookup in callback to determine **existing vs new** registration
- Wire authenticated session to auto-populate email and trigger lookup
- Ensure proper redirect flow: callback → register → onboarding (if new) → household
- Add auth debug panel for UAT/Demo (guarded by environment)

## Implementation Plan

### 1. Update `/auth/callback/page.tsx` - Session Exchange + Household Lookup

**File:** `src/app/auth/callback/page.tsx`

**Current behavior (line 166-190):**

- Checks if `type=magiclink` → decodes email → redirects to `/register?verified_email={email}`

**New behavior:**

- After establishing session, check if user has existing household
- Query `findHouseholdByEmail(session.user.email, currentCycleId)` 
- Branch redirect:
  - **No household found** → `/register?verified_email={email}&new=true`
  - **Household found** → `/register?verified_email={email}&household_id={id}&status={none|prior|current}`

**Code changes:**

```typescript
// After session is established (around line 200)
if (session?.user?.email) {
  const { getCurrentCycle } = await import('@/lib/dal');
  const { findHouseholdByEmail } = await import('@/lib/dal');
  
  const currentCycle = await getCurrentCycle();
  const cycleId = currentCycle?.cycle_id || '2025';
  
  const householdData = await findHouseholdByEmail(session.user.email, cycleId);
  
  if (householdData?.isCurrentYear) {
    // Current cycle registration exists - go directly to household profile
    // They can edit their registration through the household profile edit features
    console.log('🔍 AuthCallback: Current registration found, redirecting to household');
    toast({
      title: 'Welcome Back!',
      description: 'You already have a registration for this cycle. View and edit your information in your household profile.',
    });
    router.push('/household');
    return;
  }
  
  // For new registrations or prior cycle prepopulation, go to register page
  let redirectUrl = '/register';
  const params = new URLSearchParams({
    verified_email: session.user.email,
  });
  
  if (householdData) {
    // Existing household with prior cycle registration - prepopulate
    params.set('household_id', householdData.data.household.household_id);
    params.set('status', 'prior'); // Prepopulate scenario
  } else {
    // New household - blank form
    params.set('new', 'true');
  }
  
  redirectUrl += `?${params.toString()}`;
  console.log('🔍 AuthCallback: Redirecting to registration:', redirectUrl);
  router.push(redirectUrl);
  return;
}
```

### 2. Update `/register/page.tsx` - Handle Query Params from Callback

**File:** `src/app/register/page.tsx`

**Current behavior:**

- Checks for `verified_email` param → auto-fills email and triggers manual lookup
- Uses `findHouseholdByEmail` in `handleEmailLookup` callback

**New behavior:**

- Read query params: `verified_email`, `household_id`, `status`, `new`
- Only handle `new=true` or `status=prior` cases (current cycle goes directly to `/household`)
- Auto-trigger form display based on status

**Code changes (in `useEffect` around line 1127):**

```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const verifiedEmail = urlParams.get('verified_email');
  const householdId = urlParams.get('household_id');
  const status = urlParams.get('status'); // 'prior' only (current goes to /household)
  const isNew = urlParams.get('new') === 'true';
  
  if (!user && verifiedEmail) {
    console.log('🔍 RegisterPage: Authenticated user from magic link:', verifiedEmail);
    setVerificationEmail(verifiedEmail);
    setIsAuthenticatedUser(true);
    
    if (isNew) {
      // Brand new registration - blank form
      toast({
        title: 'Welcome!',
        description: 'Please complete your registration below.',
      });
      proceedToRegistrationForm();
      setVerificationStep('form_visible');
    } else if (householdId && status === 'prior') {
      // Existing household with prior cycle - fetch and prepopulate
      const fetchAndPrepopulate = async () => {
        try {
          const cycleId = activeRegistrationCycle?.cycle_id || '2025';
          const result = await findHouseholdByEmail(verifiedEmail, cycleId);
          
          if (result && result.isPrefill) {
            prefillForm(result.data);
            setIsPrefill(true);
            setIsCurrentYearOverwrite(false);
            
            toast({
              title: 'Welcome Back!',
              description: 'Your previous registration has been pre-filled for you.',
            });
          }
          
          setVerificationStep('form_visible');
        } catch (error) {
          console.error('Error fetching household data:', error);
          toast({
            title: 'Error',
            description: 'Could not load your previous registration. Please try again.',
            variant: 'destructive',
          });
        }
      };
      
      fetchAndPrepopulate();
    }
  }
}, [user, searchParams]);
```

### 3. Update Registration Form Submit - Handle Authenticated User

**File:** `src/app/register/page.tsx` (onSubmit function around line 1321)

**Current behavior:**

- Saves registration data
- Redirects based on user auth status

**New behavior:**

- If authenticated via magic link → always redirect to `/onboarding`
- Let onboarding page determine if password setup is needed

**Code changes:**

```typescript
// After successful registration save (around line 1400+)
if (isAuthenticatedUser) {
  // User came through magic link auth
  toast({
    title: 'Registration Complete!',
    description: 'Redirecting to complete your account setup...',
  });
  setTimeout(() => router.push('/onboarding'), 1500);
} else {
  // Manual registration without auth
  toast({
    title: 'Registration Submitted!',
    description: 'Thank you for registering.',
  });
  // Existing redirect logic
}
```

### 4. Update `/onboarding/page.tsx` - Check for Password

**File:** `src/app/onboarding/page.tsx`

**Current behavior (lines 35-100):**

- Checks auth session
- Shows password setup UI

**New behavior:**

- Check if user already has password set via Supabase user metadata
- If password exists → skip directly to `/household`
- If no password → show password setup form

**Code changes:**

```typescript
const checkAuthAndOnboarding = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!session) {
      router.replace('/login');
      return;
    }
    
    setUser(session.user);
    
    // Check if user has set a password
    // Users authenticated via magic link need to set password
    // Check user metadata or app_metadata for password_set flag
    const hasPassword = session.user.app_metadata?.password_set || 
                       session.user.user_metadata?.password_set;
    
    if (hasPassword) {
      // Password already set, redirect to household
      toast({
        title: 'Welcome back!',
        description: 'Taking you to your household dashboard...',
      });
      router.replace('/household');
      return;
    }
    
    // Show onboarding/password setup
    setShowOnboarding(true);
    setLoading(false);
  } catch (error) {
    console.error('Onboarding check error:', error);
    setLoading(false);
  }
};
```

### 5. Add Auth Debug Component (Guarded)

**File:** `src/components/auth/auth-debug.tsx` (already exists)

**Enhancement:** Add magic link flow tracking

```typescript
// Add to debug panel
<div className="text-xs space-y-1">
  <p><strong>Registration Flow:</strong></p>
  <p>Email: {session?.user?.email}</p>
  <p>Household ID: {householdId || 'Not found'}</p>
  <p>Registration Status: {status || 'New'}</p>
  <p>Auth Method: {session?.user?.app_metadata?.provider || 'Unknown'}</p>
  <p>Demo Mode: {isDemo() ? 'Yes' : 'No'}</p>
</div>
```

**Usage in pages:**

- Add to `/auth/callback` during development
- Add to `/register` with registration status
- Add to `/onboarding` with onboarding status
- **Guarded by:** `process.env.NODE_ENV !== 'production'` or feature flag

### 6. Add Helper Function - Get Current Cycle

**File:** `src/lib/dal.ts`

**Add if not exists:**

```typescript
export async function getCurrentCycle(): Promise<RegistrationCycle | null> {
  if (shouldUseAdapter()) {
    const cycles = await dbAdapter.listRegistrationCycles();
    return cycles.find(c => c.is_active) || null;
  } else {
    const cycle = await db.registration_cycles
      .where('is_active')
      .equals(1)
      .first();
    return cycle || null;
  }
}
```

## Testing Plan

### Demo Mode Tests

**Scenario 1: New Registration**

- [ ] Send magic link for new email
- [ ] Click link → callback → register with blank form
- [ ] Submit → onboarding → set password → household page
- [ ] Verify auth debug shows "New" status

**Scenario 2: Prior Cycle Registration**

- [ ] Use email with prior cycle data
- [ ] Click magic link → callback detects prior registration
- [ ] Register page prepopulated with prior data
- [ ] Submit → onboarding (skip if password set) → household
- [ ] Verify auth debug shows "Prior" status

**Scenario 3: Current Cycle Registration (Overwrite)**

- [ ] Use email with current cycle registration
- [ ] Click magic link → callback detects current registration
- [ ] Register page shows overwrite banner + prepopulated data
- [ ] Submit → onboarding → household
- [ ] Verify auth debug shows "Current" status

### Live Mode Tests (UAT with Supabase)

**Prerequisites:**

- [ ] Supabase Auth configured with magic link redirect to `/auth/callback`
- [ ] Test with real email addresses
- [ ] RLS policies allow household/guardian access by email

**Scenario 1-3:** Repeat demo mode tests with live Supabase

- [ ] Verify actual magic link emails arrive
- [ ] Verify session persists across pages
- [ ] Verify household lookup queries work
- [ ] Verify registration upsert works
- [ ] Check database for proper data

## Security Considerations

**RLS Policies (if not already in place):**

```sql
-- Guardians table: user can read their own guardian record
create policy "Guardians: Users can read own record"
  on guardians for select
  using (auth.email() = email);

-- Households table: user can read household they belong to
create policy "Households: Users can read own household"
  on households for select
  using (
    household_id in (
      select household_id from guardians where email = auth.email()
    )
  );

-- Registrations: Similar pattern
```

## Acceptance Criteria

- [ ] Magic link email sends successfully (demo and live)
- [ ] `/auth/callback` exchanges code for session and performs household lookup
- [ ] Callback redirects to `/register` with correct query params
- [ ] Registration page auto-populates based on status (none/prior/current)
- [ ] Overwrite banner shows for current cycle registrations
- [ ] Prepopulation works for prior cycle registrations
- [ ] Submit redirects to `/onboarding`
- [ ] Onboarding checks for existing password and skips if set
- [ ] Final redirect to `/household` shows parent dashboard
- [ ] Auth debug panel shows correct flow information (dev/UAT only)
- [ ] All flows work in both demo and live modes
- [ ] Tests pass for all three scenarios

## Files to Modify

1. `src/app/auth/callback/page.tsx` - Add household lookup logic
2. `src/app/register/page.tsx` - Handle query params and auth user flow
3. `src/app/onboarding/page.tsx` - Check for existing password
4. `src/lib/dal.ts` - Add `getCurrentCycle()` if missing
5. `src/components/auth/auth-debug.tsx` - Enhance debug info
6. Add tests for magic link flow scenarios

### To-dos

- [ ] Create database migration to add preferred_scripture_translation column to children table
- [ ] Regenerate Supabase types to include new children.preferred_scripture_translation field
- [ ] Add preferred_scripture_translation field to Child interface in src/lib/types.ts
- [ ] Update SupabaseAdapter.updateChild() to handle preferred_scripture_translation field
- [ ] Add scripture translation dropdown to EditChildModal component
- [ ] Update bibleBee hooks to check child-level translation preference before household default