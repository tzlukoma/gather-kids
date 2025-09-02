# Issue: Create Tests to Validate Supabase Adapter Implementation

## Overview

This issue focuses on developing a comprehensive test suite to validate the Supabase database adapter implementation. Proper testing is crucial to ensure the adapter correctly implements the database interface and behaves consistently across all supported operations. These tests will validate both the adapter's functionality and its compatibility with the existing application code.

## Objectives

1. Create contract tests that validate the adapter implementation against the DatabaseAdapter interface
2. Develop integration tests to verify interaction with Supabase services
3. Implement mock-based tests for offline development and CI pipelines
4. Ensure test coverage for edge cases and error scenarios
5. Create utilities to make adapter testing easier for future development

## Detailed Requirements

### 1. Contract Test Suite Enhancement

Expand the existing contract tests to fully validate the Supabase adapter:

**File: `__tests__/lib/db-adapter-contract.test.ts` (update)**

```typescript
import { createInMemoryDB } from '@/test-utils/dexie-mock';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import { DatabaseAdapter } from '@/lib/database/types';
import { IndexedDBAdapter } from '@/lib/database/indexed-db-adapter';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { v4 as uuidv4 } from 'uuid';

// Parameterized adapter contract test runner. Call runContractTests for
// each adapter you want to validate
function runContractTests(
	adapterName: string,
	getAdapter: () => DatabaseAdapter
) {
	describe(`Adapter Contract Tests - ${adapterName}`, () => {
		// Generate fresh ids per adapter run
		const testHouseholdId = uuidv4();
		const testChildId = uuidv4();
		const testGuardianId = uuidv4();
		const testCycleId = uuidv4();
		const testRegistrationId = uuidv4();
		const testMinistryId = uuidv4();
		const testEnrollmentId = uuidv4();
		const testEventId = uuidv4();
		const testAttendanceId = uuidv4();
		const testIncidentId = uuidv4();

		const now = new Date().toISOString();
		let adapter: DatabaseAdapter;

		beforeEach(() => {
			adapter = getAdapter();
		});

		// Define test data
		const testHousehold = {
			household_id: testHouseholdId,
			address_line1: '123 Main St',
			city: 'Testville',
			state: 'TX',
			zip: '12345',
			created_at: now,
			updated_at: now,
		};

		const testChild = {
			child_id: testChildId,
			household_id: testHouseholdId,
			first_name: 'Test',
			last_name: 'Child',
			dob: '2015-01-01',
			special_needs: false,
			allergies: 'None',
			medical_notes: 'None',
			is_active: true,
			created_at: now,
			updated_at: now,
		};

		const testGuardian = {
			guardian_id: testGuardianId,
			household_id: testHouseholdId,
			first_name: 'Parent',
			last_name: 'Guardian',
			relationship: 'Parent',
			is_primary: true,
			email: 'parent@example.com',
			mobile_phone: '555-123-4567',
			created_at: now,
			updated_at: now,
		};

		// Tests for core entities and operations

		describe('Household Operations', () => {
			test('createHousehold creates a household with correct data', async () => {
				const householdData = {
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				};

				const result = await adapter.createHousehold(householdData);

				// Verify the result
				expect(result).toBeTruthy();
				expect(result.household_id).toBeTruthy(); // Should have an ID
				expect(result.address_line1).toBe(householdData.address_line1);
				expect(result.city).toBe(householdData.city);
				expect(result.state).toBe(householdData.state);
				expect(result.zip).toBe(householdData.zip);
				expect(result.created_at).toBeTruthy(); // Should have timestamps
				expect(result.updated_at).toBeTruthy();
			});

			test('getHousehold retrieves a household by ID', async () => {
				// Create a household first
				const created = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});

				// Now retrieve it
				const result = await adapter.getHousehold(created.household_id);

				// Verify the result
				expect(result).toBeTruthy();
				expect(result!.household_id).toBe(created.household_id);
				expect(result!.address_line1).toBe(created.address_line1);
			});

			test('updateHousehold updates a household', async () => {
				// Create a household first
				const created = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});

				// Update it
				const updatedData = {
					address_line1: '456 New St',
					city: 'Newville',
				};

				const updated = await adapter.updateHousehold(
					created.household_id,
					updatedData
				);

				// Verify the result
				expect(updated.address_line1).toBe(updatedData.address_line1);
				expect(updated.city).toBe(updatedData.city);
				expect(updated.state).toBe(created.state); // Unchanged fields remain the same
				expect(updated.updated_at).not.toBe(created.updated_at); // Updated timestamp
			});

			test('listHouseholds returns all households matching filters', async () => {
				// Create multiple households
				await adapter.createHousehold({
					address_line1: '123 Oak St',
					city: 'Austin',
					state: 'TX',
					zip: '78701',
				});

				await adapter.createHousehold({
					address_line1: '456 Pine St',
					city: 'Austin',
					state: 'TX',
					zip: '78702',
				});

				await adapter.createHousehold({
					address_line1: '789 Elm St',
					city: 'Dallas',
					state: 'TX',
					zip: '75201',
				});

				// Test without filters
				const allHouseholds = await adapter.listHouseholds();
				expect(allHouseholds.length).toBeGreaterThanOrEqual(3);

				// Test with city filter
				const austinHouseholds = await adapter.listHouseholds({
					city: 'Austin',
				});
				expect(austinHouseholds.length).toBeGreaterThanOrEqual(2);
				expect(austinHouseholds.every((h) => h.city === 'Austin')).toBe(true);

				// Test with zip filter
				const zipHouseholds = await adapter.listHouseholds({ zip: '78701' });
				expect(zipHouseholds.length).toBeGreaterThanOrEqual(1);
				expect(zipHouseholds.every((h) => h.zip === '78701')).toBe(true);
			});

			test('deleteHousehold removes a household', async () => {
				// Create a household
				const created = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});

				// Delete it
				await adapter.deleteHousehold(created.household_id);

				// Verify it's gone
				const result = await adapter.getHousehold(created.household_id);
				expect(result).toBeNull();
			});
		});

		describe('Child Operations', () => {
			// Similar test structure as households
			let householdId: string;

			beforeEach(async () => {
				// Create a household for the child tests
				const household = await adapter.createHousehold({
					address_line1: testHousehold.address_line1,
					city: testHousehold.city,
					state: testHousehold.state,
					zip: testHousehold.zip,
				});
				householdId = household.household_id;
			});

			test('createChild creates a child with correct data', async () => {
				const childData = {
					household_id: householdId,
					first_name: testChild.first_name,
					last_name: testChild.last_name,
					dob: testChild.dob,
					is_active: true,
				};

				const result = await adapter.createChild(childData);

				expect(result).toBeTruthy();
				expect(result.child_id).toBeTruthy();
				expect(result.first_name).toBe(childData.first_name);
				expect(result.last_name).toBe(childData.last_name);
				expect(result.household_id).toBe(householdId);
			});

			// Add more child tests (get, update, list, delete)
		});

		// Additional entity tests...
		// Guardian tests
		// Ministry tests
		// Registration tests
		// Attendance tests
		// Etc.

		describe('Transaction Support', () => {
			test('transaction executes all operations or none', async () => {
				try {
					await adapter.transaction(async () => {
						// Create a household
						const household = await adapter.createHousehold({
							address_line1: '123 Transaction St',
							city: 'Transactionville',
							state: 'TX',
							zip: '12345',
						});

						// Create a child in that household
						await adapter.createChild({
							household_id: household.household_id,
							first_name: 'Transaction',
							last_name: 'Child',
							dob: '2020-01-01',
							is_active: true,
						});

						// Throw an error to abort transaction
						throw new Error('Intentional error to abort transaction');
					});
				} catch (e) {
					// Expected error
				}

				// Check if the household was created (it shouldn't be if transactions work)
				const households = await adapter.listHouseholds({
					city: 'Transactionville',
				});
				expect(households.length).toBe(0);
			});
		});

		describe('Error Handling', () => {
			test('handles not found errors gracefully', async () => {
				const nonExistentId = uuidv4();
				const result = await adapter.getHousehold(nonExistentId);
				expect(result).toBeNull();
			});

			test('handles invalid data errors', async () => {
				// @ts-ignore - Intentionally passing invalid data
				await expect(
					adapter.createHousehold({ invalid: 'data' })
				).rejects.toThrow();
			});
		});

		// Add more tests as needed for other entities and operations
	});
}

// Run tests against the IndexedDB adapter
describe('IndexedDB Adapter Tests', () => {
	const getIndexedDBAdapter = () => {
		const mockDexieDb = createInMemoryDB();
		return new IndexedDBAdapter(mockDexieDb);
	};

	runContractTests('IndexedDB', getIndexedDBAdapter);
});

// Run tests against the Supabase adapter
describe('Supabase Adapter Tests', () => {
	const getSupabaseAdapter = () => {
		const mockSupabaseClient = createSupabaseMock();
		return new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockSupabaseClient
		);
	};

	runContractTests('Supabase', getSupabaseAdapter);
});
```

### 2. Supabase Mock Implementation

Create a mock for Supabase client to use in tests:

**File: `src/test-utils/supabase-mock.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

/**
 * Creates a mock Supabase client for testing
 */
export function createSupabaseMock() {
	// In-memory storage for mock data
	const storage = new Map<string, Map<string, any>>();

	// Initialize tables
	[
		'households',
		'children',
		'guardians',
		'ministries',
		'registrations',
	].forEach((table) => {
		storage.set(table, new Map());
	});

	// Mock implementation of Supabase client
	const mockClient = {
		from: (tableName: string) => {
			// Get or create the table
			if (!storage.has(tableName)) {
				storage.set(tableName, new Map());
			}
			const table = storage.get(tableName)!;

			// Query state
			let queryFilters: Array<{
				column: string;
				operator: string;
				value: any;
			}> = [];
			let queryLimit: number | null = null;
			let queryOffset: number | null = null;
			let querySingle: boolean = false;

			// Reset query state for the next query
			const resetQueryState = () => {
				queryFilters = [];
				queryLimit = null;
				queryOffset = null;
				querySingle = false;
			};

			// Helper to filter items based on query conditions
			const filterItems = (items: any[]) => {
				let result = items;

				// Apply all filters
				for (const filter of queryFilters) {
					switch (filter.operator) {
						case 'eq':
							result = result.filter(
								(item) => item[filter.column] === filter.value
							);
							break;
						case 'neq':
							result = result.filter(
								(item) => item[filter.column] !== filter.value
							);
							break;
						case 'gt':
							result = result.filter(
								(item) => item[filter.column] > filter.value
							);
							break;
						case 'lt':
							result = result.filter(
								(item) => item[filter.column] < filter.value
							);
							break;
						case 'gte':
							result = result.filter(
								(item) => item[filter.column] >= filter.value
							);
							break;
						case 'lte':
							result = result.filter(
								(item) => item[filter.column] <= filter.value
							);
							break;
						case 'like':
							const likePattern = new RegExp(filter.value.replace(/%/g, '.*'));
							result = result.filter((item) =>
								likePattern.test(item[filter.column])
							);
							break;
						// Add more operators as needed
					}
				}

				// Apply limit and offset
				if (queryOffset !== null) {
					result = result.slice(queryOffset);
				}
				if (queryLimit !== null) {
					result = result.slice(0, queryLimit);
				}

				return result;
			};

			// Mock query functions
			return {
				select: (columns = '*') => {
					return {
						eq: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'eq', value });
							return this;
						},
						neq: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'neq', value });
							return this;
						},
						gt: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'gt', value });
							return this;
						},
						lt: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'lt', value });
							return this;
						},
						gte: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'gte', value });
							return this;
						},
						lte: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'lte', value });
							return this;
						},
						like: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'like', value });
							return this;
						},
						limit: (value: number) => {
							queryLimit = value;
							return this;
						},
						range: (from: number, to: number) => {
							queryOffset = from;
							queryLimit = to - from + 1;
							return this;
						},
						single: () => {
							querySingle = true;
							return this;
						},
						then: async (callback: any) => {
							const items = Array.from(table.values());
							const filteredItems = filterItems(items);
							const data = querySingle
								? filteredItems[0] || null
								: filteredItems;
							const result = { data, error: null };
							resetQueryState();
							return callback(result);
						},
					};
				},
				insert: (data: any) => {
					return {
						select: () => {
							return {
								single: () => {
									return {
										then: async (callback: any) => {
											// Handle array or single object
											const items = Array.isArray(data) ? data : [data];
											const inserted = [];

											for (const item of items) {
												const idColumn =
													Object.keys(item).find((key) =>
														key.endsWith('_id')
													) || 'id';
												table.set(item[idColumn], item);
												inserted.push(item);
											}

											const result = {
												data: querySingle ? inserted[0] : inserted,
												error: null,
											};
											resetQueryState();
											return callback(result);
										},
									};
								},
							};
						},
					};
				},
				update: (data: any) => {
					return {
						eq: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'eq', value });
							return {
								select: () => {
									return {
										single: () => {
											return {
												then: async (callback: any) => {
													const items = Array.from(table.values());
													const filteredItems = filterItems(items);

													if (filteredItems.length === 0) {
														resetQueryState();
														return callback({
															data: null,
															error: { message: 'No rows found' },
														});
													}

													for (const item of filteredItems) {
														const idColumn =
															Object.keys(item).find((key) =>
																key.endsWith('_id')
															) || 'id';
														const updated = { ...item, ...data };
														table.set(item[idColumn], updated);
													}

													const result = {
														data: querySingle
															? filteredItems[0]
															: filteredItems,
														error: null,
													};
													resetQueryState();
													return callback(result);
												},
											};
										},
									};
								},
							};
						},
					};
				},
				delete: () => {
					return {
						eq: (column: string, value: any) => {
							queryFilters.push({ column, operator: 'eq', value });
							return {
								then: async (callback: any) => {
									const items = Array.from(table.entries());
									const itemsToDelete = items.filter(
										([_, item]) => item[column] === value
									);

									for (const [key] of itemsToDelete) {
										table.delete(key);
									}

									const result = { data: null, error: null };
									resetQueryState();
									return callback(result);
								},
							};
						},
					};
				},
			};
		},
		storage: {
			from: (bucketName: string) => {
				return {
					upload: vi
						.fn()
						.mockResolvedValue({
							data: { path: 'test/path.jpg' },
							error: null,
						}),
					download: vi
						.fn()
						.mockResolvedValue({ data: new Blob(), error: null }),
					remove: vi.fn().mockResolvedValue({ data: null, error: null }),
					getPublicUrl: vi
						.fn()
						.mockReturnValue({
							data: { publicUrl: 'https://mock-url.com/test/path.jpg' },
						}),
				};
			},
		},
		auth: {
			getUser: vi
				.fn()
				.mockResolvedValue({
					data: { user: { id: 'test-user-id' } },
					error: null,
				}),
		},
		rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
		channel: (channelName: string) => {
			return {
				on: () => {
					return {
						subscribe: vi.fn().mockReturnValue(channelName),
					};
				},
			};
		},
		removeChannel: vi.fn().mockReturnValue(true),
	};

	return mockClient;
}

/**
 * Creates a test wrapper for Supabase adapter that uses the mock client
 */
export function createMockedSupabaseAdapter(SupabaseAdapterClass: any) {
	const mockClient = createSupabaseMock();

	return new SupabaseAdapterClass(
		'https://mock-url.supabase.co',
		'mock-key',
		mockClient
	);
}
```

### 3. Integration Test with Local Supabase

Create tests that can run against a local Supabase instance:

**File: `__tests__/lib/supabase-adapter-integration.test.ts`**

```typescript
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
});
```

### 4. Error Handling Tests

Create tests for proper error handling:

**File: `__tests__/lib/supabase-adapter-errors.test.ts`**

```typescript
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { vi } from 'vitest';

describe('Supabase Adapter Error Handling', () => {
	let mockClient: any;
	let adapter: SupabaseAdapter;

	beforeEach(() => {
		// Create a mock client that will throw errors
		mockClient = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						single: vi.fn(() => ({
							then: vi.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'Mock DB error', code: 'MOCK_ERROR' },
								});
							}),
						})),
					})),
				})),
				insert: vi.fn(() => ({
					select: vi.fn(() => ({
						single: vi.fn(() => ({
							then: vi.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'Mock insert error', code: 'MOCK_ERROR' },
								});
							}),
						})),
					})),
				})),
				update: vi.fn(() => ({
					eq: vi.fn(() => ({
						select: vi.fn(() => ({
							single: vi.fn(() => ({
								then: vi.fn(async (callback: any) => {
									return callback({
										data: null,
										error: { message: 'Mock update error', code: 'MOCK_ERROR' },
									});
								}),
							})),
						})),
					})),
				})),
				delete: vi.fn(() => ({
					eq: vi.fn(() => ({
						then: vi.fn(async (callback: any) => {
							return callback({
								data: null,
								error: { message: 'Mock delete error', code: 'MOCK_ERROR' },
							});
						}),
					})),
				})),
			})),
		};

		adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient
		);
	});

	test('getHousehold handles database errors', async () => {
		await expect(adapter.getHousehold('any-id')).rejects.toThrow(
			'Mock DB error'
		);
	});

	test('createHousehold handles database errors', async () => {
		await expect(
			adapter.createHousehold({ address_line1: 'Test' })
		).rejects.toThrow('Mock insert error');
	});

	test('updateHousehold handles database errors', async () => {
		await expect(
			adapter.updateHousehold('any-id', { address_line1: 'Test' })
		).rejects.toThrow('Mock update error');
	});

	test('deleteHousehold handles database errors', async () => {
		await expect(adapter.deleteHousehold('any-id')).rejects.toThrow(
			'Mock delete error'
		);
	});
});
```

### 5. Performance Tests

Create tests to ensure adapter operations perform within acceptable limits:

**File: `__tests__/lib/supabase-adapter-performance.test.ts`**

```typescript
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { createSupabaseMock } from '@/test-utils/supabase-mock';
import { v4 as uuidv4 } from 'uuid';

describe('Supabase Adapter Performance', () => {
	let adapter: SupabaseAdapter;

	beforeEach(() => {
		const mockClient = createSupabaseMock();
		adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient
		);
	});

	test('handles batch operations efficiently', async () => {
		// Create a large number of test households
		const householdsToCreate = 100;
		const startTime = Date.now();

		// Create households in parallel
		const promises = Array(householdsToCreate)
			.fill(0)
			.map((_, i) => {
				return adapter.createHousehold({
					address_line1: `Performance Test ${i}`,
					city: 'Testville',
					state: 'TS',
					zip: '12345',
				});
			});

		const households = await Promise.all(promises);
		const endTime = Date.now();

		// Verify all households were created
		expect(households.length).toBe(householdsToCreate);

		// Check performance
		const elapsedMs = endTime - startTime;
		const msPerOperation = elapsedMs / householdsToCreate;

		console.log(
			`Created ${householdsToCreate} households in ${elapsedMs}ms (${msPerOperation}ms per household)`
		);

		// Loose performance check - this will depend on the mock implementation
		expect(msPerOperation).toBeLessThan(10); // Should be very fast with mocks
	});

	test('filters large datasets efficiently', async () => {
		// Create 1000 households with different cities
		const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];

		for (let i = 0; i < 1000; i++) {
			const cityIndex = i % cities.length;
			await adapter.createHousehold({
				address_line1: `Address ${i}`,
				city: cities[cityIndex],
				state: 'TS',
				zip: '12345',
			});
		}

		// Measure query time
		const startTime = Date.now();
		const results = await adapter.listHouseholds({ city: 'Chicago' });
		const endTime = Date.now();

		// Should have approximately 1/5 of the households
		expect(results.length).toBeCloseTo(200, -1); // Allow some variation

		// Check performance
		const elapsedMs = endTime - startTime;
		console.log(`Filtered 1000 households in ${elapsedMs}ms`);

		// Loose performance check
		expect(elapsedMs).toBeLessThan(100);
	});
});
```

### 6. Test Setup Utilities

Create utilities to make testing easier:

**File: `src/test-utils/test-db.ts`**

```typescript
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
		const mockDexieDb = createInMemoryDB();
		return new IndexedDBAdapter(mockDexieDb);
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

		return {
			household,
			child,
			guardian,
		};
	}

	/**
	 * Clean up test data
	 */
	static async cleanupTestData(
		adapter: DatabaseAdapter,
		ids: { householdId?: string }
	) {
		if (ids.householdId) {
			await adapter.deleteHousehold(ids.householdId);
		}
	}
}
```

### 7. Test Coverage Reports

Update Jest configuration to include coverage reporting:

**File: `jest.config.mjs` (update)**

```javascript
export default {
	// Existing configuration...

	// Enable coverage reporting
	collectCoverage: true,
	collectCoverageFrom: [
		'src/lib/database/**/*.ts',
		'!src/lib/database/supabase-types.ts',
		'!**/*.d.ts',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'clover'],
};
```

### 8. Adapter Interface Compliance Test

Create a test to verify that both adapters implement the full interface:

**File: `__tests__/lib/database-adapter-interface.test.ts`**

```typescript
import { DatabaseAdapter } from '@/lib/database/types';
import { IndexedDBAdapter } from '@/lib/database/indexed-db-adapter';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';

describe('DatabaseAdapter Interface Compliance', () => {
	// Helper to check if a class implements all required methods
	function checkImplementation(adapterName: string, adapter: any) {
		// Define all methods that should be implemented
		const requiredMethods = [
			// Household methods
			'getHousehold',
			'createHousehold',
			'updateHousehold',
			'listHouseholds',
			'deleteHousehold',

			// Child methods
			'getChild',
			'createChild',
			'updateChild',
			'listChildren',
			'deleteChild',

			// Guardian methods
			'getGuardian',
			'createGuardian',
			'updateGuardian',
			'listGuardians',
			'deleteGuardian',

			// Emergency Contact methods
			'getEmergencyContact',
			'createEmergencyContact',
			'updateEmergencyContact',
			'listEmergencyContacts',
			'deleteEmergencyContact',

			// Registration Cycle methods
			'getRegistrationCycle',
			'createRegistrationCycle',
			'updateRegistrationCycle',
			'listRegistrationCycles',
			'deleteRegistrationCycle',

			// Registration methods
			'getRegistration',
			'createRegistration',
			'updateRegistration',
			'listRegistrations',
			'deleteRegistration',

			// Ministry methods
			'getMinistry',
			'createMinistry',
			'updateMinistry',
			'listMinistries',
			'deleteMinistry',

			// Ministry Enrollment methods
			'getMinistryEnrollment',
			'createMinistryEnrollment',
			'updateMinistryEnrollment',
			'listMinistryEnrollments',
			'deleteMinistryEnrollment',

			// Attendance methods
			'getAttendance',
			'createAttendance',
			'updateAttendance',
			'listAttendance',
			'deleteAttendance',

			// Incident methods
			'getIncident',
			'createIncident',
			'updateIncident',
			'listIncidents',
			'deleteIncident',

			// Event methods
			'getEvent',
			'createEvent',
			'updateEvent',
			'listEvents',
			'deleteEvent',

			// Branding methods
			'getBrandingSettings',
			'createBrandingSettings',
			'updateBrandingSettings',

			// Utility methods
			'subscribeToTable',
			'transaction',
		];

		// Check that each method is implemented
		for (const method of requiredMethods) {
			test(`${adapterName} implements ${method}`, () => {
				expect(typeof adapter[method]).toBe('function');
			});
		}
	}

	describe('IndexedDBAdapter', () => {
		// Create an instance of IndexedDBAdapter to check
		const adapter = new IndexedDBAdapter();
		checkImplementation('IndexedDBAdapter', adapter);
	});

	describe('SupabaseAdapter', () => {
		// Create an instance of SupabaseAdapter to check
		const adapter = new SupabaseAdapter('url', 'key');
		checkImplementation('SupabaseAdapter', adapter);
	});
});
```

## Testing Requirements

1. **Automated Testing**: Tests should be automated and runnable in CI pipelines
2. **Mocking**: Use mocks for Supabase services to enable testing without real dependencies
3. **Coverage**: Aim for 80%+ code coverage of the adapter implementations
4. **Integration Tests**: Include tests that can run against a local Supabase instance
5. **Performance**: Include tests that verify adapter performance for large datasets

## Acceptance Criteria

- [ ] Contract tests verify the implementation of all DatabaseAdapter methods
- [ ] Mock-based tests allow testing without real Supabase dependencies
- [ ] Integration tests verify compatibility with actual Supabase services
- [ ] Error handling tests ensure robust error management
- [ ] Performance tests validate efficient operation with large datasets
- [ ] Interface compliance tests confirm both adapters implement the full interface
- [ ] Test utilities make it easy to write new tests
- [ ] Coverage reports show 80%+ test coverage

## Technical Notes

1. **Test Isolation**: Ensure tests don't interfere with each other
2. **Cleanup**: Tests should clean up any test data they create
3. **CI Integration**: Tests should be runnable in CI pipelines
4. **Mock vs Real**: Use mocks for unit tests and real services for integration tests
5. **Performance Considerations**: Tests should not be unnecessarily slow

## Implementation Strategy

1. Set up the contract test infrastructure
2. Implement Supabase mock for unit testing
3. Create interface compliance tests
4. Implement unit tests for each adapter method
5. Add error handling tests
6. Add performance tests
7. Configure coverage reporting
8. Create test utilities for future testing needs

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Supabase JS Client Documentation](https://supabase.io/docs/reference/javascript/start)
- [Database Adapter Implementation](docs/SUPABASE_ADAPTER.md)

## Time Estimate

- Contract test implementation: 4-6 hours
- Mock-based tests: 3-4 hours
- Integration tests: 2-3 hours
- Error handling tests: 1-2 hours
- Performance tests: 1-2 hours
- Test utilities: 2-3 hours
- Coverage configuration: 1 hour
- Documentation: 1 hour

Total: 15-22 hours
