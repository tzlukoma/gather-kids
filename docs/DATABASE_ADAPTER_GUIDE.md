# Database Adapter System

The gatherKids application uses a database adapter interface so application code talks to **Supabase** through a single DAL, not through ad-hoc clients.

Runtime is **Supabase-only**. The factory always returns `SupabaseAdapter`. There is no `DATABASE_MODE`, IndexedDB adapter path, or demo-mode fallback.

## Overview

- **Supabase Adapter**: PostgreSQL + Auth + Storage via the Supabase client (local, UAT, and production)
- **DAL**: Import `dbAdapter` from `@/lib/dal`. Do not import `@supabase/supabase-js` outside the DAL and allowed API/script paths.

## Architecture

```
Application Code / React Query hooks
       ↓
  DAL (`@/lib/dal`)
       ↓
  Database Adapter Interface (types.ts)
       ↓
   Factory (factory.ts) → always SupabaseAdapter
```

## Configuration

Required in every environment (local disposable Supabase, UAT, or production):

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

If those variables are missing, the factory **throws**. It does not fall back to IndexedDB.

## Usage

### Importing the Adapter

```typescript
import { dbAdapter } from '@/lib/dal';
```

Do not import Dexie / `@/lib/db` from application code.

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
const unsubscribe = dbAdapter.subscribeToTable('households', (payload) => {
  console.log('Household changed:', payload);
});

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

## Testing

### Contract Tests

```bash
npm test -- db-adapter-contract
```

### Factory Tests

```bash
npm test -- database-adapter-factory
```

### Integration Tests

```bash
npm test -- database-adapter-integration
```

## Error Handling

The Supabase adapter handles common error cases:

- **404 Not Found**: Returns `null` for get operations
- **Network Errors**: Throws with original error details
- **Validation Errors**: Throws with Supabase error information

## Performance Considerations

- **Pros**: Real-time sync, multi-device support, server-side processing
- **Cons**: Network dependency, potential latency

### Optimization Tips

1. **Use transactions** for multiple related operations
2. **Apply filters** at the database level rather than in application code
3. **Implement pagination** for large result sets
4. **Subscribe selectively** to realtime updates to avoid unnecessary network traffic
