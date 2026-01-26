# New User Account Creation Flow

## Overview

New users who don't have a role yet need to create an account before they can register their family. This flow covers the account creation process that leads to the registration flow.

## Flow Steps

1. **Access Login Page**
   - User navigates to `/login`
   - Sees "Create account" link (when password auth is enabled)
   - Clicks link to navigate to `/create-account`

2. **Create Account Page**
   - User enters email and password
   - Confirms password
   - Validates password requirements (minimum 6 characters)
   - Submits form

3. **Account Creation**
   - Calls `supabase.auth.signUp({ email, password })`
   - Creates user in Supabase Auth
   - Sets `emailRedirectTo: /auth/callback` for email verification

4. **Post-Creation Redirect**
   - **If session created** (local dev or auto-confirm):
     - Redirects to `/register`
     - User can immediately start registration
   - **If email verification required**:
     - Shows "Check Your Email" message
     - User must verify email via link
     - After verification, redirects to `/auth/callback`
     - Callback redirects to `/household` (non-local-dev) or `/register` (local-dev)
     - If user has no household, `/household` redirects to `/register`

5. **Registration Flow**
   - User completes family registration
   - Gets GUARDIAN role assigned during registration
   - Redirects to `/household` (where any onboarding experience is surfaced, for example via an onboarding modal)

## Decision Points

- **Password Auth Enabled**: Is password authentication enabled? (Feature flag)
- **Demo Mode**: In demo mode, redirects to login (no account creation)
- **Email Verification**: Does Supabase require email verification?
- **Session Created**: Was session created immediately? (local dev vs production)

## Medium-Detail Flow Diagram

```mermaid
flowchart TD
    Start([New User]) --> LoginPage["Login Page"]
    LoginPage --> CreateAccountLink{"Password Auth Enabled?"}
    
    CreateAccountLink -->|No| LoginOnly["Login Only"]
    CreateAccountLink -->|Yes| CreateAccountPage["/create-account Page"]
    
    CreateAccountPage --> EnterEmail["Enter Email"]
    EnterEmail --> EnterPassword["Enter Password"]
    EnterPassword --> ConfirmPassword["Confirm Password"]
    ConfirmPassword --> Validate{"Valid?"}
    
    Validate -->|No| ShowErrors["Show Validation Errors"]
    ShowErrors --> EnterEmail
    
    Validate -->|Yes| SubmitForm["Submit Form"]
    SubmitForm --> SupabaseSignUp["supabase.auth.signUp()"]
    
    SupabaseSignUp --> SignUpCheck{"Signup Success?"}
    SignUpCheck -->|Error| ShowError["Show Error Toast"]
    ShowError --> CreateAccountPage
    
    SignUpCheck -->|Success| SessionCheck{"Session Created?"}
    
    SessionCheck -->|Yes| RedirectRegister["Redirect to /register"]
    SessionCheck -->|No| LocalDevCheck{"Local Dev?"}
    
    LocalDevCheck -->|Yes| RedirectRegister
    LocalDevCheck -->|No| EmailVerification["Show Email Verification"]
    
    EmailVerification --> UserClicksLink["User Clicks Email Link"]
    UserClicksLink --> AuthCallback["/auth/callback"]
    AuthCallback --> CallbackRedirect{Local Dev?}
    CallbackRedirect -->|Yes| RedirectRegister
    CallbackRedirect -->|No| RedirectHousehold["Redirect to /household"]
    RedirectHousehold --> HouseholdCheck{Has Household?}
    HouseholdCheck -->|No| RedirectRegister
    HouseholdCheck -->|Yes| StayHousehold["Stay on /household"]
    
    RedirectRegister --> RegistrationFlow["Registration Flow"]
    RegistrationFlow --> AssignRole["Assign GUARDIAN Role"]
    AssignRole --> HouseholdPortal["/household Portal"]
    
    LoginOnly --> End([End])
    HouseholdPortal --> End
    StayHousehold --> End
```

## Key Components

- **Create Account Page**: `src/app/create-account/page.tsx`
- **Auth Callback**: `src/app/auth/callback/page.tsx`
- **Registration Page**: `src/app/register/page.tsx`
- **Auth Utils**: `src/lib/auth-utils.ts` - `getPostLoginRoute(null)` → `/register`

## Account Creation Logic

### Password Validation
- Minimum 6 characters
- Password and confirm password must match
- All fields required

### Supabase Signup
```typescript
supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${baseUrl}/auth/callback`,
  },
})
```

### Post-Signup Behavior

**Local Development:**
- Email confirmations often disabled
- Session created immediately
- Redirects to `/register` right away

**Production:**
- Email verification required
- Shows "Check Your Email" message
- User clicks verification link
- Redirects to `/auth/callback`
- Callback redirects to `/household` (non-local-dev) or `/register` (local-dev)
- If user has no household, `/household` redirects to `/register`

## Error Handling

- **Password Mismatch**: Shows error, prevents submission
- **Password Too Short**: Shows error, prevents submission
- **Missing Fields**: Shows error, prevents submission
- **Signup Error**: Shows error toast with message
- **Timeout**: Shows timeout error (15 second limit)

## Role Assignment

After account creation:
- User has **no role** initially (`role: null` or `GUEST`)
- After completing registration, gets **GUARDIAN** role assigned during registration via `supabase.auth.updateUser()`
- Role assignment happens synchronously during `registerHouseholdCanonical()` process

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant LoginPage
    participant CreateAccountPage
    participant Supabase
    participant AuthCallback
    participant RegisterPage
    participant AuthContext

    User->>LoginPage: Navigate to /login
    LoginPage->>User: Display "Create account" link
    User->>CreateAccountPage: Click "Create account"
    
    CreateAccountPage->>User: Display account creation form
    User->>CreateAccountPage: Enter email, password, confirm password
    CreateAccountPage->>CreateAccountPage: Validate form
    
    alt Validation Fails
        CreateAccountPage->>User: Show validation errors
    else Validation Succeeds
        CreateAccountPage->>Supabase: signUp({ email, password })
        
        alt Signup Error
            Supabase-->>CreateAccountPage: Error response
            CreateAccountPage->>User: Show error toast
        else Signup Success
            Supabase-->>CreateAccountPage: User created
            
            alt Session Created (Local Dev)
                CreateAccountPage->>RegisterPage: Redirect to /register
            else Email Verification Required
                CreateAccountPage->>User: Show "Check Your Email"
                User->>User: Check email, click verification link
                User->>AuthCallback: Navigate to /auth/callback
                AuthCallback->>Supabase: Exchange code for session
                Supabase-->>AuthCallback: Session created
                AuthCallback->>AuthContext: Update auth state
                AuthCallback->>AuthCallback: Check redirect target
                alt Local Dev
                    AuthCallback->>RegisterPage: Redirect to /register
                else Production
                    AuthCallback->>HouseholdPage: Redirect to /household
                    HouseholdPage->>HouseholdPage: Check if user has household
                    alt No Household
                        HouseholdPage->>RegisterPage: Redirect to /register
                    else Has Household
                        HouseholdPage->>User: Display household portal
                    end
                end
            end
            
            RegisterPage->>User: Display registration form
            User->>RegisterPage: Complete registration
            RegisterPage->>RegisterPage: registerHouseholdCanonical()
            RegisterPage->>AuthContext: Assign GUARDIAN role via updateUser()
            RegisterPage->>User: Redirect to /household
        end
    end
```

## Related Flows

- [Guardian Registration](../guardian/registration.md) - Registration flow after account creation
- [Shared Authentication Flows](./authentication-flows.md) - Common auth patterns
- [Main Documentation](../README.md) - Return to main flows documentation

## Notes

- Account creation is only available when `loginPasswordEnabled` feature flag is true
- In demo mode, account creation is disabled (redirects to login)
- New users without roles are redirected to `/register` by `getPostLoginRoute(null)`
- The registration flow supports both authenticated sessions and magic-link-based flows; it always looks up households by email (via `findHouseholdByEmail(user.email, cycleId)`)
- For unauthenticated/magic-link flows, whether email verification is required for new registrations is controlled by the `loginMagicEnabled` feature flag
- Registration does not create new auth users — users must already have an auth account/session created via `/create-account` (password auth) or via the magic-link flow
