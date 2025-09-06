# Supabase Type Generation

This document explains how to work with the automatic type generation from our Supabase schema.

## Overview

We use Supabase's type generation to create TypeScript types that match our database schema. These types are then used in our database adapter to ensure type safety throughout the application.

## Generating Types

### Local Development

To generate types from your local Supabase instance:

```bash
# Start local Supabase if not already running
supabase start

# Generate types
npm run gen:types
```

### Production/UAT

To generate types from a remote Supabase project:

```bash
# Set project ID environment variable
export SUPABASE_PROJECT_ID=your-project-id

# Generate types
npm run gen:types:prod
```

## Type Mapping

We maintain a mapping layer between our application domain types and the generated Supabase types. This mapping is defined in `src/lib/database/type-mappings.ts`.

### Why We Need Mappings

1. **Decoupling**: Keep our domain models independent from the database schema
2. **Flexibility**: Handle differences between IndexedDB and Supabase schemas
3. **Validation**: Add validation or transformation logic during conversion
4. **Consistency**: Ensure a consistent API regardless of the database backend

## Usage in Code

When working with the database, use the domain types for your business logic and the conversion functions when interacting with the database:

```typescript
import { createHousehold } from '@/lib/dal';
import {
	supabaseToHousehold,
	householdToSupabase,
} from '@/lib/database/type-mappings';

// Use domain types in your application code
const newHousehold = {
	address_line1: '123 Main St',
	city: 'Example City',
	state: 'EX',
	zip: '12345',
};

// The DAL handles the conversion internally
const household = await createHousehold(newHousehold);
```

## Keeping Types in Sync

Types are automatically updated when changes are made to the database schema in the `main` branch. For local development, you should regenerate types after making schema changes.

## Fallback Types

When the Supabase CLI is not available, the type generation script creates fallback types that provide basic type safety. These fallback types are generic and will work with any table structure, but they don't provide the full type safety of generated types.

To get actual generated types, install the Supabase CLI:

```bash
# Using Docker (recommended)
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh

# Or download from GitHub releases
# https://github.com/supabase/cli/releases
```

## File Structure

- `scripts/gen-types.cjs` - Type generation script
- `src/lib/database/supabase-types.ts` - Generated types (auto-generated)
- `src/lib/database/type-mappings.ts` - Mapping functions between domain and Supabase types
- `src/lib/database/supabase-adapter.ts` - Database adapter using generated types
- `.github/workflows/generate-types.yml` - CI/CD workflow for automatic type generation

## Contributing

When making changes to the database schema:

1. Update the migration files in `supabase/migrations/`
2. Run `npm run gen:types` locally to update types
3. Update the type mappings in `src/lib/database/type-mappings.ts` if needed
4. Test your changes with the updated types
5. Commit both the migration and type files

The CI/CD pipeline will automatically update types when migrations are merged to the main branch.