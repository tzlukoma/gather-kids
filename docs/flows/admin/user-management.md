# Admin User Management Flow

## Overview

Admins can manage users, assign roles, activate/deactivate users, and manage user permissions.

## Flow Steps

1. **Access User Management**
   - Navigate to `/dashboard/users`
   - View list of all users
   - Filter and search users

2. **View User Details**
   - Click on user to view details
   - See user role, assigned ministries, household associations
   - View user activity

3. **Promote User to Admin**
   - Select a non-admin user
   - Use the **Promote to Admin** action in the `/dashboard/users` table to change the user's role to `ADMIN`
   - Changing roles to `MINISTRY_LEADER`, `GUARDIAN`, `VOLUNTEER`, or `GUEST` is not yet supported in this UI and will be handled by future tooling or flows (TBD)

4. **(Planned) Activate/Deactivate User**
   - Not yet available in the current `/dashboard/users` UI; documented here as a future enhancement for toggling user active status via `is_active` field.

5. **(Planned) Assign Ministries**
   - Not yet available in the current `/dashboard/users` UI; documented here as a future enhancement for assigning users to ministries and updating `assignedMinistryIds` to affect ministry leader access.

## Related Flows

- [Admin Dashboard](./dashboard.md) - Dashboard overview
- [Main Admin README](./README.md) - Return to admin flows overview
