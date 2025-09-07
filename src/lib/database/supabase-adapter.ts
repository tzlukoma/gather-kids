import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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
		this.client = customClient || (createClient(supabaseUrl, supabaseAnonKey) as SupabaseClient<Database>);
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
		return data ? supabaseToHousehold(data as any) : null;
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		// Map frontend field names to database column names
		const household = {
			household_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			// Map name to both fields for compatibility during migration
			name: data.name,
			household_name: data.name,
			// Map preferredScriptureTranslation to both fields for compatibility during migration  
			preferredScriptureTranslation: data.preferredScriptureTranslation,
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
		return supabaseToHousehold(result as any);
	}

	async updateHousehold(id: string, data: Partial<Household>): Promise<Household> {
		// Map frontend field names to database column names  
		const updateData: any = {
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
		return supabaseToHousehold(result as any);
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
	return (data || []).map((r: any) => supabaseToHousehold(r));
	}

	async deleteHousehold(id: string): Promise<void> {
		const { error } = await this.client
			.from('households')
			.delete()
			.eq('household_id', id);

		if (error) throw error;
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
	return data ? supabaseToChild(data as any) : null;
	}

	async createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child> {
		// Map frontend field names to database column names
		const child = {
			child_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			// Direct mappings
			household_id: data.household_id,
			first_name: data.first_name,
			last_name: data.last_name,
			is_active: data.is_active,
			photo_url: data.photo_url,
			allergies: data.allergies,
			// Map dob to both fields for compatibility during migration
			dob: data.dob,
			birth_date: data.dob,
			// Map child_mobile to both fields for compatibility  
			child_mobile: data.child_mobile,
			mobile_phone: data.child_mobile,
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
		return supabaseToChild(result as any);
	}

	async updateChild(id: string, data: Partial<Child>): Promise<Child> {
		// Map frontend field names to database column names
		const updateData: any = {
			updated_at: new Date().toISOString(),
		};
		
		// Map fields with proper database column names
		if (data.household_id !== undefined) updateData.household_id = data.household_id;
		if (data.first_name !== undefined) updateData.first_name = data.first_name;
		if (data.last_name !== undefined) updateData.last_name = data.last_name;
		if (data.is_active !== undefined) updateData.is_active = data.is_active;
		if (data.photo_url !== undefined) updateData.photo_url = data.photo_url;
		if (data.allergies !== undefined) updateData.allergies = data.allergies;
		
		// Map dob to both fields for compatibility
		if (data.dob !== undefined) {
			updateData.dob = data.dob;
			updateData.birth_date = data.dob;
		}
		
		// Map child_mobile to both fields for compatibility  
		if (data.child_mobile !== undefined) {
			updateData.child_mobile = data.child_mobile;
			updateData.mobile_phone = data.child_mobile;
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
		return supabaseToChild(result as any);
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
	return (data || []).map((d: any) => supabaseToChild(d));
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
		return data as any;
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
	return result ? supabaseToGuardian(result as any) : result as any;
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
	return result ? supabaseToGuardian(result as any) : result as any;
	}

	async listGuardians(householdId: string): Promise<Guardian[]> {
	const { data, error } = await this.client
			.from('guardians')
			.select('*')
			.eq('household_id', householdId);

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToGuardian(d));
	}

	async listAllGuardians(): Promise<Guardian[]> {
	const { data, error } = await this.client
			.from('guardians')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToGuardian(d));
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
		return data ? supabaseToEmergencyContact(data as any) : null;
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
	return result ? supabaseToEmergencyContact(result as any) : result as any;
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
	return result ? supabaseToEmergencyContact(result as any) : result as any;
	}

	async listEmergencyContacts(householdId: string): Promise<EmergencyContact[]> {
	const { data, error } = await this.client
			.from('emergency_contacts')
			.select('*')
			.eq('household_id', householdId);

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToEmergencyContact(d));
	}

	async listAllEmergencyContacts(): Promise<EmergencyContact[]> {
	const { data, error } = await this.client
			.from('emergency_contacts')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToEmergencyContact(d));
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
	const { data, error } = await this.client
			.from('registration_cycles' as any)
			.select('*')
			.eq('cycle_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? this.mapRegistrationCycle(data as any) : null;
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

	const { data: result, error } = await this.client
			.from('registration_cycles' as any)
			.insert(cycle)
			.select()
			.single();

	if (error) throw error;
	return result ? this.mapRegistrationCycle(result as any) : result as any;
	}

	async updateRegistrationCycle(
		id: string,
		data: Partial<RegistrationCycle>
	): Promise<RegistrationCycle> {
	const { data: result, error } = await this.client
		.from('registration_cycles' as any)
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('cycle_id', id)
			.select()
			.single();

	if (error) throw error;
	return result ? this.mapRegistrationCycle(result as any) : result as any;
	}

	async listRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]> {
    let query = this.client.from('registration_cycles' as any).select('*');

        if (isActive !== undefined) {
            query = query.eq('is_active', isActive);
        }

	const { data, error } = await query as any;
	if (error) throw error;
	return (data || []).map((r: any) => this.mapRegistrationCycle(r));
	}

	private mapRegistrationCycle(row: any): RegistrationCycle {
		return {
			cycle_id: row.cycle_id,
			start_date: row.start_date || '',
			end_date: row.end_date || '',
			is_active: row.is_active ?? false,
		};
	}

	async deleteRegistrationCycle(id: string): Promise<void> {
		const { error } = await this.client
			.from('registration_cycles' as any)
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
		return data ? supabaseToRegistration(data as any) : null;
	}

	async createRegistration(
		data: Omit<Registration, 'registration_id' | 'created_at' | 'updated_at'>
	): Promise<Registration> {
		const registration = {
			...data,
			registration_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const dbPayload: any = { ...registration };
		if (dbPayload.consents) dbPayload.consents = serializeIfObject(dbPayload.consents);

	const { data: result, error } = await this.client
			.from('registrations')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToRegistration(result as any);
	}

	async updateRegistration(
		id: string,
		data: Partial<Registration>
	): Promise<Registration> {
		const payload: any = { ...data };
		if (payload.consents) payload.consents = serializeIfObject(payload.consents);

		const { data: result, error } = await this.client
			.from('registrations')
			.update(payload)
			.eq('registration_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToRegistration(result as any);
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
		return (data || []).map((d: any) => supabaseToRegistration(d));
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
	return data ? supabaseToMinistry(data as any) : null;
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

		const dbPayload: any = { ...ministry };
		if (dbPayload.custom_questions) dbPayload.custom_questions = serializeIfObject(dbPayload.custom_questions);

		const { data: result, error } = await this.client
			.from('ministries')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistry(result as any);
	}

	async updateMinistry(id: string, data: Partial<Ministry>): Promise<Ministry> {
		const dbPayload: any = { ...data, updated_at: new Date().toISOString() };
		if (dbPayload.custom_questions) dbPayload.custom_questions = serializeIfObject(dbPayload.custom_questions);

		const { data: result, error } = await this.client
			.from('ministries')
			.update(dbPayload)
			.eq('ministry_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistry(result as any);
	}

	async listMinistries(isActive?: boolean): Promise<Ministry[]> {
		let query = this.client.from('ministries').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

	const { data, error } = await query;
	if (error) throw error;
	return (data || []).map((d: any) => supabaseToMinistry(d));
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
		return data ? supabaseToMinistryEnrollment(data as any) : null;
	}

	async createMinistryEnrollment(
		data: Omit<MinistryEnrollment, 'enrollment_id' | 'created_at' | 'updated_at'>
	): Promise<MinistryEnrollment> {
		const enrollment = {
			...data,
			enrollment_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const dbPayload: any = { ...enrollment };
		if (dbPayload.custom_fields) dbPayload.custom_fields = serializeIfObject(dbPayload.custom_fields);

		const { data: result, error } = await this.client
			.from('ministry_enrollments')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistryEnrollment(result as any);
	}

	async updateMinistryEnrollment(
		id: string,
		data: Partial<MinistryEnrollment>
	): Promise<MinistryEnrollment> {
		const dbPayload: any = { ...data, updated_at: new Date().toISOString() };
		if (dbPayload.custom_fields) dbPayload.custom_fields = serializeIfObject(dbPayload.custom_fields);

		const { data: result, error } = await this.client
			.from('ministry_enrollments')
			.update(dbPayload)
			.eq('enrollment_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistryEnrollment(result as any);
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
		return (data || []).map((d: any) => supabaseToMinistryEnrollment(d));
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
		return data ? supabaseToAttendance(data as any) : null;
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
		return supabaseToAttendance(result as any);
	}

	async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
		const { data: result, error } = await this.client
			.from('attendance')
			.update(data) // Remove updated_at since attendance table doesn't have this column
			.eq('attendance_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToAttendance(result as any);
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
		return (data || []).map((d: any) => supabaseToAttendance(d));
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
		return data ? supabaseToIncident(data as any) : null;
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
		return supabaseToIncident(result as any);
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
		return supabaseToIncident(result as any);
	}

	async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
		let query = (this.client as any).from('incidents').select('*');

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
		return (data || []).map((d: any) => supabaseToIncident(d));
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
		return data ? supabaseToEvent(data as any) : null;
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

		const dbPayload: any = { ...event };
		if (dbPayload.timeslots) dbPayload.timeslots = serializeIfObject(dbPayload.timeslots);

		const { data: result, error } = await this.client
			.from('events')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToEvent(result as any);
	}

	async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
		const dbPayload: any = { ...data, updated_at: new Date().toISOString() };
		if (dbPayload.timeslots) dbPayload.timeslots = serializeIfObject(dbPayload.timeslots);

		const { data: result, error } = await this.client
			.from('events')
			.update(dbPayload)
			.eq('event_id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToEvent(result as any);
	}

	async listEvents(): Promise<Event[]> {
		const { data, error } = await this.client
			.from('events')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToEvent(d));
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
		return data ? supabaseToUser(data as any) : null;
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
		return supabaseToUser(result as any);
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
		return supabaseToUser(result as any);
	}

	async listUsers(): Promise<User[]> {
		const { data, error } = await this.client
			.from('users')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToUser(d));
	}

	async deleteUser(id: string): Promise<void> {
		const { error } = await this.client
			.from('users')
			.delete()
			.eq('user_id', id);

		if (error) throw error;
	}

	// Leader Profiles

	private mapLeaderProfile(row: any): LeaderProfile {
		return {
			leader_id: row.leader_id,
			first_name: row.first_name || '',
			last_name: row.last_name || '',
			email: row.email || undefined,
			phone: row.phone || undefined,
			photo_url: row.photo_url || undefined,
			avatar_path: row.avatar_path || undefined,
			notes: row.notes || undefined,
			background_check_complete: row.background_check_complete ?? false,
			ministryCount: row.ministryCount ?? 0,
			is_active: row.is_active ?? true,
			created_at: row.created_at || new Date().toISOString(),
			updated_at: row.updated_at || new Date().toISOString(),
		};
	}

	private mapBibleBeeYear(row: any): BibleBeeYear {
		return {
			id: row.id,
			year: row.year ?? undefined,
			name: row.name || undefined,
			label: row.label || undefined,
			cycle_id: row.cycle_id || undefined,
			description: row.description || undefined,
			is_active: row.is_active ?? false,
			registration_open_date: row.registration_open_date || undefined,
			registration_close_date: row.registration_close_date || undefined,
			competition_start_date: row.competition_start_date || undefined,
			competition_end_date: row.competition_end_date || undefined,
			created_at: row.created_at || new Date().toISOString(),
			updated_at: row.updated_at || new Date().toISOString(),
		};
	}


	async getLeaderProfile(id: string): Promise<LeaderProfile | null> {
		const { data, error } = await (this.client as any)
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
		let query = (this.client as any).from('leader_profiles').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: any) => this.mapLeaderProfile(d));
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
		return data ? supabaseToMinistryLeaderMembership(data as any) : null;
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
		const dbPayload: any = { ...membership };
		if (dbPayload.roles && typeof dbPayload.roles !== 'string') {
			dbPayload.roles = JSON.stringify(dbPayload.roles);
		}

		const { data: result, error } = await this.client
			.from('leader_assignments')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistryLeaderMembership(result as any);
	}

	async updateMinistryLeaderMembership(
		id: string,
		data: Partial<MinistryLeaderMembership>
	): Promise<MinistryLeaderMembership> {
		const dbPayload: any = { ...data, updated_at: new Date().toISOString() };
		if (dbPayload.roles && typeof dbPayload.roles !== 'string') {
			dbPayload.roles = JSON.stringify(dbPayload.roles);
		}

		const { data: result, error } = await this.client
			.from('leader_assignments')
			.update(dbPayload)
			.eq('membership_id', id)
			.select()
			.single();

		if (error) throw error;
		return result ? supabaseToMinistryLeaderMembership(result as any) : result;
	}

	async listMinistryLeaderMemberships(
		ministryId?: string,
		leaderId?: string
	): Promise<MinistryLeaderMembership[]> {
	let query = (this.client as any).from('leader_assignments').select('*');

		if (ministryId) {
			query = query.eq('ministry_id', ministryId);
		}
		if (leaderId) {
			query = query.eq('leader_id', leaderId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: any) => supabaseToMinistryLeaderMembership(d));
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
		const { data, error } = await this.client
			.from('ministry_accounts')
			.select('*')
			.eq('ministry_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? supabaseToMinistryAccount(data as any) : null;
	}

	async createMinistryAccount(
		data: Omit<MinistryAccount, 'created_at' | 'updated_at'>
	): Promise<MinistryAccount> {
		const account = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const dbPayload: any = { ...account };
		if (dbPayload.settings && typeof dbPayload.settings !== 'string') {
			dbPayload.settings = JSON.stringify(dbPayload.settings);
		}

		const { data: result, error } = await this.client
			.from('ministry_accounts')
			.insert(dbPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToMinistryAccount(result as any);
	}

	async updateMinistryAccount(
		id: string,
		data: Partial<MinistryAccount>
	): Promise<MinistryAccount> {
		const dbPayload: any = { ...data, updated_at: new Date().toISOString() };
		if (dbPayload.settings && typeof dbPayload.settings !== 'string') {
			dbPayload.settings = JSON.stringify(dbPayload.settings);
		}

		const { data: result, error } = await this.client
			.from('ministry_accounts')
			.update(dbPayload)
			.eq('ministry_id', id)
			.select()
			.single();

		if (error) throw error;
		return result ? supabaseToMinistryAccount(result as any) : result;
	}

	async listMinistryAccounts(): Promise<MinistryAccount[]> {
		const { data, error } = await this.client
			.from('ministry_accounts')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToMinistryAccount(d));
	}

	async deleteMinistryAccount(id: string): Promise<void> {
		const { error } = await this.client
			.from('ministry_accounts')
			.delete()
			.eq('ministry_id', id);

		if (error) throw error;
	}

	// Branding Settings
	async getBrandingSettings(settingId: string): Promise<BrandingSettings | null> {
		const { data, error } = await (this.client as any)
			.from('branding_settings')
			.select('*')
			.eq('setting_id', settingId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? supabaseToBrandingSettings(data as any) : null;
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

		const { data: result, error } = await (this.client as any)
			.from('branding_settings')
			.insert(settings)
			.select()
			.single();

		if (error) throw error;
		return result ? supabaseToBrandingSettings(result as any) : result as any;
	}

	async updateBrandingSettings(
		settingId: string,
		data: Partial<BrandingSettings>
	): Promise<BrandingSettings> {
		const { data: result, error } = await (this.client as any)
			.from('branding_settings')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('setting_id', settingId)
			.select()
			.single();

		if (error) throw error;
		return result ? supabaseToBrandingSettings(result as any) : result as any;
	}

	async listBrandingSettings(): Promise<BrandingSettings[]> {
		const { data, error } = await (this.client as any)
			.from('branding_settings')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => supabaseToBrandingSettings(d));
	}

	async deleteBrandingSettings(settingId: string): Promise<void> {
		const { error } = await this.client
			.from('branding_settings')
			.delete()
			.eq('setting_id', settingId);

		if (error) throw error;
	}

	// Bible Bee entities (simplified implementations)
	async getBibleBeeYear(id: string): Promise<BibleBeeYear | null> {
		const { data, error } = await this.client
			.from('bible_bee_years')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data ? this.mapBibleBeeYear(data) : null;
	}

	async createBibleBeeYear(
		data: Omit<BibleBeeYear, 'created_at' | 'updated_at'>
	): Promise<BibleBeeYear> {
		if (data.year === undefined || data.year === null) throw new Error('year is required for bible bee year');

		const insertPayload = {
			name: data.name ?? '',
			year: data.year,
			description: data.description ?? null,
			is_active: data.is_active ?? null,
			registration_open_date: data.registration_open_date ?? null,
			registration_close_date: data.registration_close_date ?? null,
			competition_start_date: data.competition_start_date ?? null,
			competition_end_date: data.competition_end_date ?? null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('bible_bee_years')
			.insert(insertPayload)
			.select()
			.single();

		if (error) throw error;
		return this.mapBibleBeeYear(result);
	}

	async updateBibleBeeYear(
		id: string,
		data: Partial<BibleBeeYear>
	): Promise<BibleBeeYear> {
		const { data: result, error } = await this.client
			.from('bible_bee_years')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return this.mapBibleBeeYear(result);
	}

	async listBibleBeeYears(): Promise<BibleBeeYear[]> {
		const { data, error } = await this.client
			.from('bible_bee_years')
			.select('*');

		if (error) throw error;
		return (data || []).map((d: any) => this.mapBibleBeeYear(d));
	}

	async deleteBibleBeeYear(id: string): Promise<void> {
		const { error } = await this.client
			.from('bible_bee_years')
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
			bible_bee_year_id: data.year_id ?? null,
			description: (data as any).description ?? null,
			min_age: (data as any).min_age ?? null,
			max_age: (data as any).max_age ?? null,
			min_grade: data.min_grade ?? null,
			max_grade: data.max_grade ?? null,
			min_scriptures: data.minimum_required ?? null,
			requires_essay: (data as any).requires_essay ?? null,
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
		let query = (this.client as any).from('divisions').select('*');

		if (bibleBeeYearId) {
			query = query.eq('bible_bee_year_id', bibleBeeYearId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: any) => this.mapDivision(d));
	}

	private mapDivision(row: any): Division {
		return {
			id: row.id,
			year_id: row.bible_bee_year_id || row.year_id || '',
			name: row.name || '',
			minimum_required: row.minimum_required ?? 0,
			min_last_order: row.min_last_order ?? 0,
			min_grade: row.min_grade ?? 0,
			max_grade: row.max_grade ?? 0,
			created_at: row.created_at || new Date().toISOString(),
			updated_at: row.updated_at || new Date().toISOString(),
		};
	}

	async deleteDivision(id: string): Promise<void> {
		const { error } = await this.client
			.from('divisions')
			.delete()
			.eq('id', id);

		if (error) throw error;
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

	async createEssayPrompt(
		data: Omit<EssayPrompt, 'created_at' | 'updated_at'>
	): Promise<EssayPrompt> {
		const insertPayload = {
			prompt: data.prompt_text,
			title: (data as any).title ?? data.division_name ?? (data.prompt_text ? data.prompt_text.slice(0, 40) : 'Essay Prompt'),
			division_id: null,
			instructions: null,
			min_words: null,
			max_words: null,
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
		const { data: result, error } = await this.client
			.from('essay_prompts')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return this.mapEssayPrompt(result);
	}

	async listEssayPrompts(divisionId?: string): Promise<EssayPrompt[]> {
		let query = (this.client as any).from('essay_prompts').select('*');

		if (divisionId) {
			query = query.eq('division_id', divisionId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: any) => this.mapEssayPrompt(d));
	}

	private mapEssayPrompt(row: any): EssayPrompt {
		return {
			id: row.id,
			year_id: row.year_id || row.bible_bee_year_id || '',
			division_name: row.division_name || undefined,
			prompt_text: row.prompt_text || row.prompt || '',
			due_date: row.due_date || undefined,
			created_at: row.created_at || new Date().toISOString(),
			updated_at: row.updated_at || new Date().toISOString(),
		};
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
		return data ? supabaseToEnrollment(data as any) : null;
	}

	async createEnrollment(
		data: Omit<Enrollment, 'created_at' | 'updated_at'>
	): Promise<Enrollment> {
		if (!data.child_id || !data.year_id || !data.division_id) throw new Error('child_id, year_id and division_id are required for enrollment');

		const insertPayload = {
			childId: data.child_id,
			competitionYearId: data.year_id,
			divisionId: data.division_id,
			auto_enrolled: data.auto_enrolled ?? false,
			enrolled_at: data.enrolled_at ?? new Date().toISOString(),
			id: (data as any).id ?? undefined,
		};

		const { data: result, error } = await this.client
			.from('bible_bee_enrollments')
			.insert(insertPayload)
			.select()
			.single();

		if (error) throw error;
		return supabaseToEnrollment(result as any);
	}

	async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<Enrollment> {
		const payload: any = {};
		if ('child_id' in data) payload.childId = (data as any).child_id;
		if ('year_id' in data) payload.competitionYearId = (data as any).year_id;
		if ('division_id' in data) payload.divisionId = (data as any).division_id;
		if ('auto_enrolled' in data) payload.auto_enrolled = (data as any).auto_enrolled;
		if ('enrolled_at' in data) payload.enrolled_at = (data as any).enrolled_at;
		payload.updated_at = new Date().toISOString();

		const { data: result, error } = await this.client
			.from('bible_bee_enrollments')
			.update(payload)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return supabaseToEnrollment(result as any);
	}

	async listEnrollments(
		childId?: string,
		bibleBeeYearId?: string
	): Promise<Enrollment[]> {
	let query = (this.client as any).from('bible_bee_enrollments').select('*');

		if (childId) {
			query = query.eq('child_id', childId);
		}
		if (bibleBeeYearId) {
			query = query.eq('bible_bee_year_id', bibleBeeYearId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: any) => supabaseToEnrollment(d));
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
		return data ? supabaseToEnrollmentOverride(data as any) : null;
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
		return supabaseToEnrollmentOverride(result as any);
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
		return supabaseToEnrollmentOverride(result as any);
	}

	async listEnrollmentOverrides(enrollmentId?: string): Promise<EnrollmentOverride[]> {
		let query = (this.client as any).from('enrollment_overrides').select('*');

		if (enrollmentId) {
			query = query.eq('enrollment_id', enrollmentId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data || []).map((d: any) => supabaseToEnrollmentOverride(d));
	}

	async deleteEnrollmentOverride(id: string): Promise<void> {
		const { error } = await this.client
			.from('enrollment_overrides')
			.delete()
			.eq('id', id);

		if (error) throw error;
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
}