# Shared Registration Flow (Technical)

## Overview

This document provides detailed technical implementation of the registration flow, including API calls, database operations, data transformations, and error handling.

## Technical Flow

### 1. Email Lookup

**Function**: `findHouseholdByEmail(email, cycleId)`

**Process:**
1. Look up guardian by email in `guardians` table
2. Infer associated household from guardian record
3. Check `ministry_enrollments` for the household in the current cycle
4. Check `ministry_enrollments` for the household in prior cycles
5. Return result: `{ isCurrentYear, isPrefill, data }`

**Database Operations:**
```sql
-- Find household by guardian email
SELECT h.*
FROM households h
JOIN guardians g ON g.household_id = h.id
WHERE g.email = $1;

-- Check ministry enrollments for current cycle
SELECT *
FROM ministry_enrollments
WHERE household_id = $1 AND cycle_id = $2;

-- Check ministry enrollments for prior cycles
SELECT *
FROM ministry_enrollments
WHERE household_id = $1 AND cycle_id <> $2;
```

### 2. Form Data Collection

**Components:**
- Household information
- Guardian array (primary + additional)
- Child array (with ministry selections)
- Emergency contact
- Consents (liability, photo release, group consents)

**Validation:**
- Zod schema validation
- Field-level validation
- Cross-field validation (e.g., custom consents based on ministry selections)

### 3. Registration Submission

**Function**: `registerHouseholdCanonical(data, cycleId, isPrefill)`

**Process:**

#### Step 1: Convert to Canonical Format
- Transform form data to canonical DTOs
- Standardize data shapes
- Validate canonical format

#### Step 2: Database Transaction
```typescript
await dbAdapter.transaction(async () => {
  // All operations in single transaction
})
```

#### Step 3: Household Creation/Update
```typescript
if (isUpdate) {
  await dbAdapter.updateHousehold(householdId, household);
} else {
  await dbAdapter.createHousehold(household);
}
```

#### Step 4: Guardian Creation
```typescript
for (const guardianData of guardians) {
  const guardian = await dbAdapter.createGuardian({
    household_id: householdId,
    ...guardianData
  });
  createdGuardians.push(guardian);
}
```

#### Step 5: Child Creation
```typescript
for (const childData of children) {
  const child = await dbAdapter.createChild({
    household_id: householdId,
    ...childData
  });
  
  // Create ministry enrollments
  for (const ministryId of child.ministrySelections) {
    await dbAdapter.createMinistryEnrollment({
      child_id: child.child_id,
      ministry_id: ministryId,
      cycle_id: cycleId,
      status: 'enrolled'
    });
  }
}
```

#### Step 6: Emergency Contact Creation
```typescript
await dbAdapter.createEmergencyContact({
  household_id: householdId,
  ...emergencyContactData
});
```

#### Step 7: Bible Bee Enrollment (Optional)
```typescript
if (bibleBeeEnrollment) {
  // Create Bible Bee enrollment record in bible_bee_enrollments table
  await dbAdapter.createEnrollment({
    child_id: child.child_id,
    bible_bee_cycle_id: bibleBeeYear,
    division_id: divisionId
  });
  
  // Optionally assign scriptures via enrollChildInBibleBee helper
  await enrollChildInBibleBee(child.child_id, bibleBeeYear);
}
```

#### Step 8: Link Auth User to Household
```typescript
// Assumes the caller is already authenticated (via /create-account or magic-link)
const session = await supabase.auth.getSession();

if (session?.data?.session?.user) {
  // Note: Currently uses direct Supabase insert because DatabaseAdapter 
  // doesn't have a createUserHousehold method. This is a known inconsistency
  // with the adapter pattern and should ideally be added to the adapter interface.
  await supabase
    .from('user_households')
    .insert({
      auth_user_id: session.data.session.user.id,
      household_id: householdId
    });

  // Update user metadata with role and household_id
  await supabase.auth.updateUser({
    data: {
      role: AuthRole.GUARDIAN,
      household_id: householdId
    }
  });
  
  // Refresh session to ensure AuthContext picks up role change
  await supabase.auth.refreshSession();
}
```

## Detailed Technical Sequence Diagram

```mermaid
sequenceDiagram
    participant Form
    participant RegisterPage
    participant DAL
    participant CanonicalDAL
    participant DBAdapter
    participant Database
    participant SupabaseAuth

    Form->>RegisterPage: Submit form data
    RegisterPage->>RegisterPage: Validate form (Zod)
    RegisterPage->>RegisterPage: Clean phone numbers
    RegisterPage->>DAL: registerHouseholdCanonical(data, cycleId, isPrefill)
    
    DAL->>CanonicalDAL: Convert to canonical format
    CanonicalDAL->>CanonicalDAL: Transform form data
    CanonicalDAL-->>DAL: Canonical DTOs
    
    DAL->>DBAdapter: transaction()
    DBAdapter->>Database: BEGIN TRANSACTION
    
    alt Update Existing Household
        DBAdapter->>Database: UPDATE households
        DBAdapter->>Database: DELETE existing guardians
        DBAdapter->>Database: DELETE existing contacts
    else Create New Household
        DBAdapter->>Database: INSERT INTO households
    end
    
    loop For each guardian
        DBAdapter->>Database: INSERT INTO guardians
    end
    
    loop For each child
        DBAdapter->>Database: INSERT INTO children
        loop For each ministry selection
            DBAdapter->>Database: INSERT INTO ministry_enrollments
        end
    end
    
    DBAdapter->>Database: INSERT INTO emergency_contacts
    
    alt Bible Bee Enrollment
        DBAdapter->>Database: INSERT INTO bible_bee_enrollments
        DBAdapter->>DBAdapter: enrollChildInBibleBee() (optional)
    end
    
    alt Authenticated User
        DBAdapter->>Database: INSERT INTO user_households
        DBAdapter->>SupabaseAuth: updateUser({ role, household_id })
        SupabaseAuth->>SupabaseAuth: refreshSession()
    end
    
    DBAdapter->>Database: COMMIT TRANSACTION
    Database-->>DBAdapter: Transaction committed
    DBAdapter-->>DAL: Success
    DAL-->>RegisterPage: Registration complete
    RegisterPage->>Form: Show success message
    RegisterPage->>RegisterPage: Redirect
```

## Data Transformations

### Form Data → Canonical DTOs

**Household:**
```typescript
{
  household_id: string | undefined,
  name: string | undefined,
  address_line1: string,
  address_line2: string | undefined,
  city: string,
  state: string,
  zip: string,
  preferred_scripture_translation: string | undefined,
  primary_email: string
}
```

**Guardian:**
```typescript
{
  first_name: string,
  last_name: string,
  mobile_phone: string, // cleaned
  email: string | undefined,
  relationship: string,
  is_primary: boolean
}
```

**Child:**
```typescript
{
  first_name: string,
  last_name: string,
  dob: string, // ISO date
  grade: string,
  child_mobile: string | undefined, // cleaned
  allergies: string | undefined,
  medical_notes: string | undefined,
  special_needs: boolean | undefined,
  special_needs_notes: string | undefined
}
```

## Error Handling

### Validation Errors
- Field-level validation errors shown inline
- Form submission blocked until valid
- Error messages from Zod schema

### Database Errors
- Transaction rollback on error
- Error toast shown to user
- Form data preserved (draft persistence)
- User can retry submission

### User Creation Errors
- Account creation happens separately via `/create-account` or magic-link auth
- Registration assumes user is already authenticated
- If user is not authenticated, registration completes but user must authenticate separately to access household portal
- For an already authenticated user, the `GUARDIAN` role and `household_id` are assigned during registration via `supabase.auth.updateUser({ data: { role: 'GUARDIAN', household_id } })` and the session is refreshed

## Draft Persistence

Drafts are managed via the shared `useDraftPersistence` hook, which persists data through the app's database adapter (`dbAdapter.getDraft` / `dbAdapter.saveDraft`):
- Saves on field blur
- Loads on page load (when draft persistence is enabled)
- Cleared on successful submission
- Drafts are keyed by `formName` (currently `registration_v1`) together with the household/email identifier, rather than a raw localStorage key

## Related Flows

- [Guardian Registration](../guardian/registration.md) - User-facing registration flow
- [Main Documentation](../README.md) - Return to main flows documentation
