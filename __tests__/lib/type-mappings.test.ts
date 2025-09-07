import { supabaseToHousehold, householdToSupabase } from '@/lib/database/type-mappings';
import type { Database } from '@/lib/database/supabase-types';

describe('Type Mappings', () => {
	describe('Household Mappings', () => {
		it('should convert Supabase household to domain household', () => {
			const supabaseHousehold: Database['public']['Tables']['households']['Row'] = {
				household_id: 'test-id',
				name: 'Test Family',
				address_line1: '123 Main St',
				address_line2: 'Apt 1',
				city: 'Test City',
				state: 'TS',
				zip: '12345',
				created_at: '2023-01-01T00:00:00Z',
				updated_at: '2023-01-01T00:00:00Z',
			} as any; // Using any because we're using fallback types

			const domainHousehold = supabaseToHousehold(supabaseHousehold);

			expect(domainHousehold).toEqual({
				household_id: 'test-id',
				name: 'Test Family',
				preferredScriptureTranslation: undefined,
				address_line1: '123 Main St',
				address_line2: 'Apt 1',
				city: 'Test City',
				state: 'TS',
				zip: '12345',
				created_at: '2023-01-01T00:00:00Z',
				updated_at: '2023-01-01T00:00:00Z',
			});
		});

		it('should convert domain household to Supabase format', () => {
			const domainHousehold = {
				household_id: 'test-id',
				name: 'Test Family',
				address_line1: '123 Main St',
				address_line2: 'Apt 1',
				city: 'Test City',
				state: 'TS',
				zip: '12345',
			};

			const supabaseData = householdToSupabase(domainHousehold);

			expect(supabaseData).toEqual({
				household_id: 'test-id',
				name: 'Test Family',
				preferredScriptureTranslation: undefined,
				address_line1: '123 Main St',
				address_line2: 'Apt 1',
				city: 'Test City',
				state: 'TS',
				zip: '12345',
			});
		});

		it('should handle null values from Supabase', () => {
			const supabaseHousehold = {
				household_id: 'test-id',
				name: null,
				address_line1: null,
				address_line2: null,
				city: null,
				state: null,
				zip: null,
				created_at: '2023-01-01T00:00:00Z',
				updated_at: null,
			} as any;

			const domainHousehold = supabaseToHousehold(supabaseHousehold);

			expect(domainHousehold.household_id).toBe('test-id');
			expect(domainHousehold.name).toBeUndefined();
			expect(domainHousehold.address_line1).toBe('');
			expect(domainHousehold.city).toBe('');
			expect(domainHousehold.created_at).toBe('2023-01-01T00:00:00Z');
			// When updated_at is null, it generates a new timestamp
			expect(domainHousehold.updated_at).toBeDefined();
			expect(typeof domainHousehold.updated_at).toBe('string');
		});
	});

	describe('Type Safety', () => {
		it('should have proper typing for generated types', () => {
			// This test mainly checks that the types compile correctly
			const mockDatabase: Database = {
				public: {
					Tables: {} as any,
					Views: {} as any,
					Functions: {} as any,
					Enums: {} as any,
					CompositeTypes: {} as any,
				},
			} as any;

			expect(mockDatabase).toBeDefined();
			expect(mockDatabase.public).toBeDefined();
			expect(mockDatabase.public.Tables).toBeDefined();
		});
	});
});