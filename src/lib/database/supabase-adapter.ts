import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { DatabaseAdapter, HouseholdFilters, ChildFilters, RegistrationFilters, AttendanceFilters, IncidentFilters } from './types';
import type { Database } from './supabase-types';
import { supabaseToHousehold, householdToSupabase, supabaseToChild, childToSupabase, supabaseToMinistry, supabaseToMinistryEnrollment, ministryEnrollmentToSupabase, supabaseToEnrollment, enrollmentToSupabase, supabaseToEnrollmentOverride, supabaseToRegistration, registrationToSupabase, supabaseToAttendance, supabaseToIncident, supabaseToEvent, supabaseToUser, supabaseToMinistryLeaderMembership, supabaseToMinistryAccount, supabaseToGuardian, supabaseToEmergencyContact, supabaseToBrandingSettings } from './type-mappings';
import { serializeIfObject } from './type-mappings';
import type {
	Household,
	Guardian,
	EmergencyContact,
	Child,
	RegistrationCycle,
	Registration,
	Ministry,
	MinistryEnrollment,
	Attendance,
	Incident,
	Event,
	User,
	LeaderProfile,
	MinistryLeaderMembership,
	MinistryAccount,
	MinistryGroup,
	MinistryGroupMember,
	BrandingSettings,
	BibleBeeYear,
	Division,
	EssayPrompt,
	Enrollment,
	EnrollmentOverride,
} from '../types';

export class SupabaseAdapter implements DatabaseAdapter {
	// Use strict Database typing for the Supabase client. If the generated
	// `Database` type is incomplete, typecheck will reveal the mismatches to fix.
	private client: SupabaseClient<Database>;


	constructor(supabaseUrl: string, supabaseAnonKey: string, customClient?: SupabaseClient<Database>) {
		console.log('SupabaseAdapter constructor', { 
			url: supabaseUrl,
			hasAnonKey: !!supabaseAnonKey, 
			usingCustomClient: !!customClient
		});
		
		try {
			this.client = customClient || (createClient(supabaseUrl, supabaseAnonKey) as SupabaseClient<Database>);
			console.log('SupabaseAdapter created successfully');
			
			// Test connection
			this.client.auth.getSession().then(response => {
				console.log('SupabaseAdapter initial auth check', { 
					success: !response.error, 
					error: response.error ? response.error.message : null
				});
			}).catch(error => {
				console.error('SupabaseAdapter initial auth check failed', error);
			});
		} catch (error) {
			console.error('Error creating SupabaseAdapter', error);
			throw error;
		}
	}

	// Households
	async getHousehold(id: string): Promise<Household | null> {
		const { data, error } = await this.client
			.from('households')
			.select('*')
			.eq('household_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // No rows returned
			throw error;
		}
	return data ? supabaseToHousehold(data as Database['public']['Tables']['households']['Row']) : null;
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		// Map frontend field names to database column names
		const household = {
			household_id: data.household_id || uuidv4(), // Use provided ID or generate new one
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			// Map name field
			name: data.name,
			// Use snake_case for database compatibility
			preferred_scripture_translation: data.preferredScriptureTranslation,
			// Direct field mappings
			address_line1: data.address_line1,
			address_line2: data.address_line2,
			city: data.city,
			state: data.state,
			zip: data.zip,
			primary_email: data.primary_email,
			primary_phone: data.primary_phone,
			photo_url: data.photo_url,
			avatar_path: data.avatar_path,
		};

		const { data: result, error } = await this.client
			.from('households')
			.insert(household)
			.select()
			.single();

		if (error) throw error;
		return supabaseToHousehold(result as Database['public']['Tables']['households']['Row']);
	}

	async updateHousehold(id: string, data: Partial<Household>): Promise<Household> {
		// Map frontend field names to database column names  
	const updateData: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};
		
		// Map fields with proper database column names
		if (data.name !== undefined) {
			updateData.name = data.name;
			updateData.household_name = data.name;
		}
		if (data.preferredScriptureTranslation !== undefined) {
			updateData.preferredScriptureTranslation = data.preferredScriptureTranslation;
			updateData.preferred_scripture_translation = data.preferredScriptureTranslation;
		}
		if (data.address_line1 !== undefined) updateData.address_line1 = data.address_line1;
		if (data.address_line2 !== undefined) updateData.address_line2 = data.address_line2;
		if (data.city !== undefined) updateData.city = data.city;
		if (data.state !== undefined) updateData.state = data.state;
		if (data.zip !== undefined) updateData.zip = data.zip;
		if (data.primary_email !== undefined) updateData.primary_email = data.primary_email;
		if (data.primary_phone !== undefined) updateData.primary_phone = data.primary_phone;
		if (data.photo_url !== undefined) updateData.photo_url = data.photo_url;
		if (data.avatar_path !== undefined) updateData.avatar_path = data.avatar_path;

		const { data: result, error } = await this.client
			.from('households')
			.update(updateData)
			.eq('household_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateHousehold: no result returned from DB');
	return supabaseToHousehold(result as Database['public']['Tables']['households']['Row']);
	}

	async listHouseholds(filters?: HouseholdFilters): Promise<Household[]> {
		let query = this.client.from('households').select('*');

		if (filters?.city) {
			query = query.eq('city', filters.city);
		}
		if (filters?.state) {
			query = query.eq('state', filters.state);
		}
		if (filters?.zip) {
			query = query.eq('zip', filters.zip);
		}
		if (filters?.search) {
			query = query.or(
				`address_line1.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
			);
		}
		if (filters?.limit) {
			query = query.limit(filters.limit);
		}
		if (filters?.offset) {
			query = query.range(
				filters.offset,
				filters.offset + (filters.limit || 20) - 1
			);
		}

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((r) => supabaseToHousehold(r as Database['public']['Tables']['households']['Row']));
	}

	async deleteHousehold(id: string): Promise<void> {
		const { error } = await this.client
			.from('households')
			.delete()
			.eq('household_id', id);

		if (error) throw error;
	}

	async getHouseholdForUser(authUserId: string): Promise<string | null> {
		console.log('SupabaseAdapter.getHouseholdForUser: Starting query', { authUserId });
		
		try {
			const { data, error } = await this.client
				.from('user_households')
				.select('household_id')
				.eq('auth_user_id', authUserId);

			console.log('SupabaseAdapter.getHouseholdForUser: Query result', { 
				hasError: !!error, 
				errorMessage: error?.message, 
				dataCount: data?.length || 0,
				householdIds: data?.map(d => d.household_id) || []
			});
			
			if (error) {
				console.error('SupabaseAdapter.getHouseholdForUser: Query error', error);
				return null;
			}

			if (!data || data.length === 0) {
				console.log('SupabaseAdapter.getHouseholdForUser: No household found for user');
				return null;
			}

			if (data.length > 1) {
				console.warn('SupabaseAdapter.getHouseholdForUser: Multiple households found for user, using first one', {
					authUserId,
					householdIds: data.map(d => d.household_id)
				});
			}

			return data[0]?.household_id || null;
		} catch (queryError) {
			console.error('SupabaseAdapter.getHouseholdForUser: Query failed', queryError);
			throw queryError;
		}
	}

	// Children
	async getChild(id: string): Promise<Child | null> {
		const { data, error } = await this.client
			.from('children')
			.select('*')
			.eq('child_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToChild(data as Database['public']['Tables']['children']['Row']) : null;
	}

	async createChild(
		data: Omit<Child, 'created_at' | 'updated_at'>
	): Promise<Child> {
		// Map frontend field names to database column names
		const child = {
			child_id: data.child_id || uuidv4(), // Use provided child_id or generate new one
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			// Direct mappings
			household_id: data.household_id,
			first_name: data.first_name,
			last_name: data.last_name,
			is_active: data.is_active,
			photo_url: data.photo_url,
			allergies: data.allergies,
			// Use canonical dob field (birth_date was dropped in migration)
			dob: data.dob,
			// Use canonical child_mobile field (mobile_phone was dropped in migration)
			child_mobile: data.child_mobile,
			// Map grade and other new fields
			grade: data.grade,
			special_needs: data.special_needs,
			special_needs_notes: data.special_needs_notes,
			medical_notes: data.medical_notes,
			// Legacy field mapping
			notes: data.medical_notes || '',
		};

		const { data: result, error } = await this.client
			.from('children')
			.insert(child)
			.select()
			.single();

		if (error) throw error;
		return supabaseToChild(result as Database['public']['Tables']['children']['Row']);
	}

	async updateChild(id: string, data: Partial<Child>): Promise<Child> {
		// Map frontend field names to database column names
	const updateData: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};
		
		// Map fields with proper database column names
		if (data.household_id !== undefined) updateData.household_id = data.household_id;
		if (data.first_name !== undefined) updateData.first_name = data.first_name;
		if (data.last_name !== undefined) updateData.last_name = data.last_name;
		if (data.is_active !== undefined) updateData.is_active = data.is_active;
		if (data.photo_url !== undefined) updateData.photo_url = data.photo_url;
		if (data.allergies !== undefined) updateData.allergies = data.allergies;
		
		// Use canonical dob field (birth_date was dropped in migration)
		if (data.dob !== undefined) {
			updateData.dob = data.dob;
		}
		
		// Use canonical child_mobile field (mobile_phone was dropped in migration)
		if (data.child_mobile !== undefined) {
			updateData.child_mobile = data.child_mobile;
		}
		
		// Map grade and other new fields
		if (data.grade !== undefined) updateData.grade = data.grade;
		if (data.special_needs !== undefined) updateData.special_needs = data.special_needs;
		if (data.special_needs_notes !== undefined) updateData.special_needs_notes = data.special_needs_notes;
		if (data.medical_notes !== undefined) {
			updateData.medical_notes = data.medical_notes;
			updateData.notes = data.medical_notes; // Legacy field mapping
		}

		const { data: result, error } = await this.client
			.from('children')
			.update(updateData)
			.eq('child_id', id)
			.select()
			.single();

	if (error) throw error;
	return supabaseToChild(result as Database['public']['Tables']['children']['Row']);
	}

	async listChildren(filters?: ChildFilters): Promise<Child[]> {
		let query = this.client.from('children').select('*');

		if (filters?.householdId) {
			query = query.eq('household_id', filters.householdId);
		}
		if (filters?.isActive !== undefined) {
			query = query.eq('is_active', filters.isActive);
		}
		if (filters?.search) {
			query = query.or(
				`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
			);
		}
		if (filters?.limit) {
			query = query.limit(filters.limit);
		}
		if (filters?.offset) {
			query = query.range(
				filters.offset,
				filters.offset + (filters.limit || 20) - 1
			);
		}

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((d) => supabaseToChild(d as Database['public']['Tables']['children']['Row']));
	}

	async deleteChild(id: string): Promise<void> {
		const { error } = await this.client
			.from('children')
			.delete()
			.eq('child_id', id);

		if (error) throw error;
	}

	// Guardians
	async getGuardian(id: string): Promise<Guardian | null> {
		const { data, error } = await this.client
			.from('guardians')
			.select('*')
			.eq('guardian_id', id)
			.single();

		if (error) {
				if (error.code === 'PGRST116') return null;
				throw error;
			}
			return data ? supabaseToGuardian(data as Database['public']['Tables']['guardians']['Row']) : null;
	}

	async createGuardian(
		data: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'>
	): Promise<Guardian> {
		const guardian = {
			...data,
			guardian_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('guardians')
			.insert(guardian)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('createGuardian: no result returned from DB');
	return supabaseToGuardian(result as Database['public']['Tables']['guardians']['Row']);
	}

	async updateGuardian(id: string, data: Partial<Guardian>): Promise<Guardian> {
		const { data: result, error } = await this.client
			.from('guardians')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('guardian_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateGuardian: no result returned from DB');
	return supabaseToGuardian(result as Database['public']['Tables']['guardians']['Row']);
	}

	async listGuardians(householdId: string): Promise<Guardian[]> {
		console.log('SupabaseAdapter.listGuardians: Starting query', { householdId });
		let query = this.client.from('guardians').select('*');

		if (householdId && householdId !== '') {
			query = query.eq('household_id', householdId);
		}

		const { data, error } = await query;
		
		console.log('SupabaseAdapter.listGuardians: Query result', { 
			hasError: !!error, 
			errorMessage: error?.message, 
			dataCount: data?.length || 0
		});
		
		if (error) throw error;
		return (data || []).map((d) => supabaseToGuardian(d as Database['public']['Tables']['guardians']['Row']));
	}

	async listAllGuardians(): Promise<Guardian[]> {
		try {
			const { data, error } = await this.client
				.from('guardians')
				.select('*');

			if (error) {
				console.error('SupabaseAdapter.listAllGuardians: Query failed', error);
				throw error;
			}
			return (data || []).map((d) => supabaseToGuardian(d as Database['public']['Tables']['guardians']['Row']));
		} catch (error) {
			console.error('SupabaseAdapter.listAllGuardians: Exception caught', error);
			throw error;
		}
	}

	async deleteGuardian(id: string): Promise<void> {
		const { error } = await this.client
			.from('guardians')
			.delete()
			.eq('guardian_id', id);

		if (error) throw error;
	}

	// Emergency Contacts
	async getEmergencyContact(id: string): Promise<EmergencyContact | null> {
	const { data, error } = await this.client
			.from('emergency_contacts')
			.select('*')
			.eq('contact_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToEmergencyContact(data as Database['public']['Tables']['emergency_contacts']['Row']) : null;
	}

	async createEmergencyContact(
		data: Omit<EmergencyContact, 'contact_id' | 'created_at' | 'updated_at'>
	): Promise<EmergencyContact> {
		const contact = {
			contact_id: uuidv4(),
			household_id: data.household_id, // Now expecting UUID type
			first_name: data.first_name,
			last_name: data.last_name,
			mobile_phone: data.mobile_phone,
			relationship: data.relationship,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('emergency_contacts')
			.insert(contact)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('createEmergencyContact: no result returned from DB');
	return supabaseToEmergencyContact(result as Database['public']['Tables']['emergency_contacts']['Row']);
	}

	async updateEmergencyContact(
		id: string,
		data: Partial<EmergencyContact>
	): Promise<EmergencyContact> {
		const { data: result, error } = await this.client
			.from('emergency_contacts')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('contact_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateEmergencyContact: no result returned from DB');
	return supabaseToEmergencyContact(result as Database['public']['Tables']['emergency_contacts']['Row']);
	}

	async listEmergencyContacts(householdId: string): Promise<EmergencyContact[]> {
	const { data, error } = await this.client
			.from('emergency_contacts')
			.select('*')
			.eq('household_id', householdId);

	if (error) throw error;
	return (data || []).map((d) => supabaseToEmergencyContact(d as Database['public']['Tables']['emergency_contacts']['Row']));
	}

	async listAllEmergencyContacts(): Promise<EmergencyContact[]> {
	const { data, error } = await this.client
			.from('emergency_contacts')
			.select('*');

	if (error) throw error;
	return (data || []).map((d) => supabaseToEmergencyContact(d as Database['public']['Tables']['emergency_contacts']['Row']));
	}

	async deleteEmergencyContact(id: string): Promise<void> {
		const { error } = await this.client
			.from('emergency_contacts')
			.delete()
			.eq('contact_id', id);

		if (error) throw error;
	}

	// Registration Cycles
	async getRegistrationCycle(id: string): Promise<RegistrationCycle | null> {
	// TODO: regenerate supabase-types so 'registration_cycles' is included in the client typing.
	// Localized any-cast: generated types are incomplete for this table name.
	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	const { data, error } = await this.getClientAny()
			.from('registration_cycles')
			.select('*')
			.eq('cycle_id', id)
			.single();

		if (error) {
				if (error.code === 'PGRST116') return null;
				throw error;
			}
	if (!data) return null;
	return this.mapRegistrationCycle(data as Record<string, unknown>);
	}

	async createRegistrationCycle(
		data: Omit<RegistrationCycle, 'cycle_id' | 'created_at' | 'updated_at'>
	): Promise<RegistrationCycle> {
		const cycle = {
			...data,
			cycle_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	const { data: result, error } = await this.getClientAny()
			.from('registration_cycles')
			.insert(cycle)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('createRegistrationCycle: no result returned from DB');
	return this.mapRegistrationCycle(result as Record<string, unknown>);
	}

	async updateRegistrationCycle(
		id: string,
		data: Partial<RegistrationCycle>
	): Promise<RegistrationCycle> {
	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	const { data: result, error } = await this.getClientAny()
		.from('registration_cycles')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('cycle_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateRegistrationCycle: no result returned from DB');
	return this.mapRegistrationCycle(result as Record<string, unknown>);
	}

	async listRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]> {
	// TODO: regenerate supabase-types so 'registration_cycles' is included in the client typing.
	// Localized any-cast: generated types are incomplete for this table name.
	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	let query = this.getClientAny().from('registration_cycles').select('*');

        if (isActive !== undefined) {
            query = query.eq('is_active', isActive);
        }

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((r: unknown) => this.mapRegistrationCycle(r as Record<string, unknown>));
	}

	private mapRegistrationCycle(row: Record<string, unknown>): RegistrationCycle {
		const r = row ?? {} as Record<string, unknown>;
		return {
			cycle_id: (r['cycle_id'] as string) || '',
			name: (r['name'] as string) || '',
			start_date: (r['start_date'] as string) || '',
			end_date: (r['end_date'] as string) || '',
			is_active: r['is_active'] === null || r['is_active'] === undefined ? false : !!r['is_active'],
		};
	}

	async deleteRegistrationCycle(id: string): Promise<void> {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const { error } = await this.getClientAny()
			.from('registration_cycles')
			.delete()
			.eq('cycle_id', id);

		if (error) throw error;
	}

	// Registrations
	async getRegistration(id: string): Promise<Registration | null> {
	const { data, error } = await this.client
			.from('registrations')
			.select('*')
			.eq('registration_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToRegistration(data as Database['public']['Tables']['registrations']['Row']) : null;
	}

	async createRegistration(
		data: Omit<Registration, 'registration_id' | 'created_at' | 'updated_at'>
	): Promise<Registration> {
		const registration = {
			...data,
			registration_id: uuidv4(),
			created_at: new Date().toISOString(),
			// Note: registrations table doesn't have updated_at column
		};

	const insertPayload: Database['public']['Tables']['registrations']['Insert'] = {
		...registration,
		consents: registration.consents ? (serializeIfObject(registration.consents) as Database['public']['Tables']['registrations']['Insert']['consents']) : registration.consents,
	};

	const { data: result, error } = await this.client
			.from('registrations')
			.insert(insertPayload)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('createRegistration: no result returned from DB');
	return supabaseToRegistration(result as Database['public']['Tables']['registrations']['Row']);
	}

	async updateRegistration(
		id: string,
		data: Partial<Registration>
	): Promise<Registration> {
	const updatePayload: Database['public']['Tables']['registrations']['Update'] = {
		...(data as Database['public']['Tables']['registrations']['Update']),
	consents: (((data as unknown) as Record<string, unknown>)['consents'] ? serializeIfObject(((data as unknown) as Record<string, unknown>)['consents']) : ((data as unknown) as Record<string, unknown>)['consents']) as Database['public']['Tables']['registrations']['Update']['consents'],
	};

		const { data: result, error } = await this.client
			.from('registrations')
			.update(updatePayload)
			.eq('registration_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateRegistration: no result returned from DB');
	return supabaseToRegistration(result as Database['public']['Tables']['registrations']['Row']);
	}

	async listRegistrations(filters?: RegistrationFilters): Promise<Registration[]> {
		let query = this.client.from('registrations').select('*');

		if (filters?.childId) {
			query = query.eq('child_id', filters.childId);
		}
		if (filters?.cycleId) {
			query = query.eq('cycle_id', filters.cycleId);
		}
		if (filters?.status) {
			query = query.eq('status', filters.status);
		}
		if (filters?.limit) {
			query = query.limit(filters.limit);
		}
		if (filters?.offset) {
			query = query.range(
				filters.offset,
				filters.offset + (filters.limit || 20) - 1
			);
		}

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((d) => supabaseToRegistration(d as Database['public']['Tables']['registrations']['Row']));
	}

	async deleteRegistration(id: string): Promise<void> {
		const { error } = await this.client
			.from('registrations')
			.delete()
			.eq('registration_id', id);

		if (error) throw error;
	}

	// Ministries
	async getMinistry(id: string): Promise<Ministry | null> {
	const { data, error } = await this.client
			.from('ministries')
			.select('*')
			.eq('ministry_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToMinistry(data as Database['public']['Tables']['ministries']['Row']) : null;
	}

	async createMinistry(
		data: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at'>
	): Promise<Ministry> {
		const ministry = {
			...data,
			ministry_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

	const insertMinistryPayload: Database['public']['Tables']['ministries']['Insert'] = {
		...ministry,
		custom_questions: ministry.custom_questions ? (serializeIfObject(ministry.custom_questions) as Database['public']['Tables']['ministries']['Insert']['custom_questions']) : ministry.custom_questions,
	};

		const { data: result, error } = await this.client
			.from('ministries')
			.insert(insertMinistryPayload)
			.select()
			.single();

		if (error) throw error;
		if (!result) throw new Error('createMinistry: no result returned from DB');
		return supabaseToMinistry(result as Database['public']['Tables']['ministries']['Row']);
	}

	async updateMinistry(id: string, data: Partial<Ministry>): Promise<Ministry> {
	const updateMinistryPayload: Database['public']['Tables']['ministries']['Update'] = {
		...(data as Database['public']['Tables']['ministries']['Update']),
		updated_at: new Date().toISOString(),
	custom_questions: (((data as unknown) as Record<string, unknown>)['custom_questions'] ? serializeIfObject(((data as unknown) as Record<string, unknown>)['custom_questions']) : ((data as unknown) as Record<string, unknown>)['custom_questions']) as Database['public']['Tables']['ministries']['Update']['custom_questions'],
	};

		const { data: result, error } = await this.client
			.from('ministries')
			.update(updateMinistryPayload)
			.eq('ministry_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateMinistry: no result returned from DB');
	return supabaseToMinistry(result as Database['public']['Tables']['ministries']['Row']);
	}

	async listMinistries(isActive?: boolean): Promise<Ministry[]> {
		console.log('🔍 SupabaseAdapter.listMinistries: Starting query', { 
			isActive,
			timestamp: new Date().toISOString(),
			clientUrl: this.client.supabaseUrl
		});
		
		// First get all ministries
		let query = this.client.from('ministries').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		try {
			console.log('🔍 SupabaseAdapter.listMinistries: Executing ministries query...');
			const { data: ministries, error: ministriesError } = await query;
			
			console.log('🔍 SupabaseAdapter.listMinistries: Ministries query result', { 
				hasError: !!ministriesError, 
				errorMessage: ministriesError?.message, 
				dataCount: ministries?.length || 0,
				ministries: ministries?.map(m => ({ 
					ministry_id: m.ministry_id, 
					name: m.name, 
					code: m.code 
				}))
			});
			
			if (ministriesError) throw ministriesError;

			if (!ministries || ministries.length === 0) {
				console.warn('⚠️ SupabaseAdapter.listMinistries: No ministries found in the database');
				return [];
			}

			// Get all ministry accounts
			console.log('🔍 SupabaseAdapter.listMinistries: Executing ministry_accounts query...');
			const { data: accounts, error: accountsError } = await this.client
				.from('ministry_accounts')
				.select('ministry_id, email, display_name');
			
			console.log('🔍 SupabaseAdapter.listMinistries: Ministry accounts query result', {
				hasError: !!accountsError,
				errorMessage: accountsError?.message,
				accountCount: accounts?.length || 0,
				accounts: accounts?.map(a => ({
					ministry_id: a.ministry_id,
					email: a.email,
					display_name: a.display_name
				}))
			});
			
			if (accountsError) {
				console.warn('⚠️ SupabaseAdapter.listMinistries: Error fetching ministry accounts', accountsError);
			}

			// Create a map of ministry_id to email
			const emailMap = new Map<string, string>();
			if (accounts) {
				accounts.forEach(account => {
					console.log('🔍 SupabaseAdapter.listMinistries: Processing account', {
						ministry_id: account.ministry_id,
						email: account.email,
						display_name: account.display_name
					});
					
					if (account.ministry_id && account.email) {
						emailMap.set(account.ministry_id, account.email);
					}
				});
			}

			console.log('🔍 SupabaseAdapter.listMinistries: Email map created', {
				accountCount: accounts?.length || 0,
				emailMapSize: emailMap.size,
				emailMapEntries: Array.from(emailMap.entries()),
				allMinistryIds: ministries.map(m => m.ministry_id),
				allAccountMinistryIds: accounts?.map(a => a.ministry_id) || []
			});

			const result = ministries.map((ministry) => {
				try {
					const email = emailMap.get(ministry.ministry_id);
					
					console.log('🔍 SupabaseAdapter.listMinistries: Processing ministry', {
						ministryId: ministry.ministry_id,
						ministryName: ministry.name,
						ministryCode: ministry.code,
						email: email,
						hasEmailInMap: emailMap.has(ministry.ministry_id)
					});
					
					// Create a modified record with the email field
					const recordWithEmail = {
						...ministry,
						email: email
					};
					
					const mappedMinistry = supabaseToMinistry(recordWithEmail as Database['public']['Tables']['ministries']['Row']);
					
					console.log('🔍 SupabaseAdapter.listMinistries: Mapped ministry result', {
						originalMinistryId: ministry.ministry_id,
						mappedMinistryId: mappedMinistry.ministry_id,
						mappedEmail: mappedMinistry.email,
						mappedName: mappedMinistry.name
					});
					
					return mappedMinistry;
				} catch (mapError) {
					console.error('❌ SupabaseAdapter.listMinistries: Error mapping ministry', { 
						ministry, 
						error: mapError
					});
					throw mapError;
				}
			});

			console.log('✅ SupabaseAdapter.listMinistries: Successfully mapped ministries', {
				resultCount: result.length,
				resultEmails: result.map(r => ({ 
					ministry_id: r.ministry_id, 
					name: r.name, 
					email: r.email 
				}))
			});
			return result;
		} catch (queryError) {
			console.error('SupabaseAdapter.listMinistries: Query failed', queryError);
			throw queryError;
		}
	}

	async deleteMinistry(id: string): Promise<void> {
		const { error } = await this.client
			.from('ministries')
			.delete()
			.eq('ministry_id', id);

		if (error) throw error;
	}

	// Ministry Enrollments
	async getMinistryEnrollment(id: string): Promise<MinistryEnrollment | null> {
	const { data, error } = await this.client
			.from('ministry_enrollments')
			.select('*')
			.eq('enrollment_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToMinistryEnrollment(data as Database['public']['Tables']['ministry_enrollments']['Row']) : null;
	}

	async createMinistryEnrollment(
		data: Omit<MinistryEnrollment, 'enrollment_id' | 'created_at' | 'updated_at'>
	): Promise<MinistryEnrollment> {
		const enrollment = {
			...data,
			enrollment_id: uuidv4(),
			created_at: new Date().toISOString(),
			// Note: ministry_enrollments table doesn't have updated_at column
		};

	const insertEnrollmentPayload: Database['public']['Tables']['ministry_enrollments']['Insert'] = {
		...enrollment,
		custom_fields: enrollment.custom_fields ? (serializeIfObject(enrollment.custom_fields) as Database['public']['Tables']['ministry_enrollments']['Insert']['custom_fields']) : enrollment.custom_fields,
	};

		const { data: result, error } = await this.client
			.from('ministry_enrollments')
			.insert(insertEnrollmentPayload)
			.select()
			.single();

		if (error) throw error;
		if (!result) throw new Error('createMinistryEnrollment: no result returned from DB');
		return supabaseToMinistryEnrollment(result as Database['public']['Tables']['ministry_enrollments']['Row']);
	}

	async updateMinistryEnrollment(
		id: string,
		data: Partial<MinistryEnrollment>
	): Promise<MinistryEnrollment> {
	const updateEnrollmentPayload: Database['public']['Tables']['ministry_enrollments']['Update'] = {
		...(data as Database['public']['Tables']['ministry_enrollments']['Update']),
	custom_fields: (((data as unknown) as Record<string, unknown>)['custom_fields'] ? serializeIfObject(((data as unknown) as Record<string, unknown>)['custom_fields']) : ((data as unknown) as Record<string, unknown>)['custom_fields']) as Database['public']['Tables']['ministry_enrollments']['Update']['custom_fields'],
	};

		const { data: result, error } = await this.client
			.from('ministry_enrollments')
			.update(updateEnrollmentPayload)
			.eq('enrollment_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistryEnrollment(result as Database['public']['Tables']['ministry_enrollments']['Row']);
	}

	async listMinistryEnrollments(
		childId?: string,
		ministryId?: string,
		cycleId?: string
	): Promise<MinistryEnrollment[]> {
		let query = this.client.from('ministry_enrollments').select('*');

		if (childId) {
			query = query.eq('child_id', childId);
		}
		if (ministryId) {
			query = query.eq('ministry_id', ministryId);
		}
		if (cycleId) {
			query = query.eq('cycle_id', cycleId);
		}

		const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((d) => supabaseToMinistryEnrollment(d as Database['public']['Tables']['ministry_enrollments']['Row']));
	}

	async deleteMinistryEnrollment(id: string): Promise<void> {
		const { error } = await this.client
			.from('ministry_enrollments')
			.delete()
			.eq('enrollment_id', id);

		if (error) throw error;
	}

	// Attendance
	async getAttendance(id: string): Promise<Attendance | null> {
	const { data, error } = await this.client
			.from('attendance')
			.select('*')
			.eq('attendance_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToAttendance(data as Database['public']['Tables']['attendance']['Row']) : null;
	}

	async createAttendance(
		data: Omit<Attendance, 'attendance_id'>
	): Promise<Attendance> {
		const attendance = {
			...data,
			attendance_id: uuidv4(),
			// Only add created_at, not updated_at since attendance table doesn't have updated_at
		};

		const { data: result, error } = await this.client
			.from('attendance')
			.insert(attendance)
			.select()
			.single();

		if (error) throw error;
		if (!result) throw new Error('createAttendance: no result returned from DB');
		return supabaseToAttendance(result as Database['public']['Tables']['attendance']['Row']);
	}

	async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
		const { data: result, error } = await this.client
			.from('attendance')
			.update(data) // Remove updated_at since attendance table doesn't have this column
			.eq('attendance_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToAttendance(result as Database['public']['Tables']['attendance']['Row']);
	}

	async listAttendance(filters?: AttendanceFilters): Promise<Attendance[]> {
		let query = this.client.from('attendance').select('*');

		if (filters?.childId) {
			query = query.eq('child_id', filters.childId);
		}
		if (filters?.eventId) {
			query = query.eq('event_id', filters.eventId);
		}
		if (filters?.date) {
			query = query.eq('date', filters.date);
		}
		if (filters?.limit) {
			query = query.limit(filters.limit);
		}
		if (filters?.offset) {
			query = query.range(
				filters.offset,
				filters.offset + (filters.limit || 20) - 1
			);
		}

		const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((d) => supabaseToAttendance(d as Database['public']['Tables']['attendance']['Row']));
	}

	async deleteAttendance(id: string): Promise<void> {
		const { error } = await this.client
			.from('attendance')
			.delete()
			.eq('attendance_id', id);

		if (error) throw error;
	}

	// Incidents
	async getIncident(id: string): Promise<Incident | null> {
	const { data, error } = await this.client
			.from('incidents')
			.select('*')
			.eq('incident_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? supabaseToIncident(data as Database['public']['Tables']['incidents']['Row']) : null;
	}

	async createIncident(
		data: Omit<Incident, 'incident_id' | 'created_at' | 'updated_at'>
	): Promise<Incident> {
		const incident = {
			...data,
			incident_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('incidents')
			.insert(incident)
			.select()
			.single();

		if (error) throw error;
	return supabaseToIncident(result as Database['public']['Tables']['incidents']['Row']);
	}

	async updateIncident(id: string, data: Partial<Incident>): Promise<Incident> {
		const { data: result, error } = await this.client
			.from('incidents')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('incident_id', id)
			.select()
			.single();

		if (error) throw error;
	return supabaseToIncident(result as Database['public']['Tables']['incidents']['Row']);
	}

	async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
		let query = this.client.from('incidents').select('*');

		if (filters?.childId) {
			query = query.eq('child_id', filters.childId);
		}
		if (filters?.resolved !== undefined) {
			if (filters.resolved) {
				query = query.not('admin_acknowledged_at', 'is', null);
			} else {
				query = query.is('admin_acknowledged_at', null);
			}
		}
		if (filters?.limit) {
			query = query.limit(filters.limit);
		}
		if (filters?.offset) {
			query = query.range(
				filters.offset,
				filters.offset + (filters.limit || 20) - 1
			);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d) => supabaseToIncident(d as Database['public']['Tables']['incidents']['Row']));
	}

	async deleteIncident(id: string): Promise<void> {
		const { error } = await this.client
			.from('incidents')
			.delete()
			.eq('incident_id', id);

		if (error) throw error;
	}

	// Events
	async getEvent(id: string): Promise<Event | null> {
		const { data, error } = await this.client
			.from('events')
			.select('*')
			.eq('event_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToEvent(data as Database['public']['Tables']['events']['Row']) : null;
	}

	async createEvent(
		data: Omit<Event, 'event_id' | 'created_at' | 'updated_at'>
	): Promise<Event> {
		const event = {
			...data,
			event_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const insertEventPayload: Database['public']['Tables']['events']['Insert'] = {
			...event,
			timeslots: event.timeslots ? (serializeIfObject(event.timeslots) as Database['public']['Tables']['events']['Insert']['timeslots']) : event.timeslots,
		};

		const { data: result, error } = await this.client
			.from('events')
			.insert(insertEventPayload)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('createEvent: no result returned from DB');
	return supabaseToEvent(result as Database['public']['Tables']['events']['Row']);
	}

	async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
		const updateEventPayload = {
			...(data as Database['public']['Tables']['events']['Update']),
			updated_at: new Date().toISOString(),
			timeslots: ((data as unknown) as Record<string, unknown>)?.['timeslots'] ? (serializeIfObject(((data as unknown) as Record<string, unknown>)['timeslots']) as Database['public']['Tables']['events']['Update']['timeslots']) : ((data as unknown) as Record<string, unknown>)['timeslots'],
	} as Database['public']['Tables']['events']['Update'];

		const { data: result, error } = await this.client
			.from('events')
			.update(updateEventPayload)
			.eq('event_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateEvent: no result returned from DB');
	return supabaseToEvent(result as Database['public']['Tables']['events']['Row']);
	}

	async listEvents(): Promise<Event[]> {
		const { data, error } = await this.client
			.from('events')
			.select('*');

		if (error) throw error;
		return (data || []).map((d) => supabaseToEvent(d as Database['public']['Tables']['events']['Row']));
	}

	async deleteEvent(id: string): Promise<void> {
		const { error } = await this.client
			.from('events')
			.delete()
			.eq('event_id', id);

		if (error) throw error;
	}

	// Users
	async getUser(id: string): Promise<User | null> {
		const { data, error } = await this.client
			.from('users')
			.select('*')
			.eq('user_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToUser(data as Database['public']['Tables']['users']['Row']) : null;
	}

	async createUser(
		data: Omit<User, 'user_id' | 'created_at' | 'updated_at'>
	): Promise<User> {
		const user = {
			...data,
			user_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('users')
			.insert(user)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('createUser: no result returned from DB');
	return supabaseToUser(result as Database['public']['Tables']['users']['Row']);
	}

	async updateUser(id: string, data: Partial<User>): Promise<User> {
		const { data: result, error } = await this.client
			.from('users')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('user_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateUser: no result returned from DB');
	return supabaseToUser(result as Database['public']['Tables']['users']['Row']);
	}

	async listUsers(): Promise<User[]> {
		const { data, error } = await this.client
			.from('users')
			.select('*');

		if (error) throw error;
	return (data || []).map((d) => supabaseToUser(d as Database['public']['Tables']['users']['Row']));
	}

	async deleteUser(id: string): Promise<void> {
		const { error } = await this.client
			.from('users')
			.delete()
			.eq('user_id', id);

		if (error) throw error;
	}

	// Leader Profiles

	private mapLeaderProfile(row: Database['public']['Tables']['leader_profiles']['Row'] | Record<string, unknown>): LeaderProfile {
		const r = (row ?? {}) as Record<string, unknown>;
		return {
			leader_id: (r['leader_id'] as string) || '',
			first_name: (r['first_name'] as string) || '',
			last_name: (r['last_name'] as string) || '',
			email: (r['email'] as string) || undefined,
			phone: (r['phone'] as string) || undefined,
			photo_url: (r['photo_url'] as string) || undefined,
			avatar_path: (r['avatar_path'] as string) || undefined,
			notes: (r['notes'] as string) || undefined,
			background_check_complete: r['background_check_complete'] === null || r['background_check_complete'] === undefined ? false : !!r['background_check_complete'],
			ministryCount: (r['ministryCount'] as number) ?? 0,
			is_active: r['is_active'] === null || r['is_active'] === undefined ? true : !!r['is_active'],
			created_at: (r['created_at'] as string) || new Date().toISOString(),
			updated_at: (r['updated_at'] as string) || new Date().toISOString(),
		};
	}

	private mapBibleBeeYear(row: unknown): BibleBeeYear {
		const r = (row ?? {}) as Record<string, unknown>;
		return {
			id: (r['id'] as string) || '',
			year: (r['year'] as number) ?? undefined,
			name: (r['name'] as string) || undefined,
			label: (r['label'] as string) || undefined,
			cycle_id: (r['cycle_id'] as string) || undefined,
			description: (r['description'] as string) || undefined,
			is_active: r['is_active'] === null || r['is_active'] === undefined ? false : !!r['is_active'],
			registration_open_date: (r['registration_open_date'] as string) || undefined,
			registration_close_date: (r['registration_close_date'] as string) || undefined,
			competition_start_date: (r['competition_start_date'] as string) || undefined,
			competition_end_date: (r['competition_end_date'] as string) || undefined,
			created_at: (r['created_at'] as string) || new Date().toISOString(),
			updated_at: (r['updated_at'] as string) || new Date().toISOString(),
		};
	}

	private mapBibleBeeCycle(row: unknown): BibleBeeCycle {
		const r = (row ?? {}) as Record<string, unknown>;
		return {
			id: (r['id'] as string) || '',
			cycle_id: (r['cycle_id'] as string) || '',
			name: (r['name'] as string) || '',
			description: (r['description'] as string) || undefined,
			is_active: r['is_active'] === null || r['is_active'] === undefined ? false : !!r['is_active'],
			created_at: (r['created_at'] as string) || new Date().toISOString(),
			updated_at: (r['updated_at'] as string) || new Date().toISOString(),
		};
	}


	async getLeaderProfile(id: string): Promise<LeaderProfile | null> {
	const { data, error } = await this.client
			.from('leader_profiles')
			.select('*')
			.eq('leader_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? this.mapLeaderProfile(data) : null;
	}

	async createLeaderProfile(
		data: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'>
	): Promise<LeaderProfile> {
		const leader = {
			...data,
			leader_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('leader_profiles')
			.insert(leader)
			.select()
			.single();

	if (error) throw error;
	return this.mapLeaderProfile(result);
	}

	async updateLeaderProfile(
		id: string,
		data: Partial<LeaderProfile>
	): Promise<LeaderProfile> {
		const { data: result, error } = await this.client
			.from('leader_profiles')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('leader_id', id)
			.select()
			.single();

		if (error) throw error;
		return this.mapLeaderProfile(result);
	}

	async listLeaderProfiles(isActive?: boolean): Promise<LeaderProfile[]> {
	let query = this.client.from('leader_profiles').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d) => this.mapLeaderProfile(d as Database['public']['Tables']['leader_profiles']['Row']));
	}

	async deleteLeaderProfile(id: string): Promise<void> {
		const { error } = await this.client
			.from('leader_profiles')
			.delete()
			.eq('leader_id', id);

		if (error) throw error;
	}

	// Ministry Leader Memberships
	async getMinistryLeaderMembership(
		id: string
	): Promise<MinistryLeaderMembership | null> {
		const { data, error } = await this.client
			.from('leader_assignments')
			.select('*')
			.eq('membership_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToMinistryLeaderMembership(data as Record<string, unknown>) : null;
	}

	async createMinistryLeaderMembership(
		data: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'>
	): Promise<MinistryLeaderMembership> {
		const membership = {
			...data,
			membership_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};


		// serialize any JSON-like fields before insert
		const dbPayload: Record<string, unknown> = { ...membership } as Record<string, unknown>;
		// leader_assignments table expects assignment_id as PK; map membership_id to assignment_id
		if (dbPayload['membership_id']) dbPayload['assignment_id'] = dbPayload['membership_id'];
		if (dbPayload.roles && typeof dbPayload.roles !== 'string') {
			dbPayload.roles = JSON.stringify(dbPayload.roles as unknown);
		}

		const { data: result, error } = await this.client
			.from('leader_assignments')
			.insert(dbPayload as Database['public']['Tables']['leader_assignments']['Insert'])
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistryLeaderMembership(result as Record<string, unknown>);
	}

	async updateMinistryLeaderMembership(
		id: string,
		data: Partial<MinistryLeaderMembership>
	): Promise<MinistryLeaderMembership> {

		const dbPayload: Record<string, unknown> = { ...(data as Record<string, unknown>), updated_at: new Date().toISOString() };
		if (dbPayload['membership_id']) dbPayload['assignment_id'] = dbPayload['membership_id'];
		if (dbPayload.roles && typeof dbPayload.roles !== 'string') {
			dbPayload.roles = JSON.stringify(dbPayload.roles as unknown);
		}

		const { data: result, error } = await this.client
			.from('leader_assignments')
			.update(dbPayload as Database['public']['Tables']['leader_assignments']['Update'])
			.eq('membership_id', id)
			.select()
			.single();

	if (error) throw error;
	if (!result) throw new Error('updateMinistryLeaderMembership: no result returned from DB');
	return supabaseToMinistryLeaderMembership(result as Record<string, unknown>);
	}

	async listMinistryLeaderMemberships(
		ministryId?: string,
		leaderId?: string
	): Promise<MinistryLeaderMembership[]> {
	let query = this.client.from('leader_assignments').select('*');

		if (ministryId) {
			query = query.eq('ministry_id', ministryId);
		}
		if (leaderId) {
			query = query.eq('leader_id', leaderId);
		}

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((d) => supabaseToMinistryLeaderMembership(d as Record<string, unknown>));
	}

	async deleteMinistryLeaderMembership(id: string): Promise<void> {
		const { error } = await this.client
			.from('leader_assignments')
			.delete()
			.eq('membership_id', id);

		if (error) throw error;
	}

	// Ministry Accounts
	async getMinistryAccount(id: string): Promise<MinistryAccount | null> {
		console.log('🔍 SupabaseAdapter.getMinistryAccount: Starting', { ministryId: id });
		
		const { data, error } = await this.client
			.from('ministry_accounts')
			.select('*')
			.eq('ministry_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				console.log('🔍 SupabaseAdapter.getMinistryAccount: No account found', { ministryId: id });
				return null;
			}
			console.error('❌ SupabaseAdapter.getMinistryAccount: Error', error);
			throw error;
		}
		
		const result = data ? supabaseToMinistryAccount(data as Database['public']['Tables']['ministry_accounts']['Row']) : null;
		console.log('🔍 SupabaseAdapter.getMinistryAccount: Result', {
			ministryId: id,
			found: !!result,
			email: result?.email
		});
		
		return result;
	}

	async createMinistryAccount(
		data: Omit<MinistryAccount, 'created_at' | 'updated_at'>
	): Promise<MinistryAccount> {
		const account = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Prepare DB payload with proper serialization for JSON settings
		const dbPayload: Record<string, unknown> = { ...account };
		if (dbPayload['settings'] && typeof dbPayload['settings'] !== 'string') {
			dbPayload['settings'] = JSON.stringify(dbPayload['settings']);
		}

		const { data: result, error } = await this.client
			.from('ministry_accounts')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
	return supabaseToMinistryAccount(result as Database['public']['Tables']['ministry_accounts']['Row']);
	}

	async updateMinistryAccount(
		id: string,
		data: Partial<MinistryAccount>
	): Promise<MinistryAccount> {
		console.log('🔍 SupabaseAdapter.updateMinistryAccount: Starting', {
			ministryId: id,
			updateData: data
		});
		
		const dbPayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
		if (dbPayload['settings'] && typeof dbPayload['settings'] !== 'string') {
			dbPayload['settings'] = JSON.stringify(dbPayload['settings']);
		}

		console.log('🔍 SupabaseAdapter.updateMinistryAccount: DB payload', dbPayload);

		const { data: result, error } = await this.client
			.from('ministry_accounts')
			.update(dbPayload)
			.eq('ministry_id', id)
			.select()
			.single();

		if (error) {
			console.error('❌ SupabaseAdapter.updateMinistryAccount: Error', error);
			throw error;
		}
		
		const mappedResult = result ? supabaseToMinistryAccount(result as Database['public']['Tables']['ministry_accounts']['Row']) : result;
		console.log('✅ SupabaseAdapter.updateMinistryAccount: Success', {
			ministryId: id,
			updatedEmail: mappedResult?.email
		});
		
		return mappedResult;
	}

	async listMinistryAccounts(): Promise<MinistryAccount[]> {
		const { data, error } = await this.client
			.from('ministry_accounts')
			.select('*');

		if (error) throw error;
		return (data || []).map((d) => supabaseToMinistryAccount(d as Database['public']['Tables']['ministry_accounts']['Row']));
	}

	async deleteMinistryAccount(id: string): Promise<void> {
		const { error } = await this.client
			.from('ministry_accounts')
			.delete()
			.eq('ministry_id', id);

		if (error) throw error;
	}

	// Ministry Groups
	async getMinistryGroup(id: string): Promise<MinistryGroup | null> {
		const { data, error } = await this.client
			.from('ministry_groups')
			.select('*')
			.eq('id', id)
			.single();

		if (error) throw error;
		if (!data) return null;

		return {
			id: data.id,
			code: data.code,
			name: data.name,
			description: data.description || undefined,
			email: data.email || undefined,
			created_at: data.created_at,
			updated_at: data.updated_at,
		};
	}

	async getMinistryGroupByCode(code: string): Promise<MinistryGroup | null> {
		const { data, error } = await this.client
			.from('ministry_groups')
			.select('*')
			.eq('code', code)
			.single();

		if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
		if (!data) return null;

		return {
			id: data.id,
			code: data.code,
			name: data.name,
			description: data.description || undefined,
			email: data.email || undefined,
			created_at: data.created_at,
			updated_at: data.updated_at,
		};
	}

	async createMinistryGroup(data: Omit<MinistryGroup, 'id' | 'created_at' | 'updated_at'>): Promise<MinistryGroup> {
		const { data: inserted, error } = await this.client
			.from('ministry_groups')
			.insert({
				code: data.code,
				name: data.name,
				description: data.description || null,
				email: data.email || null,
			})
			.select()
			.single();

		if (error) throw error;

		return {
			id: inserted.id,
			code: inserted.code,
			name: inserted.name,
			description: inserted.description || undefined,
			email: inserted.email || undefined,
			created_at: inserted.created_at,
			updated_at: inserted.updated_at,
		};
	}

	async updateMinistryGroup(id: string, data: Partial<MinistryGroup>): Promise<MinistryGroup> {
		const updates: any = {};
		if (data.code !== undefined) updates.code = data.code;
		if (data.name !== undefined) updates.name = data.name;
		if (data.description !== undefined) updates.description = data.description;
		if (data.email !== undefined) updates.email = data.email;

		const { data: updated, error } = await this.client
			.from('ministry_groups')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;

		return {
			id: updated.id,
			code: updated.code,
			name: updated.name,
			description: updated.description || undefined,
			email: updated.email || undefined,
			created_at: updated.created_at,
			updated_at: updated.updated_at,
		};
	}

	async listMinistryGroups(): Promise<MinistryGroup[]> {
		const { data, error } = await this.client
			.from('ministry_groups')
			.select('*')
			.order('name');

		if (error) throw error;

		return (data || []).map(row => ({
			id: row.id,
			code: row.code,
			name: row.name,
			description: row.description || undefined,
			email: row.email || undefined,
			custom_consent_text: row.custom_consent_text || undefined,
			custom_consent_required: row.custom_consent_required || false,
			created_at: row.created_at,
			updated_at: row.updated_at,
		}));
	}

	async deleteMinistryGroup(id: string): Promise<void> {
		const { error } = await this.client
			.from('ministry_groups')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	// Ministry Group Members
	async addMinistryToGroup(groupId: string, ministryId: string): Promise<MinistryGroupMember> {
		const { data: inserted, error } = await this.client
			.from('ministry_group_members')
			.insert({
				group_id: groupId,
				ministry_id: ministryId,
			})
			.select()
			.single();

		if (error) throw error;

		return {
			group_id: inserted.group_id,
			ministry_id: inserted.ministry_id,
			created_at: inserted.created_at,
		};
	}

	async removeMinistryFromGroup(groupId: string, ministryId: string): Promise<void> {
		const { error } = await this.client
			.from('ministry_group_members')
			.delete()
			.eq('group_id', groupId)
			.eq('ministry_id', ministryId);

		if (error) throw error;
	}

	async listMinistriesByGroup(groupId: string): Promise<Ministry[]> {
		const { data, error } = await this.client
			.from('ministry_group_members')
			.select('ministry_id, ministries(*)')
			.eq('group_id', groupId);

		if (error) throw error;

		return (data || [])
			.filter(row => row.ministries)
			.map(row => supabaseToMinistry(row.ministries as Database['public']['Tables']['ministries']['Row']));
	}

	async listGroupsByMinistry(ministryId: string): Promise<MinistryGroup[]> {
		const { data, error } = await this.client
			.from('ministry_group_members')
			.select('group_id, ministry_groups(*)')
			.eq('ministry_id', ministryId);

		if (error) throw error;

		return (data || [])
			.filter(row => row.ministry_groups)
			.map(row => {
				const group = row.ministry_groups as Database['public']['Tables']['ministry_groups']['Row'];
				return {
					id: group.id,
					code: group.code,
					name: group.name,
					description: group.description || undefined,
					created_at: group.created_at,
					updated_at: group.updated_at,
				};
			});
	}

	// Ministry Group RBAC helpers
	async listAccessibleMinistriesForEmail(email: string): Promise<Ministry[]> {
		const { data, error } = await this.client
			.rpc('fn_ministry_ids_email_can_access', { p_email: email });

		if (error) throw error;

		if (!data || data.length === 0) return [];

		const ministryIds = data.map(row => row.ministry_id);
		const { data: ministries, error: ministriesError } = await this.client
			.from('ministries')
			.select('*')
			.in('ministry_id', ministryIds);

		if (ministriesError) throw ministriesError;

		return (ministries || []).map(row => supabaseToMinistry(row));
	}

	async listAccessibleMinistriesForAccount(accountId: string): Promise<Ministry[]> {
		const { data, error } = await this.client
			.rpc('fn_ministry_ids_ministry_account_can_access', { p_account_id: accountId });

		if (error) throw error;

		if (!data || data.length === 0) return [];

		const ministryIds = data.map(row => row.ministry_id);
		const { data: ministries, error: ministriesError } = await this.client
			.from('ministries')
			.select('*')
			.in('ministry_id', ministryIds);

		if (ministriesError) throw ministriesError;

		return (ministries || []).map(row => supabaseToMinistry(row));
	}

	// Branding Settings
	async getBrandingSettings(settingId: string): Promise<BrandingSettings | null> {
		const { data, error } = await this.client
			.from('branding_settings')
			.select('*')
			.eq('setting_id', settingId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToBrandingSettings(data as Database['public']['Tables']['branding_settings']['Row']) : null;
	}

	async createBrandingSettings(
		data: Omit<BrandingSettings, 'setting_id' | 'created_at' | 'updated_at'>
	): Promise<BrandingSettings> {
		const settings = {
			...data,
			setting_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('branding_settings')
			.insert(settings)
			.select()
			.single();

		if (error) throw error;
		if (!result) throw new Error('createBrandingSettings: no result returned from DB');
		return supabaseToBrandingSettings(result as Database['public']['Tables']['branding_settings']['Row']);
	}

	async updateBrandingSettings(
		settingId: string,
		data: Partial<BrandingSettings>
	): Promise<BrandingSettings> {
		const { data: result, error } = await this.client
			.from('branding_settings')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('setting_id', settingId)
			.select()
			.single();

		if (error) throw error;
		if (!result) throw new Error('updateBrandingSettings: no result returned from DB');
		return supabaseToBrandingSettings(result as Database['public']['Tables']['branding_settings']['Row']);
	}

	async listBrandingSettings(): Promise<BrandingSettings[]> {
		const { data, error } = await this.client
			.from('branding_settings')
			.select('*');

		if (error) throw error;
		return (data || []).map((d) => supabaseToBrandingSettings(d as Database['public']['Tables']['branding_settings']['Row']));
	}

	async deleteBrandingSettings(settingId: string): Promise<void> {
		const { error } = await this.client
			.from('branding_settings')
			.delete()
			.eq('setting_id', settingId);

		if (error) throw error;
	}

	// Note: Bible Bee Year methods removed - use Bible Bee Cycle methods instead
	// The bible_bee_years table was replaced with bible_bee_cycles in the fresh schema
	// Use getBibleBeeCycle(), createBibleBeeCycle(), updateBibleBeeCycle(), deleteBibleBeeCycle(), listBibleBeeCycles() instead

	// Bible Bee Cycles (new cycle-based system)
	async getBibleBeeCycle(id: string): Promise<BibleBeeCycle | null> {
		const { data, error } = await this.client
			.from('bible_bee_cycles')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? this.mapBibleBeeCycle(data) : null;
	}

	async createBibleBeeCycle(
		data: Omit<BibleBeeCycle, 'id' | 'created_at' | 'updated_at'>
	): Promise<BibleBeeCycle> {
		const insertPayload = {
			cycle_id: data.cycle_id,
			name: data.name,
			description: data.description ?? null,
			is_active: data.is_active ?? false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('bible_bee_cycles')
			.insert(insertPayload)
			.select()
			.single();

		if (error) throw error;
		return this.mapBibleBeeCycle(result);
	}

	async updateBibleBeeCycle(
		id: string,
		data: Partial<BibleBeeCycle>
	): Promise<BibleBeeCycle> {
		console.log('SupabaseAdapter.updateBibleBeeCycle called:', { id, data });
		const updatePayload: Record<string, unknown> = {
			updated_at: new Date().toISOString(),
		};

		if (data.cycle_id !== undefined) updatePayload.cycle_id = data.cycle_id;
		if (data.name !== undefined) updatePayload.name = data.name;
		if (data.description !== undefined) updatePayload.description = data.description;
		if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

		console.log('SupabaseAdapter.updateBibleBeeCycle payload:', updatePayload);

		const { data: result, error } = await this.client
			.from('bible_bee_cycles')
			.update(updatePayload)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('SupabaseAdapter.updateBibleBeeCycle error:', error);
			throw error;
		}
		console.log('SupabaseAdapter.updateBibleBeeCycle success:', result);
		return this.mapBibleBeeCycle(result);
	}

	async listBibleBeeCycles(isActive?: boolean): Promise<BibleBeeCycle[]> {
		let query = this.client.from('bible_bee_cycles').select('*');
		
		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		const { data, error } = await query.order('created_at', { ascending: false });

		if (error) throw error;
		return data ? data.map(this.mapBibleBeeCycle) : [];
	}

	async deleteBibleBeeCycle(id: string): Promise<void> {
		const { error } = await this.client
			.from('bible_bee_cycles')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	async getDivision(id: string): Promise<Division | null> {
		const { data, error } = await this.client
			.from('divisions')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? this.mapDivision(data) : null;
	}

	async createDivision(
		data: Omit<Division, 'created_at' | 'updated_at'>
	): Promise<Division> {
		const insertPayload = {
			name: data.name,
			bible_bee_cycle_id: data.bible_bee_cycle_id ?? null,
			description: (((data as unknown) as Record<string, unknown>)['description'] as string) ?? null,
			minimum_required: data.minimum_required ?? 0,
			min_last_order: (((data as unknown) as Record<string, unknown>)['min_last_order'] as number) ?? null,
			min_grade: data.min_grade ?? null,
			max_grade: data.max_grade ?? null,
			requires_essay: (((data as unknown) as Record<string, unknown>)['requires_essay'] as boolean) ?? false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('divisions')
			.insert(insertPayload)
			.select()
			.single();

		if (error) throw error;
		return this.mapDivision(result);
	}

	async updateDivision(id: string, data: Partial<Division>): Promise<Division> {
		const { data: result, error } = await this.client
			.from('divisions')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return this.mapDivision(result);
	}

	async listDivisions(bibleBeeYearId?: string): Promise<Division[]> {
		let query = this.client.from('divisions').select('*');

		if (bibleBeeYearId) {
			query = query.eq('bible_bee_cycle_id', bibleBeeYearId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: unknown) => this.mapDivision(d as Record<string, unknown>));
	}

	private mapDivision(row: Database['public']['Tables']['divisions']['Row'] | Record<string, unknown>): Division {
		const r = (row ?? {}) as Record<string, unknown>;
		return {
			id: (r['id'] as string) || '',
			bible_bee_cycle_id: (r['bible_bee_cycle_id'] as string) || (r['bible_bee_year_id'] as string) || '',
			name: (r['name'] as string) || '',
			minimum_required: (r['minimum_required'] as number) ?? (r['min_scriptures'] as number) ?? 0,
			min_last_order: (r['min_last_order'] as number) ?? 0,
			min_grade: (r['min_grade'] as number) ?? 0,
			max_grade: (r['max_grade'] as number) ?? 0,
			created_at: (r['created_at'] as string) || new Date().toISOString(),
			updated_at: (r['updated_at'] as string) || new Date().toISOString(),
		};
	}

	async deleteDivision(id: string): Promise<void> {
		const { error } = await this.client
			.from('divisions')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	// Scripture methods
	async getScripture(id: string): Promise<Scripture | null> {
		const { data, error } = await this.client
			.from('scriptures')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			console.error('Error fetching scripture:', error);
			throw error;
		}

		return data ? this.mapScripture(data) : null;
	}

	async upsertScripture(data: Omit<Scripture, 'created_at' | 'updated_at'> & { id?: string }): Promise<Scripture> {
		// Determine if we're using a Bible Bee cycle ID or competition year ID
		const isBibleBeeCycleId = data.year_id && data.year_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		
		const payload: any = {
			id: data.id || uuidv4(),
			scripture_number: data.scripture_number,
			scripture_order: data.scripture_order,
			counts_for: data.counts_for,
			reference: data.reference,
			category: data.category,
			texts: data.texts,
			order: data.scripture_order || 1, // Map scripture_order to required order field
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Use the appropriate field based on whether it's a cycle ID or competition year ID
		if (isBibleBeeCycleId) {
			// This is a Bible Bee cycle ID - use bible_bee_cycle_id
			console.log('upsertScripture - Using bible_bee_cycle_id:', data.year_id);
			payload.bible_bee_cycle_id = data.year_id;
			payload.competition_year_id = null;
		} else {
			// This is a competition year ID - use the traditional field
			console.log('upsertScripture - Using competition_year_id:', data.year_id);
			payload.competition_year_id = data.year_id;
			payload.bible_bee_cycle_id = null;
		}

		console.log('upsertScripture - Final payload:', payload);

		const { data: result, error } = await this.client
			.from('scriptures')
			.upsert(payload)
			.select()
			.single();

		if (error) {
			console.error('Error upserting scripture:', error);
			throw error;
		}

		return this.mapScripture(result);
	}

	async deleteScripture(id: string): Promise<void> {
		const { error } = await this.client
			.from('scriptures')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	async commitEnhancedCsvRowsToYear(rows: any[], yearId: string): Promise<any> {
		const now = new Date().toISOString();
		
		// Determine if we're using a Bible Bee cycle ID or competition year ID
		const isBibleBeeCycleId = yearId && yearId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		
		// Normalize reference helper for consistent matching
		const normalizeReference = (s?: string | null) =>
			(s ?? '')
				.toString()
				.trim()
				.replace(/\s+/g, ' ')
				.replace(/[^\w\d\s:\-]/g, '')
				.toLowerCase();
		
		// Get all existing scriptures for this year/cycle
		let query = this.client.from('scriptures').select('*');
		if (isBibleBeeCycleId) {
			// Query by bible_bee_cycle_id if it's a cycle ID
			query = query.eq('bible_bee_cycle_id', yearId);
		} else {
			// Query by competition_year_id if it's a competition year ID
			query = query.eq('competition_year_id', yearId);
		}
		
		const { data: existingScriptures, error: fetchError } = await query;
		
		if (fetchError) {
			console.error('Error fetching existing scriptures:', fetchError);
			throw fetchError;
		}
		
		let inserted = 0;
		let updated = 0;
		
		for (const row of rows) {
			// Match by normalized reference first, then fall back to scripture_number if needed
			const normalizedRef = normalizeReference(row.reference);
			let existing = existingScriptures?.find(s => normalizeReference(s.reference) === normalizedRef);
			
			// Fall back to scripture_number only if reference match fails
			if (!existing) {
				existing = existingScriptures?.find(s => s.scripture_number === row.scripture_number);
			}
			
			const scriptureData: any = {
				scripture_number: row.scripture_number,
				scripture_order: row.scripture_order,
				counts_for: row.counts_for || 1,
				reference: row.reference || '',
				category: row.category,
				texts: row.texts || {},
				order: row.scripture_order || 1, // Map scripture_order to required order field
				updated_at: now,
			};

			// Use the appropriate field based on whether it's a cycle ID or competition year ID
			if (isBibleBeeCycleId) {
				scriptureData.bible_bee_cycle_id = yearId;
				scriptureData.competition_year_id = null;
			} else {
				scriptureData.competition_year_id = yearId;
				scriptureData.bible_bee_cycle_id = null;
			}
			
			if (existing) {
				// Update existing scripture
				const { error: updateError } = await this.client
					.from('scriptures')
					.update(scriptureData)
					.eq('id', existing.id);
				
				if (updateError) {
					console.error('Error updating scripture:', updateError);
					throw updateError;
				}
				updated++;
			} else {
				// Create new scripture
				const { error: insertError } = await this.client
					.from('scriptures')
					.insert({
						id: uuidv4(),
						created_at: now,
						...scriptureData,
					});
				
				if (insertError) {
					console.error('Error inserting scripture:', insertError);
					throw insertError;
				}
				inserted++;
			}
		}
		
		return { success: true, inserted, updated };
	}

	async listScriptures(filters?: { yearId?: string }): Promise<Scripture[]> {
		let query = this.client.from('scriptures').select('*');
		
		if (filters?.yearId) {
			// Determine if we're using a Bible Bee cycle ID or competition year ID
			const isBibleBeeCycleId = filters.yearId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			
			console.log('listScriptures - yearId:', filters.yearId);
			console.log('listScriptures - isBibleBeeCycleId:', isBibleBeeCycleId);
			
			if (isBibleBeeCycleId) {
				// Query by bible_bee_cycle_id if it's a cycle ID
				console.log('Querying by bible_bee_cycle_id:', filters.yearId);
				query = query.eq('bible_bee_cycle_id', filters.yearId);
			} else {
				// Query by competition_year_id if it's a competition year ID
				console.log('Querying by competition_year_id:', filters.yearId);
				query = query.eq('competition_year_id', filters.yearId);
			}
		}

		const { data, error } = await query.order('scripture_order');

		if (error) {
			console.error('Error listing scriptures:', error);
			return [];
		}

		console.log('listScriptures - found scriptures:', data?.length || 0);
		console.log('listScriptures - data:', data);

		return (data || []).map(this.mapScripture);
	}

	async uploadJsonTexts(yearId: string, data: any, mode: 'merge' | 'overwrite' = 'merge', dryRun: boolean = false): Promise<any> {
		// Determine if we're using a Bible Bee cycle ID or competition year ID
		const isBibleBeeCycleId = yearId && yearId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		
		let updated = 0;
		let created = 0;
		const errors: string[] = [];
		const preview: Array<{ reference: string; action: 'create' | 'update'; texts: string[] }> = [];
		
		// Normalize reference helper for consistent matching
		const normalizeReference = (s?: string | null) =>
			(s ?? '')
				.toString()
				.trim()
				.replace(/\s+/g, ' ')
				.replace(/[^\w\d\s:\-]/g, '')
				.toLowerCase();
		
		// Get all existing scriptures for this year/cycle
		let query = this.client.from('scriptures').select('*');
		if (isBibleBeeCycleId) {
			query = query.eq('bible_bee_cycle_id', yearId);
		} else {
			query = query.eq('competition_year_id', yearId);
		}
		
		const { data: allScriptures, error: fetchError } = await query;
		
		if (fetchError) {
			console.error('Error fetching existing scriptures:', fetchError);
			throw fetchError;
		}
		
		for (const scriptureData of data.scriptures) {
			try {
				// Match by normalized reference text
				const normalizedRef = normalizeReference(scriptureData.reference);
				
				const existing = (allScriptures || []).find(s => 
					normalizeReference(s.reference) === normalizedRef
				);
				
				const action = existing ? 'update' : 'create';
				const existingTexts = existing?.texts || {};
				const newTexts = mode === 'overwrite' 
					? scriptureData.texts 
					: { ...existingTexts, ...scriptureData.texts };
				
				preview.push({
					reference: scriptureData.reference,
					action,
					texts: Object.keys(scriptureData.texts),
				});
				
				if (!dryRun) {
					if (existing) {
						// Update existing scripture
						const { error: updateError } = await this.client
							.from('scriptures')
							.update({
								texts: newTexts,
								updated_at: new Date().toISOString(),
							})
							.eq('id', existing.id);
						
						if (updateError) {
							console.error('Error updating scripture:', updateError);
							errors.push(`Error updating scripture ${scriptureData.reference}: ${updateError.message}`);
						} else {
							updated++;
						}
					} else {
						// Create new scripture
						const maxOrder = Math.max(0, ...(allScriptures || []).map(s => s.scripture_order || s.order || 0));
						const nextOrder = maxOrder + 1;
						
						const payload: any = {
							id: uuidv4(),
							reference: scriptureData.reference,
							scripture_order: nextOrder,
							order: nextOrder,
							counts_for: 1,
							category: '',
							texts: newTexts,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};
						
						// Use the appropriate field based on whether it's a cycle ID or competition year ID
						if (isBibleBeeCycleId) {
							payload.bible_bee_cycle_id = yearId;
							payload.competition_year_id = null;
						} else {
							payload.competition_year_id = yearId;
							payload.bible_bee_cycle_id = null;
						}
						
						const { error: createError } = await this.client
							.from('scriptures')
							.insert(payload);
						
						if (createError) {
							console.error('Error creating scripture:', createError);
							errors.push(`Error creating scripture ${scriptureData.reference}: ${createError.message}`);
						} else {
							created++;
						}
					}
				}
			} catch (error: any) {
				errors.push(`Error processing scripture ${scriptureData.reference}: ${error.message}`);
			}
		}
		
		const result = { updated, created, errors };
		return dryRun ? { ...result, preview } : result;
	}

	// Helper method to map Supabase scripture data to our Scripture type
	private mapScripture(data: any): Scripture {
		// Extract text from texts field - it might be a JSON object with translations
		let text = '';
		if (data.texts) {
			if (typeof data.texts === 'string') {
				text = data.texts;
			} else if (typeof data.texts === 'object') {
				// If it's an object with translations, use NIV as default or first available
				text = data.texts.NIV || data.texts.KJV || Object.values(data.texts)[0] || '';
			}
		}
		
		return {
			id: data.id,
			bible_bee_cycle_id: data.bible_bee_cycle_id || data.competition_year_id || data.year_id,
			scripture_number: data.scripture_number,
			scripture_order: data.scripture_order || data.order || 1, // Map order field back to scripture_order
			counts_for: data.counts_for,
			reference: data.reference,
			category: data.category,
			text: text,
			translation: 'NIV', // Default translation since it's not stored in the database
			texts: data.texts,
			created_at: data.created_at,
			updated_at: data.updated_at,
		};
	}

	async getEssayPrompt(id: string): Promise<EssayPrompt | null> {
		const { data, error } = await this.client
			.from('essay_prompts')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? this.mapEssayPrompt(data) : null;
	}

	async getEssayPromptsForYearAndDivision(yearId: string, divisionName: string): Promise<EssayPrompt[]> {
		const { data, error } = await this.supabase
			.from('essay_prompts')
			.select('*')
			.eq('year_id', yearId)
			.eq('division_name', divisionName);

		if (error) {
			console.error('Error fetching essay prompts:', error);
			return [];
		}

		return data || [];
	}

	async createEssayPrompt(
		data: Omit<EssayPrompt, 'created_at' | 'updated_at'>
	): Promise<EssayPrompt> {
		const insertPayload: any = {
			id: uuidv4(),
			bible_bee_cycle_id: data.bible_bee_cycle_id,
			division_id: data.division_id || null,
			title: data.title,
			prompt: data.prompt,
			instructions: data.instructions || null,
			due_date: data.due_date,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('essay_prompts')
			.insert(insertPayload)
			.select()
			.single();

		if (error) throw error;
		return this.mapEssayPrompt(result);
	}

	async updateEssayPrompt(
		id: string,
		data: Partial<EssayPrompt>
	): Promise<EssayPrompt> {
		const updatePayload: any = {
			...data,
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('essay_prompts')
			.update(updatePayload)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return this.mapEssayPrompt(result);
	}

	async listEssayPrompts(divisionId?: string, cycleId?: string): Promise<EssayPrompt[]> {
		let query = this.client.from('essay_prompts').select('*');

		if (divisionId) {
			// If divisionId is provided, filter by it
			query = query.eq('division_id', divisionId);
		}
		
		if (cycleId) {
			// If cycleId is provided, filter by bible_bee_cycle_id
			query = query.eq('bible_bee_cycle_id', cycleId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: unknown) => this.mapEssayPrompt(d));
	}
	private mapEssayPrompt(row: unknown): EssayPrompt {
		const r = (row ?? {}) as Record<string, unknown>;
		const mapped = {
			id: (r['id'] as string) || '',
			bible_bee_cycle_id: (r['bible_bee_cycle_id'] as string) || '',
			division_id: (r['division_id'] as string) || undefined,
			title: (r['title'] as string) || '',
			prompt: (r['prompt'] as string) || '',
			instructions: (r['instructions'] as string) || undefined,
			due_date: (r['due_date'] as string) || '',
			created_at: (r['created_at'] as string) || new Date().toISOString(),
			updated_at: (r['updated_at'] as string) || new Date().toISOString(),
		};
		
		return mapped;
	}

	async deleteEssayPrompt(id: string): Promise<void> {
		const { error } = await this.client
			.from('essay_prompts')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	async getEnrollment(id: string): Promise<Enrollment | null> {
		const { data, error } = await this.client
			.from('bible_bee_enrollments')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToEnrollment(data as unknown as Database['public']['Tables']['bible_bee_enrollments']['Row']) : null;
	}

	async createEnrollment(
		data: Omit<Enrollment, 'created_at' | 'updated_at'>
	): Promise<Enrollment> {
		console.log(`DEBUG: createEnrollment called with data:`, data);
		
		if (!data.child_id || !data.bible_bee_cycle_id || !data.division_id) {
			const error = new Error('child_id, bible_bee_cycle_id and division_id are required for enrollment');
			console.error(`DEBUG: createEnrollment validation error:`, error.message);
			throw error;
		}

		const insertPayload: Database['public']['Tables']['bible_bee_enrollments']['Insert'] = {
			child_id: data.child_id!,
			bible_bee_cycle_id: data.bible_bee_cycle_id!,
			division_id: data.division_id!,
			auto_enrolled: data.auto_enrolled ?? false,
			enrolled_at: data.enrolled_at ?? new Date().toISOString(),
			id: ((data as unknown) as Record<string, unknown>)['id'] as string ?? undefined,
		};

		console.log(`DEBUG: createEnrollment insertPayload:`, insertPayload);

		const { data: result, error } = await this.client
			.from('bible_bee_enrollments')
			.insert(insertPayload)
			.select()
			.single();

		if (error) {
			console.error(`DEBUG: createEnrollment Supabase error:`, {
				message: error.message,
				code: error.code,
				details: error.details,
				hint: error.hint,
				error: error
			});
			throw error;
		}
		
		console.log(`DEBUG: createEnrollment success, result:`, result);
		return supabaseToEnrollment(result as Database['public']['Tables']['bible_bee_enrollments']['Row']);
	}

	async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<Enrollment> {
		const payload = {
			...(data as Database['public']['Tables']['bible_bee_enrollments']['Update']),
			updated_at: new Date().toISOString(),
		} as unknown as Database['public']['Tables']['bible_bee_enrollments']['Update'];

		const { data: result, error } = await this.client
			.from('bible_bee_enrollments')
			.update(payload)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToEnrollment(result as Database['public']['Tables']['bible_bee_enrollments']['Row']);
	}

	async listEnrollments(
		childId?: string,
		bibleBeeYearId?: string
	): Promise<Enrollment[]> {
		console.log(`DEBUG: listEnrollments called with childId: ${childId}, bibleBeeYearId: ${bibleBeeYearId}`);
		
	// Note: client typing may lack some table names; use narrow cast only for the query builder here
	let query = (this.client as unknown as SupabaseClient<Database>).from('bible_bee_enrollments').select('*');

		if (childId) {
			query = query.eq('child_id', childId);
		}
		if (bibleBeeYearId) {
			query = query.eq('bible_bee_cycle_id', bibleBeeYearId);
		}

	const { data, error } = await query;
	
	console.log(`DEBUG: listEnrollments query result - data:`, data);
	console.log(`DEBUG: listEnrollments query result - error:`, error);
	
	if (error) throw error;
	return (data || []).map((d) => supabaseToEnrollment(d as Database['public']['Tables']['bible_bee_enrollments']['Row']));
	}

	async deleteEnrollment(id: string): Promise<void> {
		const { error } = await this.client
			.from('bible_bee_enrollments')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	async getEnrollmentOverride(id: string): Promise<EnrollmentOverride | null> {
		const { data, error } = await this.client
			.from('enrollment_overrides')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
	return data ? supabaseToEnrollmentOverride(data as Database['public']['Tables']['enrollment_overrides']['Row']) : null;
	}

	async createEnrollmentOverride(
		data: Omit<EnrollmentOverride, 'created_at' | 'updated_at'>
	): Promise<EnrollmentOverride> {
		const override = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('enrollment_overrides')
			.insert(override)
			.select()
			.single();

	if (error) throw error;
	return supabaseToEnrollmentOverride(result as Database['public']['Tables']['enrollment_overrides']['Row']);
	}

	async updateEnrollmentOverride(
		id: string,
		data: Partial<EnrollmentOverride>
	): Promise<EnrollmentOverride> {
		const { data: result, error } = await this.client
			.from('enrollment_overrides')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

	if (error) throw error;
	return supabaseToEnrollmentOverride(result as Database['public']['Tables']['enrollment_overrides']['Row']);
	}

	async listEnrollmentOverrides(yearId?: string): Promise<EnrollmentOverride[]> {
		let query = (this.client as unknown as SupabaseClient<Database>).from('enrollment_overrides').select('*');

		if (yearId) {
			query = query.eq('bible_bee_cycle_id', yearId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: Database['public']['Tables']['enrollment_overrides']['Row']) => supabaseToEnrollmentOverride(d));
	}

	async deleteEnrollmentOverride(id: string): Promise<void> {
		const { error } = await this.client
			.from('enrollment_overrides')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	// Student Scripture methods
	async getStudentScripture(id: string): Promise<StudentScripture | null> {
		const { data, error } = await this.client
			.from('student_scriptures')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}

		return data ? this.mapStudentScripture(data) : null;
	}

	async createStudentScripture(data: Omit<StudentScripture, 'created_at' | 'updated_at'>): Promise<StudentScripture> {
		const insertPayload: Database['public']['Tables']['student_scriptures']['Insert'] = {
			child_id: data.child_id,
			bible_bee_cycle_id: data.bible_bee_cycle_id,
			scripture_id: data.scripture_id,
			is_completed: data.is_completed,
			completed_at: data.completed_at,
			// Don't include id - let the database generate it
		};

		const { data: result, error } = await this.client
			.from('student_scriptures')
			.insert(insertPayload)
			.select()
			.single();

		if (error) throw error;
		return this.mapStudentScripture(result as Database['public']['Tables']['student_scriptures']['Row']);
	}

	async updateStudentScripture(id: string, data: Partial<StudentScripture>): Promise<StudentScripture> {
		const updatePayload: Database['public']['Tables']['student_scriptures']['Update'] = {
			is_completed: data.is_completed,
			completed_at: data.completed_at,
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('student_scriptures')
			.update(updatePayload)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return this.mapStudentScripture(result as Database['public']['Tables']['student_scriptures']['Row']);
	}

	async listStudentScriptures(childId?: string, bibleBeeCycleId?: string): Promise<StudentScripture[]> {
		let query = this.client.from('student_scriptures').select('*');

		if (childId) {
			query = query.eq('child_id', childId);
		}
		if (bibleBeeCycleId) {
			query = query.eq('bible_bee_cycle_id', bibleBeeCycleId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d) => this.mapStudentScripture(d as Database['public']['Tables']['student_scriptures']['Row']));
	}

	async deleteStudentScripture(id: string): Promise<void> {
		const { error } = await this.client
			.from('student_scriptures')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}

	private mapStudentScripture(data: Database['public']['Tables']['student_scriptures']['Row']): StudentScripture {
		return {
			id: data.id,
			child_id: data.child_id,
			bible_bee_cycle_id: data.bible_bee_cycle_id,
			scripture_id: data.scripture_id,
			is_completed: data.is_completed ?? false,
			completed_at: data.completed_at ?? undefined,
			created_at: data.created_at ?? new Date().toISOString(),
			updated_at: data.updated_at ?? new Date().toISOString(),
		};
	}

	// Realtime subscription implementation
	subscribeToTable<T>(table: string, callback: (payload: T) => void): () => void {
		const channel = this.client
			.channel(`public:${table}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table },
				(payload) => {
					callback(payload.new as unknown as T);
				}
			)
			.subscribe();

		// Return unsubscribe function
		return () => {
			this.client.removeChannel(channel);
		};
	}

	// Implement transaction support
	async transaction<T>(callback: () => Promise<T>): Promise<T> {
		// Note: Supabase doesn't have direct transaction support in the JS client
		// For now, just execute the callback
		// In the future, consider using pg connection to handle transactions
		return callback();
	}

	// Form draft persistence methods
	async getDraft(formName: string, userId: string): Promise<any | null> {
		const id = `${formName}::${userId}`;
		const { data, error } = await this.getClientAny()
			.from('form_drafts')
			.select('payload')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // No rows returned
			throw error;
		}

		return data ? data.payload : null;
	}

	async saveDraft(formName: string, userId: string, payload: any, version = 1): Promise<void> {
		const id = `${formName}::${userId}`;
		const draft = {
			id,
			form_name: formName,
			user_id: userId,
			payload,
			version,
			updated_at: new Date().toISOString(),
		};

		const { error } = await this.getClientAny()
			.from('form_drafts')
			.upsert(draft);

		if (error) {
			throw error;
		}
	}

	async clearDraft(formName: string, userId: string): Promise<void> {
		const id = `${formName}::${userId}`;
		const { error } = await this.getClientAny()
			.from('form_drafts')
			.delete()
			.eq('id', id);

		if (error) {
			throw error;
		}
	}
    
	// Temporary helper for tables missing from generated supabase types (see TODOs below).
	// TODO: regenerate `src/lib/database/supabase-types.ts` so the Supabase client generic
	// includes all tables (for example: `registration_cycles`) and remove this helper.
	// Localized any-cast helper for tables not present in the generated supabase types.
	// TODO: regenerate `src/lib/database/supabase-types.ts` and remove this.
	// Temporary helper for tables missing from generated supabase types (see TODOs below).
	// TODO: regenerate `src/lib/database/supabase-types.ts` so the Supabase client generic
	// includes all tables (for example: `registration_cycles`) and remove this helper.
	// Localized any-cast helper for tables not present in the generated supabase types.
	// TODO: regenerate `src/lib/database/supabase-types.ts` and remove this.
	// Localized any: this helper is intentionally `any` until `supabase-types.ts` is regenerated
	// to include legacy tables (e.g. `registration_cycles`). When the generator is
	// run successfully and types are complete, replace `getClientAny()` usages with
	// properly typed `this.client` calls and remove this helper.
	// See `.github/ISSUES/000-temp-relax-no-explicit-any.md` for the tracking issue.
	/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
	private getClientAny(): any {
		return this.client as any;
	}

	// Bible Bee auto-enrollment methods
	async previewAutoEnrollment(yearId: string): Promise<any> {
		// Get the Bible Bee cycle first
		const bibleCycle = await this.getBibleBeeCycle(yearId);
		if (!bibleCycle) {
			throw new Error(`Bible Bee cycle ${yearId} not found`);
		}

		// Get the registration cycle linked to this Bible Bee cycle
		const registrationCycles = await this.listRegistrationCycles();
		const currentCycle = registrationCycles.find(c => c.cycle_id === bibleCycle.cycle_id);
		if (!currentCycle) {
			throw new Error(`Registration cycle ${bibleCycle.cycle_id} linked to Bible Bee cycle not found`);
		}

		// Get Bible Bee ministry
		const ministries = await this.listMinistries();
		const bibleBeeMinistry = ministries.find(m => m.code === 'bible-bee');
		if (!bibleBeeMinistry) {
			throw new Error('Bible Bee ministry not found');
		}

		// Get children enrolled in Bible Bee for the current registration cycle
		const allEnrollments = await this.listMinistryEnrollments();
		const bibleBeeEnrollments = allEnrollments.filter(e => 
			e.cycle_id === currentCycle.cycle_id && 
			e.ministry_id === bibleBeeMinistry.ministry_id && 
			e.status === 'enrolled'
		);

		if (bibleBeeEnrollments.length === 0) {
			throw new Error('No children enrolled in Bible Bee ministry for the current registration cycle');
		}

		// Get children data
		const allChildren = await this.listChildren();
		const enrolledChildren = allChildren.filter(child => 
			bibleBeeEnrollments.some(enrollment => enrollment.child_id === child.child_id)
		);

		// Get divisions for this Bible Bee cycle
		const divisions = await this.listDivisions(yearId);
		if (divisions.length === 0) {
			throw new Error('No divisions found for this year');
		}

		// Get existing overrides
		const overrides = await this.listEnrollmentOverrides(yearId);
		const overrideMap = new Map(overrides.map(o => [o.child_id, o]));

		const previews: any[] = [];
		const counts = { proposed: 0, overrides: 0, unassigned: 0, unknown_grade: 0 };

		for (const child of enrolledChildren) {
			const gradeCode = this.gradeToCode(child.grade);
			const preview: any = {
				child_id: child.child_id,
				child_name: `${child.first_name} ${child.last_name}`,
				grade_text: child.grade || '',
				grade_code: gradeCode,
				status: 'unassigned',
			};

			// Check for override first
			const override = overrideMap.get(child.child_id);
			if (override) {
				const overrideDivision = divisions.find(d => d.id === override.division_id);
				if (overrideDivision) {
					preview.override_division = {
						id: overrideDivision.id,
						name: overrideDivision.name,
						reason: override.reason,
					};
					preview.status = 'override';
					counts.overrides++;
					previews.push(preview);
					continue;
				}
			}

			// Handle unknown grade
			if (gradeCode === null) {
				preview.status = 'unknown_grade';
				counts.unknown_grade++;
				previews.push(preview);
				continue;
			}

			// Find matching divisions
			const matchingDivisions = divisions.filter(d => 
				gradeCode >= d.min_grade && gradeCode <= d.max_grade
			);

			if (matchingDivisions.length === 0) {
				preview.status = 'unassigned';
				counts.unassigned++;
			} else if (matchingDivisions.length === 1) {
				preview.proposed_division = {
					id: matchingDivisions[0].id,
					name: matchingDivisions[0].name,
				};
				preview.status = 'proposed';
				counts.proposed++;
			} else {
				// Multiple matches shouldn't happen due to non-overlap constraint
				preview.status = 'multiple_matches';
				counts.unassigned++;
			}

			previews.push(preview);
		}

		return { previews, counts };
	}

	async commitAutoEnrollment(yearId: string, previews: any[]): Promise<any> {
		const errors: string[] = [];
		let enrolled = 0;
		let updated = 0;
		let overrides_applied = 0;
		let overrides_updated = 0;
		
		const now = new Date().toISOString();
		
		console.log(`DEBUG: commitAutoEnrollment called with ${previews.length} previews`);
		
		// Get existing enrollments for this cycle to check for duplicates
		const existingEnrollments = await this.listEnrollments();
		const cycleEnrollments = existingEnrollments.filter(e => e.bible_bee_cycle_id === yearId);
		const enrollmentMap = new Map(cycleEnrollments.map(e => [e.child_id, e]));
		
		console.log(`DEBUG: Found ${cycleEnrollments.length} existing enrollments for cycle ${yearId}`);
		
		for (const p of previews) {
			console.log(`DEBUG: Processing preview for ${p.child_name}, status: ${p.status}`);
			try {
				// Check if child already has an enrollment
				const existingEnrollment = enrollmentMap.get(p.child_id);
				
				// Apply overrides first
				if (p.status === 'override' && p.override_division) {
					const enrollmentData = {
						bible_bee_cycle_id: yearId,
						child_id: p.child_id,
						division_id: p.override_division.id,
						auto_enrolled: false,
						enrolled_at: now,
					};
					
					if (existingEnrollment) {
						// Update existing enrollment
						console.log(`DEBUG: Updating existing override enrollment for ${p.child_name}:`, enrollmentData);
						await this.updateEnrollment(existingEnrollment.id, enrollmentData);
						overrides_updated++;
						console.log(`DEBUG: Override enrollment updated successfully`);
					} else {
						// Create new enrollment
						console.log(`DEBUG: Creating new override enrollment:`, enrollmentData);
						await this.createEnrollment({
							...enrollmentData,
							id: uuidv4(),
						});
						overrides_applied++;
						console.log(`DEBUG: Override enrollment created successfully`);
					}
				}
				// Apply proposed auto-enrollments
				else if (p.status === 'proposed' && p.proposed_division) {
					const enrollmentData = {
						bible_bee_cycle_id: yearId,
						child_id: p.child_id,
						division_id: p.proposed_division.id,
						auto_enrolled: true,
						enrolled_at: now,
					};
					
					if (existingEnrollment) {
						// Update existing enrollment
						console.log(`DEBUG: Updating existing proposed enrollment for ${p.child_name}:`, enrollmentData);
						await this.updateEnrollment(existingEnrollment.id, enrollmentData);
						updated++;
						console.log(`DEBUG: Proposed enrollment updated successfully`);
					} else {
						// Create new enrollment
						console.log(`DEBUG: Creating new proposed enrollment:`, enrollmentData);
						await this.createEnrollment({
							...enrollmentData,
							id: uuidv4(),
						});
						enrolled++;
						console.log(`DEBUG: Proposed enrollment created successfully`);
					}
				}
				// Skip unassigned and unknown_grade children
				else {
					console.log(`DEBUG: Skipping child ${p.child_name} with status: ${p.status}`);
				}
			} catch (error: any) {
				console.error(`DEBUG: Error enrolling ${p.child_name}:`, {
					message: error?.message,
					code: error?.code,
					details: error?.details,
					hint: error?.hint,
					error: error
				});
				errors.push(`Error enrolling ${p.child_name}: ${error?.message || JSON.stringify(error) || 'Unknown error'}`);
			}
		}
		
		console.log(`DEBUG: commitAutoEnrollment completed - enrolled: ${enrolled}, updated: ${updated}, overrides: ${overrides_applied}, overrides_updated: ${overrides_updated}, errors: ${errors.length}`);
		return { enrolled, updated, overrides_applied, overrides_updated, errors };
	}

	// Helper method for grade conversion
	private gradeToCode(grade: string | number | null | undefined): number | null {
		if (!grade) return null;
		const gradeStr = String(grade).trim();
		const gradeNum = parseInt(gradeStr, 10);
		if (isNaN(gradeNum)) return null;
		return gradeNum;
	}
}