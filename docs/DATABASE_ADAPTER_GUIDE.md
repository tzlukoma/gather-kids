# Database Adapter System

The gatherKids application now includes a database adapter interface that enables seamless switching between IndexedDB (demo mode) and Supabase (DEV/UAT/PROD) backends.

## Overview

The database adapter system provides a unified interface for database operations while supporting multiple backends:

- **IndexedDB Adapter**: Uses Dexie.js for browser-based storage (demo mode)
- **Supabase Adapter**: Uses Supabase client for cloud-based PostgreSQL storage (production environments)

## Architecture

```
Application Code
       ↓
  Database Adapter Interface (types.ts)
       ↓
   Factory (factory.ts)
    ↙         ↘
IndexedDB     Supabase
Adapter       Adapter
```

## Configuration

The adapter is selected based on the `NEXT_PUBLIC_DATABASE_MODE` environment variable:

### Demo Mode (Default)
```env
# Uses IndexedDB (no configuration required)
NEXT_PUBLIC_DATABASE_MODE=demo
```

### Supabase Mode
```env
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If Supabase configuration is invalid or missing, the system automatically falls back to demo mode.

## Usage

### Importing the Adapter

```typescript
// New adapter interface (recommended for new code)
import { dbAdapter } from '@/lib/dal';

// Legacy Dexie interface (existing code)
import { db } from '@/lib/db';
```

### Basic Operations

```typescript
// Create a household
const household = await dbAdapter.createHousehold({
  address_line1: '123 Main St',
  city: 'Anytown',
  state: 'TX',
  zip: '12345',
});

// Retrieve a household
const retrieved = await dbAdapter.getHousehold(household.household_id);

// Update a household
const updated = await dbAdapter.updateHousehold(household.household_id, {
  city: 'New Town',
});

// List households with filters
const filtered = await dbAdapter.listHouseholds({
  city: 'Anytown',
  limit: 10,
  offset: 0,
});

// Delete a household
await dbAdapter.deleteHousehold(household.household_id);
```

### Filtering and Pagination

The adapter supports various filters for list operations:

```typescript
// Filter households
const households = await dbAdapter.listHouseholds({
  city: 'Austin',
  state: 'TX',
  search: 'Main St',
  limit: 20,
  offset: 0,
});

// Filter children
const children = await dbAdapter.listChildren({
  householdId: 'household-123',
  isActive: true,
  search: 'John',
});

// Filter registrations
const registrations = await dbAdapter.listRegistrations({
  childId: 'child-123',
  cycleId: 'cycle-2024',
  status: 'active',
});
```

### Transactions

```typescript
const result = await dbAdapter.transaction(async () => {
  const household = await dbAdapter.createHousehold({
    address_line1: '123 Family St',
    city: 'Hometown',
    state: 'TX',
    zip: '54321',
  });

  const child = await dbAdapter.createChild({
    household_id: household.household_id,
    first_name: 'Jane',
    last_name: 'Doe',
    is_active: true,
  });

  return { household, child };
});
```

### Realtime Subscriptions

```typescript
// Subscribe to table changes (Supabase only, no-op for IndexedDB)
const unsubscribe = dbAdapter.subscribeToTable('households', (payload) => {
  console.log('Household changed:', payload);
});

// Clean up subscription
unsubscribe();
```

## Supported Entities

The adapter interface supports all major entities:

- **Core Entities**: Households, Children, Guardians, Emergency Contacts
- **Registration**: Registration Cycles, Registrations
- **Ministry**: Ministries, Ministry Enrollments, Leader Profiles, Ministry Accounts
- **Operations**: Events, Attendance, Incidents
- **Bible Bee**: Bible Bee Years, Divisions, Essay Prompts, Enrollments
- **System**: Users, Branding Settings

## Migration Path

### For Existing Code

Existing code continues to work unchanged. The legacy Dexie interface is still available:

```typescript
// This continues to work
import { db } from '@/lib/db';
const household = await db.households.get(id);
```

### For New Code

New features should use the adapter interface:

```typescript
// Recommended for new code
import { dbAdapter } from '@/lib/dal';
const household = await dbAdapter.getHousehold(id);
```

### Gradual Migration

Over time, existing functions can be updated to use the adapter interface for consistency across environments.

## Testing

### Contract Tests

The adapter system includes contract tests that validate both adapters implement the same interface correctly:

```bash
npm test -- db-adapter-contract
```

### Factory Tests

Test the adapter factory selection logic:

```bash
npm test -- database-adapter-factory
```

### Integration Tests

Test the adapter interface integration with the DAL:

```bash
npm test -- database-adapter-integration
```

## Error Handling

### Supabase Errors

The Supabase adapter handles common error cases:

- **404 Not Found**: Returns `null` for get operations
- **Network Errors**: Throws with original error details
- **Validation Errors**: Throws with Supabase error information

### IndexedDB Errors

The IndexedDB adapter handles Dexie-specific errors:

- **Transaction Errors**: Properly managed through Dexie transactions
- **Constraint Violations**: Throws with descriptive error messages

## Performance Considerations

### IndexedDB Adapter

- **Pros**: No network latency, works offline
- **Cons**: Limited to single browser, no real-time sync

### Supabase Adapter

- **Pros**: Real-time sync, multi-device support, server-side processing
- **Cons**: Network dependency, potential latency

### Optimization Tips

1. **Use transactions** for multiple related operations
2. **Apply filters** at the database level rather than in application code
3. **Implement pagination** for large result sets
4. **Subscribe selectively** to realtime updates to avoid unnecessary network traffic

## Future Enhancements

- **Connection pooling** for Supabase adapter
- **Caching layer** for frequently accessed data
- **Offline support** with sync capabilities
- **Database schema migrations** management
- **Performance monitoring** and metrics