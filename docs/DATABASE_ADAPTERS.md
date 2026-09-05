# Database Adapter Usage Guide

## Introduction

Runtime storage is **Supabase**. The factory always returns `SupabaseAdapter`. There is no IndexedDB/demo backend and no `DATABASE_MODE`.

Always go through the DAL (`dbAdapter` from `@/lib/dal`). Do not import `@supabase/supabase-js` outside the DAL and allowed API/script paths.

## Common Pitfalls

### ❌ NEVER query storage from application code

```typescript
// ❌ BAD: bypasses the DAL (legacy Dexie / raw client)
const bibleBeeYears = await db.bible_bee_years.toArray();
```

That pattern is leftover from demo mode and is not a supported runtime path.

## Correct Access Patterns

### ✅ Always use the database adapter methods

```typescript
import { dbAdapter } from '@/lib/dal';

const bibleBeeYears = await dbAdapter.listBibleBeeYears();
const divisions = await dbAdapter.listDivisions(yearId);
```

UI code should prefer React Query hooks that call the DAL, not one-off `useEffect` fetches.

### Adapter Methods Reference

Here are some commonly used methods from the `DatabaseAdapter` interface:

#### Bible Bee Related

- `listBibleBeeYears()`: Get all Bible Bee years
- `listDivisions(bible_bee_year_id)`: Get divisions for a specific Bible Bee year
- `getScriptures(competitionYearId?)`: Get scriptures, optionally filtered by competition year
- `getScriptureById(id)`: Get a specific scripture by ID

#### General Data Access

- `getMinistryById(id)`: Get a specific ministry
- `listMinistries()`: List all ministries
- `getUserByEmail(email)`: Get a user by email
- `listChildren()`: List all children
- `getChildById(id)`: Get a specific child
- `listGuardians()`: List all guardians
- ... and many more

## Best Practices

1. **Import from the DAL**

   ```typescript
   import { dbAdapter } from '@/lib/dal';
   ```

2. **Handle Errors**: Always implement proper error handling for database operations
   ```typescript
   try {
   	const data = await dbAdapter.listBibleBeeYears();
   	// Use data
   } catch (error) {
   	console.error('Failed to fetch Bible Bee years:', error);
   	// Handle error
   }
   ```

## Debugging Database Issues

If your component is not showing data:

1. Confirm `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Verify the code uses adapter methods (or React Query hooks), not a leftover Dexie import
3. Test the API endpoint directly if applicable
4. Look for console errors that might indicate permission issues

For questions or issues related to the database adapters, refer to the implementation in `src/lib/database/`.
