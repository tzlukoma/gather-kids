# Supabase Integration Implementation Plan

## Overview

This plan outlines the implementation of Supabase as the production database for gatherKids while maintaining IndexedDB (Dexie.js) for demo mode. The system will use a feature flag to switch between database modes and implement a unified data access layer that abstracts the database implementation details.

## 🎯 Objectives

1. **Triple Database Support**: IndexedDB for demo mode, SQLite (Prisma) for local development, Supabase for production
2. **Seamless Switching**: Feature flag controlled database mode switching
3. **Unified API**: Single data access layer regardless of database backend
4. **Environment Management**: Local (SQLite), DEV, UAT, and PROD Supabase environments
5. **Data Migration**: Tools to migrate data between environments and database types
6. **Performance**: Optimized queries and real-time subscriptions
7. **Type Safety**: Prisma-generated types for enhanced development experience

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
            │  IndexedDB  │         │   Prisma    │
            │  (Demo)     │         │ (Local Dev) │
            └─────────────┘         └─────────────┘
                                │
                                ▼
                        ┌─────────────┐
                        │   Supabase  │
                        │(Production) │
                        └─────────────┘
```

## 🔧 Phase 1: Prisma & Supabase Setup & Configuration

### 1.1 Prisma Setup

#### Install Prisma Dependencies

```bash
npm install prisma @prisma/client
npm install -D prisma
```

#### Initialize Prisma

```bash
npx prisma init
```

#### Configure Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Household Model
model Household {
  household_id    String   @id @default(cuid())
  name            String?
  address_line1   String?
  address_line2   String?
  city            String?
  state           String?
  zip             String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  // Relations
  guardians       Guardian[]
  emergency_contacts EmergencyContact[]
  children        Child[]

  @@map("households")
}

// Guardian Model
model Guardian {
  guardian_id    String   @id @default(cuid())
  household_id   String
  first_name     String
  last_name      String
  mobile_phone   String
  email          String?
  relationship   String
  is_primary     Boolean  @default(false)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  // Relations
  household      Household @relation(fields: [household_id], references: [household_id])

  @@map("guardians")
}

// Child Model
model Child {
  child_id       String   @id @default(cuid())
  household_id   String
  first_name     String
  last_name      String
  dob            DateTime?
  grade          String?
  child_mobile   String?
  allergies      String?
  medical_notes  String?
  special_needs  Boolean  @default(false)
  special_needs_notes String?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  // Relations
  household      Household @relation(fields: [household_id], references: [household_id])
  registrations Registration[]
  enrollments   MinistryEnrollment[]
  attendance    Attendance[]
  incidents     Incident[]

  @@map("children")
}

// Ministry Model
model Ministry {
  ministry_id    String   @id @default(cuid())
  name           String
  code           String   @unique
  enrollment_type String
  min_age        Int?
  max_age        Int?
  min_grade      String?
  max_grade      String?
  open_at        DateTime?
  close_at       DateTime?
  data_profile   String
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  details        String?
  description    String?
  is_active      Boolean  @default(true)

  // Relations
  enrollments    MinistryEnrollment[]
  assignments    LeaderAssignment[]

  @@map("ministries")
}

// Registration Model
model Registration {
  registration_id String   @id @default(cuid())
  child_id       String
  cycle_id       String
  status         String
  pre_registered_sunday_school Boolean @default(false)
  submitted_via  String
  submitted_at   DateTime @default(now())

  // Relations
  child          Child @relation(fields: [child_id], references: [child_id])

  @@map("registrations")
}

// Ministry Enrollment Model
model MinistryEnrollment {
  enrollment_id  String   @id @default(cuid())
  child_id       String
  cycle_id       String
  ministry_id    String
  status         String
  custom_fields  Json?
  notes          String?

  // Relations
  child          Child @relation(fields: [child_id], references: [child_id])
  ministry       Ministry @relation(fields: [ministry_id], references: [ministry_id])

  @@map("ministry_enrollments")
}

// Attendance Model
model Attendance {
  attendance_id  String   @id @default(cuid())
  event_id       String
  child_id       String
  date           String
  timeslot_id    String?
  check_in_at    DateTime?
  checked_in_by  String?
  check_out_at   DateTime?
  picked_up_by  String?
  pickup_method  String?
  notes          String?
  first_time_flag Boolean @default(false)

  // Relations
  child          Child @relation(fields: [child_id], references: [child_id])

  @@map("attendance")
}

// Incident Model
model Incident {
  incident_id    String   @id @default(cuid())
  child_id       String
  child_name     String
  event_id       String?
  description    String
  severity       String
  leader_id      String
  timestamp      DateTime @default(now())
  admin_acknowledged_at DateTime?

  // Relations
  child          Child @relation(fields: [child_id], references: [child_id])

  @@map("incidents")
}

// User Model
model User {
  user_id       String   @id @default(cuid())
  name          String
  email         String   @unique
  mobile_phone  String?
  role          String
  is_active     Boolean  @default(true)
  background_check_status String?
  expires_at    DateTime?

  // Relations
  assignments   LeaderAssignment[]

  @@map("users")
}

// Leader Assignment Model
model LeaderAssignment {
  assignment_id String   @id @default(cuid())
  leader_id     String
  ministry_id   String
  cycle_id      String
  role          String

  // Relations
  leader        User @relation(fields: [leader_id], references: [user_id])
  ministry      Ministry @relation(fields: [ministry_id], references: [ministry_id])

  @@map("leader_assignments")
}
```

#### Environment Configuration for Prisma

```env
# .env.local
DATABASE_URL="file:./dev.db"
```

#### Generate Prisma Client

```bash
npx prisma generate
npx prisma db push
```

### 1.2 Supabase Project Creation

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
NEXT_PUBLIC_DATABASE_MODE=prisma  # demo | prisma | supabase

# Prisma Configuration
DATABASE_URL="file:./dev.db"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key

# Feature Flags
NEXT_PUBLIC_SHOW_DEMO_FEATURES=true
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=false
NEXT_PUBLIC_ENABLE_PRISMA_MODE=true
```

#### .env.staging (UAT)

```env
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-uat-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-uat-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-uat-service-role-key
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=true
NEXT_PUBLIC_ENABLE_PRISMA_MODE=false
```

#### .env.production (PROD)

```env
NEXT_PUBLIC_DATABASE_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
NEXT_PUBLIC_SHOW_DEMO_FEATURES=false
NEXT_PUBLIC_ENABLE_SUPABASE_MODE=true
NEXT_PUBLIC_ENABLE_PRISMA_MODE=false
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

````typescript
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

### 2.3 Implement Prisma Adapter

```typescript
// src/lib/database/prisma-adapter.ts
import { DatabaseAdapter } from './types';
import { PrismaClient } from '@prisma/client';
import type { Household, Child, Attendance /* other types */ } from '../types';

export class PrismaAdapter implements DatabaseAdapter {
	private client: PrismaClient;

	constructor() {
		this.client = new PrismaClient();
	}

	async getHousehold(id: string): Promise<Household | null> {
		const household = await this.client.household.findUnique({
			where: { household_id: id },
			include: {
				guardians: true,
				emergency_contacts: true,
				children: true,
			},
		});

		return household;
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		const household = await this.client.household.create({
			data: {
				...data,
				guardians: {
					create: data.guardians || [],
				},
				emergency_contacts: {
					create: data.emergency_contacts || [],
				},
				children: {
					create: data.children || [],
				},
			},
			include: {
				guardians: true,
				emergency_contacts: true,
				children: true,
			},
		});

		return household;
	}

	async updateHousehold(id: string, data: Partial<Household>): Promise<Household> {
		const household = await this.client.household.update({
			where: { household_id: id },
			data,
			include: {
				guardians: true,
				emergency_contacts: true,
				children: true,
			},
		});

		return household;
	}

	async deleteHousehold(id: string): Promise<void> {
		await this.client.household.delete({
			where: { household_id: id },
		});
	}

	async listHouseholds(filters?: HouseholdFilters): Promise<Household[]> {
		const where: any = {};

		if (filters?.city) where.city = filters.city;
		if (filters?.state) where.state = filters.state;
		if (filters?.zip) where.zip = filters.zip;

		const households = await this.client.household.findMany({
			where,
			include: {
				guardians: true,
				emergency_contacts: true,
				children: true,
			},
		});

		return households;
	}

	async getChild(id: string): Promise<Child | null> {
		const child = await this.client.child.findUnique({
			where: { child_id: id },
			include: {
				household: true,
				registrations: true,
				enrollments: true,
				attendance: true,
				incidents: true,
			},
		});

		return child;
	}

	async createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child> {
		const child = await this.client.child.create({
			data,
			include: {
				household: true,
				registrations: true,
				enrollments: true,
				attendance: true,
				incidents: true,
			},
		});

		return child;
	}

	async updateChild(id: string, data: Partial<Child>): Promise<Child> {
		const child = await this.client.child.update({
			where: { child_id: id },
			data,
			include: {
				household: true,
				registrations: true,
				enrollments: true,
				attendance: true,
				incidents: true,
			},
		});

		return child;
	}

	async deleteChild(id: string): Promise<void> {
		await this.client.child.delete({
			where: { child_id: id },
		});
	}

	async listChildren(filters?: ChildFilters): Promise<Child[]> {
		const where: any = {};

		if (filters?.household_id) where.household_id = filters.household_id;
		if (filters?.grade) where.grade = filters.grade;
		if (filters?.is_active !== undefined) where.is_active = filters.is_active;

		const children = await this.client.child.findMany({
			where,
			include: {
				household: true,
				registrations: true,
				enrollments: true,
				attendance: true,
				incidents: true,
			},
		});

		return children;
	}

	async getAttendance(id: string): Promise<Attendance | null> {
		const attendance = await this.client.attendance.findUnique({
			where: { attendance_id: id },
			include: {
				child: true,
			},
		});

		return attendance;
	}

	async createAttendance(
		data: Omit<Attendance, 'attendance_id'>
	): Promise<Attendance> {
		const attendance = await this.client.attendance.create({
			data,
			include: {
				child: true,
			},
		});

		return attendance;
	}

	async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
		const attendance = await this.client.attendance.update({
			where: { attendance_id: id },
			data,
			include: {
				child: true,
			},
		});

		return attendance;
	}

	async listAttendance(filters?: AttendanceFilters): Promise<Attendance[]> {
		const where: any = {};

		if (filters?.date) where.date = filters.date;
		if (filters?.event_id) where.event_id = filters.event_id;
		if (filters?.child_id) where.child_id = filters.child_id;
		if (filters?.timeslot_id) where.timeslot_id = filters.timeslot_id;

		const attendance = await this.client.attendance.findMany({
			where,
			include: {
				child: true,
			},
		});

		return attendance;
	}

	subscribeToTable<T>(
		table: string,
		callback: (data: T[]) => void
	): () => void {
		// For local development, we'll implement polling-based updates
		// This can be enhanced with WebSockets or Server-Sent Events later
		const interval = setInterval(async () => {
			try {
				const data = await this.listData(table);
				callback(data as T[]);
			} catch (error) {
				console.error(`Error polling ${table}:`, error);
			}
		}, 5000); // Poll every 5 seconds

		return () => {
			clearInterval(interval);
		};
	}

	async transaction<T>(operations: () => Promise<T>): Promise<T> {
		return await this.client.$transaction(operations);
	}

	async disconnect(): Promise<void> {
		await this.client.$disconnect();
	}
}
````

````

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
````

### 2.4 Database Factory

```typescript
// src/lib/database/factory.ts
import { DatabaseAdapter } from './types';
import { IndexedDBAdapter } from './indexeddb-adapter';
import { PrismaAdapter } from './prisma-adapter';
import { SupabaseAdapter } from './supabase-adapter';

export function createDatabaseAdapter(): DatabaseAdapter {
	const mode = process.env.NEXT_PUBLIC_DATABASE_MODE || 'demo';

	switch (mode) {
		case 'demo':
			return new IndexedDBAdapter();
		case 'prisma':
			return new PrismaAdapter();
		case 'supabase':
			const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
			const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
			return new SupabaseAdapter(url, anonKey);
		default:
			console.warn(`Unknown database mode: ${mode}, falling back to demo mode`);
			return new IndexedDBAdapter();
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

#### Prisma Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { seedData } from '../src/lib/seed';

const prisma = new PrismaClient();

async function seedPrisma() {
	try {
		console.log('Starting Prisma seeding...');

		// Clear existing data
		await prisma.attendance.deleteMany();
		await prisma.incident.deleteMany();
		await prisma.ministryEnrollment.deleteMany();
		await prisma.registration.deleteMany();
		await prisma.child.deleteMany();
		await prisma.guardian.deleteMany();
		await prisma.emergencyContact.deleteMany();
		await prisma.household.deleteMany();
		await prisma.leaderAssignment.deleteMany();
		await prisma.ministry.deleteMany();
		await prisma.user.deleteMany();

		console.log('Existing data cleared');

		// Seed ministries
		const ministries = await Promise.all(
			seedData.ministries.map((ministry) =>
				prisma.ministry.create({
					data: {
						ministry_id: ministry.ministry_id,
						name: ministry.name,
						code: ministry.code,
						enrollment_type: ministry.enrollment_type,
						min_age: ministry.min_age,
						max_age: ministry.max_age,
						min_grade: ministry.min_grade,
						max_grade: ministry.max_grade,
						open_at: ministry.open_at ? new Date(ministry.open_at) : null,
						close_at: ministry.close_at ? new Date(ministry.close_at) : null,
						data_profile: ministry.data_profile,
						details: ministry.details,
						description: ministry.description,
						is_active: ministry.is_active,
					},
				})
			)
		);

		console.log(`${ministries.length} ministries created`);

		// Seed users
		const users = await Promise.all(
			seedData.users.map((user) =>
				prisma.user.create({
					data: {
						user_id: user.user_id,
						name: user.name,
						email: user.email,
						mobile_phone: user.mobile_phone,
						role: user.role,
						is_active: user.is_active,
						background_check_status: user.background_check_status,
						expires_at: user.expires_at ? new Date(user.expires_at) : null,
					},
				})
			)
		);

		console.log(`${users.length} users created`);

		// Seed households with related data
		for (const householdData of seedData.households) {
			const household = await prisma.household.create({
				data: {
					household_id: householdData.household_id,
					name: householdData.name,
					address_line1: householdData.address_line1,
					address_line2: householdData.address_line2,
					city: householdData.city,
					state: householdData.state,
					zip: householdData.zip,
					created_at: new Date(householdData.created_at),
					updated_at: new Date(householdData.updated_at),
				},
			});

			// Create guardians for this household
			const householdGuardians = seedData.guardians.filter(
				(g) => g.household_id === household.household_id
			);
			await Promise.all(
				householdGuardians.map((guardian) =>
					prisma.guardian.create({
						data: {
							guardian_id: guardian.guardian_id,
							household_id: household.household_id,
							first_name: guardian.first_name,
							last_name: guardian.last_name,
							mobile_phone: guardian.mobile_phone,
							email: guardian.email,
							relationship: guardian.relationship,
							is_primary: guardian.is_primary,
							created_at: new Date(guardian.created_at),
							updated_at: new Date(guardian.updated_at),
						},
					})
				)
			);

			// Create emergency contacts for this household
			const householdEmergencyContacts = seedData.emergencyContacts.filter(
				(ec) => ec.household_id === household.household_id
			);
			await Promise.all(
				householdEmergencyContacts.map((ec) =>
					prisma.emergencyContact.create({
						data: {
							contact_id: ec.contact_id,
							household_id: household.household_id,
							first_name: ec.first_name,
							last_name: ec.last_name,
							mobile_phone: ec.mobile_phone,
							relationship: ec.relationship,
						},
					})
				)
			);

			// Create children for this household
			const householdChildren = seedData.children.filter(
				(c) => c.household_id === household.household_id
			);
			await Promise.all(
				householdChildren.map((child) =>
					prisma.child.create({
						data: {
							child_id: child.child_id,
							household_id: household.household_id,
							first_name: child.first_name,
							last_name: child.last_name,
							dob: child.dob ? new Date(child.dob) : null,
							grade: child.grade,
							child_mobile: child.child_mobile,
							allergies: child.allergies,
							medical_notes: child.medical_notes,
							special_needs: child.special_needs,
							special_needs_notes: child.special_needs_notes,
							is_active: child.is_active,
							created_at: new Date(child.created_at),
							updated_at: new Date(child.updated_at),
						},
					})
				)
			);
		}

		console.log('Households and related data created');

		// Seed other related data (registrations, enrollments, etc.)
		// ... additional seeding logic

		console.log('Prisma seeding completed successfully');
	} catch (error) {
		console.error('Error during Prisma seeding:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

seedPrisma().catch(console.error);
```

#### Supabase Seeding

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
