import type * as DexieTypes from '../types';
import type * as SupabaseTypes from './supabase-types';
import type * as CanonicalDtos from './canonical-dtos';

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

// =====================================
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
		consents: registration.consents.map(consent => ({
			...consent,
			type: consent.type === 'photoRelease' ? 'photo_release' : consent.type as any, // Convert to snake_case
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
		consents: canonical.consents.map(consent => ({
			...consent,
			type: consent.type === 'photo_release' ? 'photoRelease' : consent.type as any, // Convert to camelCase for legacy
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
	return {
		household_id: record.household_id || '',
		name: record.name || undefined,
		preferredScriptureTranslation: record.preferredScriptureTranslation || undefined,
		address_line1: record.address_line1 || '',
		address_line2: record.address_line2 || '',
		city: record.city || '',
		state: record.state || '',
		zip: record.zip || '',
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
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
	} as any; // Using any for fallback types
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
	return {
		child_id: record.child_id || '',
		household_id: record.household_id || '',
		first_name: record.first_name || '',
		last_name: record.last_name || '',
		dob: record.dob,
		grade: record.grade,
		child_mobile: record.child_mobile,
		allergies: record.allergies,
		medical_notes: record.medical_notes,
		special_needs: record.special_needs || false,
		special_needs_notes: record.special_needs_notes,
		is_active: record.is_active !== undefined ? record.is_active : true,
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
		photo_url: record.photo_url,
	};
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
		household_id: record.household_id || '',
		first_name: record.first_name || '',
		last_name: record.last_name || '',
		mobile_phone: record.mobile_phone || '',
		email: record.email,
		relationship: record.relationship || '',
		is_primary: record.is_primary || false,
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
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
		contact_id: record.contact_id || '',
		household_id: record.household_id || '',
		first_name: record.first_name || '',
		last_name: record.last_name || '',
		mobile_phone: record.mobile_phone || '',
		relationship: record.relationship || '',
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
	return {
		ministry_id: record.ministry_id || '',
		name: record.name || '',
		description: record.description,
		min_age: record.min_age,
		max_age: record.max_age,
		min_grade: record.min_grade,
		max_grade: record.max_grade,
		is_active: record.is_active !== undefined ? record.is_active : true,
		enrollment_type: record.enrollment_type || 'enrolled',
		custom_questions: record.custom_questions,
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
	};
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
		custom_questions: ministry.custom_questions,
	} as any; // Using any for fallback types
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
	return {
		setting_id: record.setting_id || '',
		org_id: record.org_id,
		primary_color: record.primary_color,
		secondary_color: record.secondary_color,
		logo_url: record.logo_url,
		org_name: record.org_name,
		created_at: record.created_at || new Date().toISOString(),
		updated_at: record.updated_at || new Date().toISOString(),
	};
}

export function brandingSettingsToSupabase(
	settings: CreateBrandingSettingsDTO
): Omit<SupabaseBrandingSettings, 'created_at' | 'updated_at'> {
	return {
		setting_id: settings.setting_id,
		org_id: settings.org_id,
		primary_color: settings.primary_color,
		secondary_color: settings.secondary_color,
		logo_url: settings.logo_url,
		org_name: settings.org_name,
	} as any; // Using any for fallback types
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