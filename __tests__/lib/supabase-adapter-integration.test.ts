import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { DatabaseAdapter } from '@/lib/database/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * These tests require a local Supabase instance to be running
 * They will be skipped if the SUPABASE_URL and SUPABASE_ANON_KEY environment variables are not set
 */
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Only run these tests if Supabase config is available
const itIfSupabase = supabaseUrl && supabaseKey ? it : it.skip;

describe('Supabase Adapter Integration Tests', () => {
	let adapter: DatabaseAdapter;
	let testIds: string[] = [];

	beforeAll(() => {
		// Create a real Supabase adapter for integration testing
		adapter = new SupabaseAdapter(supabaseUrl, supabaseKey);
	});

	afterAll(async () => {
		// Clean up any test data
		for (const id of testIds) {
			try {
				await adapter.deleteHousehold(id);
			} catch (e) {
				// Ignore cleanup errors
			}
		}
	});

	// Integration test with real Supabase
	itIfSupabase(
		'performs full household CRUD operations against real Supabase',
		async () => {
			// Create a unique household
			const householdData = {
				address_line1: `Integration Test ${Date.now()}`,
				city: 'Supabaseville',
				state: 'SB',
				zip: '00000',
			};

			// Test create
			const created = await adapter.createHousehold(householdData);
			expect(created).toBeTruthy();
			expect(created.household_id).toBeTruthy();
			testIds.push(created.household_id);

			// Test get
			const fetched = await adapter.getHousehold(created.household_id);
			expect(fetched).toBeTruthy();
			expect(fetched!.address_line1).toBe(householdData.address_line1);

			// Test update
			const updateData = {
				address_line1: `Updated ${Date.now()}`,
			};
			const updated = await adapter.updateHousehold(
				created.household_id,
				updateData
			);
			expect(updated.address_line1).toBe(updateData.address_line1);

			// Test list with filter
			const listed = await adapter.listHouseholds({ city: 'Supabaseville' });
			expect(listed.some((h) => h.household_id === created.household_id)).toBe(
				true
			);

			// Test delete
			await adapter.deleteHousehold(created.household_id);
			const afterDelete = await adapter.getHousehold(created.household_id);
			expect(afterDelete).toBeNull();

			// Remove from cleanup list since we already deleted it
			testIds = testIds.filter((id) => id !== created.household_id);
		}
	);

	itIfSupabase(
		'performs full child operations with foreign key relationships',
		async () => {
			// Create a household first
			const household = await adapter.createHousehold({
				address_line1: `Child Integration Test ${Date.now()}`,
				city: 'ChildTestCity',
				state: 'CT',
				zip: '11111',
			});
			testIds.push(household.household_id);

			// Create a child in the household
			const childData = {
				household_id: household.household_id,
				first_name: 'Integration',
				last_name: 'TestChild',
				dob: '2018-01-01',
				is_active: true,
			};

			const created = await adapter.createChild(childData);
			expect(created).toBeTruthy();
			expect(created.household_id).toBe(household.household_id);

			// Test child retrieval
			const fetched = await adapter.getChild(created.child_id);
			expect(fetched).toBeTruthy();
			expect(fetched!.first_name).toBe(childData.first_name);

			// Test child update
			const updateData = {
				allergies: 'Integration Test Allergies',
				medical_notes: 'Integration Test Notes',
			};
			const updated = await adapter.updateChild(created.child_id, updateData);
			expect(updated.allergies).toBe(updateData.allergies);
			expect(updated.medical_notes).toBe(updateData.medical_notes);

			// Test list children with household filter
			const children = await adapter.listChildren({
				householdId: household.household_id,
			});
			expect(children.some((c) => c.child_id === created.child_id)).toBe(true);

			// Clean up child
			await adapter.deleteChild(created.child_id);
		}
	);

	itIfSupabase(
		'performs guardian operations with proper relationships',
		async () => {
			// Create a household first
			const household = await adapter.createHousehold({
				address_line1: `Guardian Integration Test ${Date.now()}`,
				city: 'GuardianTestCity',
				state: 'GT',
				zip: '22222',
			});
			testIds.push(household.household_id);

			// Create a guardian
			const guardianData = {
				household_id: household.household_id,
				first_name: 'Integration',
				last_name: 'Guardian',
				relationship: 'Parent',
				is_primary: true,
				email: `integration.guardian.${Date.now()}@example.com`,
				mobile_phone: '555-123-4567',
			};

			const created = await adapter.createGuardian(guardianData);
			expect(created).toBeTruthy();
			expect(created.household_id).toBe(household.household_id);
			expect(created.email).toBe(guardianData.email);

			// Test guardian retrieval
			const fetched = await adapter.getGuardian(created.guardian_id);
			expect(fetched).toBeTruthy();
			expect(fetched!.first_name).toBe(guardianData.first_name);

			// Test list guardians for household
			const guardians = await adapter.listGuardians(household.household_id);
			expect(guardians.some((g) => g.guardian_id === created.guardian_id)).toBe(
				true
			);

			// Clean up guardian
			await adapter.deleteGuardian(created.guardian_id);
		}
	);

	itIfSupabase('tests real Supabase error handling', async () => {
		// Test foreign key constraint by trying to create a child with non-existent household
		const invalidChildData = {
			household_id: uuidv4(), // Non-existent household
			first_name: 'Invalid',
			last_name: 'Child',
			dob: '2020-01-01',
			is_active: true,
		};

		await expect(adapter.createChild(invalidChildData)).rejects.toThrow();
	});

	itIfSupabase('tests real Supabase filtering and search', async () => {
		// Create test data with known patterns
		const timestamp = Date.now();
		const testHouseholds = await Promise.all([
			adapter.createHousehold({
				address_line1: `${timestamp} Oak Street`,
				city: 'FilterTestCity',
				state: 'FT',
				zip: '33333',
			}),
			adapter.createHousehold({
				address_line1: `${timestamp} Pine Avenue`,
				city: 'FilterTestCity',
				state: 'FT',
				zip: '33334',
			}),
			adapter.createHousehold({
				address_line1: `${timestamp} Elm Boulevard`,
				city: 'OtherCity',
				state: 'FT',
				zip: '33335',
			}),
		]);

		// Add to cleanup list
		testIds.push(...testHouseholds.map((h) => h.household_id));

		// Test city filter
		const cityFiltered = await adapter.listHouseholds({
			city: 'FilterTestCity',
		});
		const ourCityHouseholds = cityFiltered.filter((h) =>
			h.address_line1.includes(String(timestamp))
		);
		expect(ourCityHouseholds.length).toBe(2);

		// Test state filter
		const stateFiltered = await adapter.listHouseholds({ state: 'FT' });
		const ourStateHouseholds = stateFiltered.filter((h) =>
			h.address_line1.includes(String(timestamp))
		);
		expect(ourStateHouseholds.length).toBe(3);

		// Test search filter (if supported)
		const searchFiltered = await adapter.listHouseholds({
			search: 'Oak',
		});
		const ourSearchHouseholds = searchFiltered.filter((h) =>
			h.address_line1.includes(String(timestamp))
		);
		expect(ourSearchHouseholds.length).toBeGreaterThanOrEqual(1);
	});

	itIfSupabase('tests real Supabase performance under load', async () => {
		// Create a moderate number of records to test real performance
		const recordCount = 50;
		const timestamp = Date.now();

		const startTime = Date.now();

		// Create records in parallel
		const createPromises = Array(recordCount)
			.fill(0)
			.map((_, i) =>
				adapter.createHousehold({
					address_line1: `Performance Test ${timestamp} - ${i}`,
					city: 'PerformanceCity',
					state: 'PC',
					zip: String(40000 + i),
				})
			);

		const created = await Promise.all(createPromises);
		const createTime = Date.now() - startTime;

		// Add to cleanup
		testIds.push(...created.map((h) => h.household_id));

		// Test query performance
		const queryStart = Date.now();
		const queried = await adapter.listHouseholds({ city: 'PerformanceCity' });
		const queryTime = Date.now() - queryStart;

		// Verify results
		const ourRecords = queried.filter((h) =>
			h.address_line1.includes(String(timestamp))
		);
		expect(ourRecords.length).toBe(recordCount);

		console.log(
			`Real Supabase Performance: Created ${recordCount} records in ${createTime}ms, queried in ${queryTime}ms`
		);

		// Performance assertions (these may need adjustment based on real Supabase performance)
		expect(createTime).toBeLessThan(5000); // 5 seconds for 50 creates
		expect(queryTime).toBeLessThan(1000); // 1 second for query
	});
});