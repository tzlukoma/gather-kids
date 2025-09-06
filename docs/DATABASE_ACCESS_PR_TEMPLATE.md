# Database Access Pattern PR Checklist

## Description

<!-- Provide a brief description of the changes in this PR -->

## Database Access Pattern Review

When accessing database tables, please check all that apply:

- [ ] I've updated components to use database adapter methods (`dbAdapter.methodName()`) instead of direct Dexie queries
- [ ] I've replaced `useLiveQuery` with proper React state management where needed
- [ ] I've tested with both IndexedDB (demo mode) and Supabase (UAT) environments
- [ ] I've added appropriate error handling for database operations

## Components Updated

<!-- List the components that were updated to use proper adapter methods -->

- ComponentName1.tsx
- ComponentName2.tsx

## Testing

<!-- Describe how you tested these changes -->

- [ ] Tested in demo mode (IndexedDB)
- [ ] Tested in UAT environment (Supabase)

## Related Documentation

See the [Database Adapter Usage Guide](../docs/DATABASE_ADAPTERS.md) for more information on proper database access patterns.
