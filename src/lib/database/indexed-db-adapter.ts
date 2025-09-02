import { db as dexieDb } from '../db'; // Import existing Dexie instance
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter, HouseholdFilters, ChildFilters, RegistrationFilters, AttendanceFilters, IncidentFilters } from './types';
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

export class IndexedDBAdapter implements DatabaseAdapter {
	// Households
	async getHousehold(id: string): Promise<Household | null> {
		const result = await dexieDb.households.get(id);
		return result || null;
	}

	async createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household> {
		const household: Household = {
			...data,
			household_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.households.add(household);
		return household;
	}

	async updateHousehold(id: string, data: Partial<Household>): Promise<Household> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.households.update(id, updated);
		const result = await dexieDb.households.get(id);
		if (!result) throw new Error(`Household ${id} not found after update`);
		return result;
	}

	async listHouseholds(filters?: HouseholdFilters): Promise<Household[]> {
		let collection = dexieDb.households.toCollection();

		if (filters?.city) {
			collection = dexieDb.households.where('city').equals(filters.city);
		}
		if (filters?.state) {
			collection = collection.and(h => h.state === filters.state);
		}
		if (filters?.zip) {
			collection = collection.and(h => h.zip === filters.zip);
		}
		if (filters?.search) {
			const searchLower = filters.search.toLowerCase();
			collection = collection.and(h => 
				(h.address_line1?.toLowerCase().includes(searchLower) || false) ||
				(h.city?.toLowerCase().includes(searchLower) || false)
			);
		}

		if (filters?.offset) {
			collection = collection.offset(filters.offset);
		}
		if (filters?.limit) {
			collection = collection.limit(filters.limit);
		}

		return collection.toArray();
	}

	async deleteHousehold(id: string): Promise<void> {
		await dexieDb.households.delete(id);
	}

	// Children
	async getChild(id: string): Promise<Child | null> {
		const result = await dexieDb.children.get(id);
		return result || null;
	}

	async createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child> {
		const child: Child = {
			...data,
			child_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.children.add(child);
		return child;
	}

	async updateChild(id: string, data: Partial<Child>): Promise<Child> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.children.update(id, updated);
		const result = await dexieDb.children.get(id);
		if (!result) throw new Error(`Child ${id} not found after update`);
		return result;
	}

	async listChildren(filters?: ChildFilters): Promise<Child[]> {
		let collection = dexieDb.children.toCollection();

		if (filters?.householdId) {
			collection = dexieDb.children.where('household_id').equals(filters.householdId);
		}
		if (filters?.isActive !== undefined) {
			collection = collection.and(c => c.is_active === filters.isActive);
		}
		if (filters?.search) {
			const searchLower = filters.search.toLowerCase();
			collection = collection.and(c => 
				c.first_name?.toLowerCase().includes(searchLower) ||
				c.last_name?.toLowerCase().includes(searchLower)
			);
		}

		if (filters?.offset) {
			collection = collection.offset(filters.offset);
		}
		if (filters?.limit) {
			collection = collection.limit(filters.limit);
		}

		return collection.toArray();
	}

	async deleteChild(id: string): Promise<void> {
		await dexieDb.children.delete(id);
	}

	// Guardians
	async getGuardian(id: string): Promise<Guardian | null> {
		const result = await dexieDb.guardians.get(id);
		return result || null;
	}

	async createGuardian(
		data: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'>
	): Promise<Guardian> {
		const guardian: Guardian = {
			...data,
			guardian_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.guardians.add(guardian);
		return guardian;
	}

	async updateGuardian(id: string, data: Partial<Guardian>): Promise<Guardian> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.guardians.update(id, updated);
		const result = await dexieDb.guardians.get(id);
		if (!result) throw new Error(`Guardian ${id} not found after update`);
		return result;
	}

	async listGuardians(householdId: string): Promise<Guardian[]> {
		return dexieDb.guardians.where('household_id').equals(householdId).toArray();
	}

	async deleteGuardian(id: string): Promise<void> {
		await dexieDb.guardians.delete(id);
	}

	// Emergency Contacts
	async getEmergencyContact(id: string): Promise<EmergencyContact | null> {
		const result = await dexieDb.emergency_contacts.get(id);
		return result || null;
	}

	async createEmergencyContact(
		data: Omit<EmergencyContact, 'contact_id'>
	): Promise<EmergencyContact> {
		const contact: EmergencyContact = {
			...data,
			contact_id: uuidv4(),
		};
		await dexieDb.emergency_contacts.add(contact);
		return contact;
	}

	async updateEmergencyContact(
		id: string,
		data: Partial<EmergencyContact>
	): Promise<EmergencyContact> {
		await dexieDb.emergency_contacts.update(id, data);
		const result = await dexieDb.emergency_contacts.get(id);
		if (!result) throw new Error(`Emergency contact ${id} not found after update`);
		return result;
	}

	async listEmergencyContacts(householdId: string): Promise<EmergencyContact[]> {
		return dexieDb.emergency_contacts.where('household_id').equals(householdId).toArray();
	}

	async deleteEmergencyContact(id: string): Promise<void> {
		await dexieDb.emergency_contacts.delete(id);
	}

	// Registration Cycles
	async getRegistrationCycle(id: string): Promise<RegistrationCycle | null> {
		const result = await dexieDb.registration_cycles.get(id);
		return result || null;
	}

	async createRegistrationCycle(
		data: Omit<RegistrationCycle, 'cycle_id'>
	): Promise<RegistrationCycle> {
		const cycle: RegistrationCycle = {
			...data,
			cycle_id: uuidv4(),
		};
		await dexieDb.registration_cycles.add(cycle);
		return cycle;
	}

	async updateRegistrationCycle(
		id: string,
		data: Partial<RegistrationCycle>
	): Promise<RegistrationCycle> {
		await dexieDb.registration_cycles.update(id, data);
		const result = await dexieDb.registration_cycles.get(id);
		if (!result) throw new Error(`Registration cycle ${id} not found after update`);
		return result;
	}

	async listRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]> {
		if (isActive !== undefined) {
			return dexieDb.registration_cycles.filter(cycle => cycle.is_active === isActive).toArray();
		}
		return dexieDb.registration_cycles.toArray();
	}

	async deleteRegistrationCycle(id: string): Promise<void> {
		await dexieDb.registration_cycles.delete(id);
	}

	// Registrations
	async getRegistration(id: string): Promise<Registration | null> {
		const result = await dexieDb.registrations.get(id);
		return result || null;
	}

	async createRegistration(
		data: Omit<Registration, 'registration_id'>
	): Promise<Registration> {
		const registration: Registration = {
			...data,
			registration_id: uuidv4(),
		};
		await dexieDb.registrations.add(registration);
		return registration;
	}

	async updateRegistration(
		id: string,
		data: Partial<Registration>
	): Promise<Registration> {
		await dexieDb.registrations.update(id, data);
		const result = await dexieDb.registrations.get(id);
		if (!result) throw new Error(`Registration ${id} not found after update`);
		return result;
	}

	async listRegistrations(filters?: RegistrationFilters): Promise<Registration[]> {
		let collection = dexieDb.registrations.toCollection();

		if (filters?.childId) {
			collection = dexieDb.registrations.where('child_id').equals(filters.childId);
		}
		if (filters?.cycleId) {
			collection = collection.and(r => r.cycle_id === filters.cycleId);
		}
		if (filters?.status) {
			collection = collection.and(r => r.status === filters.status);
		}

		if (filters?.offset) {
			collection = collection.offset(filters.offset);
		}
		if (filters?.limit) {
			collection = collection.limit(filters.limit);
		}

		return collection.toArray();
	}

	async deleteRegistration(id: string): Promise<void> {
		await dexieDb.registrations.delete(id);
	}

	// Ministries
	async getMinistry(id: string): Promise<Ministry | null> {
		const result = await dexieDb.ministries.get(id);
		return result || null;
	}

	async createMinistry(
		data: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at'>
	): Promise<Ministry> {
		const ministry: Ministry = {
			...data,
			ministry_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministries.add(ministry);
		return ministry;
	}

	async updateMinistry(id: string, data: Partial<Ministry>): Promise<Ministry> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministries.update(id, updated);
		const result = await dexieDb.ministries.get(id);
		if (!result) throw new Error(`Ministry ${id} not found after update`);
		return result;
	}

	async listMinistries(isActive?: boolean): Promise<Ministry[]> {
		if (isActive !== undefined) {
			return dexieDb.ministries.filter(ministry => ministry.is_active === isActive).toArray();
		}
		return dexieDb.ministries.toArray();
	}

	async deleteMinistry(id: string): Promise<void> {
		await dexieDb.ministries.delete(id);
	}

	// Ministry Enrollments
	async getMinistryEnrollment(id: string): Promise<MinistryEnrollment | null> {
		const result = await dexieDb.ministry_enrollments.get(id);
		return result || null;
	}

	async createMinistryEnrollment(
		data: Omit<MinistryEnrollment, 'enrollment_id'>
	): Promise<MinistryEnrollment> {
		const enrollment: MinistryEnrollment = {
			...data,
			enrollment_id: uuidv4(),
		};
		await dexieDb.ministry_enrollments.add(enrollment);
		return enrollment;
	}

	async updateMinistryEnrollment(
		id: string,
		data: Partial<MinistryEnrollment>
	): Promise<MinistryEnrollment> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministry_enrollments.update(id, updated);
		const result = await dexieDb.ministry_enrollments.get(id);
		if (!result) throw new Error(`Ministry enrollment ${id} not found after update`);
		return result;
	}

	async listMinistryEnrollments(
		childId?: string,
		ministryId?: string,
		cycleId?: string
	): Promise<MinistryEnrollment[]> {
		let collection = dexieDb.ministry_enrollments.toCollection();

		if (childId) {
			collection = dexieDb.ministry_enrollments.where('child_id').equals(childId);
		}
		if (ministryId) {
			collection = collection.and(e => e.ministry_id === ministryId);
		}
		if (cycleId) {
			collection = collection.and(e => e.cycle_id === cycleId);
		}

		return collection.toArray();
	}

	async deleteMinistryEnrollment(id: string): Promise<void> {
		await dexieDb.ministry_enrollments.delete(id);
	}

	// Attendance
	async getAttendance(id: string): Promise<Attendance | null> {
		const result = await dexieDb.attendance.get(id);
		return result || null;
	}

	async createAttendance(
		data: Omit<Attendance, 'attendance_id'>
	): Promise<Attendance> {
		const attendance: Attendance = {
			...data,
			attendance_id: uuidv4(),
		};
		await dexieDb.attendance.add(attendance);
		return attendance;
	}

	async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
		await dexieDb.attendance.update(id, data);
		const result = await dexieDb.attendance.get(id);
		if (!result) throw new Error(`Attendance ${id} not found after update`);
		return result;
	}

	async listAttendance(filters?: AttendanceFilters): Promise<Attendance[]> {
		let collection = dexieDb.attendance.toCollection();

		if (filters?.childId) {
			collection = dexieDb.attendance.where('child_id').equals(filters.childId);
		}
		if (filters?.eventId) {
			collection = collection.and(a => a.event_id === filters.eventId);
		}
		if (filters?.date) {
			collection = collection.and(a => a.date === filters.date);
		}

		if (filters?.offset) {
			collection = collection.offset(filters.offset);
		}
		if (filters?.limit) {
			collection = collection.limit(filters.limit);
		}

		return collection.toArray();
	}

	async deleteAttendance(id: string): Promise<void> {
		await dexieDb.attendance.delete(id);
	}

	// Incidents
	async getIncident(id: string): Promise<Incident | null> {
		const result = await dexieDb.incidents.get(id);
		return result || null;
	}

	async createIncident(
		data: Omit<Incident, 'incident_id'>
	): Promise<Incident> {
		const incident: Incident = {
			...data,
			incident_id: uuidv4(),
		};
		await dexieDb.incidents.add(incident);
		return incident;
	}

	async updateIncident(id: string, data: Partial<Incident>): Promise<Incident> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.incidents.update(id, updated);
		const result = await dexieDb.incidents.get(id);
		if (!result) throw new Error(`Incident ${id} not found after update`);
		return result;
	}

	async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
		let collection = dexieDb.incidents.toCollection();

		if (filters?.childId) {
			collection = dexieDb.incidents.where('child_id').equals(filters.childId);
		}
		if (filters?.resolved !== undefined) {
			collection = collection.and(i => 
				filters.resolved ? (i.admin_acknowledged_at != null) : (i.admin_acknowledged_at == null)
			);
		}

		if (filters?.offset) {
			collection = collection.offset(filters.offset);
		}
		if (filters?.limit) {
			collection = collection.limit(filters.limit);
		}

		return collection.toArray();
	}

	async deleteIncident(id: string): Promise<void> {
		await dexieDb.incidents.delete(id);
	}

	// Events
	async getEvent(id: string): Promise<Event | null> {
		const result = await dexieDb.events.get(id);
		return result || null;
	}

	async createEvent(
		data: Omit<Event, 'event_id'>
	): Promise<Event> {
		const event: Event = {
			...data,
			event_id: uuidv4(),
		};
		await dexieDb.events.add(event);
		return event;
	}

	async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
		await dexieDb.events.update(id, data);
		const result = await dexieDb.events.get(id);
		if (!result) throw new Error(`Event ${id} not found after update`);
		return result;
	}

	async listEvents(): Promise<Event[]> {
		return dexieDb.events.toArray();
	}

	async deleteEvent(id: string): Promise<void> {
		await dexieDb.events.delete(id);
	}

	// Users
	async getUser(id: string): Promise<User | null> {
		const result = await dexieDb.users.get(id);
		return result || null;
	}

	async createUser(
		data: Omit<User, 'user_id'>
	): Promise<User> {
		const user: User = {
			...data,
			user_id: uuidv4(),
		};
		await dexieDb.users.add(user);
		return user;
	}

	async updateUser(id: string, data: Partial<User>): Promise<User> {
		await dexieDb.users.update(id, data);
		const result = await dexieDb.users.get(id);
		if (!result) throw new Error(`User ${id} not found after update`);
		return result;
	}

	async listUsers(): Promise<User[]> {
		return dexieDb.users.toArray();
	}

	async deleteUser(id: string): Promise<void> {
		await dexieDb.users.delete(id);
	}

	// Leader Profiles
	async getLeaderProfile(id: string): Promise<LeaderProfile | null> {
		const result = await dexieDb.leader_profiles.get(id);
		return result || null;
	}

	async createLeaderProfile(
		data: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'>
	): Promise<LeaderProfile> {
		const leader: LeaderProfile = {
			...data,
			leader_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.leader_profiles.add(leader);
		return leader;
	}

	async updateLeaderProfile(
		id: string,
		data: Partial<LeaderProfile>
	): Promise<LeaderProfile> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.leader_profiles.update(id, updated);
		const result = await dexieDb.leader_profiles.get(id);
		if (!result) throw new Error(`Leader profile ${id} not found after update`);
		return result;
	}

	async listLeaderProfiles(isActive?: boolean): Promise<LeaderProfile[]> {
		if (isActive !== undefined) {
			return dexieDb.leader_profiles.filter(profile => profile.is_active === isActive).toArray();
		}
		return dexieDb.leader_profiles.toArray();
	}

	async deleteLeaderProfile(id: string): Promise<void> {
		await dexieDb.leader_profiles.delete(id);
	}

	// Ministry Leader Memberships
	async getMinistryLeaderMembership(
		id: string
	): Promise<MinistryLeaderMembership | null> {
		const result = await dexieDb.ministry_leader_memberships.get(id);
		return result || null;
	}

	async createMinistryLeaderMembership(
		data: Omit<MinistryLeaderMembership, 'membership_id' | 'created_at' | 'updated_at'>
	): Promise<MinistryLeaderMembership> {
		const membership: MinistryLeaderMembership = {
			...data,
			membership_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministry_leader_memberships.add(membership);
		return membership;
	}

	async updateMinistryLeaderMembership(
		id: string,
		data: Partial<MinistryLeaderMembership>
	): Promise<MinistryLeaderMembership> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministry_leader_memberships.update(id, updated);
		const result = await dexieDb.ministry_leader_memberships.get(id);
		if (!result) throw new Error(`Ministry leader membership ${id} not found after update`);
		return result;
	}

	async listMinistryLeaderMemberships(
		ministryId?: string,
		leaderId?: string
	): Promise<MinistryLeaderMembership[]> {
		let collection = dexieDb.ministry_leader_memberships.toCollection();

		if (ministryId) {
			collection = dexieDb.ministry_leader_memberships.where('ministry_id').equals(ministryId);
		}
		if (leaderId) {
			collection = collection.and(m => m.leader_id === leaderId);
		}

		return collection.toArray();
	}

	async deleteMinistryLeaderMembership(id: string): Promise<void> {
		await dexieDb.ministry_leader_memberships.delete(id);
	}

	// Ministry Accounts
	async getMinistryAccount(id: string): Promise<MinistryAccount | null> {
		const result = await dexieDb.ministry_accounts.get(id);
		return result || null;
	}

	async createMinistryAccount(
		data: Omit<MinistryAccount, 'created_at' | 'updated_at'>
	): Promise<MinistryAccount> {
		const account: MinistryAccount = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministry_accounts.add(account);
		return account;
	}

	async updateMinistryAccount(
		id: string,
		data: Partial<MinistryAccount>
	): Promise<MinistryAccount> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.ministry_accounts.update(id, updated);
		const result = await dexieDb.ministry_accounts.get(id);
		if (!result) throw new Error(`Ministry account ${id} not found after update`);
		return result;
	}

	async listMinistryAccounts(): Promise<MinistryAccount[]> {
		return dexieDb.ministry_accounts.toArray();
	}

	async deleteMinistryAccount(id: string): Promise<void> {
		await dexieDb.ministry_accounts.delete(id);
	}

	// Branding Settings
	async getBrandingSettings(settingId: string): Promise<BrandingSettings | null> {
		const result = await dexieDb.branding_settings.get(settingId);
		return result || null;
	}

	async createBrandingSettings(
		data: Omit<BrandingSettings, 'setting_id' | 'created_at' | 'updated_at'>
	): Promise<BrandingSettings> {
		const settings: BrandingSettings = {
			...data,
			setting_id: uuidv4(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.branding_settings.add(settings);
		return settings;
	}

	async updateBrandingSettings(
		settingId: string,
		data: Partial<BrandingSettings>
	): Promise<BrandingSettings> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.branding_settings.update(settingId, updated);
		const result = await dexieDb.branding_settings.get(settingId);
		if (!result) throw new Error(`Branding settings ${settingId} not found after update`);
		return result;
	}

	async listBrandingSettings(): Promise<BrandingSettings[]> {
		return dexieDb.branding_settings.toArray();
	}

	async deleteBrandingSettings(settingId: string): Promise<void> {
		await dexieDb.branding_settings.delete(settingId);
	}

	// Bible Bee entities (simplified implementations)
	async getBibleBeeYear(id: string): Promise<BibleBeeYear | null> {
		const result = await dexieDb.bible_bee_years.get(id);
		return result || null;
	}

	async createBibleBeeYear(
		data: Omit<BibleBeeYear, 'created_at'>
	): Promise<BibleBeeYear> {
		const year: BibleBeeYear = {
			...data,
			created_at: new Date().toISOString(),
		};
		await dexieDb.bible_bee_years.add(year);
		return year;
	}

	async updateBibleBeeYear(
		id: string,
		data: Partial<BibleBeeYear>
	): Promise<BibleBeeYear> {
		await dexieDb.bible_bee_years.update(id, data);
		const result = await dexieDb.bible_bee_years.get(id);
		if (!result) throw new Error(`Bible Bee year ${id} not found after update`);
		return result;
	}

	async listBibleBeeYears(): Promise<BibleBeeYear[]> {
		return dexieDb.bible_bee_years.toArray();
	}

	async deleteBibleBeeYear(id: string): Promise<void> {
		await dexieDb.bible_bee_years.delete(id);
	}

	async getDivision(id: string): Promise<Division | null> {
		const result = await dexieDb.divisions.get(id);
		return result || null;
	}

	async createDivision(
		data: Omit<Division, 'created_at' | 'updated_at'>
	): Promise<Division> {
		const division: Division = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.divisions.add(division);
		return division;
	}

	async updateDivision(id: string, data: Partial<Division>): Promise<Division> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.divisions.update(id, updated);
		const result = await dexieDb.divisions.get(id);
		if (!result) throw new Error(`Division ${id} not found after update`);
		return result;
	}

	async listDivisions(bibleBeeYearId?: string): Promise<Division[]> {
		if (bibleBeeYearId) {
			return dexieDb.divisions.where('bible_bee_year_id').equals(bibleBeeYearId).toArray();
		}
		return dexieDb.divisions.toArray();
	}

	async deleteDivision(id: string): Promise<void> {
		await dexieDb.divisions.delete(id);
	}

	async getEssayPrompt(id: string): Promise<EssayPrompt | null> {
		const result = await dexieDb.essay_prompts.get(id);
		return result || null;
	}

	async createEssayPrompt(
		data: Omit<EssayPrompt, 'created_at' | 'updated_at'>
	): Promise<EssayPrompt> {
		const prompt: EssayPrompt = {
			...data,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		await dexieDb.essay_prompts.add(prompt);
		return prompt;
	}

	async updateEssayPrompt(
		id: string,
		data: Partial<EssayPrompt>
	): Promise<EssayPrompt> {
		const updated = {
			...data,
			updated_at: new Date().toISOString(),
		};
		await dexieDb.essay_prompts.update(id, updated);
		const result = await dexieDb.essay_prompts.get(id);
		if (!result) throw new Error(`Essay prompt ${id} not found after update`);
		return result;
	}

	async listEssayPrompts(divisionId?: string): Promise<EssayPrompt[]> {
		if (divisionId) {
			return dexieDb.essay_prompts.where('division_id').equals(divisionId).toArray();
		}
		return dexieDb.essay_prompts.toArray();
	}

	async deleteEssayPrompt(id: string): Promise<void> {
		await dexieDb.essay_prompts.delete(id);
	}

	async getEnrollment(id: string): Promise<Enrollment | null> {
		const result = await dexieDb.enrollments.get(id);
		return result || null;
	}

	async createEnrollment(
		data: Omit<Enrollment, 'id'>
	): Promise<Enrollment> {
		const enrollment: Enrollment = {
			...data,
			id: uuidv4(),
		};
		await dexieDb.enrollments.add(enrollment);
		return enrollment;
	}

	async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<Enrollment> {
		await dexieDb.enrollments.update(id, data);
		const result = await dexieDb.enrollments.get(id);
		if (!result) throw new Error(`Enrollment ${id} not found after update`);
		return result;
	}

	async listEnrollments(
		childId?: string,
		bibleBeeYearId?: string
	): Promise<Enrollment[]> {
		let collection = dexieDb.enrollments.toCollection();

		if (childId) {
			collection = dexieDb.enrollments.where('child_id').equals(childId);
		}
		if (bibleBeeYearId) {
			collection = collection.and(e => e.year_id === bibleBeeYearId);
		}

		return collection.toArray();
	}

	async deleteEnrollment(id: string): Promise<void> {
		await dexieDb.enrollments.delete(id);
	}

	async getEnrollmentOverride(id: string): Promise<EnrollmentOverride | null> {
		const result = await dexieDb.enrollment_overrides.get(id);
		return result || null;
	}

	async createEnrollmentOverride(
		data: Omit<EnrollmentOverride, 'created_at'>
	): Promise<EnrollmentOverride> {
		const override: EnrollmentOverride = {
			...data,
			created_at: new Date().toISOString(),
		};
		await dexieDb.enrollment_overrides.add(override);
		return override;
	}

	async updateEnrollmentOverride(
		id: string,
		data: Partial<EnrollmentOverride>
	): Promise<EnrollmentOverride> {
		await dexieDb.enrollment_overrides.update(id, data);
		const result = await dexieDb.enrollment_overrides.get(id);
		if (!result) throw new Error(`Enrollment override ${id} not found after update`);
		return result;
	}

	async listEnrollmentOverrides(enrollmentId?: string): Promise<EnrollmentOverride[]> {
		if (enrollmentId) {
			return dexieDb.enrollment_overrides.where('enrollment_id').equals(enrollmentId).toArray();
		}
		return dexieDb.enrollment_overrides.toArray();
	}

	async deleteEnrollmentOverride(id: string): Promise<void> {
		await dexieDb.enrollment_overrides.delete(id);
	}

	// No-op for realtime subscriptions in demo mode
	subscribeToTable<T>(_table: string, _callback: (payload: T) => void): () => void {
		// Return unsubscribe function that does nothing
		return () => {};
	}

	// Implement transaction support using Dexie
	async transaction<T>(callback: () => Promise<T>): Promise<T> {
		return dexieDb.transaction(
			'rw',
			[
				dexieDb.households,
				dexieDb.children,
				dexieDb.guardians,
				dexieDb.emergency_contacts,
				dexieDb.registration_cycles,
				dexieDb.registrations,
				dexieDb.ministries,
				dexieDb.ministry_enrollments,
				dexieDb.attendance,
				dexieDb.incidents,
				dexieDb.events,
				dexieDb.users,
				dexieDb.leader_profiles,
				dexieDb.ministry_leader_memberships,
				dexieDb.ministry_accounts,
				dexieDb.branding_settings,
				dexieDb.bible_bee_years,
				dexieDb.divisions,
				dexieDb.essay_prompts,
				dexieDb.enrollments,
				dexieDb.enrollment_overrides,
			],
			async () => {
				return callback();
			}
		);
	}
}