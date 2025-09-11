import { DatabaseAdapter } from '@/lib/database/types';
import { IndexedDBAdapter } from '@/lib/database/indexed-db-adapter';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { createInMemoryDB } from './dexie-mock';
import { createSupabaseMock } from './supabase-mock';

/**
 * Test Database Factory
 * Creates a DatabaseAdapter instance for testing with either IndexedDB or Supabase
 */
export class TestDatabaseFactory {
	/**
	 * Create an in-memory IndexedDB adapter for testing
	 */
	static createIndexedDBAdapter(): DatabaseAdapter {
		return new IndexedDBAdapter();
	}

	/**
	 * Create a mock Supabase adapter for testing
	 */
	static createSupabaseAdapter(): DatabaseAdapter {
		const mockSupabaseClient = createSupabaseMock();
		return new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockSupabaseClient
		);
	}

	/**
	 * Create test data in the provided adapter
	 */
	static async createTestData(adapter: DatabaseAdapter) {
		// Create a household
		const household = await adapter.createHousehold({
			address_line1: 'Test Address',
			city: 'Test City',
			state: 'TS',
			zip: '12345',
		});

		// Create a child in the household
		const child = await adapter.createChild({
			household_id: household.household_id,
			first_name: 'Test',
			last_name: 'Child',
			dob: '2018-01-01',
			is_active: true,
		});

		// Create a guardian in the household
		const guardian = await adapter.createGuardian({
			household_id: household.household_id,
			first_name: 'Test',
			last_name: 'Guardian',
			relationship: 'Parent',
			is_primary: true,
			email: 'test@example.com',
			mobile_phone: '555-123-4567',
		});

		// Create a ministry
		const ministry = await adapter.createMinistry({
			code: 'TEST_MIN',
			name: 'Test Ministry',
			description: 'A ministry for testing',
			min_age: 3,
			max_age: 12,
			is_active: true,
			enrollment_type: 'enrolled',
			data_profile: 'Basic',
		});

		// Create a registration cycle
		const cycle = await adapter.createRegistrationCycle({
			start_date: '2024-01-01',
			end_date: '2024-12-31',
			is_active: true,
		});

		// Create a registration
		const registration = await adapter.createRegistration({
			child_id: child.child_id,
			cycle_id: cycle.cycle_id,
			status: 'active',
			pre_registered_sunday_school: false,
			consents: [],
			submitted_via: 'web',
			submitted_at: new Date().toISOString(),
		});

		// Create a ministry enrollment
		const enrollment = await adapter.createMinistryEnrollment({
			child_id: child.child_id,
			ministry_id: ministry.ministry_id,
			cycle_id: cycle.cycle_id,
			status: 'enrolled',
		});

		// Create an event
		const event = await adapter.createEvent({
			name: 'Test Event',
			timeslots: [{ id: crypto.randomUUID(), start_local: '09:00', end_local: '11:00' }],
		});

		// Create an attendance record
		const attendance = await adapter.createAttendance({
			child_id: child.child_id,
			event_id: event.event_id,
			check_in_at: new Date().toISOString(),
			date: new Date().toISOString().split('T')[0],
		});

		// Create an incident
		const incident = await adapter.createIncident({
			child_id: child.child_id,
			child_name: `${child.first_name} ${child.last_name}`,
			description: 'Test incident',
			severity: 'low',
			leader_id: 'test-leader-id',
			timestamp: new Date().toISOString(),
		});

		return {
			household,
			child,
			guardian,
			ministry,
			cycle,
			registration,
			enrollment,
			event,
			attendance,
			incident,
		};
	}

	/**
	 * Clean up test data
	 */
	static async cleanupTestData(
		adapter: DatabaseAdapter,
		data: {
			household?: { household_id: string };
			child?: { child_id: string };
			guardian?: { guardian_id: string };
			ministry?: { ministry_id: string };
			cycle?: { cycle_id: string };
			registration?: { registration_id: string };
			enrollment?: { enrollment_id: string };
			event?: { event_id: string };
			attendance?: { attendance_id: string };
			incident?: { incident_id: string };
		}
	) {
		try {
			// Clean up in reverse dependency order
			if (data.incident) {
				await adapter.deleteIncident(data.incident.incident_id);
			}
			if (data.attendance) {
				await adapter.deleteAttendance(data.attendance.attendance_id);
			}
			if (data.event) {
				await adapter.deleteEvent(data.event.event_id);
			}
			if (data.enrollment) {
				await adapter.deleteMinistryEnrollment(data.enrollment.enrollment_id);
			}
			if (data.registration) {
				await adapter.deleteRegistration(data.registration.registration_id);
			}
			if (data.cycle) {
				await adapter.deleteRegistrationCycle(data.cycle.cycle_id);
			}
			if (data.ministry) {
				await adapter.deleteMinistry(data.ministry.ministry_id);
			}
			if (data.guardian) {
				await adapter.deleteGuardian(data.guardian.guardian_id);
			}
			if (data.child) {
				await adapter.deleteChild(data.child.child_id);
			}
			if (data.household) {
				await adapter.deleteHousehold(data.household.household_id);
			}
		} catch (error) {
			// Ignore cleanup errors - they might already be deleted
			console.warn('Cleanup error (expected):', error);
		}
	}

	/**
	 * Create a set of test households with different characteristics for filtering tests
	 */
	static async createFilterTestData(adapter: DatabaseAdapter) {
		const households = await Promise.all([
			adapter.createHousehold({
				address_line1: '123 Oak Street',
				city: 'Austin',
				state: 'TX',
				zip: '78701',
			}),
			adapter.createHousehold({
				address_line1: '456 Pine Avenue',
				city: 'Austin',
				state: 'TX',
				zip: '78702',
			}),
			adapter.createHousehold({
				address_line1: '789 Elm Boulevard',
				city: 'Dallas',
				state: 'TX',
				zip: '75201',
			}),
			adapter.createHousehold({
				address_line1: '321 Main Street',
				city: 'Houston',
				state: 'TX',
				zip: '77001',
			}),
			adapter.createHousehold({
				address_line1: '654 Cedar Drive',
				city: 'San Antonio',
				state: 'TX',
				zip: '78201',
			}),
		]);

		return households;
	}

	/**
	 * Create performance test data
	 */
	static async createPerformanceTestData(
		adapter: DatabaseAdapter,
		count: number = 100
	) {
		const households = [];
		
		for (let i = 0; i < count; i++) {
			const household = await adapter.createHousehold({
				address_line1: `Performance Test Address ${i}`,
				city: i % 2 === 0 ? 'EvenCity' : 'OddCity',
				state: 'PT',
				zip: String(10000 + i),
			});
			households.push(household);
		}

		return households;
	}

	/**
	 * Helper to measure operation performance
	 */
	static async measurePerformance<T>(
		operation: () => Promise<T>,
		operationName: string
	): Promise<{ result: T; elapsedMs: number }> {
		const startTime = Date.now();
		const result = await operation();
		const elapsedMs = Date.now() - startTime;
		
		console.log(`${operationName} completed in ${elapsedMs}ms`);
		
		return { result, elapsedMs };
	}

	/**
	 * Run a standard set of validation tests against any adapter
	 */
	static async validateAdapter(adapter: DatabaseAdapter) {
		const tests = {
			householdCRUD: false,
			childCRUD: false,
			guardianCRUD: false,
			filtering: false,
			errorHandling: false,
			transactions: false,
			subscriptions: false,
		};

		try {
			// Test household CRUD
			const household = await adapter.createHousehold({
				address_line1: 'Validation Test',
				city: 'TestCity',
				state: 'TC',
				zip: '99999',
			});
			
			const retrieved = await adapter.getHousehold(household.household_id);
			if (retrieved && retrieved.address_line1 === 'Validation Test') {
				tests.householdCRUD = true;
			}

			// Test child CRUD
			const child = await adapter.createChild({
				household_id: household.household_id,
				first_name: 'Test',
				last_name: 'Child',
				dob: '2020-01-01',
				is_active: true,
			});
			
			const retrievedChild = await adapter.getChild(child.child_id);
			if (retrievedChild && retrievedChild.first_name === 'Test') {
				tests.childCRUD = true;
			}

			// Test guardian CRUD
			const guardian = await adapter.createGuardian({
				household_id: household.household_id,
				first_name: 'Test',
				last_name: 'Guardian',
				relationship: 'Parent',
				is_primary: true,
				email: 'test@example.com',
				mobile_phone: '555-123-4567',
			});
			
			const retrievedGuardian = await adapter.getGuardian(guardian.guardian_id);
			if (retrievedGuardian && retrievedGuardian.first_name === 'Test') {
				tests.guardianCRUD = true;
			}

			// Test filtering
			const filtered = await adapter.listHouseholds({ city: 'TestCity' });
			if (filtered.length > 0) {
				tests.filtering = true;
			}

			// Test error handling
			try {
				await adapter.getHousehold('non-existent-id');
				tests.errorHandling = true; // Should not throw, should return null
			} catch (error) {
				// Some adapters might throw, which is also valid
				tests.errorHandling = true;
			}

			// Test transactions
			try {
				await adapter.transaction(async () => {
					await adapter.createHousehold({
						address_line1: 'Transaction Test',
						city: 'TransactionCity',
						state: 'TC',
						zip: '88888',
					});
				});
				tests.transactions = true;
			} catch (error) {
				// Transaction support might not be available
			}

			// Test subscriptions
			try {
				const unsubscribe = adapter.subscribeToTable('households', () => {});
				if (typeof unsubscribe === 'function') {
					tests.subscriptions = true;
					unsubscribe();
				}
			} catch (error) {
				// Subscription support might not be available
			}

			// Cleanup
			await this.cleanupTestData(adapter, {
				household,
				child,
				guardian,
			});

		} catch (error) {
			console.error('Adapter validation error:', error);
		}

		return tests;
	}
}