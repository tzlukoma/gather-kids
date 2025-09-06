# Database Adapter Usage Guide

## Introduction

The gatherKids application supports two database backends:

- **IndexedDB** (for local development and demo mode)
- **Supabase** (for UAT and production environments)

This guide explains how to properly access data regardless of which backend is active.

## Common Pitfalls

### ❌ NEVER use direct Dexie queries with Supabase mode

```typescript
// ❌ BAD: Will only work with IndexedDB adapter
const bibleBeeYears = await db.bible_bee_years.toArray();
const divisions = await db.divisions
	.where('bible_bee_year_id')
	.equals(yearId)
	.toArray();
```

This pattern only works with the IndexedDB adapter and will fail silently with Supabase.

## Correct Access Patterns

### ✅ Always use the database adapter methods

```typescript
// ✅ GOOD: Works with both IndexedDB and Supabase adapters
const bibleBeeYears = await dbAdapter.listBibleBeeYears();
const divisions = await dbAdapter.listDivisions(yearId);
```

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

1. **Import Properly**: Import the adapter along with the direct DB object

   ```typescript
   import { db, dbAdapter } from '@/lib/db';
   ```

2. **Check Adapter Type**: You can check which adapter is in use for debugging

   ```typescript
   const adapterType = (db as any).constructor.name;
   console.log(`Using ${adapterType}`);
   ```

3. **Write Tests**: Use Jest to test your data access with both adapters

4. **Handle Errors**: Always implement proper error handling for database operations
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

1. Check which adapter is being used (the DatabaseAdapterBadge shows this)
2. Verify your access pattern is using adapter methods not direct Dexie queries
3. Test the API endpoint directly if applicable
4. Look for console errors that might indicate permission issues

## Transitioning Code

When updating existing components that use direct Dexie queries:

1. Replace `useLiveQuery` with `useState` + `useEffect`
2. Replace direct table queries with adapter method calls
3. Add proper loading and error states

Example:

```typescript
// Before (Dexie specific)
const bibleBeeYears = useLiveQuery(() => db.bible_bee_years.toArray());

// After (works with any adapter)
const [bibleBeeYears, setBibleBeeYears] = useState<BibleBeeYear[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
	const fetchData = async () => {
		try {
			setIsLoading(true);
			const years = await dbAdapter.listBibleBeeYears();
			setBibleBeeYears(years);
		} catch (err) {
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	fetchData();
}, []);
```

For questions or issues related to the database adapters, refer to the implementation in `src/lib/database/`.
