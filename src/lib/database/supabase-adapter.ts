import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter, HouseholdFilters, ChildFilters, RegistrationFilters, AttendanceFilters, IncidentFilters } from './types';
import type { Database } from './supabase-types';
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
	private client: SupabaseClient<Database>;


constructor(supabaseUrl: string, supabaseAnonKey: string, customClient?: SupabaseClient<Database>) {
	this.client = customClient || createClient<Database>(supabaseUrl, supabaseAnonKey);
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
		return data;
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		const household = {
			...data,
			household_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('households')
			.insert(household)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateHousehold(id: string, data: Partial<Household>): Promise<Household> {
		const { data: result, error } = await this.client
			.from('households')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('household_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return data || [];
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
		return data;
	}

	async createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child> {
		const child = {
			...data,
			child_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('children')
			.insert(child)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateChild(id: string, data: Partial<Child>): Promise<Child> {
		const { data: result, error } = await this.client
			.from('children')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('child_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return data || [];
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
		return data;
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
		return result;
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
		return result;
	}

	async listGuardians(householdId: string): Promise<Guardian[]> {
		const { data, error } = await this.client
			.from('guardians')
			.select('*')
			.eq('household_id', householdId);

		if (error) throw error;
		return data || [];
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
		return data;
	}

	async createEmergencyContact(
		data: Omit<EmergencyContact, 'contact_id' | 'created_at' | 'updated_at'>
	): Promise<EmergencyContact> {
		const contact = {
			...data,
			contact_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('emergency_contacts')
			.insert(contact)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return result;
	}

	async listEmergencyContacts(householdId: string): Promise<EmergencyContact[]> {
		const { data, error } = await this.client
			.from('emergency_contacts')
			.select('*')
			.eq('household_id', householdId);

		if (error) throw error;
		return data || [];
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
			.from('registration_cycles')
			.select('*')
			.eq('cycle_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data;
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
			.from('registration_cycles')
			.insert(cycle)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateRegistrationCycle(
		id: string,
		data: Partial<RegistrationCycle>
	): Promise<RegistrationCycle> {
		const { data: result, error } = await this.client
			.from('registration_cycles')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('cycle_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]> {
		let query = this.client.from('registration_cycles').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
	}

	async deleteRegistrationCycle(id: string): Promise<void> {
		const { error } = await this.client
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
		return data;
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

		const { data: result, error } = await this.client
			.from('registrations')
			.insert(registration)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateRegistration(
		id: string,
		data: Partial<Registration>
	): Promise<Registration> {
		const { data: result, error } = await this.client
			.from('registrations')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('registration_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return data || [];
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
		return data;
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

		const { data: result, error } = await this.client
			.from('ministries')
			.insert(ministry)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateMinistry(id: string, data: Partial<Ministry>): Promise<Ministry> {
		const { data: result, error } = await this.client
			.from('ministries')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('ministry_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listMinistries(isActive?: boolean): Promise<Ministry[]> {
		let query = this.client.from('ministries').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
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
		return data;
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

		const { data: result, error } = await this.client
			.from('ministry_enrollments')
			.insert(enrollment)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateMinistryEnrollment(
		id: string,
		data: Partial<MinistryEnrollment>
	): Promise<MinistryEnrollment> {
		const { data: result, error } = await this.client
			.from('ministry_enrollments')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('enrollment_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return data || [];
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
		return data;
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
		return result;
	}

	async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
		const { data: result, error } = await this.client
			.from('attendance')
			.update(data) // Remove updated_at since attendance table doesn't have this column
			.eq('attendance_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return data || [];
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
		return data;
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
		return result;
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
		return result;
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
		return data || [];
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
		return data;
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

		const { data: result, error } = await this.client
			.from('events')
			.insert(event)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
		const { data: result, error } = await this.client
			.from('events')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('event_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listEvents(): Promise<Event[]> {
		const { data, error } = await this.client
			.from('events')
			.select('*');

		if (error) throw error;
		return data || [];
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
		return data;
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
		return result;
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
		return result;
	}

	async listUsers(): Promise<User[]> {
		const { data, error } = await this.client
			.from('users')
			.select('*');

		if (error) throw error;
		return data || [];
	}

	async deleteUser(id: string): Promise<void> {
		const { error } = await this.client
			.from('users')
			.delete()
			.eq('user_id', id);

		if (error) throw error;
	}

	// Leader Profiles
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
		return data;
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
		return result;
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
		return result;
	}

	async listLeaderProfiles(isActive?: boolean): Promise<LeaderProfile[]> {
		let query = this.client.from('leader_profiles').select('*');

		if (isActive !== undefined) {
			query = query.eq('is_active', isActive);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
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
			.from('ministry_leader_memberships')
			.select('*')
			.eq('membership_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data;
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

		const { data: result, error } = await this.client
			.from('ministry_leader_memberships')
			.insert(membership)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateMinistryLeaderMembership(
		id: string,
		data: Partial<MinistryLeaderMembership>
	): Promise<MinistryLeaderMembership> {
		const { data: result, error } = await this.client
			.from('ministry_leader_memberships')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('membership_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listMinistryLeaderMemberships(
		ministryId?: string,
		leaderId?: string
	): Promise<MinistryLeaderMembership[]> {
		let query = this.client.from('ministry_leader_memberships').select('*');

		if (ministryId) {
			query = query.eq('ministry_id', ministryId);
		}
		if (leaderId) {
			query = query.eq('leader_id', leaderId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
	}

	async deleteMinistryLeaderMembership(id: string): Promise<void> {
		const { error } = await this.client
			.from('ministry_leader_memberships')
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
		return data;
	}

	async createMinistryAccount(
		data: Omit<MinistryAccount, 'created_at' | 'updated_at'>
	): Promise<MinistryAccount> {
		const account = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('ministry_accounts')
			.insert(account)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateMinistryAccount(
		id: string,
		data: Partial<MinistryAccount>
	): Promise<MinistryAccount> {
		const { data: result, error } = await this.client
			.from('ministry_accounts')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('ministry_id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listMinistryAccounts(): Promise<MinistryAccount[]> {
		const { data, error } = await this.client
			.from('ministry_accounts')
			.select('*');

		if (error) throw error;
		return data || [];
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
		const { data, error } = await this.client
			.from('branding_settings')
			.select('*')
			.eq('setting_id', settingId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data;
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
		return result;
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
		return result;
	}

	async listBrandingSettings(): Promise<BrandingSettings[]> {
		const { data, error } = await this.client
			.from('branding_settings')
			.select('*');

		if (error) throw error;
		return data || [];
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
		return data;
	}

	async createBibleBeeYear(
		data: Omit<BibleBeeYear, 'created_at' | 'updated_at'>
	): Promise<BibleBeeYear> {
		const year = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('bible_bee_years')
			.insert(year)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return result;
	}

	async listBibleBeeYears(): Promise<BibleBeeYear[]> {
		const { data, error } = await this.client
			.from('bible_bee_years')
			.select('*');

		if (error) throw error;
		return data || [];
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
		return data;
	}

	async createDivision(
		data: Omit<Division, 'created_at' | 'updated_at'>
	): Promise<Division> {
		const division = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('divisions')
			.insert(division)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return result;
	}

	async listDivisions(bibleBeeYearId?: string): Promise<Division[]> {
		let query = this.client.from('divisions').select('*');

		if (bibleBeeYearId) {
			query = query.eq('bible_bee_year_id', bibleBeeYearId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
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
		return data;
	}

	async createEssayPrompt(
		data: Omit<EssayPrompt, 'created_at' | 'updated_at'>
	): Promise<EssayPrompt> {
		const prompt = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('essay_prompts')
			.insert(prompt)
			.select()
			.single();

		if (error) throw error;
		return result;
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
		return result;
	}

	async listEssayPrompts(divisionId?: string): Promise<EssayPrompt[]> {
		let query = this.client.from('essay_prompts').select('*');

		if (divisionId) {
			query = query.eq('division_id', divisionId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
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
			.from('enrollments')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw error;
		}
		return data;
	}

	async createEnrollment(
		data: Omit<Enrollment, 'created_at' | 'updated_at'>
	): Promise<Enrollment> {
		const enrollment = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		const { data: result, error } = await this.client
			.from('enrollments')
			.insert(enrollment)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<Enrollment> {
		const { data: result, error } = await this.client
			.from('enrollments')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return result;
	}

	async listEnrollments(
		childId?: string,
		bibleBeeYearId?: string
	): Promise<Enrollment[]> {
		let query = this.client.from('enrollments').select('*');

		if (childId) {
			query = query.eq('child_id', childId);
		}
		if (bibleBeeYearId) {
			query = query.eq('bible_bee_year_id', bibleBeeYearId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
	}

	async deleteEnrollment(id: string): Promise<void> {
		const { error } = await this.client
			.from('enrollments')
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
		return data;
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
		return result;
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
		return result;
	}

	async listEnrollmentOverrides(enrollmentId?: string): Promise<EnrollmentOverride[]> {
		let query = this.client.from('enrollment_overrides').select('*');

		if (enrollmentId) {
			query = query.eq('enrollment_id', enrollmentId);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
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