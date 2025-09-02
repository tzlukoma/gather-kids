import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

describe('Supabase Adapter Error Handling', () => {
	test('getHousehold handles database errors', async () => {
		// Create a mock that returns errors
		const errorMockClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() => ({
							then: jest.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'Mock DB error', code: 'MOCK_ERROR' },
								});
							}),
						})),
					})),
				})),
			})),
		};

		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			errorMockClient as any
		);

		await expect(adapter.getHousehold('any-id')).rejects.toThrow(
			'Mock DB error'
		);
	});

	test('createHousehold handles database errors', async () => {
		const errorMockClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				insert: jest.fn(() => ({
					select: jest.fn(() => ({
						single: jest.fn(() => ({
							then: jest.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'Mock insert error', code: 'MOCK_ERROR' },
								});
							}),
						})),
					})),
				})),
			})),
		};

		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			errorMockClient as any
		);

		await expect(
			adapter.createHousehold({ address_line1: 'Test' })
		).rejects.toThrow('Mock insert error');
	});

	test('updateHousehold handles database errors', async () => {
		const errorMockClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				update: jest.fn(() => ({
					eq: jest.fn(() => ({
						select: jest.fn(() => ({
							single: jest.fn(() => ({
								then: jest.fn(async (callback: any) => {
									return callback({
										data: null,
										error: { message: 'Mock update error', code: 'MOCK_ERROR' },
									});
								}),
							})),
						})),
					})),
				})),
			})),
		};

		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			errorMockClient as any
		);

		await expect(
			adapter.updateHousehold('any-id', { address_line1: 'Test' })
		).rejects.toThrow('Mock update error');
	});

	test('deleteHousehold handles database errors', async () => {
		const errorMockClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				delete: jest.fn(() => ({
					eq: jest.fn(() => ({
						then: jest.fn(async (callback: any) => {
							return callback({
								data: null,
								error: { message: 'Mock delete error', code: 'MOCK_ERROR' },
							});
						}),
					})),
				})),
			})),
		};

		const adapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			errorMockClient as any
		);

		await expect(adapter.deleteHousehold('any-id')).rejects.toThrow(
			'Mock delete error'
		);
	});

	test('getHousehold handles PGRST116 error (not found) gracefully', async () => {
		// Create a mock that returns the specific "not found" error
		const notFoundClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() => ({
							then: jest.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { message: 'No rows returned', code: 'PGRST116' },
								});
							}),
						})),
					})),
				})),
			})),
		};

		const notFoundAdapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			notFoundClient as any
		);

		const result = await notFoundAdapter.getHousehold('non-existent-id');
		expect(result).toBeNull();
	});

	test('createChild handles foreign key constraint errors', async () => {
		const constraintErrorClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				insert: jest.fn(() => ({
					select: jest.fn(() => ({
						single: jest.fn(() => ({
							then: jest.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { 
										message: 'Foreign key constraint violation', 
										code: '23503' 
									},
								});
							}),
						})),
					})),
				})),
			})),
		};

		const constraintAdapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			constraintErrorClient as any
		);

		await expect(
			constraintAdapter.createChild({
				household_id: 'non-existent-household',
				first_name: 'Test',
				last_name: 'Child',
				dob: '2020-01-01',
				is_active: true,
			})
		).rejects.toThrow('Foreign key constraint violation');
	});

	test('handles network timeouts gracefully', async () => {
		const timeoutClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() => ({
							then: jest.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { 
										message: 'Network timeout', 
										code: 'NETWORK_ERROR' 
									},
								});
							}),
						})),
					})),
				})),
			})),
		};

		const timeoutAdapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			timeoutClient as any
		);

		await expect(timeoutAdapter.getHousehold('any-id')).rejects.toThrow(
			'Network timeout'
		);
	});

	test('handles authentication errors', async () => {
		const authErrorClient = {
			...createSupabaseMock(),
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() => ({
							then: jest.fn(async (callback: any) => {
								return callback({
									data: null,
									error: { 
										message: 'JWT expired', 
										code: '401' 
									},
								});
							}),
						})),
					})),
				})),
			})),
		};

		const authAdapter = new SupabaseAdapter(
			'https://mock-url.supabase.co',
			'mock-key',
			authErrorClient as any
		);

		await expect(authAdapter.getHousehold('any-id')).rejects.toThrow(
			'JWT expired'
		);
	});
});