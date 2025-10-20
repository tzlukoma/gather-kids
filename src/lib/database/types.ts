// Import shared domain types
import type {
	Household,
	Guardian,
	EmergencyContact,
	Child,
	RegistrationCycle,
	ChildYearProfile,
	Registration,
	Ministry,
	MinistryEnrollment,
	LeaderProfile,
	MinistryLeaderMembership,
	MinistryAccount,
	MinistryGroup,
	MinistryGroupMember,
	User,
	Event,
	Attendance,
	Incident,
	BibleBeeYear,
	Division,
	EssayPrompt,
	Enrollment,
	EnrollmentOverride,
	BrandingSettings,
	Scripture,
	StudentEssay,
	AuditLogEntry,
} from '../types';

// Filter and query types (to be extended as needed)
export interface BaseFilters {
	limit?: number;
	offset?: number;
}

export interface HouseholdFilters extends BaseFilters {
	city?: string;
	state?: string;
	zip?: string;
	search?: string;
}

export interface ChildFilters extends BaseFilters {
	householdId?: string;
	isActive?: boolean;
	search?: string;
}

export interface RegistrationFilters extends BaseFilters {
	childId?: string;
	cycleId?: string;
	status?: string;
}

export interface AttendanceFilters extends BaseFilters {
	childId?: string;
	eventId?: string;
	date?: string;
}

export interface IncidentFilters extends BaseFilters {
	childId?: string;
	resolved?: boolean;
}

// Define the DatabaseAdapter interface with CRUD operations for each entity
export interface DatabaseAdapter {
	// Households
	getHousehold(id: string): Promise<Household | null>;
	createHousehold(
		data: Omit<Household, 'household_id' | 'created_at' | 'updated_at'>
	): Promise<Household>;
	updateHousehold(id: string, data: Partial<Household>): Promise<Household>;
	listHouseholds(filters?: HouseholdFilters): Promise<Household[]>;
	deleteHousehold(id: string): Promise<void>;
	getHouseholdForUser(authUserId: string): Promise<string | null>;

	// Children
	getChild(id: string): Promise<Child | null>;
	createChild(
		data: Omit<Child, 'child_id' | 'created_at' | 'updated_at'>
	): Promise<Child>;
	updateChild(id: string, data: Partial<Child>): Promise<Child>;
	listChildren(filters?: ChildFilters): Promise<Child[]>;
	deleteChild(id: string): Promise<void>;

	// Guardians
	getGuardian(id: string): Promise<Guardian | null>;
	createGuardian(
		data: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'>
	): Promise<Guardian>;
	updateGuardian(id: string, data: Partial<Guardian>): Promise<Guardian>;
	listGuardians(householdId: string): Promise<Guardian[]>;
	listAllGuardians(): Promise<Guardian[]>;
	deleteGuardian(id: string): Promise<void>;

	// Emergency Contacts
	getEmergencyContact(id: string): Promise<EmergencyContact | null>;
	createEmergencyContact(
		data: Omit<EmergencyContact, 'contact_id' | 'created_at' | 'updated_at'>
	): Promise<EmergencyContact>;
	updateEmergencyContact(
		id: string,
		data: Partial<EmergencyContact>
	): Promise<EmergencyContact>;
	listEmergencyContacts(householdId: string): Promise<EmergencyContact[]>;
	listAllEmergencyContacts(): Promise<EmergencyContact[]>;
	deleteEmergencyContact(id: string): Promise<void>;

	// Registration Cycles
	getRegistrationCycle(id: string): Promise<RegistrationCycle | null>;
	createRegistrationCycle(
		data: Omit<RegistrationCycle, 'cycle_id' | 'created_at' | 'updated_at'>
	): Promise<RegistrationCycle>;
	updateRegistrationCycle(
		id: string,
		data: Partial<RegistrationCycle>
	): Promise<RegistrationCycle>;
	listRegistrationCycles(isActive?: boolean): Promise<RegistrationCycle[]>;
	deleteRegistrationCycle(id: string): Promise<void>;

	// Registrations
	getRegistration(id: string): Promise<Registration | null>;
	createRegistration(
		data: Omit<Registration, 'registration_id' | 'created_at' | 'updated_at'>
	): Promise<Registration>;
	updateRegistration(
		id: string,
		data: Partial<Registration>
	): Promise<Registration>;
	listRegistrations(filters?: RegistrationFilters): Promise<Registration[]>;
	deleteRegistration(id: string): Promise<void>;

	// Ministries
	getMinistry(id: string): Promise<Ministry | null>;
	createMinistry(
		data: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at'>
	): Promise<Ministry>;
	updateMinistry(id: string, data: Partial<Ministry>): Promise<Ministry>;
	listMinistries(isActive?: boolean): Promise<Ministry[]>;
	deleteMinistry(id: string): Promise<void>;

	// Ministry Enrollments
	getMinistryEnrollment(id: string): Promise<MinistryEnrollment | null>;
	createMinistryEnrollment(
		data: Omit<
			MinistryEnrollment,
			'enrollment_id' | 'created_at' | 'updated_at'
		>
	): Promise<MinistryEnrollment>;
	updateMinistryEnrollment(
		id: string,
		data: Partial<MinistryEnrollment>
	): Promise<MinistryEnrollment>;
	listMinistryEnrollments(
		childId?: string,
		ministryId?: string,
		cycleId?: string
	): Promise<MinistryEnrollment[]>;
	deleteMinistryEnrollment(id: string): Promise<void>;

	// Attendance
	getAttendance(id: string): Promise<Attendance | null>;
	createAttendance(
		data: Omit<Attendance, 'attendance_id' | 'created_at' | 'updated_at'>
	): Promise<Attendance>;
	updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance>;
	listAttendance(filters?: AttendanceFilters): Promise<Attendance[]>;
	deleteAttendance(id: string): Promise<void>;

	// Incidents
	getIncident(id: string): Promise<Incident | null>;
	createIncident(
		data: Omit<Incident, 'incident_id' | 'created_at' | 'updated_at'>
	): Promise<Incident>;
	updateIncident(id: string, data: Partial<Incident>): Promise<Incident>;
	listIncidents(filters?: IncidentFilters): Promise<Incident[]>;
	deleteIncident(id: string): Promise<void>;

	// Events
	getEvent(id: string): Promise<Event | null>;
	createEvent(
		data: Omit<Event, 'event_id' | 'created_at' | 'updated_at'>
	): Promise<Event>;
	updateEvent(id: string, data: Partial<Event>): Promise<Event>;
	listEvents(): Promise<Event[]>;
	deleteEvent(id: string): Promise<void>;

	// Users
	getUser(id: string): Promise<User | null>;
	createUser(
		data: Omit<User, 'user_id' | 'created_at' | 'updated_at'>
	): Promise<User>;
	updateUser(id: string, data: Partial<User>): Promise<User>;
	listUsers(): Promise<User[]>;
	deleteUser(id: string): Promise<void>;

	// Leader Profiles
	getLeaderProfile(id: string): Promise<LeaderProfile | null>;
	createLeaderProfile(
		data: Omit<LeaderProfile, 'leader_id' | 'created_at' | 'updated_at'>
	): Promise<LeaderProfile>;
	updateLeaderProfile(
		id: string,
		data: Partial<LeaderProfile>
	): Promise<LeaderProfile>;
	listLeaderProfiles(isActive?: boolean): Promise<LeaderProfile[]>;
	deleteLeaderProfile(id: string): Promise<void>;

	// Ministry Leader Memberships
	getMinistryLeaderMembership(
		id: string
	): Promise<MinistryLeaderMembership | null>;
	createMinistryLeaderMembership(
		data: Omit<
			MinistryLeaderMembership,
			'membership_id' | 'created_at' | 'updated_at'
		>
	): Promise<MinistryLeaderMembership>;
	updateMinistryLeaderMembership(
		id: string,
		data: Partial<MinistryLeaderMembership>
	): Promise<MinistryLeaderMembership>;
	listMinistryLeaderMemberships(
		ministryId?: string,
		leaderId?: string
	): Promise<MinistryLeaderMembership[]>;
	deleteMinistryLeaderMembership(id: string): Promise<void>;

	// Ministry Accounts
	getMinistryAccount(id: string): Promise<MinistryAccount | null>;
	createMinistryAccount(
		data: Omit<MinistryAccount, 'created_at' | 'updated_at'>
	): Promise<MinistryAccount>;
	updateMinistryAccount(
		id: string,
		data: Partial<MinistryAccount>
	): Promise<MinistryAccount>;
	listMinistryAccounts(): Promise<MinistryAccount[]>;
	deleteMinistryAccount(id: string): Promise<void>;

	// Ministry Groups
	getMinistryGroup(id: string): Promise<MinistryGroup | null>;
	getMinistryGroupByCode(code: string): Promise<MinistryGroup | null>;
	createMinistryGroup(
		data: Omit<MinistryGroup, 'id' | 'created_at' | 'updated_at'>
	): Promise<MinistryGroup>;
	updateMinistryGroup(
		id: string,
		data: Partial<MinistryGroup>
	): Promise<MinistryGroup>;
	listMinistryGroups(): Promise<MinistryGroup[]>;
	deleteMinistryGroup(id: string): Promise<void>;

	// Ministry Group Members
	addMinistryToGroup(groupId: string, ministryId: string): Promise<MinistryGroupMember>;
	removeMinistryFromGroup(groupId: string, ministryId: string): Promise<void>;
	listMinistriesByGroup(groupId: string): Promise<Ministry[]>;
	listGroupsByMinistry(ministryId: string): Promise<MinistryGroup[]>;

	// Ministry Group RBAC helpers
	listAccessibleMinistriesForEmail(email: string): Promise<Ministry[]>;
	listAccessibleMinistriesForAccount(accountId: string): Promise<Ministry[]>;

	// Branding Settings
	getBrandingSettings(settingId: string): Promise<BrandingSettings | null>;
	createBrandingSettings(
		data: Omit<BrandingSettings, 'setting_id' | 'created_at' | 'updated_at'>
	): Promise<BrandingSettings>;
	updateBrandingSettings(
		settingId: string,
		data: Partial<BrandingSettings>
	): Promise<BrandingSettings>;
	listBrandingSettings(): Promise<BrandingSettings[]>;
	deleteBrandingSettings(settingId: string): Promise<void>;

	// Bible Bee specific entities (simplified for core functionality)
	getBibleBeeYear(id: string): Promise<BibleBeeYear | null>;
	createBibleBeeYear(
		data: Omit<BibleBeeYear, 'created_at' | 'updated_at'>
	): Promise<BibleBeeYear>;
	updateBibleBeeYear(
		id: string,
		data: Partial<BibleBeeYear>
	): Promise<BibleBeeYear>;
	listBibleBeeYears(): Promise<BibleBeeYear[]>;
	deleteBibleBeeYear(id: string): Promise<void>;

	// Bible Bee Cycles (new cycle-based system)
	getBibleBeeCycle(id: string): Promise<BibleBeeCycle | null>;
	createBibleBeeCycle(
		data: Omit<BibleBeeCycle, 'id' | 'created_at' | 'updated_at'>
	): Promise<BibleBeeCycle>;
	updateBibleBeeCycle(
		id: string,
		data: Partial<BibleBeeCycle>
	): Promise<BibleBeeCycle>;
	listBibleBeeCycles(isActive?: boolean): Promise<BibleBeeCycle[]>;
	deleteBibleBeeCycle(id: string): Promise<void>;

	getDivision(id: string): Promise<Division | null>;
	createDivision(
		data: Omit<Division, 'created_at' | 'updated_at'>
	): Promise<Division>;
	updateDivision(id: string, data: Partial<Division>): Promise<Division>;
	listDivisions(bibleBeeYearId?: string): Promise<Division[]>;
	deleteDivision(id: string): Promise<void>;

	// Scriptures
	getScripture(id: string): Promise<Scripture | null>;
	upsertScripture(data: Omit<Scripture, 'created_at' | 'updated_at'> & { id?: string }): Promise<Scripture>;
	deleteScripture(id: string): Promise<void>;
	listScriptures(filters?: { yearId?: string; cycleId?: string }): Promise<Scripture[]>;
	commitEnhancedCsvRowsToYear(rows: any[], yearId: string): Promise<any>;
	uploadJsonTexts(yearId: string, data: any, mode: 'merge' | 'overwrite', dryRun: boolean): Promise<any>;

	getEssayPrompt(id: string): Promise<EssayPrompt | null>;
	getEssayPromptsForYearAndDivision(yearId: string, divisionName: string): Promise<EssayPrompt[]>;
	createEssayPrompt(
		data: Omit<EssayPrompt, 'created_at' | 'updated_at'>
	): Promise<EssayPrompt>;
	updateEssayPrompt(
		id: string,
		data: Partial<EssayPrompt>
	): Promise<EssayPrompt>;
	listEssayPrompts(divisionId?: string, cycleId?: string): Promise<EssayPrompt[]>;
	deleteEssayPrompt(id: string): Promise<void>;

	getEnrollment(id: string): Promise<Enrollment | null>;
	createEnrollment(
		data: Omit<Enrollment, 'created_at' | 'updated_at'>
	): Promise<Enrollment>;
	updateEnrollment(id: string, data: Partial<Enrollment>): Promise<Enrollment>;
	listEnrollments(
		childId?: string,
		bibleBeeYearId?: string
	): Promise<Enrollment[]>;
	deleteEnrollment(id: string): Promise<void>;

	getEnrollmentOverride(id: string): Promise<EnrollmentOverride | null>;
	createEnrollmentOverride(
		data: Omit<EnrollmentOverride, 'created_at' | 'updated_at'>
	): Promise<EnrollmentOverride>;
	updateEnrollmentOverride(
		id: string,
		data: Partial<EnrollmentOverride>
	): Promise<EnrollmentOverride>;
	listEnrollmentOverrides(yearId?: string): Promise<EnrollmentOverride[]>;
	deleteEnrollmentOverride(id: string): Promise<void>;
	deleteEnrollmentOverrideByChild(childId: string): Promise<void>;

	// Student Scripture methods
	getStudentScripture(id: string): Promise<StudentScripture | null>;
	createStudentScripture(data: Omit<StudentScripture, 'created_at' | 'updated_at'>): Promise<StudentScripture>;
	updateStudentScripture(id: string, data: Partial<StudentScripture>): Promise<StudentScripture>;
	listStudentScriptures(childId?: string, bibleBeeCycleId?: string): Promise<StudentScripture[]>;
	deleteStudentScripture(id: string): Promise<void>;

	// Realtime (can be no-op in IndexedDB implementation)
	subscribeToTable<T>(
		table: string,
		callback: (payload: T) => void
	): () => void;

	// Batch operations (optional for v1)
	transaction<T>(callback: () => Promise<T>): Promise<T>;

	// Form draft persistence
	getDraft(formName: string, userId: string): Promise<any | null>;
	saveDraft(formName: string, userId: string, payload: any, version?: number): Promise<void>;
	clearDraft(formName: string, userId: string): Promise<void>;

	// Bible Bee auto-enrollment methods
	previewAutoEnrollment(yearId: string): Promise<any>;
	commitAutoEnrollment(yearId: string, previews: any[]): Promise<any>;

	// Student Essay methods
	getStudentEssay(id: string): Promise<StudentEssay | null>;
	createStudentEssay(data: Omit<StudentEssay, 'created_at' | 'updated_at'>): Promise<StudentEssay>;
	updateStudentEssay(id: string, data: Partial<StudentEssay>): Promise<StudentEssay>;
	listStudentEssays(childId?: string, bibleBeeCycleId?: string): Promise<StudentEssay[]>;
	deleteStudentEssay(id: string): Promise<void>;

	// Household editing methods
	addGuardian(householdId: string, guardian: Omit<Guardian, 'guardian_id'>): Promise<Guardian>;
	removeGuardian(guardianId: string): Promise<void>;
	updateEmergencyContact(householdId: string, contact: EmergencyContact): Promise<void>;
	addChild(householdId: string, child: Omit<Child, 'child_id'>, cycleId: string): Promise<Child>;
	softDeleteChild(childId: string): Promise<void>;

	// Enrollment editing methods (current cycle only)
	addEnrollment(childId: string, ministryId: string, cycleId: string, customFields?: any): Promise<void>;
	removeEnrollment(childId: string, ministryId: string, cycleId: string): Promise<void>;
	updateEnrollmentFields(childId: string, ministryId: string, cycleId: string, customFields: any): Promise<void>;

	// Audit logging
	logAudit(log: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void>;
}