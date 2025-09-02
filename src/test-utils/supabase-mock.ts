// Mock functions - using Jest in this environment

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
		'emergency_contacts',
		'registration_cycles',
		'registrations',
		'ministries',
		'ministry_enrollments',
		'events',
		'attendance',
		'incidents',
		'users',
		'leader_profiles',
		'ministry_leader_memberships',
		'ministry_accounts',
		'branding_settings',
		'biblebee_years',
		'divisions',
		'essay_prompts',
		'enrollments',
		'enrollment_overrides',
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

			// Create a query builder
			return {
				select: (columns = '*') => ({
					eq: (column: string, value: any) => ({
						single: () => ({
							then: async (callback: any) => {
								const items = Array.from(table.values());
								const filtered = items.filter(item => item[column] === value);
								const data = filtered[0] || null;
								
								if (!data) {
									return callback({
										data: null,
										error: { message: 'No rows returned', code: 'PGRST116' }
									});
								}
								
								return callback({ data, error: null });
							}
						})
					}),
					then: async (callback: any) => {
						const items = Array.from(table.values());
						return callback({ data: items, error: null });
					}
				}),
				insert: (data: any) => ({
					select: () => ({
						single: () => ({
							then: async (callback: any) => {
								const item = Array.isArray(data) ? data[0] : data;
								const idColumn = Object.keys(item).find(key => key.endsWith('_id')) || 'id';
								
								const timestamp = new Date().toISOString();
								const finalItem = {
									...item,
									created_at: item.created_at || timestamp,
									updated_at: item.updated_at || timestamp,
								};
								
								table.set(item[idColumn], finalItem);
								return callback({ data: finalItem, error: null });
							}
						})
					})
				}),
				update: (data: any) => ({
					eq: (column: string, value: any) => ({
						select: () => ({
							single: () => ({
								then: async (callback: any) => {
									const items = Array.from(table.values());
									const item = items.find(item => item[column] === value);
									
									if (!item) {
										return callback({
											data: null,
											error: { message: 'No rows found', code: 'PGRST116' }
										});
									}
									
									const idColumn = Object.keys(item).find(key => key.endsWith('_id')) || 'id';
									const updated = {
										...item,
										...data,
										updated_at: new Date().toISOString()
									};
									
									table.set(item[idColumn], updated);
									return callback({ data: updated, error: null });
								}
							})
						})
					})
				}),
				delete: () => ({
					eq: (column: string, value: any) => ({
						then: async (callback: any) => {
							const items = Array.from(table.entries());
							const toDelete = items.filter(([_, item]) => item[column] === value);
							
							for (const [key] of toDelete) {
								table.delete(key);
							}
							
							return callback({ data: null, error: null });
						}
					})
				})
			};
		},
		storage: {
			from: (bucketName: string) => ({
				upload: jest.fn().mockResolvedValue({
					data: { path: 'test/path.jpg' },
					error: null,
				}),
				download: jest.fn().mockResolvedValue({ 
					data: new Blob(), 
					error: null 
				}),
				remove: jest.fn().mockResolvedValue({ 
					data: null, 
					error: null 
				}),
				getPublicUrl: jest.fn().mockReturnValue({
					data: { publicUrl: 'https://mock-url.com/test/path.jpg' },
				}),
			}),
		},
		auth: {
			getUser: jest.fn().mockResolvedValue({
				data: { user: { id: 'test-user-id' } },
				error: null,
			}),
		},
		rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
		channel: (channelName: string) => ({
			on: () => ({
				subscribe: jest.fn().mockReturnValue(channelName),
			}),
		}),
		removeChannel: jest.fn().mockReturnValue(true),
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