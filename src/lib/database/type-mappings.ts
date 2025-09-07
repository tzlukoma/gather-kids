import type * as DexieTypes from '../types';
import type * as SupabaseTypes from './supabase-types';
import type * as CanonicalDtos from './canonical-dtos';
import type { Attendance, Incident, Event, User, MinistryLeaderMembership, MinistryAccount, BrandingSettings, EventTimeslot, Consent, CustomQuestion } from '../types';
import type { Database } from './supabase-types';

/**
 * Maps between Dexie types, Supabase generated types, and canonical snake_case DTOs
 * This ensures consistent typing regardless of which adapter is used
 *
 * The canonical DTOs represent the "fresh start" data shapes that the DAL should
 * expose to the UI with consistent snake_case naming.
 */

// Type mapper utility types
type OmitSystemFields<T> = Omit<T, 'created_at' | 'updated_at'>;
type WithOptionalId<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
// Canonical DTO Conversions
// =====================================

/**
 * Convert from legacy/mixed naming to canonical snake_case DTOs
 * These functions handle the "fresh start" conversion to standardized shapes
 */

// Household: Legacy -> Canonical
export function householdToCanonical(household: DexieTypes.Household): CanonicalDtos.HouseholdRead {
	return {
		household_id: household.household_id,
		name: household.name,
		address_line1: household.address_line1,
		address_line2: household.address_line2,
		city: household.city,
		state: household.state,
		zip: household.zip,
		preferred_scripture_translation: household.preferredScriptureTranslation, // camelCase -> snake_case
		primary_email: household.primary_email,
		primary_phone: household.primary_phone,
		photo_url: household.photo_url,
		created_at: household.created_at,
		updated_at: household.updated_at,
	};
}

// Household: Canonical -> Legacy (for backward compatibility)
export function canonicalToHousehold(canonical: CanonicalDtos.HouseholdWrite, id?: string): DexieTypes.Household {
	const now = new Date().toISOString();
	return {
		household_id: canonical.household_id || id || '',
		name: canonical.name,
		address_line1: canonical.address_line1,
		address_line2: canonical.address_line2,
		city: canonical.city,
		state: canonical.state,
		zip: canonical.zip,
		preferredScriptureTranslation: canonical.preferred_scripture_translation, // snake_case -> camelCase
		primary_email: canonical.primary_email,
		primary_phone: canonical.primary_phone,
		photo_url: canonical.photo_url,
		created_at: now,
		updated_at: now,
	};
}

// Guardian: Legacy -> Canonical
export function guardianToCanonical(guardian: DexieTypes.Guardian): CanonicalDtos.GuardianRead {
	return {
		guardian_id: guardian.guardian_id,
		household_id: guardian.household_id,
		first_name: guardian.first_name,
		last_name: guardian.last_name,
		mobile_phone: guardian.mobile_phone,
		email: guardian.email,
		relationship: guardian.relationship,
		is_primary: guardian.is_primary,
		created_at: guardian.created_at,
		updated_at: guardian.updated_at,
	};
}

// Guardian: Canonical -> Legacy
export function canonicalToGuardian(canonical: CanonicalDtos.GuardianWrite, id?: string): DexieTypes.Guardian {
	const now = new Date().toISOString();
	return {
		guardian_id: canonical.guardian_id || id || '',
		household_id: canonical.household_id,
		first_name: canonical.first_name,
		last_name: canonical.last_name,
		mobile_phone: canonical.mobile_phone,
		email: canonical.email,
		relationship: canonical.relationship,
		is_primary: canonical.is_primary,
		created_at: now,
		updated_at: now,
	};
}

// Emergency Contact: Legacy -> Canonical
export function emergencyContactToCanonical(contact: DexieTypes.EmergencyContact): CanonicalDtos.EmergencyContactRead {
	return {
		contact_id: contact.contact_id,
		household_id: contact.household_id,
		first_name: contact.first_name,
		last_name: contact.last_name,
		mobile_phone: contact.mobile_phone,
		relationship: contact.relationship,
		created_at: new Date().toISOString(), // Legacy types don't have timestamps
		updated_at: new Date().toISOString(),
	};
}

// Emergency Contact: Canonical -> Legacy
export function canonicalToEmergencyContact(canonical: CanonicalDtos.EmergencyContactWrite, id?: string): DexieTypes.EmergencyContact {
	return {
		contact_id: canonical.contact_id || id || '',
		household_id: canonical.household_id,
		first_name: canonical.first_name,
		last_name: canonical.last_name,
		mobile_phone: canonical.mobile_phone,
		relationship: canonical.relationship,
	};
}

// Child: Legacy -> Canonical
export function childToCanonical(child: DexieTypes.Child): CanonicalDtos.ChildRead {
	return {
		child_id: child.child_id,
		household_id: child.household_id,
		first_name: child.first_name,
		last_name: child.last_name,
		dob: child.dob,
		grade: child.grade,
		child_mobile: child.child_mobile,
		allergies: child.allergies,
		medical_notes: child.medical_notes,
		special_needs: child.special_needs,
		special_needs_notes: child.special_needs_notes,
		is_active: child.is_active,
		photo_url: child.photo_url,
		created_at: child.created_at,
		updated_at: child.updated_at,
	};
}

// Child: Canonical -> Legacy
export function canonicalToChild(canonical: CanonicalDtos.ChildWrite, id?: string): DexieTypes.Child {
	const now = new Date().toISOString();
	return {
		child_id: canonical.child_id || id || '',
		household_id: canonical.household_id,
		first_name: canonical.first_name,
		last_name: canonical.last_name,
		dob: canonical.dob,
		grade: canonical.grade,
		child_mobile: canonical.child_mobile,
		allergies: canonical.allergies,
		medical_notes: canonical.medical_notes,
		special_needs: canonical.special_needs,
		special_needs_notes: canonical.special_needs_notes,
		is_active: canonical.is_active !== undefined ? canonical.is_active : true,
		photo_url: canonical.photo_url,
		created_at: now,
		updated_at: now,
	};
}

// Registration: Legacy -> Canonical (with consent normalization)
export function registrationToCanonical(registration: DexieTypes.Registration): CanonicalDtos.RegistrationRead {
	return {
		registration_id: registration.registration_id,
		child_id: registration.child_id,
		cycle_id: registration.cycle_id,
		status: registration.status,
		pre_registered_sunday_school: registration.pre_registered_sunday_school,
		consents: (registration.consents || []).map((consent: any) => ({
			...consent,
			type: consent.type === 'photoRelease' ? 'photo_release' : String(consent.type), // Convert to snake_case
		})),
		submitted_via: registration.submitted_via,
		submitted_at: registration.submitted_at,
	};
}

// Registration: Canonical -> Legacy (with consent normalization)
export function canonicalToRegistration(canonical: CanonicalDtos.RegistrationWrite, id?: string): DexieTypes.Registration {
	return {
		registration_id: canonical.registration_id || id || '',
		child_id: canonical.child_id,
		cycle_id: canonical.cycle_id,
		status: canonical.status || 'active',
		pre_registered_sunday_school: canonical.pre_registered_sunday_school !== undefined ? canonical.pre_registered_sunday_school : true,
		consents: (canonical.consents || []).map((consent: any) => ({
			...consent,
			type: consent.type === 'photo_release' ? 'photoRelease' : String(consent.type), // Convert to camelCase for legacy
		})),
		submitted_via: canonical.submitted_via || 'web',
		submitted_at: new Date().toISOString(),
	};
}

// =====================================
// Legacy Household Mappings (keep for compatibility)
// =====================================

export type CreateHouseholdDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Household, 'household_id'>
>;
export type HouseholdEntity = DexieTypes.Household;
export type SupabaseHousehold =
	SupabaseTypes.Database['public']['Tables']['households']['Row'];

// Household conversions
export function supabaseToHousehold(
	record: SupabaseHousehold
): HouseholdEntity {
	// Emit a warning when legacy/camelCase fields or null addresses are present
	const r = record as unknown as Record<string, unknown>;
	try {
		if ((r.preferredScriptureTranslation as any) !== undefined || record.address_line1 === null || record.address_line2 === null) {
			console.warn('supabaseToHousehold: detected legacy/camelCase or null address fields');
		}
	} catch (e) {
		/* ignore */
	}
	return {
		household_id: record.household_id || '',
		name: record.name ?? undefined,
		// accept either snake_case (new generated types) or legacy camelCase
	preferredScriptureTranslation: (record as unknown as any).preferred_scripture_translation ?? (r.preferredScriptureTranslation as string | undefined) ?? undefined,
	// coerce null -> empty string for address fields to satisfy callers expecting string
	address_line1: record.address_line1 ?? '' ,
	address_line2: record.address_line2 ?? '' ,
		city: record.city ?? '' ,
		state: record.state ?? '' ,
		zip: record.zip ?? '' ,
		created_at: record.created_at ?? new Date().toISOString(),
		updated_at: record.updated_at ?? new Date().toISOString(),
	};
}

export function householdToSupabase(
	household: CreateHouseholdDTO
): Omit<SupabaseHousehold, 'created_at' | 'updated_at'> {
	return {
		household_id: household.household_id,
		name: household.name,
		preferredScriptureTranslation: household.preferredScriptureTranslation,
		address_line1: household.address_line1,
		address_line2: household.address_line2,
		city: household.city,
		state: household.state,
		zip: household.zip,
	} as unknown as Omit<SupabaseHousehold, 'created_at' | 'updated_at'>;
}

// =====================================
// Child Mappings
// =====================================

export type CreateChildDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Child, 'child_id'>
>;
export type ChildEntity = DexieTypes.Child;
export type SupabaseChild =
	SupabaseTypes.Database['public']['Tables']['children']['Row'];

// Child conversions
export function supabaseToChild(record: SupabaseChild): ChildEntity {
	// Warn when null dob is encountered (legacy data issue)
	const rChild = record as unknown as Record<string, any>;
	try {
		if (rChild.dob === null) console.warn('supabaseToChild: null dob encountered');
	} catch (e) {
		/* ignore */
	}
	return {
		child_id: record.child_id || '',
	household_id: record.household_id ?? '',
	first_name: record.first_name ?? '',
	last_name: record.last_name ?? '',
		dob: record.dob ?? undefined,
	grade: record.grade ?? undefined,
	child_mobile: record.child_mobile ?? undefined,
	allergies: record.allergies ?? undefined,
	medical_notes: record.medical_notes ?? undefined,
	special_needs: record.special_needs ?? false,
	special_needs_notes: record.special_needs_notes ?? undefined,
	is_active: record.is_active ?? true,
	created_at: record.created_at ?? new Date().toISOString(),
	updated_at: record.updated_at ?? new Date().toISOString(),
	photo_url: rChild.photo_url ?? rChild.photoUrl ?? undefined,
	};
}

// Attendance mapping
export function supabaseToAttendance(row: Database['public']['Tables']['attendance']['Row'] | any): Attendance {
	return {
		attendance_id: row.attendance_id,
		child_id: row.child_id || '',
		event_id: row.event_id || '',
		check_in_at: row.check_in_at || null,
		check_out_at: row.check_out_at || null,
		checked_in_by: row.checked_in_by || undefined,
		checked_out_by: row.checked_out_by || undefined,
		first_time_flag: !!row.first_time_flag,
		notes: row.notes || '',
		picked_up_by: row.picked_up_by || undefined,
		pickup_method: row.pickup_method || undefined,
		timeslot_id: row.timeslot_id || undefined,
		date: row.date || undefined,
		created_at: row.created_at || undefined,
	} as Attendance;
}

// Incident mapping
export function supabaseToIncident(row: Database['public']['Tables']['incidents']['Row'] | any): Incident {
	return {
		incident_id: row.incident_id,
		child_id: row.child_id || '',
		child_name: row.child_name || '',
		event_id: row.event_id || '',
		leader_id: row.leader_id || '',
		description: row.description || '',
		severity: row.severity || 'low',
		timestamp: row.timestamp || new Date().toISOString(),
		admin_acknowledged_at: row.admin_acknowledged_at || null,
		created_at: row.created_at || undefined,
	} as Incident;
}

// Events mapping - parse timeslots JSON to EventTimeslot[]
export function supabaseToEvent(row: Database['public']['Tables']['events']['Row'] | any): Event {
	// Parse timeslots using the helper so we always return typed EventTimeslot[]
	const rEvent = row as unknown as Record<string, any>;
	const timeslots = parseEventTimeslots(rEvent.timeslots);
	return {
		event_id: row.event_id,
		name: row.name || '',
		description: row.description || '',
		timeslots,
		created_at: row.created_at || undefined,
	} as Event;
}

// Parse Event timeslots to typed EventTimeslot[]
export function parseEventTimeslots(value: any): EventTimeslot[] {
	try {
		if (!value) return [];
		if (typeof value === 'string') return JSON.parse(value) as EventTimeslot[];
		return value as EventTimeslot[];
	} catch (e) {
		return [];
	}
}

// Parse registration consents (stored as JSON) into canonical Consent[]
export function parseConsents(value: any): Consent[] {
	try {
		if (!value) return [];
		const raw = typeof value === 'string' ? JSON.parse(value) : value;
		return (raw as unknown as any[]).map((c: any) => ({
			...c,
			// normalize to domain type 'photoRelease'
			type: c.type === 'photo_release' ? 'photoRelease' : c.type,
		})) as Consent[];
	} catch (e) {
		return [];
	}
}

// Parse custom questions field stored in ministries
export function parseCustomQuestions(value: any): CustomQuestion[] {
	try {
		if (!value) return [];
		if (typeof value === 'string') return JSON.parse(value) as CustomQuestion[];
		return value as CustomQuestion[];
	} catch (e) {
		return [];
	}
}

// Parse enrollment custom fields
export function parseCustomFields(value: any): Record<string, any> | undefined {
	try {
		if (!value) return undefined;
		if (typeof value === 'string') return JSON.parse(value) as Record<string, any>;
		return value as Record<string, any>;
	} catch (e) {
		return undefined;
	}
}

// Serialize helpers for adapter writes
export function serializeIfObject(value: any): any {
	if (value === undefined || value === null) return value;
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch (e) {
		return value;
	}
}

// Users mapping
export function supabaseToUser(row: Database['public']['Tables']['users']['Row'] | any): User {
	return {
		user_id: row.user_id,
		email: row.email || '',
		name: row.name || '',
		role: row.role || 'user',
		is_active: row.is_active === null || row.is_active === undefined ? true : !!row.is_active,
		background_check_status: row.background_check_status || 'unknown',
		created_at: row.created_at || undefined,
		updated_at: row.updated_at || undefined,
	} as User;
}

// Ministry Leader Membership mapping
export function supabaseToMinistryLeaderMembership(row: any): MinistryLeaderMembership {
	// Normalize role/role_type to domain enum: 'PRIMARY' | 'VOLUNTEER'
	let rawRole = (row.role_type ?? row.role ?? '') as string;
	if (typeof rawRole === 'string') rawRole = rawRole.trim();
	const role_type = ((): 'PRIMARY' | 'VOLUNTEER' => {
		const r = (rawRole || '').toLowerCase();
		if (r === 'primary' || r === 'primary_leader' || r === 'lead' || r === 'primary_leader') return 'PRIMARY';
		if (r === 'volunteer' || r === 'member' || r === 'helper') return 'VOLUNTEER';
		// default to VOLUNTEER for any unknown value
		return 'VOLUNTEER';
	})();

	return {
		membership_id: row.membership_id || row.id || '',
		ministry_id: row.ministry_id || '',
		leader_id: row.leader_id || row.user_id || '',
		role_type,
		is_active: row.is_active === null || row.is_active === undefined ? true : !!row.is_active,
		notes: row.notes ?? undefined,
		created_at: row.created_at || undefined,
		updated_at: row.updated_at || undefined,
	} as MinistryLeaderMembership;
}

// Ministry Account mapping
export function supabaseToMinistryAccount(row: Database['public']['Tables']['ministry_accounts']['Row'] | any): MinistryAccount {
	// Parse settings JSON if present (not currently part of the domain type but kept for future use)
	let settings: any = undefined;
	try {
		if (row.settings) {
			if (typeof row.settings === 'string') settings = JSON.parse(row.settings);
			else settings = row.settings;
		}
	} catch (e) {
		settings = undefined;
	}

	return {
		ministry_id: row.ministry_id || row.ministry || row.id || '',
		email: row.email || undefined,
		display_name: row.display_name || row.name || undefined,
		is_active: row.is_active === null || row.is_active === undefined ? true : !!row.is_active,
		created_at: row.created_at || undefined,
		updated_at: row.updated_at || undefined,
	} as MinistryAccount;
}

export function childToSupabase(
	child: CreateChildDTO
): Omit<SupabaseChild, 'created_at' | 'updated_at'> {
	return {
		child_id: child.child_id,
		household_id: child.household_id,
		first_name: child.first_name,
		last_name: child.last_name,
		dob: child.dob,
		grade: child.grade,
		child_mobile: child.child_mobile,
		allergies: child.allergies,
		medical_notes: child.medical_notes,
		special_needs: child.special_needs,
		special_needs_notes: child.special_needs_notes,
		is_active: child.is_active,
		photo_url: child.photo_url,
	} as any; // Using any for fallback types
}

// =====================================
// Guardian Mappings
// =====================================

export type CreateGuardianDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Guardian, 'guardian_id'>
>;
export type GuardianEntity = DexieTypes.Guardian;
export type SupabaseGuardian =
	SupabaseTypes.Database['public']['Tables']['guardians']['Row'];

// Guardian conversions
export function supabaseToGuardian(record: SupabaseGuardian): GuardianEntity {
	return {
		guardian_id: record.guardian_id || '',
	household_id: record.household_id ?? '',
	first_name: record.first_name ?? '',
	last_name: record.last_name ?? '',
	mobile_phone: record.mobile_phone ?? '',
	email: record.email ?? undefined,
	relationship: record.relationship ?? '',
	is_primary: record.is_primary ?? false,
	created_at: record.created_at ?? new Date().toISOString(),
	updated_at: record.updated_at ?? new Date().toISOString(),
	};
}

export function guardianToSupabase(
	guardian: CreateGuardianDTO
): Omit<SupabaseGuardian, 'created_at' | 'updated_at'> {
	return {
		guardian_id: guardian.guardian_id,
		household_id: guardian.household_id,
		first_name: guardian.first_name,
		last_name: guardian.last_name,
		mobile_phone: guardian.mobile_phone,
		email: guardian.email,
		relationship: guardian.relationship,
		is_primary: guardian.is_primary,
	} as any; // Using any for fallback types
}

// =====================================
// Emergency Contact Mappings
// =====================================

export type CreateEmergencyContactDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.EmergencyContact, 'contact_id'>
>;
export type EmergencyContactEntity = DexieTypes.EmergencyContact;
export type SupabaseEmergencyContact =
	SupabaseTypes.Database['public']['Tables']['emergency_contacts']['Row'];

// Emergency Contact conversions
export function supabaseToEmergencyContact(
	record: SupabaseEmergencyContact
): EmergencyContactEntity {
	return {
	contact_id: record.contact_id ?? '',
	household_id: record.household_id ?? '',
	first_name: record.first_name ?? '',
	last_name: record.last_name ?? '',
	mobile_phone: record.mobile_phone ?? '',
	relationship: record.relationship ?? '',
	};
}

export function emergencyContactToSupabase(
	contact: CreateEmergencyContactDTO
): Omit<SupabaseEmergencyContact, 'created_at' | 'updated_at'> {
	return {
		contact_id: contact.contact_id,
		household_id: contact.household_id,
		first_name: contact.first_name,
		last_name: contact.last_name,
		mobile_phone: contact.mobile_phone,
		relationship: contact.relationship,
	} as any; // Using any for fallback types
}

// =====================================
// Ministry Mappings
// =====================================

export type CreateMinistryDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.Ministry, 'ministry_id'>
>;
export type MinistryEntity = DexieTypes.Ministry;
export type SupabaseMinistry =
	SupabaseTypes.Database['public']['Tables']['ministries']['Row'];

// Ministry conversions
export function supabaseToMinistry(record: SupabaseMinistry): MinistryEntity {
	const r: any = record;
	// Warn when legacy camelCase ministry fields are present
	try {
		if (r.enrollmentType !== undefined || r.dataProfile !== undefined || r.ministry_code !== undefined || r.label !== undefined) {
			console.warn('supabaseToMinistry: detected legacy/camelCase ministry fields');
		}
	} catch (e) {
		/* ignore */
	}
	return {
		ministry_id: r.ministry_id || '',
		// tolerate optional code and data profile which may be present in generated types
		code: r.code ?? r.ministry_code ?? undefined,
		name: (r.name ?? r.label) ?? '',
		// coerce null -> undefined for optional fields produced by the generator
		description: r.description ?? undefined,
		min_age: r.min_age ?? undefined,
		max_age: r.max_age ?? undefined,
		min_grade: r.min_grade ?? undefined,
		max_grade: r.max_grade ?? undefined,
		// ensure callers that expect a boolean get a sensible default
		is_active: r.is_active ?? true,
		enrollment_type: r.enrollment_type ?? r.enrollmentType ?? 'enrolled',
		data_profile: r.data_profile ?? r.dataProfile ?? undefined,
	// custom_questions is stored as SupabaseJson; parse into typed CustomQuestion[]
	custom_questions: parseCustomQuestions(r.custom_questions),
		created_at: r.created_at || new Date().toISOString(),
		updated_at: r.updated_at || new Date().toISOString(),
	};
}

// =====================================
// Ministry Enrollment Mappings
// =====================================

export type SupabaseMinistryEnrollment =
	SupabaseTypes.Database['public']['Tables']['ministry_enrollments']['Row'];

export function supabaseToMinistryEnrollment(
	record: SupabaseMinistryEnrollment
): DexieTypes.MinistryEnrollment {
	// Normalize nullable id fields to empty string so callers don't have to handle null
	return {
		enrollment_id: record.enrollment_id || '',
		child_id: record.child_id ?? '',
		cycle_id: record.cycle_id ?? '',
		ministry_id: record.ministry_id ?? '',
		status: (record.status as unknown as string) ?? 'enrolled',
		custom_fields: parseCustomFields(record.custom_fields),
		notes: undefined,
	} as unknown as DexieTypes.MinistryEnrollment;
}

export function ministryEnrollmentToSupabase(
	enrollment: Omit<DexieTypes.MinistryEnrollment, 'created_at' | 'updated_at'>
): Omit<SupabaseMinistryEnrollment, 'created_at'> {
	return {
		enrollment_id: enrollment.enrollment_id,
		child_id: enrollment.child_id,
		cycle_id: enrollment.cycle_id,
		ministry_id: enrollment.ministry_id,
		status: enrollment.status,
		custom_fields: serializeIfObject(enrollment.custom_fields) as unknown as SupabaseMinistryEnrollment['custom_fields'],
	} as unknown as Omit<SupabaseMinistryEnrollment, 'created_at'>;
}

export function ministryToSupabase(
	ministry: CreateMinistryDTO
): Omit<SupabaseMinistry, 'created_at' | 'updated_at'> {
	return {
		ministry_id: ministry.ministry_id,
		name: ministry.name,
		description: ministry.description,
		min_age: ministry.min_age,
		max_age: ministry.max_age,
		min_grade: ministry.min_grade,
		max_grade: ministry.max_grade,
		is_active: ministry.is_active,
		enrollment_type: ministry.enrollment_type,
		custom_questions: serializeIfObject(ministry.custom_questions) as unknown as SupabaseMinistry['custom_questions'],
	} as unknown as Omit<SupabaseMinistry, 'created_at' | 'updated_at'>;
}

// =====================================
// Branding Settings Mappings
// =====================================

export type CreateBrandingSettingsDTO = OmitSystemFields<
	WithOptionalId<DexieTypes.BrandingSettings, 'setting_id'>
>;
export type BrandingSettingsEntity = DexieTypes.BrandingSettings;
export type SupabaseBrandingSettings =
	SupabaseTypes.Database['public']['Tables']['branding_settings']['Row'];

// Branding Settings conversions
export function supabaseToBrandingSettings(
	record: SupabaseBrandingSettings
): BrandingSettingsEntity {
	// Warn when camelCase branding fields are present
	try {
		if ((record as any).primaryColor !== undefined || (record as any).secondaryColor !== undefined || (record as any).logoUrl !== undefined || (record as any).orgName !== undefined) {
			console.warn('supabaseToBrandingSettings: detected camelCase branding fields');
		}
	} catch (e) {
		/* ignore */
	}
	return ({
		setting_id: record.setting_id || '',
		org_id: record.org_id,
		// accept snake_case or camelCase or alternate org_name field
		primary_color: (record as any).primary_color ?? (record as any).primaryColor ?? undefined,
		secondary_color: (record as any).secondary_color ?? (record as any).secondaryColor ?? undefined,
		logo_url: record.logo_url ?? (record as any).logoUrl ?? undefined,
		org_name: (record as any).org_name ?? (record as any).orgName ?? undefined,
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
	}) as any;
}

// =====================================
// Enrollment / EnrollmentOverride Mappings
// =====================================

// The codebase uses a couple enrollment representations (legacy camelCase tables and new snake_case).
// Keep these functions permissive: accept either convention and coerce nullable DB fields to domain expectations.

export function supabaseToEnrollment(record: any): DexieTypes.Enrollment {
	// Support both `bible_bee_enrollments` (camelCase) and `enrollments` (snake_case)
	return {
		id: record.id || record.enrollment_id || '',
		year_id: record.year_id ?? record.competitionYearId ?? record.bible_bee_year_id ?? '',
		child_id: record.child_id ?? record.childId ?? '',
		division_id: record.division_id ?? record.divisionId ?? '',
		auto_enrolled: record.auto_enrolled ?? false,
		enrolled_at: record.enrolled_at ?? record.enrolledAt ?? new Date().toISOString(),
	} as any;
}

export function enrollmentToSupabase(enrollment: Partial<DexieTypes.Enrollment>): any {
	return {
		id: enrollment.id,
		year_id: enrollment.year_id,
		child_id: enrollment.child_id,
		division_id: enrollment.division_id,
		auto_enrolled: enrollment.auto_enrolled,
		enrolled_at: enrollment.enrolled_at,
	} as any;
}

export function supabaseToEnrollmentOverride(record: any): DexieTypes.EnrollmentOverride {
	return {
		id: record.id || record.override_id || '',
		year_id: record.year_id ?? record.bible_bee_year_id ?? '',
		child_id: record.child_id ?? record.childId ?? '',
		division_id: record.division_id ?? record.divisionId ?? '',
		reason: record.reason ?? undefined,
		created_by: record.created_by ?? record.createdBy ?? undefined,
		created_at: record.created_at ?? new Date().toISOString(),
	} as any;
}

// =====================================
// Registration mappings
// =====================================

export type SupabaseRegistration =
	SupabaseTypes.Database['public']['Tables']['registrations']['Row'];

export function supabaseToRegistration(record: SupabaseRegistration): DexieTypes.Registration {
	return {
		registration_id: record.registration_id || '',
		child_id: record.child_id ?? '',
		cycle_id: record.cycle_id ?? '',
		status: (record.status as unknown as string) ?? 'active',
		pre_registered_sunday_school: record.pre_registered_sunday_school ?? false,
		consents: parseConsents((record as unknown as any).consents),
		submitted_via: (record.submitted_via as unknown as string) ?? 'web',
		submitted_at: record.submitted_at ?? new Date().toISOString(),
	} as unknown as DexieTypes.Registration;
}

export function registrationToSupabase(reg: Partial<DexieTypes.Registration>): any {
	return {
		registration_id: reg.registration_id,
		child_id: reg.child_id,
		cycle_id: reg.cycle_id,
		status: reg.status,
		pre_registered_sunday_school: reg.pre_registered_sunday_school,
		consents: serializeIfObject(reg.consents) as unknown as SupabaseRegistration['consents'],
		submitted_via: reg.submitted_via,
		submitted_at: reg.submitted_at,
	} as unknown as Partial<SupabaseRegistration>;
}

export function brandingSettingsToSupabase(
	settings: CreateBrandingSettingsDTO
): Omit<SupabaseBrandingSettings, 'created_at' | 'updated_at'> {
	return {
	setting_id: settings.setting_id,
	org_id: settings.org_id,
	primary_color: (settings as unknown as any).primary_color ?? (settings as unknown as any).primaryColor ?? undefined,
	secondary_color: (settings as unknown as any).secondary_color ?? (settings as unknown as any).secondaryColor ?? undefined,
	logo_url: (settings as unknown as any).logo_url ?? (settings as unknown as any).logoUrl ?? undefined,
	org_name: (settings as unknown as any).org_name ?? (settings as unknown as any).orgName ?? undefined,
	} as unknown as Omit<SupabaseBrandingSettings, 'created_at' | 'updated_at'>;
}

// =====================================
// Generic conversion helpers
// =====================================

/**
 * Generic conversion helper for entities with standard timestamp fields
 */
export function convertTimestamps<T extends { created_at?: string; updated_at?: string }>(
	record: T
): T {
	const now = new Date().toISOString();
	return {
		...record,
		created_at: record.created_at || now,
		updated_at: record.updated_at || now,
	};
}

/**
 * Type guard to check if an object has the required ID field
 */
export function hasIdField<T, K extends string>(
	obj: T,
	idField: K
): obj is T & Record<K, string> {
	return typeof obj === 'object' && obj !== null && idField in obj;
}