import { z } from 'zod';

/**
 * Canonical Registration Flow DTOs - Snake Case Standard
 * 
 * These DTOs represent the standardized data shapes for the registration flow.
 * All field names use snake_case for consistency across DB, JSON, and APIs.
 * 
 * This is the "fresh start" approach - these DTOs define the canonical shape
 * that the DAL should expose to the UI, regardless of underlying DB schema.
 */

// =====================================
// Household DTOs
// =====================================

export const HouseholdReadDto = z.object({
  household_id: z.string(),
  name: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  preferred_scripture_translation: z.string().optional(),
  primary_email: z.string().optional(),
  primary_phone: z.string().optional(),
  photo_url: z.string().optional(),
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const HouseholdWriteDto = z.object({
  household_id: z.string().optional(), // Optional for creates
  name: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  preferred_scripture_translation: z.string().optional(),
  primary_email: z.string().optional(),
  primary_phone: z.string().optional(),
  photo_url: z.string().optional(),
});

export type HouseholdRead = z.infer<typeof HouseholdReadDto>;
export type HouseholdWrite = z.infer<typeof HouseholdWriteDto>;

// =====================================
// Guardian DTOs
// =====================================

export const GuardianReadDto = z.object({
  guardian_id: z.string(),
  household_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  mobile_phone: z.string(),
  email: z.string().optional(),
  relationship: z.string(),
  is_primary: z.boolean(),
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const GuardianWriteDto = z.object({
  guardian_id: z.string().optional(), // Optional for creates
  household_id: z.string(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  mobile_phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required').optional(),
  relationship: z.string().min(1, 'Relationship is required'),
  is_primary: z.boolean().default(false),
});

export type GuardianRead = z.infer<typeof GuardianReadDto>;
export type GuardianWrite = z.infer<typeof GuardianWriteDto>;

// =====================================
// Emergency Contact DTOs
// =====================================

export const EmergencyContactReadDto = z.object({
  contact_id: z.string(),
  household_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  mobile_phone: z.string(),
  relationship: z.string(),
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const EmergencyContactWriteDto = z.object({
  contact_id: z.string().optional(), // Optional for creates
  household_id: z.string(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  mobile_phone: z.string().min(10, 'Valid phone number is required'),
  relationship: z.string().min(1, 'Relationship is required'),
});

export type EmergencyContactRead = z.infer<typeof EmergencyContactReadDto>;
export type EmergencyContactWrite = z.infer<typeof EmergencyContactWriteDto>;

// =====================================
// Child DTOs
// =====================================

export const ChildReadDto = z.object({
  child_id: z.string(),
  household_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  dob: z.string().optional(), // ISO date string
  grade: z.string().optional(),
  child_mobile: z.string().optional(),
  allergies: z.string().optional(),
  medical_notes: z.string().optional(),
  special_needs: z.boolean().optional(),
  special_needs_notes: z.string().optional(),
  is_active: z.boolean(),
  photo_url: z.string().optional(),
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const ChildWriteDto = z.object({
  child_id: z.string().optional(), // Optional for creates
  household_id: z.string(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  dob: z.string().refine((val) => val && !isNaN(Date.parse(val)), {
    message: 'Valid date of birth is required',
  }).optional(),
  grade: z.string().optional(),
  child_mobile: z.string().optional(),
  allergies: z.string().optional(),
  medical_notes: z.string().optional(),
  special_needs: z.boolean().optional(),
  special_needs_notes: z.string().optional(),
  is_active: z.boolean().default(true),
  photo_url: z.string().optional(),
});

export type ChildRead = z.infer<typeof ChildReadDto>;
export type ChildWrite = z.infer<typeof ChildWriteDto>;

// =====================================
// Registration & Consent DTOs
// =====================================

export const ConsentDto = z.object({
  type: z.enum(['liability', 'photo_release', 'custom']), // Snake case for photo_release
  text: z.string().optional(), // For custom consents
  accepted_at: z.string().nullable(), // ISO timestamp or null
  signer_id: z.string(),
  signer_name: z.string(),
});

export const RegistrationReadDto = z.object({
  registration_id: z.string(),
  child_id: z.string(),
  cycle_id: z.string(),
  status: z.enum(['active', 'pending', 'inactive']),
  pre_registered_sunday_school: z.boolean(),
  consents: z.array(ConsentDto),
  submitted_via: z.enum(['web', 'import']),
  submitted_at: z.string(), // ISO timestamp
});

export const RegistrationWriteDto = z.object({
  registration_id: z.string().optional(), // Optional for creates
  child_id: z.string(),
  cycle_id: z.string(),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
  pre_registered_sunday_school: z.boolean().default(true),
  consents: z.array(ConsentDto),
  submitted_via: z.enum(['web', 'import']).default('web'),
  submitted_at: z.string().optional(), // ISO timestamp - optional for creates
});

export type Consent = z.infer<typeof ConsentDto>;
export type RegistrationRead = z.infer<typeof RegistrationReadDto>;
export type RegistrationWrite = z.infer<typeof RegistrationWriteDto>;

// =====================================
// Composite Registration Form DTO
// =====================================

export const RegistrationFormDto = z.object({
  household: HouseholdWriteDto,
  guardians: z.array(GuardianWriteDto).min(1, 'At least one guardian is required'),
  emergency_contact: EmergencyContactWriteDto,
  children: z.array(ChildWriteDto).min(1, 'At least one child is required'),
  consents: z.object({
    liability: z.boolean().refine((val) => val === true, {
      message: 'Liability consent is required',
    }),
    photo_release: z.boolean().refine((val) => val === true, { // Snake case
      message: 'Photo release consent is required',
    }),
    custom_consents: z.record(z.boolean()).optional(),
  }),
});

export type RegistrationForm = z.infer<typeof RegistrationFormDto>;

// =====================================
// Household Data Composite DTO (for pre-fill)
// =====================================

export const HouseholdDataDto = z.object({
  household: HouseholdReadDto,
  guardians: z.array(GuardianReadDto),
  emergency_contacts: z.array(EmergencyContactReadDto),
  children: z.array(ChildReadDto),
  registrations: z.array(RegistrationReadDto),
});

export type HouseholdData = z.infer<typeof HouseholdDataDto>;