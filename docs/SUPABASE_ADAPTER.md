# Issue: Implement Supabase Database Adapter Interface and Factory

## Overview

This issue focuses on implementing the foundational database abstraction layer that will enable the gatherKids application to seamlessly switch between IndexedDB (demo mode) and Supabase (DEV/UAT/PROD) backends. This is a critical first step in our Supabase integration plan and lays the groundwork for all subsequent database-related work.

## Objectives

1. Create a database adapter interface that defines the contract for both backends
2. Implement a Supabase adapter that fulfills this contract
3. Build a factory function that selects the appropriate adapter based on configuration
4. Ensure the adapter supports all current functionality without requiring changes to the DAL

## Detailed Requirements

### 1. Database Adapter Interface

Create a `DatabaseAdapter` interface that defines all database operations needed by the application:

**File: `src/lib/database/types.ts`**

```typescript
// Import shared domain types
import type {
	Household,
	Guardian,
	EmergencyContact,
	Child,
	RegistrationCycle,
	ChildYearProfile,
	Registration,
	Ministry,
	MinistryEnrollment,
	LeaderProfile,
	MinistryLeaderMembership,
	MinistryAccount,
	User,
	Event,
	Attendance,
	Incident,
	BibleBeeYear,
	Division,
	EssayPrompt,
	Enrollment,
	EnrollmentOverride,
	BrandingSettings,
} from '../types';

// Filter and query types (to be extended as needed)
export interface BaseFilters {
	limit?: number;
	offset?: number;
}

export interface HouseholdFilters extends BaseFilters {
	city?: string;
	state?: string;
	zip?: string;
	search?: string;
}

export interface ChildFilters extends BaseFilters {
	householdId?: string;
	isActive?: boolean;
	search?: string;
}

export interface RegistrationFilters extends BaseFilters {
	childId?: string;
	cycleId?: string;
	status?: string;
}

// ... additional filter types as needed

// Define the DatabaseAdapter interface with CRUD operations for each entity
export interface DatabaseAdapter {
	// Households
	getHousehold(id: string): Promise<Household | null>;
	createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household>;
	updateHousehold(id: string, data: Partial<Household>): Promise<Household>;
	listHouseholds(filters?: HouseholdFilters): Promise<Household[]>;
	deleteHousehold(id: string): Promise<void>;

	// Children
	getChild(id: string): Promise<Child | null>;
	createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child>;
	updateChild(id: string, data: Partial<Child>): Promise<Child>;
	listChildren(filters?: ChildFilters): Promise<Child[]>;
	deleteChild(id: string): Promise<void>;

	// Guardians
	getGuardian(id: string): Promise<Guardian | null>;
	createGuardian(
		data: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'>
	): Promise<Guardian>;
	updateGuardian(id: string, data: Partial<Guardian>): Promise<Guardian>;
	listGuardians(householdId: string): Promise<Guardian[]>;
	deleteGuardian(id: string): Promise<void>;

	// Emergency Contacts
	getEmergencyContact(id: string): Promise<EmergencyContact | null>;
	createEmergencyContact(
		data: Omit<EmergencyContact, 'contact_id' | 'created_at' | 'updated_at'>
	): Promise<EmergencyContact>;
	updateEmergencyContact(
		id: string,
		data: Partial<EmergencyContact>
	): Promise<EmergencyContact>;
	listEmergencyContacts(householdId: string): Promise<EmergencyContact[]>;
	deleteEmergencyContact(id: string): Promise<void>;

	// Registration Cycles
	getRegistrationCycle(id: string): Promise<RegistrationCycle | null>;
	createRegistrationCycle(
		data: Omit<RegistrationCycle, 'cycle_id' | 'created_at' | 'updated_at'>
	): Promise<RegistrationCycle>;
	updateRegistrationCycle(
		id: string,
		data: Partial<RegistrationCycle>
	): Promise<RegistrationCycle>;
	listRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]>;
	deleteRegistrationCycle(id: string): Promise<void>;

	// Registrations
	getRegistration(id: string): Promise<Registration | null>;
	createRegistration(
		data: Omit<Registration, 'registration_id' | 'created_at' | 'updated_at'>
	): Promise<Registration>;
	updateRegistration(
		id: string,
		data: Partial<Registration>
	): Promise<Registration>;
	listRegistrations(filters?: RegistrationFilters): Promise<Registration[]>;
	deleteRegistration(id: string): Promise<void>;

	// Ministries
	getMinistry(id: string): Promise<Ministry | null>;
	createMinistry(
		data: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at'>
	): Promise<Ministry>;
	updateMinistry(id: string, data: Partial<Ministry>): Promise<Ministry>;
	listMinistries(isActive?: boolean): Promise<Ministry[]>;
	deleteMinistry(id: string): Promise<void>;

	// Ministry Enrollments
	getMinistryEnrollment(id: string): Promise<MinistryEnrollment | null>;
	createMinistryEnrollment(
		data: Omit<
			MinistryEnrollment,
			'enrollment_id' | 'created_at' | 'updated_at'
		>
	): Promise<MinistryEnrollment>;
	updateMinistryEnrollment(
		id: string,
		data: Partial<MinistryEnrollment>
	): Promise<MinistryEnrollment>;
	listMinistryEnrollments(
		childId?: string,
		ministryId?: string,
		cycleId?: string
	): Promise<MinistryEnrollment[]>;
	deleteMinistryEnrollment(id: string): Promise<void>;

	// Attendance
	getAttendance(id: string): Promise<Attendance | null>;
	createAttendance(
		data: Omit<Attendance, 'attendance_id' | 'created_at' | 'updated_at'>
	): Promise<Attendance>;
	updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance>;
	listAttendance(
		childId?: string,
		eventId?: string,
		date?: string
	): Promise<Attendance[]>;
	deleteAttendance(id: string): Promise<void>;

	// Incidents
	getIncident(id: string): Promise<Incident | null>;
	createIncident(
		data: Omit<Incident, 'incident_id' | 'created_at' | 'updated_at'>
	): Promise<Incident>;
	updateIncident(id: string, data: Partial<Incident>): Promise<Incident>;
	listIncidents(childId?: string, resolved?: boolean): Promise<Incident[]>;
	deleteIncident(id: string): Promise<void>;

	// Events
	getEvent(id: string): Promise<Event | null>;
	createEvent(
		data: Omit<Event, 'event_id' | 'created_at' | 'updated_at'>
	): Promise<Event>;
	updateEvent(id: string, data: Partial<Event>): Promise<Event>;
	listEvents(): Promise<Event[]>;
	deleteEvent(id: string): Promise<void>;

	// Branding
	getBrandingSettings(settingId: string): Promise<BrandingSettings | null>;
	createBrandingSettings(
		data: Omit<BrandingSettings, 'setting_id' | 'created_at' | 'updated_at'>
	): Promise<BrandingSettings>;
	updateBrandingSettings(
		settingId: string,
		data: Partial<BrandingSettings>
	): Promise<BrandingSettings>;

	// Bible Bee specific
	// (Include all Bible Bee related operations)

	// Realtime (can be no-op in IndexedDB implementation)
	subscribeToTable<T>(
		table: string,
		callback: (payload: T) => void
	): () => void;

	// Batch operations (optional for v1)
	transaction<T>(callback: () => Promise<T>): Promise<T>;
}
```

### 2. Supabase Adapter Implementation

Create an implementation of the database adapter that uses Supabase:

**File: `src/lib/database/supabase-adapter.ts`**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseAdapter } from './types';
import { v4 as uuidv4 } from 'uuid';
// Import domain types and database types

export class SupabaseAdapter implements DatabaseAdapter {
	private client: SupabaseClient;

	constructor(supabaseUrl: string, supabaseAnonKey: string) {
		this.client = createClient(supabaseUrl, supabaseAnonKey);
	}

	// Implement all methods defined in the DatabaseAdapter interface

	// Example implementation:
	async getHousehold(id: string) {
		const { data, error } = await this.client
			.from('households')
			.select('*')
			.eq('household_id', id)
			.single();

		if (error) throw error;
		return data;
	}

	async createHousehold(data) {
		const household = {
			...data,
			household_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('households')
			.insert(household)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateHousehold(id, data) {
		const { data: result, error } = await this.client
			.from('households')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('household_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listHouseholds(filters) {
		let query = this.client.from('households').select('*');

		if (filters?.city) {
			query = query.eq('city', filters.city);
		}
		if (filters?.state) {
			query = query.eq('state', filters.state);
		}
		if (filters?.zip) {
			query = query.eq('zip', filters.zip);
		}
		if (filters?.search) {
			query = query.or(
				`address_line1.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
			);
		}
		if (filters?.limit) {
			query = query.limit(filters.limit);
		}
		if (filters?.offset) {
			query = query.range(
				filters.offset,
				filters.offset + (filters.limit || 20) - 1
			);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data;
	}

	async deleteHousehold(id) {
		const { error } = await this.client
			.from('households')
			.delete()
			.eq('household_id', id);

		if (error) throw error;
	}

	// Continue implementing all other methods...

	// Realtime subscription implementation
	subscribeToTable<T>(table: string, callback: (payload: T) => void) {
		const channel = this.client
			.channel(`public:${table}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table },
				(payload) => {
					callback(payload.new as unknown as T);
				}
			)
			.subscribe();

		// Return unsubscribe function
		return () => {
			this.client.removeChannel(channel);
		};
	}

	// Implement transaction support
	async transaction<T>(callback: () => Promise<T>): Promise<T> {
		// Note: Supabase doesn't have direct transaction support in the JS client
		// For now, just execute the callback
		return callback();
		// In the future, consider using pg connection to handle transactions
	}
}
```

### 3. Database Factory

Create a factory function that selects the appropriate database adapter:

**File: `src/lib/database/factory.ts`**

```typescript
import { SupabaseAdapter } from './supabase-adapter';
import { IndexedDBAdapter } from './indexed-db-adapter'; // This is the existing Dexie adapter wrapped
import type { DatabaseAdapter } from './types';

export function createDatabaseAdapter(): DatabaseAdapter {
	// Determine which adapter to use based on environment
	const mode = process.env.NEXT_PUBLIC_DATABASE_MODE || 'demo';

	if (mode === 'supabase') {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseKey) {
			console.error(
				'Supabase URL and key are required when using Supabase mode'
			);
			// Fallback to demo mode if Supabase config is missing
			return new IndexedDBAdapter();
		}

		return new SupabaseAdapter(supabaseUrl, supabaseKey);
	}

	// Default to IndexedDB for demo mode
	return new IndexedDBAdapter();
}

// Create a singleton instance
export const db = createDatabaseAdapter();
```

### 4. IndexedDB Adapter Wrapper

Create a wrapper around the existing Dexie implementation to match the new interface:

**File: `src/lib/database/indexed-db-adapter.ts`**

```typescript
import { db as dexieDb } from '../db'; // Import existing Dexie instance
import type { DatabaseAdapter } from './types';
// Import domain types

export class IndexedDBAdapter implements DatabaseAdapter {
	// Implement methods that delegate to the existing Dexie instance

	async getHousehold(id: string) {
		return dexieDb.households.get(id);
	}

	async createHousehold(data) {
		const id = await dexieDb.households.add({
			...data,
			household_id: data.household_id, // Use provided ID or generate one
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});
		return dexieDb.households.get(id);
	}

	// Implement all other methods...

	// No-op for realtime subscriptions in demo mode
	subscribeToTable<T>(_table: string, _callback: (payload: T) => void) {
		// Return unsubscribe function that does nothing
		return () => {};
	}

	// Implement transaction support using Dexie
	async transaction<T>(callback: () => Promise<T>): Promise<T> {
		return dexieDb.transaction(
			'rw',
			dexieDb.households,
			dexieDb.children,
			// Include all tables that might be accessed
			async () => {
				return callback();
			}
		);
	}
}
```

### 5. Integration with Existing Code

Update the DAL to use the new database adapter:

**File: `src/lib/dal.ts` (modified)**

```typescript
// Replace import { db } from './db';
import { db } from './database/factory';

// The rest of the file remains the same
```

## Testing Requirements

1. **Contract Tests**: Enhance the existing adapter contract tests to validate the Supabase adapter implementation
2. **Environment Switching**: Test switching between demo and Supabase modes
3. **Error Handling**: Test error scenarios (network issues, permissions, etc.)

## Acceptance Criteria

- [ ] All database adapter interface methods are fully defined
- [ ] Supabase adapter implements all required methods
- [ ] IndexedDB adapter wrapper implements all required methods
- [ ] Factory correctly selects adapter based on environment
- [ ] Integration with existing DAL is seamless
- [ ] Contract tests pass for both adapters
- [ ] Documentation explains the database adapter architecture

## Technical Notes

1. **Error Handling**: Supabase adapter should handle common error cases and translate them to consistent formats
2. **Type Safety**: Use generated Supabase types where possible
3. **Performance**: Consider bulk operations where appropriate
4. **Idempotency**: Ensure operations are idempotent where possible
5. **Feature Flags**: Seamless switching requires proper environment variable configuration

## Implementation Strategy

1. Create the basic folder structure and interfaces
2. Implement the IndexedDB wrapper first (simpler, working with existing code)
3. Implement the Supabase adapter, focusing on core operations first
4. Create the factory and integration with existing code
5. Write and run contract tests
6. Complete remaining adapter methods
7. Document the implementation

## Resources

- [Supabase JavaScript Client Documentation](https://supabase.io/docs/reference/javascript/start)
- [Current Database Schema (SQL migrations)](supabase/migrations)
- [Current DAL Implementation](src/lib/dal.ts)
- [Existing Contract Tests](__tests__/lib/db-adapter-contract.test.ts)

## Time Estimate

This is a significant foundational task that requires careful implementation:

- Database adapter interface: 2-3 hours
- Supabase adapter implementation: 8-10 hours
- IndexedDB adapter wrapper: 3-4 hours
- Factory and integration: 1-2 hours
- Testing and validation: 4-5 hours
- Documentation: 1-2 hours

Total: 19-26 hours
