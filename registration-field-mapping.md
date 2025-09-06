# Registration Flow Field Mapping - Shape Sheet

## Current State Analysis (Post-Canonical DTO Implementation)

### ✅ **PHASE 1 COMPLETE: Canonical Snake Case DTOs**

All registration flow entities now have standardized snake_case DTOs with comprehensive validation:

- ✅ **HouseholdReadDto / HouseholdWriteDto**: All fields snake_case, `preferred_scripture_translation` standardized
- ✅ **GuardianReadDto / GuardianWriteDto**: Complete with validation and snake_case enforcement
- ✅ **EmergencyContactReadDto / EmergencyContactWriteDto**: All fields standardized  
- ✅ **ChildReadDto / ChildWriteDto**: All fields snake_case, including `child_mobile`, `medical_notes`, `special_needs_notes`
- ✅ **RegistrationReadDto / RegistrationWriteDto**: `photo_release` (not `photoRelease`) enforced
- ✅ **ConsentDto**: Canonical consent types with snake_case
- ✅ **RegistrationFormDto**: Complete form validation with snake_case enforcement

### ✅ **PHASE 2 COMPLETE: DAL Conversion Layer**

Enhanced DAL with canonical conversion while maintaining API compatibility:

- ✅ **convertFormDataToCanonical()**: Converts legacy camelCase form data to snake_case DTOs
- ✅ **registerHouseholdCanonical()**: New registration function using canonical DTOs internally
- ✅ **testCanonicalConversion()**: Validation function ensures no camelCase leakage
- ✅ **26 passing tests**: Comprehensive test coverage for all conversion scenarios

### ✅ **Key Achievements in Fresh Start Data Shapes**

1. **Snake Case Enforcement**: All canonical DTOs reject camelCase fields
2. **photoRelease → photo_release**: Consent type standardization complete
3. **preferredScriptureTranslation → preferred_scripture_translation**: Household field standardized
4. **API Compatibility**: Legacy form data automatically converted to canonical shapes
5. **Type Safety**: Zod validation ensures data integrity at DTO boundaries

## Current Schema Status (from latest migration 20250905005600)

| Entity | Field | Current DB Status | Canonical DTO | Conversion Status |
|--------|-------|------------------|---------------|-------------------|
| **HOUSEHOLDS** | | | | |
| | `preferredScriptureTranslation` | ✅ Added (camelCase) | `preferred_scripture_translation` | ✅ Converted |
| | `name` | ✅ Added | `name` | ✅ Match |
| | `address_line1` | ✅ Exists | `address_line1` | ✅ Match |
| | `address_line2` | ❌ Missing | `address_line2` | ⏳ Need DB column |
| **GUARDIANS** | | | | |
| | `relationship` | ✅ Added | `relationship` | ✅ Match |
| | All other fields | ✅ Match | snake_case | ✅ Converted |
| **EMERGENCY_CONTACTS** | | | | |
| | Field structure | ⚠️ Needs review | snake_case | ✅ Converted |
| **CHILDREN** | | | | |
| | `dob` | ✅ Added | `dob` | ✅ Match |
| | `child_mobile` | ✅ Added | `child_mobile` | ✅ Match |
| | `grade`, `special_needs`, etc. | ✅ Added | snake_case | ✅ Match |
| **REGISTRATIONS** | | | | |
| | Consent types | ⏳ TBD | `photo_release` | ✅ Converted |

## Next Steps - Database Schema Alignment

- [ ] **Step 5A - Emergency Contacts Schema**: Fix field name mismatches (`name` vs `first_name`/`last_name`)
- [ ] **Step 5B - Missing DB Columns**: Add `address_line2`, ensure all canonical fields exist
- [ ] **Step 5C - Consent Data Migration**: Update existing `photoRelease` → `photo_release` in stored data
- [ ] **Step 6 - Registration Form Update**: Update UI form to use canonical DTOs
- [ ] **Step 7 - DAL Integration**: Replace legacy `registerHousehold` with `registerHouseholdCanonical`
- [ ] **Step 8 - Type Regeneration**: Apply schema changes and regenerate supabase-types.ts

## Implementation Notes

**Data Flow (Current)**:
```
Legacy Form Data (camelCase) 
  → convertFormDataToCanonical() 
  → Canonical DTOs (snake_case) 
  → Legacy DAL (camelCase for compatibility)
  → Database (mixed case)
```

**Target Data Flow**:
```
Updated Form (snake_case) 
  → Canonical DTOs (snake_case) 
  → Updated DAL (snake_case) 
  → Updated Database (snake_case)
```

**Fresh Start Achievement**: 
- All new code uses canonical snake_case DTOs
- Legacy compatibility maintained during transition
- Type safety enforced at all DTO boundaries
- No camelCase allowed in canonical layer