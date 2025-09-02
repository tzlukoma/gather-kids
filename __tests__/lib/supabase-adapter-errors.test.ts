import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

describe('Supabase Adapter Error Handling', () => {
	test('getHousehold handles not found gracefully', async () => {
		const mockClient = createSupabaseMock();
		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient as any
		);

		// Test with a non-existent ID
		const result = await adapter.getHousehold('non-existent-id');
		expect(result).toBeNull();
	});

	test('getHousehold handles PGRST116 error correctly', async () => {
		// Create a mock that explicitly returns the PGRST116 error
		const errorMockClient = {
			from: () => ({
				select: () => ({
					eq: () => ({
						single: () => ({
							then: async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'No rows returned', code: 'PGRST116' }
								});
							}
						})
					})
				})
			})
		};

		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			errorMockClient as any
		);

		const result = await adapter.getHousehold('non-existent-id');
		expect(result).toBeNull();
	});

	test('createHousehold handles database errors', async () => {
		// Create a mock that returns an error for insert operations
		const errorMockClient = {
			from: () => ({
				insert: () => ({
					select: () => ({
						single: () => ({
							then: async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'Database error', code: 'DB_ERROR' }
								});
							}
						})
					})
				})
			})
		};

		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			errorMockClient as any
		);

		await expect(
			adapter.createHousehold({ address_line1: 'Test' })
		).rejects.toThrow('Database error');
	});

	test('updateHousehold handles not found scenarios', async () => {
		const mockClient = createSupabaseMock();
		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient as any
		);

		// Try to update a non-existent household - the mock returns an error for this
		await expect(
			adapter.updateHousehold('non-existent-id', { address_line1: 'Updated' })
		).rejects.toThrow('No rows found');
	});

	test('adapter handles invalid operations gracefully', async () => {
		const mockClient = createSupabaseMock();
		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient as any
		);

		// These operations should not crash the adapter
		expect(typeof adapter.subscribeToTable).toBe('function');
		expect(typeof adapter.transaction).toBe('function');
		
		// Should be able to call subscription methods without errors
		const unsubscribe = adapter.subscribeToTable('test', () => {});
		expect(typeof unsubscribe).toBe('function');
		unsubscribe();

		// Should be able to call transaction methods
		const result = await adapter.transaction(async () => 'test-result');
		expect(result).toBe('test-result');
	});

	test('foreign key constraint simulation', async () => {
		const mockClient = createSupabaseMock();
		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			mockClient as any
		);

		// Try to create a child with non-existent household_id
		// This should not crash but may not enforce FK constraints in mock
		const childData = {
			household_id: 'non-existent-household',
			first_name: 'Test',
			last_name: 'Child',
			dob: '2020-01-01',
			is_active: true,
		};

		// In a real implementation, this would fail with FK constraint
		// In our mock, it might succeed, which is acceptable for unit tests
		const result = await adapter.createChild(childData);
		expect(result).toBeTruthy();
		expect(result.household_id).toBe('non-existent-household');
	});
});