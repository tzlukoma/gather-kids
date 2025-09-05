# Registration Database Drop Plan

## Overview

This document outlines the planned database schema changes for the Registration Fresh Start - Step 3. Each change is documented with rationale and proof of non-usage to ensure safe removal of legacy/duplicate columns.

## Safety Measures

### Backup & Rollback Steps

1. **Pre-migration Database Backup**:
   ```bash
   # Create timestamped backup
   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S)_pre_registration_cleanup.sql
   ```

2. **Rollback Strategy**:
   - Each migration is non-destructive initially (adds before removing)
   - Failed migrations can be rolled back by reversing the specific changes
   - Database backup can be restored if needed: `psql "$DATABASE_URL" < backup_file.sql`

3. **Local Testing**:
   ```bash
   # Test against fresh local DB
   ./scripts/test-db-setup.sh
   supabase db reset
   # Apply migrations in order
   supabase migration up
   ```

## Planned Changes by Table

### 1. Households Table

#### Backfill Operations
- **Field**: `preferred_scripture_translation` ← `preferredScriptureTranslation`
- **Rationale**: Canonical DTO uses snake_case; camelCase is legacy
- **Backfill SQL**: 
  ```sql
  UPDATE public.households
     SET preferred_scripture_translation = preferredScriptureTranslation
   WHERE preferred_scripture_translation IS NULL
     AND preferredScriptureTranslation IS NOT NULL;
  ```

#### Planned Drops
- **Drop**: `preferredScriptureTranslation` (camelCase duplicate)
- **Usage Analysis**: Found in 20 locations across 10 files:
  ```bash
  grep -r "preferredScriptureTranslation" --include="*.ts" --include="*.tsx" src/
  # Results: 20 matches in type definitions, adapters, and conversion layers
  ```
- **Key Usage Locations**:
  - `src/lib/database/supabase-adapter.ts` - Writes to BOTH fields for migration compatibility
  - `src/lib/database/canonical-dal.ts` - Converts from camelCase to snake_case
  - `src/lib/database/type-mappings.ts` - Handles conversion between formats
  - `src/app/register/page.tsx` - Registration form using legacy format
- **Proof of Safety**: 
  - All current writes go to BOTH `preferredScriptureTranslation` AND `preferred_scripture_translation`
  - Canonical DAL already converts camelCase input to snake_case output
  - Registration forms will be updated in next phase to use canonical DTOs

#### Fields to Evaluate (with proof required)
- **Evaluate**: `address` - May be unused if `address_line1` is preferred
- **Evaluate**: `household_name` - May be duplicate of `name`
- **Evaluate**: `household_uuid` - Only drop if no remaining FK dependencies

### 2. Children Table

#### Backfill Operations
- **Field**: `dob` ← `birth_date`
- **Rationale**: Canonical DTO uses `dob`; `birth_date` is legacy
- **Backfill SQL**:
  ```sql
  UPDATE public.children
     SET dob = COALESCE(dob, birth_date)
   WHERE birth_date IS NOT NULL;
  ```

- **Field**: `child_mobile` ← `mobile_phone`
- **Rationale**: Canonical DTO uses `child_mobile` to distinguish from guardian mobile
- **Backfill SQL**:
  ```sql
  UPDATE public.children
     SET child_mobile = COALESCE(child_mobile, mobile_phone)
   WHERE mobile_phone IS NOT NULL;
  ```

#### Planned Drops
- **Drop**: `birth_date` (after backfill to `dob`)
- **Usage Analysis**: Found in 9 locations across 6 files:
  ```bash
  grep -r "birth_date" --include="*.ts" --include="*.tsx" src/
  # Results: 9 matches in adapters and type definitions
  ```
- **Key Usage Locations**:
  - `src/lib/database/supabase-adapter.ts` - Lines 197, 237: Writes to BOTH fields
  - `src/lib/database/supabase-types.ts` - Type definitions only
- **Proof**: All writes go to BOTH `birth_date` AND `dob`; canonical DTOs use `dob`

- **Drop**: `mobile_phone` (after backfill to `child_mobile`) 
- **Usage Analysis**: Found in supabase-adapter.ts for dual writes only
- **Key Usage**: Lines 200, 243 in supabase-adapter.ts write to BOTH fields
- **Proof**: Canonical DTOs use `child_mobile` exclusively

#### Fields to Evaluate (with proof required)
- **Evaluate**: `household_uuid` - Only drop if consolidated to `household_id`
- **Evaluate**: `external_*` fields - May be needed for import compatibility
- **Evaluate**: `notes` - Check if used in UI
- **Evaluate**: `gender` - Check if used in registration flow

### 3. Guardians Table

#### Backfill Operations
- **Field**: `household_id` ← mapping from `household_uuid`
- **Rationale**: Consolidate household references to use primary key
- **Backfill SQL**:
  ```sql
  UPDATE public.guardians g
     SET household_id = h.household_id
    FROM public.households h
   WHERE g.household_id IS NULL
     AND g.household_uuid IS NOT NULL
     AND h.household_uuid = g.household_uuid;
  ```

#### Fields to Evaluate (with proof required)
- **Evaluate**: `household_uuid` - Drop after consolidating to `household_id`
- **Evaluate**: `household_id_uuid` - Intermediate field, may be droppable
- **Evaluate**: `external_*` fields - Check import script dependencies

### 4. Emergency Contacts Table

#### Status
- **Schema**: Already snake_case (`first_name`, `last_name`, `mobile_phone`, `relationship`)
- **Action**: No schema changes needed, already aligned with canonical DTOs
- **FK**: May need `household_id_uuid` FK constraint addition (separate from this cleanup)

### 5. Registrations Table

#### Schema Updates
- **Field**: `consents` column type
- **Change**: `json` → `jsonb` for better performance and functionality
- **SQL**:
  ```sql
  ALTER TABLE public.registrations
    ALTER COLUMN consents TYPE jsonb USING consents::jsonb;
  ```

#### Backfill Operations
- **Field**: Consent object `type` values
- **Change**: `'photoRelease'` → `'photo_release'`
- **Rationale**: Canonical DTOs enforce snake_case for consent types
- **Backfill SQL**:
  ```sql
  UPDATE public.registrations
     SET consents = (
       SELECT jsonb_agg(
         CASE WHEN e->>'type' = 'photoRelease'
              THEN jsonb_set(e, '{type}', '"photo_release"')
              ELSE e
         END
       )
       FROM jsonb_array_elements(consents) AS e
     )
   WHERE EXISTS (
     SELECT 1 FROM jsonb_array_elements(consents) e
     WHERE e->>'type' = 'photoRelease'
   );
  ```

## Default Value Updates

### Timestamp Columns
- **All tables**: Update `created_at`, `updated_at` to `timestamptz NOT NULL DEFAULT now()`
- **Rationale**: Ensure consistent timezone handling and non-null defaults

### Boolean Defaults
- **children.is_active**: Set `DEFAULT true`
- **Rationale**: New children should be active by default

## Migration Order

1. **Add/Normalize**: Column types, defaults, constraints
2. **Backfill**: Data migration (idempotent)
3. **FK Hardening**: Consolidate household references
4. **Drops**: Remove legacy/duplicate columns (with usage proof)

## Verification Steps

Post-migration verification queries:

```sql
-- Verify no photoRelease consent types remain
SELECT COUNT(*) FROM registrations r, jsonb_array_elements(r.consents) e 
WHERE e->>'type' = 'photoRelease';

-- Verify birth_date/mobile_phone removal
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'children' AND column_name IN ('birth_date', 'mobile_phone');

-- Verify preferredScriptureTranslation removal  
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'households' AND column_name = 'preferredScriptureTranslation';

-- Check data integrity
SELECT COUNT(*) FROM children WHERE dob IS NOT NULL;
SELECT COUNT(*) FROM households WHERE preferred_scripture_translation IS NOT NULL;
```

## Success Criteria

- [ ] All canonical DTO field names match database schema
- [ ] No camelCase field names remain in Registration domain
- [ ] All legacy duplicates removed with proof of non-usage
- [ ] Data successfully backfilled with zero loss
- [ ] CI pipeline passes (types-sync, contracts, snake_case guard)
- [ ] Manual verification queries return expected results