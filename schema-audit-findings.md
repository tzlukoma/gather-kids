# Registration Form Schema Audit - Critical Mismatches Found

## Overview
The registration form is failing due to multiple schema mismatches between what the frontend expects and what the database provides. This audit identifies all mismatches to be resolved proactively.

## Critical Issues Found

### 1. HOUSEHOLDS TABLE

**Form Submission Fields vs Database Schema:**
- ✅ `address_line1` - Fixed in migration 20250905001727
- ❌ `name` (form) vs `household_name` (database table)
- ❌ `preferredScriptureTranslation` (form) vs `preferred_scripture_translation` (database table)

**Database has:**
```sql
household_name text,
preferred_scripture_translation text,
```

**Form submits:**
```javascript
name: data.household.name,
preferredScriptureTranslation: data.household.preferredScriptureTranslation,
```

### 2. CHILDREN TABLE

**Form Submission Fields vs Database Schema:**
- ❌ `dob` (form) vs `birth_date` (database table)
- ❌ `grade` field - MISSING from database table entirely
- ❌ `special_needs` field - MISSING from database table entirely  
- ❌ `special_needs_notes` field - MISSING from database table entirely
- ❌ `medical_notes` field - MISSING from database table entirely
- ✅ `child_mobile` vs `mobile_phone` - matches database

**Database has:**
```sql
birth_date date,
mobile_phone text,
allergies text,
notes text,
```

**Form submits:**
```javascript
dob: childData.dob,
grade: childData.grade,
child_mobile: childData.child_mobile,
special_needs: childData.special_needs,
special_needs_notes: childData.special_needs_notes,
medical_notes: childData.medical_notes,
```

### 3. EMERGENCY_CONTACTS TABLE

**Data Type Mismatch:**
- ❌ `household_id` - Form submits UUID, database expects TEXT
- ❌ `contact_id` - Missing auto-generation logic

**Database has:**
```sql
contact_id text PRIMARY KEY,
household_id text,
```

**Form submits:**
```javascript
household_id: householdId, // UUID from household creation
```

### 4. GUARDIANS TABLE 

**Form Fields vs Database:**
- ❌ `relationship` field - MISSING from database table entirely

**Database missing:**
```sql
-- relationship text, -- THIS IS MISSING
```

**Form submits:**
```javascript
relationship: guardianData.relationship,
```

## Required Fixes

### Migration 1: Fix households table field names
```sql
-- Add missing columns and migrate data
ALTER TABLE households ADD COLUMN IF NOT EXISTS name text;
UPDATE households SET name = household_name WHERE name IS NULL;

-- Rename column
ALTER TABLE households RENAME COLUMN preferred_scripture_translation TO preferredScriptureTranslation;
```

### Migration 2: Fix children table missing fields
```sql
-- Add missing columns to children table
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS special_needs boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS special_needs_notes text,
ADD COLUMN IF NOT EXISTS medical_notes text;

-- Rename birth_date to dob for frontend compatibility
ALTER TABLE children RENAME COLUMN birth_date TO dob;
ALTER TABLE children RENAME COLUMN mobile_phone TO child_mobile;
```

### Migration 3: Fix emergency_contacts data types
```sql
-- Change household_id to UUID type to match households table
ALTER TABLE emergency_contacts 
ALTER COLUMN household_id TYPE uuid USING household_id::uuid;

-- Add foreign key constraint
ALTER TABLE emergency_contacts 
ADD CONSTRAINT emergency_contacts_household_id_fkey 
FOREIGN KEY (household_id) REFERENCES households(household_id) ON DELETE CASCADE;
```

### Migration 4: Fix guardians table missing relationship field
```sql
-- Add missing relationship field
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS relationship text;
```

## Impact Assessment
- **Critical**: Registration form will fail completely without these fixes
- **Data Loss Risk**: Medium - migrations should preserve existing data
- **Downtime**: None - migrations can be run during operation

## Testing Plan
1. Apply migrations in UAT environment
2. Test complete registration flow
3. Verify existing data integrity
4. Test both new registrations and updates