# Guardian Onboarding Flow

## Overview

The guardian onboarding flow handles initial password setup for newly provisioned or invited guardian accounts. It is used when a guardian has an account but needs to choose a password before accessing the application.

## Flow Steps

1. **Access Onboarding**
   - Guardian opens a secure onboarding link (for example, from an email) that signs them in and routes them to `/onboarding`
   - Guardians may also be redirected to `/onboarding` if their account exists but no password has been configured

2. **Password Setup**
   - Enter password
   - Confirm password
   - Submit form to save password

3. **Complete Onboarding**
   - Password is stored and the account is marked as having completed initial setup
   - Guardian is automatically redirected to `/dashboard` ⚠️ **Bug**: Currently all users are redirected to `/dashboard` regardless of role, but guardians should be redirected to `/household` according to `getPostLoginRoute`. See [Issue #187](https://github.com/tzlukoma/gather-kids/issues/187) for the fix.
   - **Note**: The `/dashboard` route is protected for ADMIN and MINISTRY_LEADER only, so guardian users cannot actually access it. The intended behavior is to redirect guardians directly to `/household` after onboarding.

## Related Flows

- [Registration](./registration.md) - Registration flow
- [Household Portal](./household-portal.md) - Household dashboard
- [Main Guardian README](./README.md) - Return to guardian flows overview
