// Mock functions - using Jest in this environment

/**
 * Creates a mock Supabase client for testing
 */
export function createSupabaseMock(): any {
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

			// Create a query builder that supports chaining
			const createQueryBuilder = (filters: Array<{type: string, column?: string, value?: any, condition?: string}> = []) => {
				const queryBuilder = {
					eq: (column: string, value: any) => {
						return createQueryBuilder([...filters, {type: 'eq', column, value}]);
					},
					or: (condition: string) => {
						return createQueryBuilder([...filters, {type: 'or', condition}]);
					},
					limit: (count: number) => {
						return createQueryBuilder([...filters, {type: 'limit', value: count}]);
					},
					range: (from: number, to: number) => {
						return createQueryBuilder([...filters, {type: 'range', value: {from, to}}]);
					},
					single: () => {
						return new Promise((resolve) => {
							let items = Array.from(table.values());
							
							// Apply filters
							for (const filter of filters) {
								if (filter.type === 'eq' && filter.column) {
									items = items.filter(item => item[filter.column!] === filter.value);
								} else if (filter.type === 'or' && filter.condition) {
									// Simple OR condition parsing for testing
									const conditions = filter.condition.split(',');
									items = items.filter(item => {
										return conditions.some(condition => {
											const match = condition.match(/(\w+)\.ilike\.%(.+)%/);
											if (match) {
												const [, field, searchTerm] = match;
												return item[field]?.toLowerCase?.().includes(searchTerm.toLowerCase());
											}
											return false;
										});
									});
								}
							}
							
							const data = items[0] || null;
							
							if (!data) {
								resolve({
									data: null,
									error: { message: 'No rows returned', code: 'PGRST116' }
								});
							} else {
								resolve({ data, error: null });
							}
						});
					},
					then: (callback?: any) => {
						return new Promise((resolve) => {
							let items = Array.from(table.values());
							
							// Apply filters
							for (const filter of filters) {
								if (filter.type === 'eq' && filter.column) {
									items = items.filter(item => item[filter.column!] === filter.value);
								} else if (filter.type === 'or' && filter.condition) {
									// Simple OR condition parsing for testing
									const conditions = filter.condition.split(',');
									items = items.filter(item => {
										return conditions.some(condition => {
											const match = condition.match(/(\w+)\.ilike\.%(.+)%/);
											if (match) {
												const [, field, searchTerm] = match;
												return item[field]?.toLowerCase?.().includes(searchTerm.toLowerCase());
											}
											return false;
										});
									});
								} else if (filter.type === 'limit') {
									items = items.slice(0, filter.value);
								} else if (filter.type === 'range') {
									const {from, to} = filter.value;
									items = items.slice(from, to + 1);
								}
							}
							
							const result = { data: items, error: null };
							if (callback) {
								resolve(callback(result));
							} else {
								resolve(result);
							}
						});
					}
				};
				
				return queryBuilder;
			};

			let insertData: any = null;
			
			// Create a query builder
			return {
				select: (columns = '*') => createQueryBuilder(),
				insert: (data: any) => {
					insertData = data;
					return {
						select: () => ({
							single: () => {
								return new Promise((resolve) => {
									const item = Array.isArray(insertData) ? insertData[0] : insertData;
									
									// Simulate database constraint errors for testing
									if (item.address_line1 === 'Test') {
										resolve({
											data: null,
											error: { message: 'Database error', code: 'DATABASE_ERROR' }
										});
										return;
									}
									
									// Find the primary key column for this table
									let idColumn = 'id'; // default fallback
									if (tableName === 'households') idColumn = 'household_id';
									else if (tableName === 'children') idColumn = 'child_id';
									else if (tableName === 'guardians') idColumn = 'guardian_id';
									else if (tableName === 'emergency_contacts') idColumn = 'contact_id';
									else if (tableName === 'registration_cycles') idColumn = 'cycle_id';
									else if (tableName === 'registrations') idColumn = 'registration_id';
									else if (tableName === 'ministries') idColumn = 'ministry_id';
									else if (tableName === 'ministry_enrollments') idColumn = 'enrollment_id';
									else if (tableName === 'events') idColumn = 'event_id';
									else if (tableName === 'attendance') idColumn = 'attendance_id';
									else if (tableName === 'incidents') idColumn = 'incident_id';
									else if (tableName === 'users') idColumn = 'user_id';
									else if (tableName === 'leader_profiles') idColumn = 'profile_id';
									else if (tableName === 'ministry_leader_memberships') idColumn = 'membership_id';
									else if (tableName === 'ministry_accounts') idColumn = 'account_id';
									else if (tableName === 'branding_settings') idColumn = 'setting_id';
									else if (tableName === 'biblebee_years') idColumn = 'year_id';
									else if (tableName === 'divisions') idColumn = 'division_id';
									else if (tableName === 'essay_prompts') idColumn = 'prompt_id';
									else if (tableName === 'enrollments') idColumn = 'enrollment_id';
									else if (tableName === 'enrollment_overrides') idColumn = 'override_id';
									
									const timestamp = new Date().toISOString();
									const finalItem = {
										...item,
										created_at: item.created_at || timestamp,
										updated_at: item.updated_at || timestamp,
									};
									
									// Ensure the finalItem has an ID if it doesn't exist
									if (!finalItem[idColumn]) {
										finalItem[idColumn] = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
									}
									
									table.set(finalItem[idColumn], finalItem);
									resolve({ data: finalItem, error: null });
								});
							}
						})
					};
				},
				update: (data: any) => ({
					eq: (column: string, value: any) => ({
						select: () => ({
							single: () => {
								return new Promise((resolve) => {
									const items = Array.from(table.values());
									const item = items.find(item => item[column] === value);
									
									if (!item) {
										resolve({
											data: null,
											error: { message: 'No rows found', code: 'PGRST116' }
										});
										return;
									}
									
									// Find the primary key column for this table
									let idColumn = 'id'; // default fallback  
									if (tableName === 'households') idColumn = 'household_id';
									else if (tableName === 'children') idColumn = 'child_id';
									else if (tableName === 'guardians') idColumn = 'guardian_id';
									else if (tableName === 'emergency_contacts') idColumn = 'contact_id';
									else if (tableName === 'registration_cycles') idColumn = 'cycle_id';
									else if (tableName === 'registrations') idColumn = 'registration_id';
									else if (tableName === 'ministries') idColumn = 'ministry_id';
									else if (tableName === 'ministry_enrollments') idColumn = 'enrollment_id';
									else if (tableName === 'events') idColumn = 'event_id';
									else if (tableName === 'attendance') idColumn = 'attendance_id';
									else if (tableName === 'incidents') idColumn = 'incident_id';
									else if (tableName === 'users') idColumn = 'user_id';
									else if (tableName === 'leader_profiles') idColumn = 'profile_id';
									else if (tableName === 'ministry_leader_memberships') idColumn = 'membership_id';
									else if (tableName === 'ministry_accounts') idColumn = 'account_id';
									else if (tableName === 'branding_settings') idColumn = 'setting_id';
									else if (tableName === 'biblebee_years') idColumn = 'year_id';
									else if (tableName === 'divisions') idColumn = 'division_id';
									else if (tableName === 'essay_prompts') idColumn = 'prompt_id';
									else if (tableName === 'enrollments') idColumn = 'enrollment_id';
									else if (tableName === 'enrollment_overrides') idColumn = 'override_id';
									const updated = {
										...item,
										...data,
										updated_at: new Date().toISOString()
									};
									
									table.set(item[idColumn], updated);
									resolve({ data: updated, error: null });
								});
							}
						})
					})
				}),
				delete: () => ({
					eq: (column: string, value: any) => {
						return new Promise((resolve) => {
							const items = Array.from(table.entries());
							const toDelete = items.filter(([_, item]) => item[column] === value);
							
							for (const [key] of toDelete) {
								table.delete(key);
							}
							
							resolve({ data: null, error: null });
						});
					}
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
			getUser: async () => ({ data: { user: { id: 'test-user-id' } }, error: null }),
		},
	rpc: async () => ({ data: null, error: null }),
		channel: (channelName: string) => ({
			on: () => ({
				subscribe: async () => channelName,
			}),
		}),
		removeChannel: () => true,
	};

	return mockClient as any;
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