# Issue: Set Up Proper Type Generation from Supabase Schema

## Overview

This issue focuses on implementing automatic TypeScript type generation from our Supabase database schema. Having properly generated types will ensure type safety throughout the application when interacting with the database, reducing runtime errors and improving developer experience. This task builds on the database adapter implementation by providing strongly-typed interfaces that match our actual database schema.

## Objectives

1. Configure Supabase CLI for type generation
2. Generate TypeScript types from the database schema
3. Create a mapping between Dexie types and Supabase generated types
4. Integrate generated types with the database adapter
5. Set up automation for keeping types in sync with schema changes

## Detailed Requirements

### 1. Supabase CLI Setup for Type Generation

**File: `package.json` (update)**

Add the necessary development dependencies:

```json
{
	"devDependencies": {
		"supabase": "^1.77.9",
		"@supabase/supabase-js": "^2.38.0"
	},
	"scripts": {
		"gen:types": "supabase gen types typescript --local > src/lib/database/supabase-types.ts",
		"gen:types:prod": "supabase gen types typescript --project-id \"$SUPABASE_PROJECT_ID\" --schema public > src/lib/database/supabase-types.ts"
	}
}
```

**File: `supabase/config.toml` (update)**

Ensure the config file has type generation enabled:

```toml
[generate_types]
typescript = true
```

### 2. Type Generation Implementation

Create a script to generate types that can be run in different environments:

**File: `scripts/gen-types.js`**

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directory setup
const TYPES_DIR = path.join(process.cwd(), 'src', 'lib', 'database');
if (!fs.existsSync(TYPES_DIR)) {
	fs.mkdirSync(TYPES_DIR, { recursive: true });
}

const TYPES_FILE = path.join(TYPES_DIR, 'supabase-types.ts');
const HEADER = `/**
 * This file contains types generated from the Supabase schema.
 * DO NOT EDIT MANUALLY. This file is auto-generated.
 * Generated on: ${new Date().toISOString()}
 */

`;

// Parse command-line arguments
const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const projectId = process.env.SUPABASE_PROJECT_ID;

try {
	let command;
	if (useLocal) {
		console.log('📦 Generating types from local Supabase instance...');
		command = 'supabase gen types typescript --local';
	} else if (projectId) {
		console.log(
			`📦 Generating types from remote Supabase project (${projectId})...`
		);
		command = `supabase gen types typescript --project-id "${projectId}" --schema public`;
	} else {
		console.error(
			'❌ No project ID provided and --local not specified. Set SUPABASE_PROJECT_ID or use --local flag.'
		);
		process.exit(1);
	}

	// Execute type generation
	const types = execSync(command).toString();

	// Post-process the types
	const processedTypes =
		HEADER +
		types
			// Add any custom processing here if needed
			.replace(/export type Json/, 'export type SupabaseJson');
	// Add more replacements as needed
	fs.writeFileSync(TYPES_FILE, processedTypes);
	console.log(`✅ Types generated successfully: ${TYPES_FILE}`);
} catch (error) {
	console.error('❌ Failed to generate types:', error.message);
	process.exit(1);
}
```

Make the script executable:

```bash
chmod +x scripts/gen-types.js
```

### 3. Type Mapping Implementation

Create a mapping layer between Dexie types and Supabase generated types:

**File: `src/lib/database/type-mappings.ts`**

```typescript
import type * as DexieTypes from '../types';
import type * as SupabaseTypes from './supabase-types';

/**
 * Maps between Dexie types and Supabase generated types
 * This ensures consistent typing regardless of which adapter is used
 */

// Type mapper utility types
type OmitSystemFields<T> = Omit<T, 'created_at' | 'updated_at'>;
type WithOptionalId<T, K extends string> = Omit<T, K> & Partial<Pick<T, K>>;

// Example mappings for core entity types
export type CreateHouseholdDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Household, 'household_id'>
>;
export type HouseholdEntity = DexieTypes.Household;
export type SupabaseHousehold =
	SupabaseTypes.Database['public']['Tables']['households']['Row'];

export type CreateChildDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Child, 'child_id'>
>;
export type ChildEntity = DexieTypes.Child;
export type SupabaseChild =
	SupabaseTypes.Database['public']['Tables']['children']['Row'];

export type CreateGuardianDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Guardian, 'guardian_id'>
>;
export type GuardianEntity = DexieTypes.Guardian;
export type SupabaseGuardian =
	SupabaseTypes.Database['public']['Tables']['guardians']['Row'];

// Continue defining mappings for all entity types...

/**
 * Conversion functions between Supabase and application types
 */

// Household conversions
export function supabaseToHousehold(
	record: SupabaseHousehold
): HouseholdEntity {
	return {
		household_id: record.household_id,
		address_line1: record.address_line1 || '',
		address_line2: record.address_line2 || '',
		city: record.city || '',
		state: record.state || '',
		zip: record.zip || '',
		created_at: record.created_at,
		updated_at: record.updated_at || record.created_at,
		// Map any additional fields
	};
}

export function householdToSupabase(
	household: CreateHouseholdDTO
): Omit<SupabaseHousehold, 'created_at' | 'updated_at'> {
	return {
		household_id: household.household_id,
		address_line1: household.address_line1,
		address_line2: household.address_line2,
		city: household.city,
		state: household.state,
		zip: household.zip,
		// Map any additional fields
	};
}

// Add similar conversion functions for all entity types...
```

### 4. Integration with Database Adapter

Update the Supabase adapter to use the generated types:

**File: `src/lib/database/supabase-adapter.ts` (update)**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseAdapter } from './types';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from './supabase-types';
import {
	supabaseToHousehold,
	householdToSupabase,
	HouseholdEntity,
	CreateHouseholdDTO,
	// Import other conversions
} from './type-mappings';

export class SupabaseAdapter implements DatabaseAdapter {
	private client: SupabaseClient<Database>;

	constructor(supabaseUrl: string, supabaseAnonKey: string) {
		this.client = createClient<Database>(supabaseUrl, supabaseAnonKey);
	}

	// Example implementation with proper typing
	async getHousehold(id: string): Promise<HouseholdEntity | null> {
		const { data, error } = await this.client
			.from('households')
			.select('*')
			.eq('household_id', id)
			.single();

		if (error) throw error;
		return data ? supabaseToHousehold(data) : null;
	}

	async createHousehold(data: CreateHouseholdDTO): Promise<HouseholdEntity> {
		const household = {
			...householdToSupabase(data),
			household_id: data.household_id || uuidv4(),
		};

		const { data: result, error } = await this.client
			.from('households')
			.insert(household)
			.select()
			.single();

		if (error) throw error;
		return supabaseToHousehold(result);
	}

	// Continue implementing all methods with proper type conversions...
}
```

### 5. CI/CD Integration

Set up automated type generation in the CI/CD pipeline:

**File: `.github/workflows/generate-types.yml`**

```yaml
name: Generate Supabase Types

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'
  pull_request:
    paths:
      - 'supabase/migrations/**'
  workflow_dispatch:

jobs:
  generate-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Generate types from production schema
        if: github.ref == 'refs/heads/main'
        env:
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: node scripts/gen-types.js

      - name: Commit and push if there are changes
        if: github.ref == 'refs/heads/main'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add src/lib/database/supabase-types.ts
          git diff --quiet && git diff --staged --quiet || git commit -m "[auto] Update Supabase type definitions"
          git push
```

### 6. Developer Documentation

**File: `docs/SUPABASE_TYPES.md`**

````markdown
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
````

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

```

## Testing Requirements

1. **Type Correctness**: Verify that generated types match the database schema
2. **Conversion Functions**: Test that conversion functions correctly map between types
3. **Edge Cases**: Test handling of nullable fields and optional properties

## Acceptance Criteria

- [ ] Supabase CLI is properly configured for type generation
- [ ] TypeScript types are successfully generated from the schema
- [ ] Type mapping functions are implemented for all entity types
- [ ] Database adapter uses the generated types
- [ ] CI/CD pipeline automatically updates types on schema changes
- [ ] Developer documentation explains how to work with the generated types
- [ ] Type generation works both locally and against remote Supabase projects

## Technical Notes

1. **Type Safety**: Ensure that all generated types are used consistently throughout the application
2. **Schema Changes**: Consider the impact of schema changes on type definitions
3. **Nullable Fields**: Pay attention to handling of nullable fields in the conversion functions
4. **Custom Types**: Some complex types (like JSON fields) may require custom mapping
5. **Version Control**: Keep generated types in version control for consistent development experience

## Implementation Strategy

1. Set up Supabase CLI and configure type generation
2. Create initial type generation script
3. Generate base types from the schema
4. Implement type mapping layer
5. Update database adapter to use generated types
6. Add CI/CD automation for type generation
7. Document the type generation process

## Resources

- [Supabase Type Generation Documentation](https://supabase.io/docs/reference/javascript/typescript-support)
- [Current Database Schema](supabase/migrations)
- [Current Type Definitions](src/lib/types.ts)
- [Database Adapter Implementation](docs/SUPABASE_ADAPTER.md)

## Time Estimate

- Supabase CLI setup: 1-2 hours
- Type generation script: 2-3 hours
- Type mapping implementation: 4-6 hours
- Database adapter integration: 2-3 hours
- CI/CD setup: 1-2 hours
- Documentation: 1-2 hours

Total: 11-18 hours
```
