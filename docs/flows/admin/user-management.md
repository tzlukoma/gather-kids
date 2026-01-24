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

3. **Update User Role**
   - Select user
   - Change role (ADMIN, MINISTRY_LEADER, GUARDIAN, VOLUNTEER, GUEST)
   - Save changes

4. **Activate/Deactivate User**
   - Toggle user active status
   - Inactive users cannot access system
   - Update `is_active` field

5. **Assign Ministries**
   - Assign user to ministries
   - Update `assignedMinistryIds`
   - Affects ministry leader access

## Related Flows

- [Admin Dashboard](./dashboard.md) - Dashboard overview
- [Main Admin README](./README.md) - Return to admin flows overview
