<!-- b9de12d5-77f8-4964-9d07-bde32f12799c 642f2ee7-7f81-40b6-b60c-51c6e01f7a4b -->
# Household Data Editing Feature

## Overview

Allow users to update household and child data after submission using modal dialogs that pre-populate with existing data. ADMIN users can edit all households, GUARDIAN users can only edit their own. Changes are immediate with confirmation warnings and audit trails. Uses database adapters directly through React Query mutations - NO API routes.

## Key Components to Create

### 1. Edit Modal Components (new files)

**`src/components/gatherKids/edit-guardian-modal.tsx`**

- Modal form for adding/editing guardian information
- Uses react-hook-form with zod validation matching `guardianSchema` from register page
- Fields: first_name, last_name, mobile_phone, email, relationship, is_primary
- Props: `guardian: Guardian | null`, `householdId: string`, `onClose: () => void`
- When editing (guardian not null): Pre-populate form with `defaultValues: guardian` in useForm
- When adding new (guardian is null): Empty form fields
- Calls `useAddGuardian()` or `useUpdateGuardian()` mutation hooks

**`src/components/gatherKids/edit-emergency-contact-modal.tsx`**

- Modal form for editing emergency contact
- Fields: first_name, last_name, mobile_phone, relationship
- Props: `contact: EmergencyContact`, `householdId: string`, `onClose: () => void`
- Pre-populate form with `defaultValues: contact` in useForm
- Calls `useUpdateEmergencyContact()` mutation hook

**`src/components/gatherKids/edit-child-modal.tsx`**

- Modal form for adding/editing child information
- Fields: first_name, last_name, dob, grade, child_mobile, allergies, medical_notes, special_needs, special_needs_notes
- Props: `child: Child | null`, `householdId: string`, `onClose: () => void`
- When editing: Pre-populate form with `defaultValues: child`
- When adding new: Empty form, auto-enroll in current active registration cycle
- Calls `useAddChild()` or `useUpdateChild()` mutation hooks

**`src/components/gatherKids/edit-child-enrollments-modal.tsx`**

- Modal for managing child's ministry enrollments for current year only
- Props: `child: Child`, `householdId: string`, `currentEnrollments: MinistryEnrollment[]`, `onClose: () => void`
- Filter enrollments by current active cycle
- Pre-populate checkboxes and custom fields based on existing enrollments
- Calls `useAddChildEnrollment()`, `useRemoveChildEnrollment()`, `useUpdateChildEnrollmentFields()` mutation hooks

**`src/components/gatherKids/edit-household-address-modal.tsx`**

- Modal for editing household address and basic info
- Fields: name, address_line1, address_line2, city, state, zip, preferredScriptureTranslation
- Props: `household: Household`, `onClose: () => void`
- Pre-populate form with `defaultValues: household` in useForm
- Calls `useUpdateHousehold()` mutation hook

**`src/components/gatherKids/confirmation-dialog.tsx`**

- Reusable confirmation dialog component
- Props: `isOpen: boolean`, `title: string`, `description: string`, `onConfirm: () => void`, `onCancel: () => void`, `variant?: 'default' | 'destructive'`
- Warning styling for destructive actions

### 2. Update Household Profile Component

**Modify `src/components/gatherKids/household-profile.tsx`**

- Add "Edit" buttons next to each section
- Check user permissions using `canEditHousehold()` helper
- Add state management for modal visibility and pass current data to modals
- Permission check happens in component, mutations are called directly

### 3. Data Access Layer Functions

**Enhance `src/lib/dal.ts`**

Add functions that call through to database adapters:

```typescript
// Get current active registration cycle
export async function getCurrentRegistrationCycle(): Promise<RegistrationCycle | null>

// Household updates
export async function updateHouseholdInfo(householdId: string, data: Partial<Household>): Promise<void>

// Guardian operations  
export async function addGuardian(householdId: string, guardian: Omit<Guardian, 'guardian_id'>): Promise<Guardian>
export async function updateGuardian(guardianId: string, data: Partial<Guardian>): Promise<void>
export async function removeGuardian(guardianId: string): Promise<void>

// Emergency contact
export async function updateEmergencyContact(householdId: string, contact: EmergencyContact): Promise<void>

// Child operations
export async function addChild(householdId: string, child: Omit<Child, 'child_id'>, cycleId: string): Promise<Child>
export async function updateChild(childId: string, data: Partial<Child>): Promise<void>
export async function softDeleteChild(childId: string): Promise<void>

// Enrollment operations (current cycle only)
export async function addChildEnrollment(childId: string, ministryId: string, cycleId: string, customFields?: any): Promise<void>
export async function removeChildEnrollment(childId: string, ministryId: string, cycleId: string): Promise<void>
export async function updateChildEnrollmentFields(childId: string, ministryId: string, cycleId: string, customFields: any): Promise<void>
```

### 4. Permissions Helper

**Create `src/lib/permissions/household.ts`**

```typescript
import type { BaseUser } from '@/lib/auth-types';
import { AuthRole } from '@/lib/auth-types';

export function canEditHousehold(user: BaseUser | null, householdId: string): boolean {
  if (!user) return false;
  
  // Admin can edit any household
  if (user.metadata?.role === AuthRole.ADMIN) return true;
  
  // Guardian can edit their own household
  if (user.metadata?.role === AuthRole.GUARDIAN && 
      user.metadata?.household_id === householdId) {
    return true;
  }
  
  return false;
}
```

### 5. React Query Hooks (Following Established Patterns)

**Enhance `src/hooks/data/households.ts`** (add mutations to existing file)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHouseholdInfo, updateEmergencyContact } from '@/lib/dal';
import { queryKeys } from './keys';

export function useUpdateHousehold() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, data }: { 
      householdId: string; 
      data: Partial<Household> 
    }) => updateHouseholdInfo(householdId, data),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.household(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.households() });
    },
  });
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, contact }: { 
      householdId: string; 
      contact: EmergencyContact 
    }) => updateEmergencyContact(householdId, contact),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: ['emergencyContacts'] });
    },
  });
}
```

**Create `src/hooks/data/guardians.ts`** (new file)

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addGuardian, updateGuardian, removeGuardian } from '@/lib/dal';
import { queryKeys } from './keys';
import type { Guardian } from '@/lib/types';

export function useAddGuardian() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, guardian }: { 
      householdId: string; 
      guardian: Omit<Guardian, 'guardian_id'> 
    }) => addGuardian(householdId, guardian),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
    },
  });
}

export function useUpdateGuardian() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ guardianId, householdId, data }: { 
      guardianId: string;
      householdId: string;
      data: Partial<Guardian> 
    }) => updateGuardian(guardianId, data),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
    },
  });
}

export function useRemoveGuardian() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ guardianId, householdId }: { 
      guardianId: string;
      householdId: string;
    }) => removeGuardian(guardianId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
    },
  });
}
```

**Enhance `src/hooks/data/children.ts`** (add mutations)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addChild, updateChild, softDeleteChild } from '@/lib/dal';
import { queryKeys } from './keys';

export function useAddChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, child, cycleId }: { 
      householdId: string;
      child: Omit<Child, 'child_id'>;
      cycleId: string;
    }) => addChild(householdId, child, cycleId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId, data }: { 
      childId: string;
      householdId: string;
      data: Partial<Child> 
    }) => updateChild(childId, data),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}

export function useSoftDeleteChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId }: { 
      childId: string;
      householdId: string;
    }) => softDeleteChild(childId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}
```

**Create `src/hooks/data/enrollments.ts`** (new file)

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  addChildEnrollment, 
  removeChildEnrollment, 
  updateChildEnrollmentFields 
} from '@/lib/dal';
import { queryKeys } from './keys';

export function useAddChildEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId, ministryId, cycleId, customFields }: { 
      childId: string;
      householdId: string;
      ministryId: string;
      cycleId: string;
      customFields?: any;
    }) => addChildEnrollment(childId, ministryId, cycleId, customFields),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
    },
  });
}

export function useRemoveChildEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId, ministryId, cycleId }: { 
      childId: string;
      householdId: string;
      ministryId: string;
      cycleId: string;
    }) => removeChildEnrollment(childId, ministryId, cycleId),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
    },
  });
}

export function useUpdateChildEnrollmentFields() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId, ministryId, cycleId, customFields }: { 
      childId: string;
      householdId: string;
      ministryId: string;
      cycleId: string;
      customFields: any;
    }) => updateChildEnrollmentFields(childId, ministryId, cycleId, customFields),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
    },
  });
}
```

**Update `src/hooks/data/index.ts`**

```typescript
// Add to existing exports
export { 
  useUpdateHousehold, 
  useUpdateEmergencyContact 
} from './households';

export { 
  useAddGuardian, 
  useUpdateGuardian, 
  useRemoveGuardian 
} from './guardians';

export { 
  useAddChild, 
  useUpdateChild, 
  useSoftDeleteChild 
} from './children';

export { 
  useAddChildEnrollment, 
  useRemoveChildEnrollment, 
  useUpdateChildEnrollmentFields 
} from './enrollments';
```

### 6. Database Adapter Support

**Enhance `src/lib/database/supabase-adapter.ts`**

Add methods to SupabaseAdapter class:

```typescript
// Household
async updateHousehold(householdId: string, data: Partial<Household>): Promise<void>

// Guardians
async addGuardian(householdId: string, guardian: Omit<Guardian, 'guardian_id'>): Promise<Guardian>
async updateGuardian(guardianId: string, data: Partial<Guardian>): Promise<void>
async removeGuardian(guardianId: string): Promise<void>

// Emergency Contact
async updateEmergencyContact(householdId: string, contact: EmergencyContact): Promise<void>

// Children
async addChild(householdId: string, child: Omit<Child, 'child_id'>, cycleId: string): Promise<Child>
async updateChild(childId: string, data: Partial<Child>): Promise<void>
async softDeleteChild(childId: string): Promise<void>

// Enrollments
async addEnrollment(childId: string, ministryId: string, cycleId: string, customFields?: any): Promise<void>
async removeEnrollment(childId: string, ministryId: string, cycleId: string): Promise<void>
async updateEnrollmentFields(childId: string, ministryId: string, cycleId: string, customFields: any): Promise<void>

// Audit logging
async logAudit(log: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void>
```

**Enhance `src/lib/database/indexed-db-adapter.ts`**

Add corresponding methods for demo mode with same signatures

### 7. Database Adapter Interface

**Enhance `src/lib/database/types.ts`**

Add methods to DatabaseAdapter interface to match adapter implementations

### 8. Database Migration

**Create `supabase/migrations/YYYYMMDDHHMMSS_add_audit_log_table.sql`**

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(household_id),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_household ON audit_log(household_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

### 9. Types Updates

**Enhance `src/lib/types.ts`**

```typescript
export interface AuditLogEntry {
  id: string;
  household_id: string;
  user_id: string;
  action: string;
  entity_type: 'guardian' | 'child' | 'household' | 'enrollment' | 'emergency_contact';
  entity_id?: string;
  changes: Record<string, any>;
  created_at: string;
}
```

## Implementation Steps

1. Create audit log database migration and run it
2. Add audit logging to database adapter interface
3. Implement audit logging in Supabase adapter and IndexedDB adapter
4. Create permission helper function
5. Add update methods to database adapter interface
6. Implement update methods in Supabase adapter
7. Implement update methods in IndexedDB adapter for demo mode
8. Add DAL functions that call through to adapters
9. Create React Query mutation hooks following established patterns
10. Build reusable confirmation dialog component
11. Create individual edit modal components with pre-populated forms
12. Create child enrollments modal with current cycle filtering
13. Update HouseholdProfile component with edit buttons and modal state
14. Add getCurrentRegistrationCycle() to filter enrollments
15. Test all CRUD operations
16. Test permission boundaries
17. Verify audit trail
18. Verify form pre-population

## Key Considerations

- **No API Routes**: All mutations go directly through DAL -> Database Adapters
- **Permission Checks**: Happen in UI components before calling mutations
- **Pre-populated Forms**: All edit modals use `defaultValues` in useForm
- **Current Cycle Only**: Filter enrollments using `getCurrentRegistrationCycle()`
- **Auto-enrollment**: New children auto-enrolled in current active cycle
- **Soft Deletes**: Children marked `is_active = false`
- **Confirmation Dialogs**: For irreversible actions
- **Audit Trail**: Log all changes through database adapters
- **Query Invalidation**: Invalidate `householdProfile` after mutations
- **Form Validation**: Reuse zod schemas from registration page

## Files to Create

- `src/components/gatherKids/edit-guardian-modal.tsx`
- `src/components/gatherKids/edit-emergency-contact-modal.tsx`
- `src/components/gatherKids/edit-child-modal.tsx`
- `src/components/gatherKids/edit-child-enrollments-modal.tsx`
- `src/components/gatherKids/edit-household-address-modal.tsx`
- `src/components/gatherKids/confirmation-dialog.tsx`
- `src/lib/permissions/household.ts`
- `src/hooks/data/guardians.ts`
- `src/hooks/data/enrollments.ts`
- `supabase/migrations/YYYYMMDDHHMMSS_add_audit_log_table.sql`

## Files to Modify

- `src/components/gatherKids/household-profile.tsx` (add edit buttons and modals)
- `src/hooks/data/households.ts` (add mutation hooks)
- `src/hooks/data/children.ts` (add mutation hooks)
- `src/hooks/data/index.ts` (export new hooks)
- `src/lib/dal.ts` (add update functions)
- `src/lib/database/types.ts` (add methods to DatabaseAdapter interface)
- `src/lib/database/supabase-adapter.ts` (implement update methods)
- `src/lib/database/indexed-db-adapter.ts` (implement update methods)
- `src/lib/types.ts` (add AuditLogEntry type)

### To-dos

- [ ] Create audit log database migration
- [ ] Add audit logging functions to DAL and adapters
- [ ] Create household permissions helper
- [ ] Build reusable confirmation dialog component
- [ ] Create all edit modal components (guardian, emergency contact, child, household, enrollments)
- [ ] Create API routes for update operations with permission checks
- [ ] Create React Query mutation hooks for updates
- [ ] Update HouseholdProfile component with edit buttons and modal management
- [ ] Add getCurrentRegistrationCycle and filter enrollments by current cycle
- [ ] Test all CRUD operations for each entity type
- [ ] Test permission boundaries (ADMIN vs GUARDIAN)
- [ ] Verify audit trail logging works correctly