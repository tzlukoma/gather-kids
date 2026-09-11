# Bible Bee Scripture Availability Gate

## Overview

This feature allows admins to control when household/parent views can see Bible Bee scripture text by setting a `competition_start_date` on a Bible Bee cycle. Before that date, families can see scripture references and track their progress, but the actual verse text remains hidden.

## Timezone Selection: America/New_York (Eastern Time)

**Selected timezone:** `America/New_York` (ET)

### Rationale

1. **Cathedral International location**: The ministry is US-based, and their operations run on Eastern Time
2. **Consistent operations**: All ministry activities and schedules use ET as the primary reference
3. **Predictable boundaries**: Using ET midnight as the gate boundary provides clear, consistent behavior for staff and families

### Date Comparison Logic

The gate uses **date-only comparison** (not datetime):
- Compares today's date in ET (YYYY-MM-DD) with the configured `competition_start_date`
- Uses midnight ET as the boundary
- On the start date at 12:00:00 AM ET, scriptures become available

### Implementation

```typescript
// Get today's date in America/New_York timezone (date-only)
const todayET = new Date().toLocaleDateString('en-US', { 
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Convert MM/DD/YYYY to YYYY-MM-DD for comparison
const [month, day, year] = todayET.split('/');
const todayYYYYMMDD = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

// Date-only string comparison (YYYY-MM-DD format)
return todayYYYYMMDD >= competitionStartDate;
```

## Behavior Matrix

| Start Date Value | Today's Date (ET) | Scriptures Available? | Notes |
|------------------|-------------------|----------------------|-------|
| `null` / `undefined` / `''` | any | ✅ Yes | Backward compatible - immediate availability |
| `2026-09-15` | `2026-09-14` | ❌ No | Before start date - locked |
| `2026-09-15` | `2026-09-15` | ✅ Yes | On start date - available |
| `2026-09-15` | `2026-09-16` | ✅ Yes | After start date - available |

## User Experience

### Household View (Before Start Date)
- Scripture cards show reference and tracking UI
- Verse text is replaced with a lock icon and message: "Scriptures available on {formatted date}"
- Progress tracking continues to work
- Children can mark scriptures as memorized

### Household View (On/After Start Date)
- Full scripture text is visible
- Normal Bible Bee functionality

### Admin/Evaluation View
- **Always** shows full scripture text, regardless of start date
- Bypasses the gate completely
- Allows admins to prepare and verify content before release

## Database Schema

```sql
ALTER TABLE public.bible_bee_cycles
ADD COLUMN IF NOT EXISTS competition_start_date DATE NULL;

ALTER TABLE public.bible_bee_cycles
ADD COLUMN IF NOT EXISTS competition_end_date DATE NULL;
```

### Column Properties
- **Type:** `DATE` (not `TIMESTAMP`) - date-only comparison
- **Nullable:** `YES` - backward compatible with existing cycles
- **Default:** `NULL` - scriptures immediately available if not set

## Testing

Comprehensive test coverage in:
- `__tests__/lib/bibleBeeScriptureGate.test.ts` - Unit tests for date logic
- `__tests__/integration/bibleBeeScriptureVisibility.test.ts` - Integration tests for full flow

### Test Scenarios
1. ✅ Null start date → available (backward compat)
2. ✅ Future start date → locked
3. ✅ Today == start date → available
4. ✅ Past start date → available
5. ✅ Admin paths bypass gate
6. ✅ Migration safety (nullable columns)

## UAT Testing Plan

### Setup
1. Create a test Bible Bee cycle with `competition_start_date` set to tomorrow
2. Enroll test children in the cycle
3. Upload sample scriptures

### Test Cases

**TC1: Household View - Before Start Date**
- Login as guardian
- Navigate to Bible Bee progress
- **Expected:** Scripture references visible, verse text shows lock icon with "Available on {date}"
- **Verify:** Can still mark scriptures as memorized

**TC2: Household View - On Start Date**
- Update cycle's `competition_start_date` to today
- Refresh household Bible Bee page
- **Expected:** Full scripture text now visible

**TC3: Admin View - Ignores Lock**
- Set cycle's `competition_start_date` to far future (2099-12-31)
- Login as admin
- Navigate to Bible Bee → Evaluation Scriptures
- **Expected:** Full scripture text visible despite future lock date

**TC4: Null Start Date - Backward Compatible**
- Create cycle without setting `competition_start_date` (leave blank)
- **Expected:** Scriptures immediately available to households

## Migration Path

### Existing Cycles
- Remain valid with `competition_start_date = NULL`
- Scriptures stay immediately available
- No data migration required

### New Cycles
- Admin sets start date during cycle creation
- Or updates existing cycle to add start date when needed

## Code References

- **Gate Logic:** `src/lib/bibleBeeScriptureGate.ts`
- **Hook Integration:** `src/hooks/data/bibleBee.ts` (`useStudentAssignmentsQuery`)
- **UI Component:** `src/components/gatherKids/scripture-card.tsx` (locked state)
- **Admin Form:** `src/components/gatherKids/bible-bee-manage.tsx` (date inputs)
- **Migration:** `supabase/migrations/20260911120000_add_competition_dates_to_bible_bee_cycles.sql`

## Future Enhancements

- Email notifications before start date
- Preview mode for guardians (see locked state)
- Staggered release by division
- End date enforcement (optional, currently just stored)
