import type * as DexieTypes from '../types';
import type * as SupabaseTypes from './supabase-types';

/**
 * Maps between Dexie types and Supabase generated types
 * This ensures consistent typing regardless of which adapter is used
 */

// Type mapper utility types
type OmitSystemFields<T> = Omit<T, 'created_at' | 'updated_at'>;
type WithOptionalId<T, K extends string> = Omit<T, K> & Partial<Pick<T, K>>;

// =====================================
// Household Mappings
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