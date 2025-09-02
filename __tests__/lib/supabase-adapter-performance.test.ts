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

	test('handles concurrent read operations', async () => {
		// Create some test data first
		const households = await Promise.all([
			adapter.createHousehold({
				address_line1: '123 Concurrent St',
				city: 'ConcurrentCity',
				state: 'CC',
				zip: '11111',
			}),
			adapter.createHousehold({
				address_line1: '456 Parallel Ave',
				city: 'ParallelCity',
				state: 'PC',
				zip: '22222',
			}),
			adapter.createHousehold({
				address_line1: '789 Async Blvd',
				city: 'AsyncCity',
				state: 'AC',
				zip: '33333',
			}),
		]);

		// Perform concurrent reads
		const startTime = Date.now();
		const concurrentReads = households.map((household) =>
			adapter.getHousehold(household.household_id)
		);

		const results = await Promise.all(concurrentReads);
		const endTime = Date.now();

		// Verify all reads succeeded
		expect(results.length).toBe(3);
		expect(results.every((result) => result !== null)).toBe(true);

		// Check performance
		const elapsedMs = endTime - startTime;
		console.log(`Completed ${results.length} concurrent reads in ${elapsedMs}ms`);

		// Should complete relatively quickly
		expect(elapsedMs).toBeLessThan(50);
	});

	test('handles complex queries with multiple filters', async () => {
		// Create diverse test data
		await Promise.all([
			adapter.createHousehold({
				address_line1: '123 Oak St',
				city: 'Austin',
				state: 'TX',
				zip: '78701',
			}),
			adapter.createHousehold({
				address_line1: '456 Pine St',
				city: 'Austin',
				state: 'TX',
				zip: '78702',
			}),
			adapter.createHousehold({
				address_line1: '789 Elm St',
				city: 'Dallas',
				state: 'TX',
				zip: '75201',
			}),
			adapter.createHousehold({
				address_line1: '321 Main St',
				city: 'Houston',
				state: 'TX',
				zip: '77001',
			}),
		]);

		// Test complex query performance
		const startTime = Date.now();
		const results = await adapter.listHouseholds({
			state: 'TX',
			city: 'Austin',
			search: 'St',
		});
		const endTime = Date.now();

		// Should find matching records
		expect(results.length).toBeGreaterThan(0);

		// Check performance
		const elapsedMs = endTime - startTime;
		console.log(`Complex query completed in ${elapsedMs}ms`);

		// Should complete quickly even with multiple filters
		expect(elapsedMs).toBeLessThan(25);
	});

	test('measures transaction overhead', async () => {
		// Measure transaction performance vs individual operations
		const startTimeTransaction = Date.now();
		
		await adapter.transaction(async () => {
			await adapter.createHousehold({
				address_line1: '123 Transaction St',
				city: 'TransactionCity',
				state: 'TC',
				zip: '99999',
			});
			
			await adapter.createHousehold({
				address_line1: '456 Transaction Ave',
				city: 'TransactionCity',
				state: 'TC',
				zip: '99998',
			});
		});
		
		const endTimeTransaction = Date.now();
		const transactionTime = endTimeTransaction - startTimeTransaction;

		// Measure individual operations
		const startTimeIndividual = Date.now();
		
		await adapter.createHousehold({
			address_line1: '789 Individual St',
			city: 'IndividualCity',
			state: 'IC',
			zip: '88888',
		});
		
		await adapter.createHousehold({
			address_line1: '321 Individual Ave',
			city: 'IndividualCity',
			state: 'IC',
			zip: '88887',
		});
		
		const endTimeIndividual = Date.now();
		const individualTime = endTimeIndividual - startTimeIndividual;

		console.log(`Transaction time: ${transactionTime}ms, Individual time: ${individualTime}ms`);

		// Transaction overhead should be reasonable (< 50% overhead)
		expect(transactionTime).toBeLessThan(individualTime * 1.5);
	});

	test('handles large result sets efficiently', async () => {
		// Create a large dataset
		const dataSize = 500;
		const createPromises = [];
		
		for (let i = 0; i < dataSize; i++) {
			createPromises.push(
				adapter.createHousehold({
					address_line1: `Large Dataset ${i}`,
					city: i % 2 === 0 ? 'EvenCity' : 'OddCity',
					state: 'LD',
					zip: String(10000 + i),
				})
			);
		}
		
		await Promise.all(createPromises);

		// Measure query time for large result set
		const startTime = Date.now();
		const results = await adapter.listHouseholds({ state: 'LD' });
		const endTime = Date.now();

		// Verify we got all the data
		expect(results.length).toBe(dataSize);

		// Check performance
		const elapsedMs = endTime - startTime;
		console.log(`Retrieved ${results.length} records in ${elapsedMs}ms`);

		// Should handle large result sets efficiently
		expect(elapsedMs).toBeLessThan(200);
	});
});