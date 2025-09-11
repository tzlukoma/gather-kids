# Roles and Access Control

This document outlines the role-based access control (RBAC) system implemented in the Gather Kids application, including user roles, permissions, and Row-Level Security (RLS) policies.

## Overview

The application uses a multi-role system where users are assigned specific roles that determine their access to different parts of the system and data. Roles are stored in Supabase user metadata and enforced through RLS policies at the database level.

## User Roles

### 1. ADMIN

**Purpose**: Complete administrative control over the system

**Dashboard Access**:

- ✅ All dashboard pages including ministries management
- ✅ Full access to all administrative functions
- ✅ Can manage users, roles, and system settings

**Data Permissions**:

- ✅ **SELECT**: All data from all tables
- ✅ **INSERT**: Can create records in any table
- ✅ **UPDATE**: Can modify any record
- ✅ **DELETE**: Can delete any record

**Use Cases**:

- System administration
- User management
- Ministry configuration
- Data maintenance

### 2. MINISTRY_LEADER

**Purpose**: Manage ministry participants and view organizational data

**Dashboard Access**:

- ✅ Rosters page (primary dashboard)
- ✅ Registrations page
- ✅ Household profiles
- ❌ Ministries management (redirected to rosters)

**Data Permissions**:

- ✅ **SELECT**: All households, children, guardians, emergency contacts
- ❌ **INSERT**: Cannot create household/child records
- ❌ **UPDATE**: Cannot modify household/child records
- ❌ **DELETE**: Cannot delete household/child records

**Use Cases**:

- View ministry rosters
- Check attendance
- Review registrations
- Access contact information for ministry participants

### 3. GUARDIAN

**Purpose**: Parents managing their own family data

**Dashboard Access**:

- ❌ Dashboard access (redirected to home page)
- ✅ Registration form access
- ✅ Can view/edit their own household data

**Data Permissions**:

- ✅ **SELECT**: Only data from households they're associated with via `user_households` table
- ✅ **INSERT**: Can create children/guardians/emergency contacts in their household
- ✅ **UPDATE**: Can modify their household data
- ✅ **DELETE**: Can delete children from their household

**Use Cases**:

- Register children for ministries
- Update family information
- Manage emergency contacts
- View their own registration data

### 4. VOLUNTEER

**Purpose**: Future role for volunteers (currently defined but not actively used)

**Dashboard Access**:

- ❌ No dashboard access

**Data Permissions**:

- ❌ No data access (role not implemented)

**Use Cases**:

- Future implementation for volunteer management

### 5. GUEST

**Purpose**: Default role for users without assigned roles

**Dashboard Access**:

- ❌ No dashboard access (redirected to home page)

**Data Permissions**:

- ❌ No data access

**Use Cases**:

- New users before role assignment
- Users without specific role assignment

## Role Assignment Flow

### 1. New User Registration

```
New User → GUEST role (default)
↓
Complete Registration → GUARDIAN role assigned
```

### 2. Ministry Leader Assignment

```
Admin/System → Manually assign MINISTRY_LEADER role
↓
Ministry Leader → Access to rosters and registrations
```

### 3. Admin Assignment

```
System Administrator → Manually assign ADMIN role
↓
Admin → Full system access
```

## Row-Level Security (RLS) Policies

### Policy Structure

All RLS policies follow this pattern:

```sql
-- Role-based access using JWT token
(auth.jwt() ->> 'role')::text = 'ROLE_NAME'
```

### Table-Specific Policies

#### Children Table

- **GUARDIAN**: Access only children from their households
- **MINISTRY_LEADER**: SELECT all children (read-only)
- **ADMIN**: Full access (SELECT/INSERT/UPDATE/DELETE)

#### Households Table

- **GUARDIAN**: Access only their household
- **MINISTRY_LEADER**: SELECT all households (read-only)
- **ADMIN**: Full access (SELECT/INSERT/UPDATE/DELETE)

#### Guardians Table

- **GUARDIAN**: Access only guardians from their household
- **MINISTRY_LEADER**: SELECT all guardians (read-only)
- **ADMIN**: Full access (SELECT/INSERT/UPDATE/DELETE)

#### Emergency Contacts Table

- **GUARDIAN**: Access only emergency contacts from their household
- **MINISTRY_LEADER**: SELECT all emergency contacts (read-only)
- **ADMIN**: Full access (SELECT/INSERT/UPDATE/DELETE)

## Security Considerations

### 1. JWT Token Validation

- Roles are stored in JWT tokens as `user_metadata.role`
- RLS policies validate roles using `auth.jwt() ->> 'role'`
- Tokens are validated on every database request

### 2. Household Association

- Guardians are linked to households via `user_households` table
- This table maps `auth_user_id` to `household_id`
- Created during registration process

### 3. Ministry Leader Access

- Ministry leaders have read-only access to all data
- This allows them to view rosters and registrations
- They cannot modify household data directly

### 4. Admin Override

- Admins have full access to all data
- This allows system administration and data maintenance
- Should be used sparingly and with proper oversight

## Implementation Details

### Role Storage

```typescript
// Roles are defined in auth-types.ts
export const AuthRole = {
	ADMIN: 'ADMIN',
	MINISTRY_LEADER: 'MINISTRY_LEADER',
	GUARDIAN: 'GUARDIAN',
	VOLUNTEER: 'VOLUNTEER',
	GUEST: 'GUEST',
} as const;
```

### Role Assignment

```typescript
// During registration, users get GUARDIAN role
await supabase.auth.updateUser({
	data: { role: AuthRole.GUARDIAN },
});
```

### Navigation Control

```typescript
// Dashboard access is controlled by role
if (user?.metadata?.role === AuthRole.ADMIN) {
	// Full dashboard access
} else if (user?.metadata?.role === AuthRole.MINISTRY_LEADER) {
	// Redirect to rosters
} else {
	// Redirect to home
}
```

## Maintenance Notes

### Adding New Roles

1. Add role to `AuthRole` enum in `auth-types.ts`
2. Update RLS policies in migration files
3. Update navigation logic in dashboard components
4. Update this documentation

### Modifying Permissions

1. Update RLS policies in migration files
2. Test all role combinations
3. Update this documentation
4. Consider impact on existing users

### Testing Roles

- Test each role's access to different dashboard pages
- Verify RLS policies work correctly
- Test data access restrictions
- Verify navigation redirects work properly

## Related Files

- `src/lib/auth-types.ts` - Role definitions
- `src/contexts/auth-context.tsx` - Role management
- `src/app/login/page.tsx` - Demo users with different roles
- `supabase/migrations/20250110000004_fix_children_rls_policies.sql` - RLS policies
- `src/app/dashboard/` - Dashboard access control
- `src/lib/database/canonical-dal.ts` - Role assignment during registration

## Changelog

- **2025-01-11**: Initial RLS policies implemented
- **2025-01-11**: Role-based access control documented
- **2025-01-11**: Added support for MINISTRY_LEADER read-only access
