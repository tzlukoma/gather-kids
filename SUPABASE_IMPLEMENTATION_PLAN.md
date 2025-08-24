# Supabase Integration Implementation Plan

## Overview

This plan outlines the implementation of Supabase as the production database for gatherKids while maintaining IndexedDB (Dexie.js) for demo mode. The system will use a feature flag to switch between database modes and implement a unified data access layer that abstracts the database implementation details.

## 🎯 Objectives

1. **Dual Database Support**: IndexedDB for demo mode, Supabase for production
2. **Seamless Switching**: Feature flag controlled database mode switching
3. **Unified API**: Single data access layer regardless of database backend
4. **Environment Management**: DEV, UAT, and PROD Supabase environments
5. **Data Migration**: Tools to migrate data between environments
6. **Performance**: Optimized queries and real-time subscriptions

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   Data Access    │    │   Database      │
│   Components    │───▶│      Layer       │───▶│   Abstraction   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Database Mode     │
                    │   (Feature Flag)    │
                    └─────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌─────────────┐         ┌─────────────┐
            │  IndexedDB  │         │   Supabase  │
            │  (Demo)     │         │ (Production)│
            └─────────────┘         └─────────────┘
```

## 🔧 Phase 1: Supabase Setup & Configuration

### 1.1 Supabase Project Creation

#### Development Environment (DEV)

```bash
# Create DEV project
supabase projects create gatherkids-dev
# Note: Project ID, API Key, and URL for .env files
```

#### UAT Environment

```bash
# Create UAT project
supabase projects create gatherkids-uat
# Note: Project ID, API Key, and URL for .env files
```

#### Production Environment (PROD)

```bash
# Create PROD project
supabase projects create gatherkids-prod
# Note: Project ID, API Key, and URL for .env files
```

### 1.2 Environment Configuration

#### .env.local (Development)

```env
# Database Mode
NEXT_PUBLIC_DATABASE_MODE=demo  # demo | supabase

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key

# Feature Flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=false
```

#### .env.staging (UAT)

```env
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-uat-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-uat-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-uat-service-role-key
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=true
```

#### .env.production (PROD)

```env
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=true
```

### 1.3 Database Schema Setup

#### Create Migration Files

```sql
-- migrations/001_initial_schema.sql
-- Create all tables based on current IndexedDB schema

-- Enable Row Level Security (RLS)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Leaders can view assigned ministry data" ON children
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leader_assignments la
            JOIN ministry_enrollments me ON la.ministry_id = me.ministry_id
            WHERE la.leader_id = auth.uid()::text
            AND me.child_id = children.child_id
        )
    );

-- Additional policies for other tables...
```

#### Apply Schema to All Environments

```bash
# DEV Environment
supabase db push --project-ref your-dev-project-ref

# UAT Environment
supabase db push --project-ref your-uat-project-ref

# PROD Environment
supabase db push --project-ref your-prod-project-ref
```

## 🔧 Phase 2: Database Abstraction Layer

### 2.1 Create Database Interface

```typescript
// src/lib/database/types.ts
export interface DatabaseAdapter {
	// Household operations
	getHousehold(id: string): Promise<Household | null>;
	createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household>;
	updateHousehold(id: string, data: Partial<Household>): Promise<Household>;
	deleteHousehold(id: string): Promise<void>;
	listHouseholds(filters?: HouseholdFilters): Promise<Household[]>;

	// Child operations
	getChild(id: string): Promise<Child | null>;
	createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child>;
	updateChild(id: string, data: Partial<Child>): Promise<Child>;
	deleteChild(id: string): Promise<void>;
	listChildren(filters?: ChildFilters): Promise<Child[]>;

	// Attendance operations
	getAttendance(id: string): Promise<Attendance | null>;
	createAttendance(
		data: Omit<Attendance, 'attendance_id'>
	): Promise<Attendance>;
	updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance>;
	listAttendance(filters?: AttendanceFilters): Promise<Attendance[]>;

	// Real-time subscriptions
	subscribeToTable<T>(table: string, callback: (data: T[]) => void): () => void;
	subscribeToQuery<T>(query: string, callback: (data: T[]) => void): () => void;

	// Transaction support
	transaction<T>(operations: () => Promise<T>): Promise<T>;
}
```

### 2.2 Implement IndexedDB Adapter

```typescript
// src/lib/database/indexeddb-adapter.ts
import { DatabaseAdapter } from './types';
import { db } from '../db';
import type { Household, Child, Attendance /* other types */ } from '../types';

export class IndexedDBAdapter implements DatabaseAdapter {
	async getHousehold(id: string): Promise<Household | null> {
		return await db.households.get(id);
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		const now = new Date().toISOString();
		const household: Household = {
			...data,
			household_id: crypto.randomUUID(),
			created_at: now,
			updated_at: now,
		};

		await db.households.add(household);
		return household;
	}

	// Implement other methods...

	subscribeToTable<T>(
		table: string,
		callback: (data: T[]) => void
	): () => void {
		// Use Dexie React Hooks for real-time updates
		// This maintains the current real-time functionality
		return () => {}; // Cleanup function
	}
}
```

### 2.3 Implement Supabase Adapter

```typescript
// src/lib/database/supabase-adapter.ts
import { DatabaseAdapter } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';
import type { Household, Child, Attendance /* other types */ } from '../types';

export class SupabaseAdapter implements DatabaseAdapter {
	private client: SupabaseClient<Database>;

	constructor(url: string, anonKey: string) {
		this.client = createClient<Database>(url, anonKey);
	}

	async getHousehold(id: string): Promise<Household | null> {
		const { data, error } = await this.client
			.from('households')
			.select('*')
			.eq('household_id', id)
			.single();

		if (error) throw error;
		return data;
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		const now = new Date().toISOString();
		const household: Omit<Household, 'household_id'> = {
			...data,
			created_at: now,
			updated_at: now,
		};

		const { data: result, error } = await this.client
			.from('households')
			.insert(household)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	// Implement other methods...

	subscribeToTable<T>(
		table: string,
		callback: (data: T[]) => void
	): () => void {
		const subscription = this.client
			.channel(`public:${table}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table },
				(payload) => {
					// Handle real-time updates
					this.refreshTableData(table, callback);
				}
			)
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
	}

	private async refreshTableData<T>(
		table: string,
		callback: (data: T[]) => void
	) {
		const { data, error } = await this.client.from(table).select('*');

		if (!error && data) {
			callback(data as T[]);
		}
	}
}
```

### 2.4 Database Factory

```typescript
// src/lib/database/factory.ts
import { DatabaseAdapter } from './types';
import { IndexedDBAdapter } from './indexeddb-adapter';
import { SupabaseAdapter } from './supabase-adapter';

export function createDatabaseAdapter(): DatabaseAdapter {
	const mode = process.env.NEXT_PUBLIC_DATABASE_MODE || 'demo';

	if (mode === 'demo') {
		return new IndexedDBAdapter();
	} else {
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
		const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
		return new SupabaseAdapter(url, anonKey);
	}
}

export const db = createDatabaseAdapter();
```

## 🔧 Phase 3: Update Data Access Layer

### 3.1 Refactor DAL Functions

```typescript
// src/lib/dal.ts
import { db } from './database/factory';
// ... other imports

// Update all functions to use the abstracted database
export async function querySundaySchoolRoster(
	dateISO: string,
	timeslotId?: string
) {
	const attendanceRecords = await db.listAttendance({
		date: dateISO,
		event_id: 'evt_sunday_school',
		timeslot_id: timeslotId,
	});

	const childIds = attendanceRecords.map((a) => a.child_id);
	const children = await db.listChildren({ child_id: childIds });

	return children;
}

export async function recordCheckIn(
	childId: string,
	eventId: string,
	timeslotId?: string
) {
	const attendance: Omit<Attendance, 'attendance_id'> = {
		child_id: childId,
		event_id: eventId,
		date: getTodayIsoDate(),
		timeslot_id: timeslotId,
		check_in_at: new Date().toISOString(),
		checked_in_by: getCurrentUserId(), // Implement this
	};

	return await db.createAttendance(attendance);
}

// Update all other functions similarly...
```

### 3.2 Update Components

```typescript
// src/components/ministrysync/check-in-view.tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useDatabaseSubscription } from '@/hooks/use-database-subscription';

export function CheckInView({
	initialChildren,
	selectedEvent,
	selectedGrades,
	statusFilter,
}: CheckInViewProps) {
	// Replace Dexie useLiveQuery with custom hook
	const children = useDatabaseSubscription('children', {
		event_id: selectedEvent,
		grades: selectedGrades,
	});

	// Rest of component remains the same...
}
```

## 🔧 Phase 4: Authentication Integration

### 4.1 Supabase Auth Setup

```typescript
// src/lib/auth/supabase-auth.ts
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export class SupabaseAuth {
	private client: SupabaseClient;

	constructor() {
		this.client = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		);
	}

	async signIn(email: string, password: string): Promise<User | null> {
		const { data, error } = await this.client.auth.signInWithPassword({
			email,
			password,
		});

		if (error) throw error;
		return data.user;
	}

	async signUp(
		email: string,
		password: string,
		userData: any
	): Promise<User | null> {
		const { data, error } = await this.client.auth.signUp({
			email,
			password,
			options: {
				data: userData,
			},
		});

		if (error) throw error;
		return data.user;
	}

	async signOut(): Promise<void> {
		await this.client.auth.signOut();
	}

	onAuthStateChange(callback: (user: User | null) => void) {
		return this.client.auth.onAuthStateChange((event, session) => {
			callback(session?.user ?? null);
		});
	}
}
```

### 4.2 Update Auth Context

```typescript
// src/contexts/auth-context.tsx
import { useFeatureFlags } from './feature-flag-context';
import { SupabaseAuth } from '@/lib/auth/supabase-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
	const { flags } = useFeatureFlags();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (flags.databaseMode === 'supabase') {
			const supabaseAuth = new SupabaseAuth();
			const unsubscribe = supabaseAuth.onAuthStateChange(setUser);
			setLoading(false);

			return unsubscribe;
		} else {
			// Existing IndexedDB auth logic
			// ... existing code
		}
	}, [flags.databaseMode]);

	// Rest of context implementation...
}
```

## 🔧 Phase 5: Feature Flag Updates

### 5.1 Enhanced Feature Flags

```typescript
// src/contexts/feature-flag-context.tsx
interface FeatureFlags {
	showDemoFeatures: boolean;
	databaseMode: 'demo' | 'supabase';
	enableSupabaseMode: boolean;
	enableRealTimeSync: boolean;
	enableOfflineMode: boolean;
}

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
	const [flags, setFlags] = useState<FeatureFlags>({
		showDemoFeatures: process.env.NODE_ENV === 'development',
		databaseMode:
			(process.env.NEXT_PUBLIC_DATABASE_MODE as 'demo' | 'supabase') || 'demo',
		enableSupabaseMode: process.env.NEXT_PUBLIC_ENABLE_SUPABASE_MODE === 'true',
		enableRealTimeSync: true,
		enableOfflineMode: true,
	});

	// Rest of implementation...
}
```

## 🔧 Phase 6: Data Migration & Seeding

### 6.1 Migration Scripts

```typescript
// scripts/migrate-to-supabase.ts
import { createClient } from '@supabase/supabase-js';
import { db as indexedDB } from '../src/lib/db';

async function migrateData() {
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	// Migrate households
	const households = await indexedDB.households.toArray();
	for (const household of households) {
		await supabase.from('households').insert(household);
	}

	// Migrate other tables...
	console.log('Migration completed');
}

migrateData().catch(console.error);
```

### 6.2 Seeding Scripts

```typescript
// scripts/seed-supabase.ts
import { createClient } from '@supabase/supabase-js';
import { seedData } from '../src/lib/seed';

async function seedSupabase() {
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	const data = seedData();

	// Insert seed data into Supabase
	for (const table of Object.keys(data)) {
		await supabase.from(table).insert(data[table]);
	}

	console.log('Seeding completed');
}

seedSupabase().catch(console.error);
```

## 🔧 Phase 7: Environment Management

### 7.1 Environment-Specific Configuration

```typescript
// src/lib/config/environment.ts
export const environment = {
	dev: {
		databaseMode: 'demo' as const,
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL_DEV,
		supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV,
		enableDemoFeatures: true,
		enableRealTimeSync: false,
	},
	uat: {
		databaseMode: 'supabase' as const,
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL_UAT,
		supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_UAT,
		enableDemoFeatures: false,
		enableRealTimeSync: true,
	},
	production: {
		databaseMode: 'supabase' as const,
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL_PROD,
		supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD,
		enableDemoFeatures: false,
		enableRealTimeSync: true,
	},
};

export function getCurrentEnvironment() {
	const env = process.env.NODE_ENV;
	if (env === 'production') return environment.production;
	if (env === 'staging') return environment.uat;
	return environment.dev;
}
```

### 7.2 Deployment Scripts

```bash
#!/bin/bash
# deploy.sh

ENVIRONMENT=$1

if [ "$ENVIRONMENT" = "dev" ]; then
  echo "Deploying to DEV..."
  cp .env.dev .env.local
  npm run build
  npm run start
elif [ "$ENVIRONMENT" = "uat" ]; then
  echo "Deploying to UAT..."
  cp .env.uat .env.local
  npm run build
  npm run start
elif [ "$ENVIRONMENT" = "prod" ]; then
  echo "Deploying to PROD..."
  cp .env.production .env.local
  npm run build
  npm run start
else
  echo "Usage: ./deploy.sh [dev|uat|prod]"
  exit 1
fi
```

## 🔧 Phase 8: Testing & Validation

### 8.1 Test Database Adapters

```typescript
// src/lib/database/__tests__/database-adapters.test.ts
import { IndexedDBAdapter } from '../indexeddb-adapter';
import { SupabaseAdapter } from '../supabase-adapter';

describe('Database Adapters', () => {
	test('IndexedDB adapter creates household', async () => {
		const adapter = new IndexedDBAdapter();
		const household = await adapter.createHousehold({
			name: 'Test Household',
			address_line1: '123 Test St',
			city: 'Test City',
			state: 'TS',
			zip: '12345',
		});

		expect(household.household_id).toBeDefined();
		expect(household.name).toBe('Test Household');
	});

	test('Supabase adapter creates household', async () => {
		const adapter = new SupabaseAdapter(
			process.env.TEST_SUPABASE_URL!,
			process.env.TEST_SUPABASE_KEY!
		);

		const household = await adapter.createHousehold({
			name: 'Test Household',
			address_line1: '123 Test St',
			city: 'Test City',
			state: 'TS',
			zip: '12345',
		});

		expect(household.household_id).toBeDefined();
		expect(household.name).toBe('Test Household');
	});
});
```

### 8.2 Integration Tests

```typescript
// src/lib/dal/__tests__/dal-integration.test.ts
import { createDatabaseAdapter } from '../../database/factory';
import { recordCheckIn, recordCheckOut } from '../dal';

describe('DAL Integration', () => {
	test('Check-in flow works with both adapters', async () => {
		const db = createDatabaseAdapter();

		// Test check-in flow
		const attendance = await recordCheckIn('child-1', 'event-1');
		expect(attendance.check_in_at).toBeDefined();

		// Test check-out flow
		const updatedAttendance = await recordCheckOut(
			'attendance-1',
			'guardian-1'
		);
		expect(updatedAttendance.check_out_at).toBeDefined();
	});
});
```

## 🔧 Phase 9: Performance Optimization

### 9.1 Query Optimization

```typescript
// src/lib/database/supabase-adapter.ts
export class SupabaseAdapter implements DatabaseAdapter {
	// Implement query caching
	private queryCache = new Map<string, { data: any; timestamp: number }>();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	async getHousehold(id: string): Promise<Household | null> {
		const cacheKey = `household:${id}`;
		const cached = this.queryCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data;
		}

		const { data, error } = await this.client
			.from('households')
			.select('*')
			.eq('household_id', id)
			.single();

		if (error) throw error;

		this.queryCache.set(cacheKey, { data, timestamp: Date.now() });
		return data;
	}
}
```

### 9.2 Real-time Subscription Management

```typescript
// src/hooks/use-database-subscription.ts
import { useEffect, useState } from 'react';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { db } from '@/lib/database/factory';

export function useDatabaseSubscription<T>(
	table: string,
	filters?: Record<string, any>
) {
	const [data, setData] = useState<T[]>([]);
	const { flags } = useFeatureFlags();

	useEffect(() => {
		if (flags.databaseMode === 'demo') {
			// Use existing Dexie React Hooks
			return;
		}

		// Set up Supabase real-time subscription
		const unsubscribe = db.subscribeToTable<T>(table, setData);

		// Initial data fetch
		db.listData(table, filters).then(setData);

		return unsubscribe;
	}, [table, filters, flags.databaseMode]);

	return data;
}
```

## 🔧 Phase 10: Monitoring & Observability

### 10.1 Database Performance Monitoring

```typescript
// src/lib/database/monitoring.ts
export class DatabaseMonitor {
	private metrics = {
		queryCount: 0,
		queryTime: 0,
		errorCount: 0,
		cacheHits: 0,
		cacheMisses: 0,
	};

	recordQuery(duration: number, success: boolean) {
		this.metrics.queryCount++;
		this.metrics.queryTime += duration;

		if (!success) {
			this.metrics.errorCount++;
		}
	}

	recordCacheHit() {
		this.metrics.cacheHits++;
	}

	recordCacheMiss() {
		this.metrics.cacheMisses++;
	}

	getMetrics() {
		return {
			...this.metrics,
			averageQueryTime:
				this.metrics.queryCount > 0
					? this.metrics.queryTime / this.metrics.queryCount
					: 0,
			cacheHitRate:
				this.metrics.cacheHits + this.metrics.cacheMisses > 0
					? this.metrics.cacheHits /
					  (this.metrics.cacheHits + this.metrics.cacheMisses)
					: 0,
		};
	}
}
```

## 📋 Implementation Timeline

### Week 1-2: Supabase Setup & Schema

- Create Supabase projects for all environments
- Set up database schema and RLS policies
- Configure environment variables

### Week 3-4: Database Abstraction Layer

- Implement DatabaseAdapter interface
- Create IndexedDB and Supabase adapters
- Implement database factory

### Week 5-6: Data Access Layer Updates

- Refactor all DAL functions to use abstracted database
- Update components to use new data layer
- Implement real-time subscriptions

### Week 7-8: Authentication & Testing

- Integrate Supabase authentication
- Write comprehensive tests
- Performance testing and optimization

### Week 9-10: Deployment & Monitoring

- Deploy to UAT environment
- Data migration and validation
- Production deployment
- Monitoring setup

## 🚨 Risk Mitigation

### 1. **Data Loss Prevention**

- Implement comprehensive backup strategies
- Use database transactions for critical operations
- Validate data integrity during migration

### 2. **Performance Degradation**

- Implement query caching and optimization
- Monitor query performance in production
- Use database indexes for common queries

### 3. **Downtime Minimization**

- Deploy during low-usage periods
- Use blue-green deployment strategy
- Implement rollback procedures

### 4. **Security Concerns**

- Implement proper RLS policies
- Use service role keys only for admin operations
- Regular security audits and updates

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

## 🔍 Next Steps

1. **Review this plan** and provide feedback
2. **Set up Supabase projects** for all environments
3. **Begin with Phase 1** (Supabase Setup & Configuration)
4. **Create development branch** for implementation
5. **Implement incrementally** with regular testing

This plan provides a comprehensive roadmap for integrating Supabase while maintaining the existing IndexedDB functionality for demo mode. The approach ensures minimal disruption to the current system while providing a robust foundation for production use.
