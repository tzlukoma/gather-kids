# Registration Sanity Check SQL Queries

This document provides key SQL queries to verify that registration went well for the last household you registered.

## Quick Overview Queries

### 1. Get the Most Recent Household

```sql
-- Get the most recently created household
SELECT
    household_id,
    name,
    address_line1,
    city,
    state,
    zip,
    primary_phone,
    email,
    preferred_scripture_translation,
    created_at
FROM households
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Get All Data for the Most Recent Household

```sql
-- Get complete household data with guardians and children
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    'HOUSEHOLD' as table_name,
    h.household_id,
    h.name,
    h.address_line1,
    h.city,
    h.state,
    h.zip,
    h.primary_phone,
    h.email,
    h.preferred_scripture_translation,
    h.created_at
FROM households h, latest_household lh
WHERE h.household_id = lh.household_id

UNION ALL

SELECT
    'GUARDIAN' as table_name,
    g.guardian_id,
    g.first_name,
    g.last_name,
    g.mobile_phone,
    g.email,
    g.relationship,
    g.is_primary::text,
    g.created_at::text,
    NULL,
    g.created_at
FROM guardians g, latest_household lh
WHERE g.household_id = lh.household_id

UNION ALL

SELECT
    'CHILD' as table_name,
    c.child_id,
    c.first_name,
    c.last_name,
    c.dob::text,
    c.grade,
    c.gender,
    c.child_mobile,
    c.allergies,
    c.special_needs::text,
    c.created_at
FROM children c, latest_household lh
WHERE c.household_id = lh.household_id;
```

## Detailed Verification Queries

### 3. Check Registration Records

```sql
-- Verify registrations were created for all children
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    r.registration_id,
    c.first_name || ' ' || c.last_name as child_name,
    r.cycle_id,
    r.status,
    r.pre_registered_sunday_school,
    r.submitted_at,
    r.submitted_via,
    r.created_at
FROM registrations r
JOIN children c ON r.child_id = c.child_id
JOIN latest_household lh ON c.household_id = lh.household_id
ORDER BY r.created_at DESC;
```

### 4. Check Ministry Enrollments

```sql
-- Verify ministry enrollments (should include Sunday School auto-enrollment)
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    me.enrollment_id,
    c.first_name || ' ' || c.last_name as child_name,
    m.name as ministry_name,
    m.code as ministry_code,
    me.status,
    me.custom_fields,
    me.created_at
FROM ministry_enrollments me
JOIN children c ON me.child_id = c.child_id
JOIN ministries m ON me.ministry_id = m.ministry_id
JOIN latest_household lh ON c.household_id = lh.household_id
ORDER BY me.created_at DESC;
```

### 5. Check Bible Bee Enrollments (if applicable)

```sql
-- Check if children were auto-enrolled in Bible Bee
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    bbe.id,
    c.first_name || ' ' || c.last_name as child_name,
    cy.name as competition_year,
    d.name as division,
    bbe.auto_enrolled,
    bbe.enrolled_at
FROM bible_bee_enrollments bbe
JOIN children c ON bbe."childId" = c.child_id
JOIN competition_years cy ON bbe."competitionYearId" = cy.id
JOIN divisions d ON bbe."divisionId" = d.id
JOIN latest_household lh ON c.household_id = lh.household_id
ORDER BY bbe.enrolled_at DESC;
```

### 6. Check User-Household Relationship (Authentication)

```sql
-- Verify user authentication relationship was created
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    uh.user_household_id,
    uh.auth_user_id,
    uh.household_id,
    uh.created_at
FROM user_households uh, latest_household lh
WHERE uh.household_id = lh.household_id;
```

### 7. Check Emergency Contacts

```sql
-- Verify emergency contacts were created
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    ec.contact_id,
    ec.first_name,
    ec.last_name,
    ec.mobile_phone,
    ec.relationship,
    ec.created_at
FROM emergency_contacts ec, latest_household lh
WHERE ec.household_id = lh.household_id
ORDER BY ec.created_at DESC;
```

## Data Integrity Checks

### 8. Verify Required Data Completeness

```sql
-- Check for any missing required fields
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    'Missing household name' as issue
FROM households h, latest_household lh
WHERE h.household_id = lh.household_id AND h.name IS NULL

UNION ALL

SELECT
    'Missing guardian email' as issue
FROM guardians g, latest_household lh
WHERE g.household_id = lh.household_id AND g.email IS NULL

UNION ALL

SELECT
    'Missing child DOB' as issue
FROM children c, latest_household lh
WHERE c.household_id = lh.household_id AND c.dob IS NULL

UNION ALL

SELECT
    'Missing registration' as issue
FROM children c, latest_household lh
LEFT JOIN registrations r ON c.child_id = r.child_id
WHERE c.household_id = lh.household_id AND r.registration_id IS NULL;
```

### 9. Check for Sunday School Auto-Enrollment

```sql
-- Verify all children are enrolled in Sunday School
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    c.first_name || ' ' || c.last_name as child_name,
    CASE
        WHEN me.enrollment_id IS NOT NULL THEN 'ENROLLED'
        ELSE 'NOT ENROLLED'
    END as sunday_school_status
FROM children c, latest_household lh
LEFT JOIN ministry_enrollments me ON c.child_id = me.child_id
    AND me.ministry_id = 'min_sunday_school'
WHERE c.household_id = lh.household_id;
```

### 10. Check Custom Fields and Consents

```sql
-- Check for custom ministry fields and consents
WITH latest_household AS (
    SELECT household_id FROM households ORDER BY created_at DESC LIMIT 1
)
SELECT
    c.first_name || ' ' || c.last_name as child_name,
    m.name as ministry_name,
    me.custom_fields,
    r.consents
FROM children c, latest_household lh
JOIN ministry_enrollments me ON c.child_id = me.child_id
JOIN ministries m ON me.ministry_id = m.ministry_id
LEFT JOIN registrations r ON c.child_id = r.child_id
WHERE c.household_id = lh.household_id
    AND (me.custom_fields IS NOT NULL OR r.consents IS NOT NULL);
```

## Registration Cycle Verification

### 11. Check Active Registration Cycle

```sql
-- Verify the registration cycle being used
SELECT
    cycle_id,
    name,
    start_date,
    end_date,
    description,
    is_active,
    created_at
FROM registration_cycles
WHERE is_active = true
ORDER BY created_at DESC;
```

### 12. Count Registrations by Cycle

```sql
-- See how many registrations exist for each cycle
SELECT
    rc.name as cycle_name,
    rc.is_active,
    COUNT(r.registration_id) as registration_count
FROM registration_cycles rc
LEFT JOIN registrations r ON rc.cycle_id = r.cycle_id
GROUP BY rc.cycle_id, rc.name, rc.is_active
ORDER BY rc.created_at DESC;
```

## Troubleshooting Queries

### 13. Find Orphaned Records

```sql
-- Check for any orphaned records
SELECT 'Orphaned guardians' as issue, COUNT(*) as count
FROM guardians g
LEFT JOIN households h ON g.household_id = h.household_id
WHERE h.household_id IS NULL

UNION ALL

SELECT 'Orphaned children' as issue, COUNT(*) as count
FROM children c
LEFT JOIN households h ON c.household_id = h.household_id
WHERE h.household_id IS NULL

UNION ALL

SELECT 'Orphaned registrations' as issue, COUNT(*) as count
FROM registrations r
LEFT JOIN children c ON r.child_id = c.child_id
WHERE c.child_id IS NULL;
```

### 14. Check for Duplicate Enrollments

```sql
-- Check for duplicate ministry enrollments
SELECT
    child_id,
    ministry_id,
    COUNT(*) as enrollment_count
FROM ministry_enrollments
GROUP BY child_id, ministry_id
HAVING COUNT(*) > 1;
```

## Usage Instructions

1. **Run queries 1-2 first** to get an overview of the most recent household
2. **Run queries 3-7** to verify all registration components were created
3. **Run queries 8-10** to check data integrity and completeness
4. **Run queries 11-12** to verify registration cycle setup
5. **Use queries 13-14** only if you suspect data issues

## Notes

- Replace `LIMIT 1` with a specific `household_id` if you want to check a particular household
- The `user_households` table may not exist in demo mode
- Bible Bee enrollments only exist if there's an active competition year
- Custom fields and consents depend on the ministries selected during registration
