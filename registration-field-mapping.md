# Registration Flow Field Mapping - Shape Sheet

## Current State Analysis (Post-Migration 20250905005600)

| Entity | Surface | UI Field (register/page.tsx) | DAL Method/Type (types.ts) | DB Column (supabase-types.ts) | Status | Notes |
|--------|---------|------------------------------|---------------------------|----------------------------|--------|-------|
| **HOUSEHOLDS** | | | | | | |
| | Register Form | `name` | `Household.name?` | ❌ Missing (has `household_name`) | MISMATCH | Migration 20250905005600 added `name` column |
| | Register Form | `address_line1` | `Household.address_line1?` | ✅ `address` | RENAMED | Migration renamed to `address` |
| | Register Form | `address_line2` | `Household.address_line2?` | ❌ Missing | MISSING | Need to add |
| | Register Form | `city` | `Household.city?` | ✅ `city` | MATCH | |
| | Register Form | `state` | `Household.state?` | ✅ `state` | MATCH | |
| | Register Form | `zip` | `Household.zip?` | ✅ `zip` | MATCH | |
| | Register Form | `preferredScriptureTranslation` | `Household.preferredScriptureTranslation?` | ❌ `preferred_scripture_translation` | MISMATCH | Migration added camelCase column |
| | DAL | `household_id` | `Household.household_id` | ✅ `household_id` | MATCH | Primary key |
| | DAL | `primary_email` | `Household.primary_email?` | ❌ `email` | RENAMED | DB uses `email` |
| | DAL | `primary_phone` | `Household.primary_phone?` | ❌ Missing | MISSING | Need to add |
| | DAL | `photo_url` | `Household.photo_url?` | ❌ Missing | MISSING | Optional field |
| | System | `created_at` | `Household.created_at` | ✅ `created_at` | MATCH | |
| | System | `updated_at` | `Household.updated_at` | ✅ `updated_at` | MATCH | |
| **GUARDIANS** | | | | | | |
| | Register Form | `first_name` | `Guardian.first_name` | ✅ `first_name` | MATCH | |
| | Register Form | `last_name` | `Guardian.last_name` | ✅ `last_name` | MATCH | |
| | Register Form | `mobile_phone` | `Guardian.mobile_phone` | ✅ `mobile_phone` | MATCH | |
| | Register Form | `email` | `Guardian.email?` | ✅ `email` | MATCH | |
| | Register Form | `relationship` | `Guardian.relationship` | ✅ `relationship` | MATCH | Migration 20250905005600 added |
| | Register Form | `is_primary` | `Guardian.is_primary` | ✅ `is_primary` | MATCH | |
| | DAL | `guardian_id` | `Guardian.guardian_id` | ✅ `guardian_id` | MATCH | Primary key |
| | DAL | `household_id` | `Guardian.household_id` | ✅ `household_id` | MATCH | Foreign key |
| | System | `created_at` | `Guardian.created_at` | ✅ `created_at` | MATCH | |
| | System | `updated_at` | `Guardian.updated_at` | ✅ `updated_at` | MATCH | |
| **EMERGENCY_CONTACTS** | | | | | | |
| | Register Form | `first_name` | `EmergencyContact.first_name` | ❌ Missing (has `name`) | MISMATCH | DB has `name` instead |
| | Register Form | `last_name` | `EmergencyContact.last_name` | ❌ Missing (has `name`) | MISMATCH | DB has single `name` field |
| | Register Form | `mobile_phone` | `EmergencyContact.mobile_phone` | ❌ `phone` | RENAMED | DB uses `phone` |
| | Register Form | `relationship` | `EmergencyContact.relationship` | ✅ `relationship` | MATCH | |
| | DAL | `contact_id` | `EmergencyContact.contact_id` | ✅ `contact_id` | MATCH | Primary key |
| | DAL | `household_id` | `EmergencyContact.household_id` | ❌ `household_id` + `household_id_uuid` | COMPLEX | Migration created UUID FK |
| | System | `created_at` | ❌ Missing | ✅ `created_at` | MISSING | Need to add to type |
| | System | `updated_at` | ❌ Missing | ✅ `updated_at` | MISSING | Need to add to type |
| **CHILDREN** | | | | | | |
| | Register Form | `first_name` | `Child.first_name` | ❌ Missing | MISSING | Need to add |
| | Register Form | `last_name` | `Child.last_name` | ❌ Missing | MISSING | Need to add |
| | Register Form | `dob` | `Child.dob?` | ❌ Missing (has `birth_date`) | MISMATCH | Migration 20250905005600 added `dob` |
| | Register Form | `grade` | `Child.grade?` | ✅ `grade` | MATCH | Migration 20250905005600 added |
| | Register Form | `child_mobile` | `Child.child_mobile?` | ✅ `child_mobile` | MATCH | Migration 20250905005600 added |
| | Register Form | `allergies` | `Child.allergies?` | ✅ `allergies` | MATCH | |
| | Register Form | `medical_notes` | `Child.medical_notes?` | ❌ `notes` | RENAMED | DB uses `notes` |
| | Register Form | `special_needs` | `Child.special_needs?` | ✅ `special_needs` | MATCH | Migration 20250905005600 added |
| | Register Form | `special_needs_notes` | `Child.special_needs_notes?` | ❌ Missing | MISSING | Migration 20250905005600 should have added |
| | DAL | `child_id` | `Child.child_id` | ❌ Missing (has `id`) | MISMATCH | DB uses auto-increment `id` |
| | DAL | `household_id` | `Child.household_id` | ✅ `household_id` | MATCH | Foreign key |
| | DAL | `is_active` | `Child.is_active` | ✅ `is_active` | MATCH | |
| | DAL | `photo_url` | `Child.photo_url?` | ❌ Missing | MISSING | Optional field |
| | System | `created_at` | `Child.created_at` | ✅ `created_at` | MATCH | |
| | System | `updated_at` | `Child.updated_at` | ✅ `updated_at` | MATCH | |
| **REGISTRATIONS** | | | | | | |
| | Register Form | `consents.liability` | `Registration.consents[].type: 'liability'` | ❌ Not checked | UNMAPPED | Need to check |
| | Register Form | `consents.photoRelease` | `Registration.consents[].type: 'photoRelease'` | ❌ Not checked | NEEDS_SNAKE_CASE | Should be `photo_release` |
| | DAL | `registration_id` | `Registration.registration_id` | ❌ Not checked | UNMAPPED | Need to check |
| | DAL | `child_id` | `Registration.child_id` | ❌ Not checked | UNMAPPED | Need to check |
| | DAL | `cycle_id` | `Registration.cycle_id` | ❌ Not checked | UNMAPPED | Need to check |
| | DAL | `status` | `Registration.status` | ❌ Not checked | UNMAPPED | Need to check |
| | DAL | `pre_registered_sunday_school` | `Registration.pre_registered_sunday_school` | ❌ Not checked | UNMAPPED | Need to check |
| | DAL | `submitted_via` | `Registration.submitted_via` | ❌ Not checked | UNMAPPED | Need to check |
| | DAL | `submitted_at` | `Registration.submitted_at` | ❌ Not checked | UNMAPPED | Need to check |

## Issues Identified

### CRITICAL Schema Mismatches Still Present:
1. **Children table**: Missing `first_name`, `last_name`, `child_id` proper mapping
2. **Emergency contacts**: Field name mismatches (`name` vs `first_name`/`last_name`, `phone` vs `mobile_phone`)
3. **Households**: Mixed field naming (some migrated, some not)
4. **Registration/consents**: photoRelease needs snake_case conversion

### Migration 20250905005600 Analysis:
- ✅ Added missing fields: `households.name`, `children.grade/special_needs/medical_notes`, `guardians.relationship`
- ✅ Created compatibility columns: `households.preferredScriptureTranslation`, `children.dob/child_mobile`
- ⚠️ Used camelCase for new columns instead of snake_case (against requirement)
- ❌ Did not address emergency_contacts field naming mismatches
- ❌ Did not standardize to snake_case across the board

### Action Plan:
1. Check current DB state to see what's actually applied
2. Create new migrations to fix remaining mismatches and enforce snake_case
3. Update type mappings to handle legacy/compatibility columns
4. Create canonical snake_case DTOs
5. Update DAL to use canonical shapes while maintaining API compatibility