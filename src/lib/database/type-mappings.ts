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
		consents: (registration.consents || []).map((consent: unknown) => {
			const c = toRecord(consent);
			const raw = (c['type'] as string) ?? '';
			const normalized: CanonicalDtos.Consent['type'] = (
				raw === 'photoRelease' || raw === 'photo_release'
			) ? 'photo_release' : (raw === 'liability' ? 'liability' : 'custom');
			return {
				type: normalized,
				accepted_at: (c['accepted_at'] as string) ?? null,
				signer_id: (c['signer_id'] as string) ?? '',
				signer_name: (c['signer_name'] as string) ?? '',
				text: (c['text'] as string) ?? undefined,
			} as CanonicalDtos.Consent;
		}),
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
		consents: (canonical.consents || []).map((consent: unknown) => {
			const c = toRecord(consent);
			const raw = (c['type'] as string) ?? '';
			const normalized = (raw === 'photo_release' || raw === 'photoRelease') ? 'photoRelease' : (raw === 'liability' ? 'liability' : 'custom');
			return {
				type: normalized,
				accepted_at: (c['accepted_at'] as string) ?? null,
				signer_id: (c['signer_id'] as string) ?? '',
				signer_name: (c['signer_name'] as string) ?? '',
				text: (c['text'] as string) ?? undefined,
			} as Consent;
		}),
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
	const r = toRecord(record);
	try {
		if ((r.preferredScriptureTranslation as Record<string, unknown>)?.preferredScriptureTranslation !== undefined || record.address_line1 === null || record.address_line2 === null) {
			console.warn('supabaseToHousehold: detected legacy/camelCase or null address fields');
		}
	} catch (e) {
		/* ignore */
	}
	return {
		household_id: record.household_id || '',
		name: record.name ?? undefined,
	// accept either snake_case (new generated types) or legacy camelCase
	preferredScriptureTranslation: (r.preferred_scripture_translation as string | undefined) ?? (r.preferredScriptureTranslation as string | undefined) ?? undefined,
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
	const rChild = toRecord(record);
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
	photo_url: (rChild.photo_url as string | undefined) ?? (rChild.photoUrl as string | undefined) ?? undefined,
	};
}

// Attendance mapping
export function supabaseToAttendance(row: Database['public']['Tables']['attendance']['Row'] | Record<string, unknown> | null | undefined): Attendance {
	const r = toRecord(row);
	return {
		attendance_id: (r['attendance_id'] as string) || '',
		child_id: (r['child_id'] as string) || '',
		event_id: (r['event_id'] as string) || '',
		check_in_at: (r['check_in_at'] as string) ?? null,
		check_out_at: (r['check_out_at'] as string) ?? null,
		checked_in_by: (r['checked_in_by'] as string) ?? undefined,
		checked_out_by: (r['checked_out_by'] as string) ?? undefined,
		first_time_flag: !!r['first_time_flag'],
		notes: (r['notes'] as string) ?? '',
		picked_up_by: (r['picked_up_by'] as string) ?? undefined,
		pickup_method: (r['pickup_method'] as string) ?? undefined,
		timeslot_id: (r['timeslot_id'] as string) ?? undefined,
		date: (r['date'] as string) ?? undefined,
		created_at: (r['created_at'] as string) ?? undefined,
	} as Attendance;
}

// Incident mapping
export function supabaseToIncident(row: Database['public']['Tables']['incidents']['Row'] | Record<string, unknown> | null | undefined): Incident {
	const r = toRecord(row);
	return {
		incident_id: (r['incident_id'] as string) || '',
		child_id: (r['child_id'] as string) || '',
		child_name: (r['child_name'] as string) || '',
		event_id: (r['event_id'] as string) || '',
		leader_id: (r['leader_id'] as string) || '',
		description: (r['description'] as string) || '',
		severity: (r['severity'] as string) as Incident['severity'] || 'low',
		timestamp: (r['timestamp'] as string) ?? new Date().toISOString(),
		admin_acknowledged_at: (r['admin_acknowledged_at'] as string) ?? null,
		created_at: (r['created_at'] as string) ?? undefined,
	} as Incident;
}

// Events mapping - parse timeslots JSON to EventTimeslot[]
export function supabaseToEvent(row: Database['public']['Tables']['events']['Row'] | Record<string, unknown> | null | undefined): Event {
	// Parse timeslots using the helper so we always return typed EventTimeslot[]
	const r = toRecord(row);
	const timeslots = parseEventTimeslots(r.timeslots);
	return {
		event_id: (r['event_id'] as string) || '',
		name: (r['name'] as string) || '',
		description: (r['description'] as string) || '',
		timeslots,
		created_at: (r['created_at'] as string) ?? undefined,
	} as Event;
}

// Parse Event timeslots to typed EventTimeslot[]
export function parseEventTimeslots(value: unknown): EventTimeslot[] {
	try {
		if (!value) return [];
		if (typeof value === 'string') return JSON.parse(value) as EventTimeslot[];
		return value as EventTimeslot[];
	} catch (e) {
		return [];
	}
}

// Helper to normalize unknown values to Record<string, unknown> safely
function toRecord(value: unknown): Record<string, unknown> {
	if (!value) return {};
	if (typeof value === 'object') return value as Record<string, unknown>;
	return {};
}

// Parse registration consents (stored as JSON) into canonical Consent[]
export function parseConsents(value: unknown): Consent[] {
	try {
		if (!value) return [];
		const raw = typeof value === 'string' ? JSON.parse(value) : value;
		return (raw as unknown as Array<Record<string, unknown>>).map((c) => ({
			...c,
			// normalize to domain type 'photoRelease'
			type: (c['type'] as string) === 'photo_release' ? 'photoRelease' : (c['type'] as string),
		})) as Consent[];
	} catch (e) {
		return [];
	}
}

// Parse custom questions field stored in ministries
export function parseCustomQuestions(value: unknown): CustomQuestion[] {
	try {
		if (!value) return [];
		if (typeof value === 'string') return JSON.parse(value) as CustomQuestion[];
		return value as CustomQuestion[];
	} catch (e) {
		return [];
	}
}

// Parse enrollment custom fields
export function parseCustomFields(value: unknown): Record<string, unknown> | undefined {
	try {
		if (!value) return undefined;
		if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
		return value as Record<string, unknown>;
	} catch (e) {
		return undefined;
	}
}

// Serialize helpers for adapter writes
export function serializeIfObject(value: unknown): unknown {
	if (value === undefined || value === null) return value;
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch (e) {
		return value;
	}
}

// Users mapping
export function supabaseToUser(row: Database['public']['Tables']['users']['Row'] | Record<string, unknown> | null | undefined): User {
	const r = (row ?? {}) as Record<string, unknown>;
	return {
		user_id: (r['user_id'] as string) || '',
		email: (r['email'] as string) || '',
		name: (r['name'] as string) || '',
		role: (r['role'] as string) || 'user',
		is_active: r['is_active'] === null || r['is_active'] === undefined ? true : !!r['is_active'],
		background_check_status: (r['background_check_status'] as string) || 'unknown',
		created_at: (r['created_at'] as string) ?? undefined,
		updated_at: (r['updated_at'] as string) ?? undefined,
	} as User;
}

// Ministry Leader Membership mapping
export function supabaseToMinistryLeaderMembership(row: Record<string, unknown> | null | undefined): MinistryLeaderMembership {
	// normalize input to a Record for safe property access
	const r = (row ?? {}) as Record<string, unknown>;
	// Normalize role/role_type to domain enum: 'PRIMARY' | 'VOLUNTEER'
	let rawRole = (r['role_type'] ?? r['role'] ?? '') as string;
	if (typeof rawRole === 'string') rawRole = rawRole.trim();
	const role_type = ((): 'PRIMARY' | 'VOLUNTEER' => {
		const v = (rawRole || '').toLowerCase();
		if (v === 'primary' || v === 'primary_leader' || v === 'lead') return 'PRIMARY';
		if (v === 'volunteer' || v === 'member' || v === 'helper') return 'VOLUNTEER';
		// default to VOLUNTEER for any unknown value
		return 'VOLUNTEER';
	})();

	return {
		membership_id: (r['membership_id'] as string) || (r['id'] as string) || '',
		ministry_id: (r['ministry_id'] as string) || '',
		leader_id: (r['leader_id'] as string) || (r['user_id'] as string) || '',
		role_type,
		is_active: r['is_active'] === null || r['is_active'] === undefined ? true : !!r['is_active'],
		notes: (r['notes'] as string) ?? undefined,
		created_at: (r['created_at'] as string) ?? new Date().toISOString(),
		updated_at: (r['updated_at'] as string) ?? new Date().toISOString(),
	} as MinistryLeaderMembership;
}

// Ministry Account mapping
export function supabaseToMinistryAccount(row: Database['public']['Tables']['ministry_accounts']['Row'] | Record<string, unknown> | null | undefined): MinistryAccount {
	const r = (row ?? {}) as Record<string, unknown>;
	// Parse legacy 'settings' if present but it's not used directly by domain type; keep safe parsing in case needed
	try {
		const maybe = r['settings'];
		if (maybe !== undefined && maybe !== null) {
			if (typeof maybe === 'string') JSON.parse(maybe as string);
		}
	} catch (e) {
		/* ignore */
	}

	// The DB has an 'id' PK and an optional 'ministry_id' FK; domain expects ministry_id as primary identifier.
	const ministryId = (r['ministry_id'] as string) || (r['ministry'] as string) || (r['id'] as string) || '';

	return {
		ministry_id: ministryId,
		email: (r['email'] as string) ?? '',
		display_name: (r['display_name'] as string) ?? (r['name'] as string) ?? '',
		is_active: r['is_active'] === null || r['is_active'] === undefined ? true : !!r['is_active'],
		created_at: (r['created_at'] as string) ?? new Date().toISOString(),
		updated_at: (r['updated_at'] as string) ?? new Date().toISOString(),
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
	} as unknown as Omit<SupabaseChild, 'created_at' | 'updated_at'>;
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
	} as unknown as Omit<SupabaseGuardian, 'created_at' | 'updated_at'>;
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
	} as unknown as Omit<SupabaseEmergencyContact, 'created_at' | 'updated_at'>;
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
	console.log('🔍 supabaseToMinistry: Converting record', {
		ministry_id: record.ministry_id,
		name: record.name,
		email: (record as any).email,
		allFields: Object.keys(record)
	});
	const r: Record<string, unknown> = record as unknown as Record<string, unknown>;
	
	// Warn when legacy camelCase ministry fields are present
	try {
		if (r.enrollmentType !== undefined || r.dataProfile !== undefined || r.ministry_code !== undefined || r.label !== undefined) {
			console.warn('supabaseToMinistry: detected legacy/camelCase ministry fields');
		}
	} catch (e) {
		console.error('supabaseToMinistry: Error checking for legacy fields', e);
	}

	try {
		const emailValue = (r.email as string | undefined) ?? undefined;
		console.log('🔍 supabaseToMinistry: Email processing', {
			rawEmail: r.email,
			emailValue: emailValue,
			emailType: typeof r.email
		});

		const result = {
			ministry_id: String(r.ministry_id || ''),
			// tolerate optional code and data profile which may be present in generated types
			code: String(r.code ?? r.ministry_code ?? ''),
			name: String((r.name ?? r.label) ?? ''),
			email: emailValue, // Add email field
			// coerce null -> undefined for optional fields produced by the generator
			description: (r.description as string | undefined) ?? undefined,
			details: (r.details as string | undefined) ?? undefined,
			min_age: (r.min_age as number | undefined) ?? undefined,
			max_age: (r.max_age as number | undefined) ?? undefined,
			min_grade: (r.min_grade as string | undefined) ?? undefined,
			max_grade: (r.max_grade as string | undefined) ?? undefined,
			// ensure callers that expect a boolean get a sensible default
			is_active: r.is_active === null || r.is_active === undefined ? true : !!r.is_active,
			enrollment_type: (r.enrollment_type ?? r.enrollmentType ?? 'enrolled') as 'enrolled' | 'expressed_interest',
			data_profile: (r.data_profile ?? r.dataProfile ?? 'Basic') as 'Basic' | 'SafetyAware',
			// custom_questions is stored as SupabaseJson; parse into typed CustomQuestion[]
			custom_questions: parseCustomQuestions(r.custom_questions),
			optional_consent_text: (r.optional_consent_text as string | undefined) ?? undefined,
			communicate_later: (r.communicate_later as boolean | undefined) ?? undefined,
			open_at: (r.open_at as string | undefined) ?? undefined,
			close_at: (r.close_at as string | undefined) ?? undefined,
			created_at: String(r.created_at || new Date().toISOString()),
			updated_at: String(r.updated_at || new Date().toISOString()),
		};
		
		console.log('🔍 supabaseToMinistry: Successfully converted ministry', {
			id: result.ministry_id,
			name: result.name,
			code: result.code,
			email: result.email,
			emailType: typeof result.email
		});
		
		return result;
	} catch (error) {
		console.error('supabaseToMinistry: Error converting ministry record', {
			record,
			error
		});
		throw error;
	}
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
		const rec = record as unknown as Record<string, unknown>;
		if (rec.primaryColor !== undefined || rec.secondaryColor !== undefined || rec.logoUrl !== undefined || rec.orgName !== undefined) {
			console.warn('supabaseToBrandingSettings: detected camelCase branding fields');
		}
	} catch (e) {
		/* ignore */
	}
	return ({
		setting_id: record.setting_id || '',
		org_id: record.org_id,
		// accept snake_case or camelCase or alternate org_name field
		primary_color: (record as unknown as Record<string, unknown>).primary_color as string | undefined ?? (record as unknown as Record<string, unknown>).primaryColor as string | undefined ?? undefined,
		secondary_color: (record as unknown as Record<string, unknown>).secondary_color as string | undefined ?? (record as unknown as Record<string, unknown>).secondaryColor as string | undefined ?? undefined,
		logo_url: record.logo_url ?? (record as unknown as Record<string, unknown>).logoUrl as string | undefined ?? undefined,
		org_name: (record as unknown as Record<string, unknown>).org_name as string | undefined ?? (record as unknown as Record<string, unknown>).orgName as string | undefined ?? undefined,
		app_name: record.app_name ?? undefined,
		description: record.description ?? undefined,
		use_logo_only: record.use_logo_only ?? undefined,
		youtube_url: record.youtube_url ?? undefined,
		instagram_url: record.instagram_url ?? undefined,
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
	}) as BrandingSettingsEntity;
}

// =====================================
// Enrollment / EnrollmentOverride Mappings
// =====================================

// The codebase uses a couple enrollment representations (legacy camelCase tables and new snake_case).
// Keep these functions permissive: accept either convention and coerce nullable DB fields to domain expectations.

export function supabaseToEnrollment(record: Record<string, unknown> | null | undefined): DexieTypes.Enrollment {
	// Support both `bible_bee_enrollments` (camelCase) and `enrollments` (snake_case)
	const r = (record ?? {}) as Record<string, unknown>;
	return {
		id: (r['id'] as string) || (r['enrollment_id'] as string) || '',
		year_id: (r['year_id'] as string) ?? (r['competitionYearId'] as string) ?? (r['bible_bee_year_id'] as string) ?? '',
		child_id: (r['child_id'] as string) ?? (r['childId'] as string) ?? '',
		division_id: (r['division_id'] as string) ?? (r['divisionId'] as string) ?? '',
		auto_enrolled: (r['auto_enrolled'] as boolean) ?? false,
		enrolled_at: (r['enrolled_at'] as string) ?? (r['enrolledAt'] as string) ?? new Date().toISOString(),
	} as DexieTypes.Enrollment;
}

export function enrollmentToSupabase(enrollment: Partial<DexieTypes.Enrollment>): Record<string, unknown> {
	return {
		id: enrollment.id,
		year_id: enrollment.year_id,
		child_id: enrollment.child_id,
		division_id: enrollment.division_id,
		auto_enrolled: enrollment.auto_enrolled,
		enrolled_at: enrollment.enrolled_at,
	} as Record<string, unknown>;
}

export function supabaseToEnrollmentOverride(record: Record<string, unknown> | null | undefined): DexieTypes.EnrollmentOverride {
	const r = (record ?? {}) as Record<string, unknown>;
	return {
		id: (r['id'] as string) || (r['override_id'] as string) || '',
		year_id: (r['year_id'] as string) ?? (r['bible_bee_year_id'] as string) ?? '',
		child_id: (r['child_id'] as string) ?? (r['childId'] as string) ?? '',
		division_id: (r['division_id'] as string) ?? (r['divisionId'] as string) ?? '',
		reason: (r['reason'] as string) ?? undefined,
		created_by: (r['created_by'] as string) ?? (r['createdBy'] as string) ?? undefined,
		created_at: (r['created_at'] as string) ?? new Date().toISOString(),
	} as DexieTypes.EnrollmentOverride;
}

// =====================================
// Registration mappings
// =====================================

export type SupabaseRegistration =
	SupabaseTypes.Database['public']['Tables']['registrations']['Row'];

export function supabaseToRegistration(record: SupabaseRegistration | Record<string, unknown>): DexieTypes.Registration {
	const r = record as Record<string, unknown>;
	return {
		registration_id: (r['registration_id'] as string) || '',
		child_id: (r['child_id'] as string) ?? '',
		cycle_id: (r['cycle_id'] as string) ?? '',
		status: (r['status'] as string) ?? 'active',
		pre_registered_sunday_school: (r['pre_registered_sunday_school'] as boolean) ?? false,
		consents: parseConsents(r['consents']),
		submitted_via: (r['submitted_via'] as string) ?? 'web',
		submitted_at: (r['submitted_at'] as string) ?? new Date().toISOString(),
	} as DexieTypes.Registration;
}

export function registrationToSupabase(reg: Partial<DexieTypes.Registration>): Partial<SupabaseRegistration> {
	return {
		registration_id: reg.registration_id,
		child_id: reg.child_id,
		cycle_id: reg.cycle_id,
		status: reg.status,
		pre_registered_sunday_school: reg.pre_registered_sunday_school,
		consents: serializeIfObject(reg.consents) as unknown as SupabaseRegistration['consents'],
		submitted_via: reg.submitted_via,
		submitted_at: reg.submitted_at,
	} as Partial<SupabaseRegistration>;
}

export function brandingSettingsToSupabase(
	settings: CreateBrandingSettingsDTO
): Omit<SupabaseBrandingSettings, 'created_at' | 'updated_at'> {
	const s = settings as unknown as Record<string, unknown>;
	return ({
	setting_id: settings.setting_id,
	org_id: settings.org_id,
	primary_color: (s.primary_color as string | undefined) ?? (s.primaryColor as string | undefined) ?? undefined,
	secondary_color: (s.secondary_color as string | undefined) ?? (s.secondaryColor as string | undefined) ?? undefined,
	logo_url: (s.logo_url as string | undefined) ?? (s.logoUrl as string | undefined) ?? undefined,
	org_name: (s.org_name as string | undefined) ?? (s.orgName as string | undefined) ?? undefined,
	} as unknown) as Omit<SupabaseBrandingSettings, 'created_at' | 'updated_at'>;
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