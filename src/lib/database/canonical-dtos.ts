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

// =====================================
// Bible Bee DTOs
// =====================================

/**
 * Canonical Bible Bee Cycle DTO
 * Represents a Bible Bee competition cycle linked to a registration cycle
 */
export const BibleBeeCycleReadDto = z.object({
  id: z.string(),
  cycle_id: z.string(), // FK to registration_cycles.cycle_id
  name: z.string(), // Human-readable name (e.g., "Fall 2025 Bible Bee")
  description: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const BibleBeeCycleWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  cycle_id: z.string(),
  name: z.string().min(1, 'Cycle name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(false),
});

export type BibleBeeCycleRead = z.infer<typeof BibleBeeCycleReadDto>;
export type BibleBeeCycleWrite = z.infer<typeof BibleBeeCycleWriteDto>;

/**
 * Canonical Division DTO
 * Represents a Bible Bee division (age/grade group) within a cycle
 */
export const DivisionReadDto = z.object({
  id: z.string(),
  bible_bee_cycle_id: z.string(), // FK to bible_bee_cycles.id
  name: z.string(), // Division name (e.g., "Primary", "Elementary", "Middle School", "High School")
  description: z.string().optional(),
  minimum_required: z.number(), // Minimum number of scriptures required
  min_last_order: z.number().optional(), // Calculated minimum boundary (for progress tracking)
  min_grade: z.number(), // Minimum grade level (-1 to 12, where -1 = Pre-K)
  max_grade: z.number(), // Maximum grade level (-1 to 12)
  requires_essay: z.boolean(), // Whether this division requires an essay
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const DivisionWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  bible_bee_cycle_id: z.string(),
  name: z.string().min(1, 'Division name is required'),
  description: z.string().optional(),
  minimum_required: z.number().min(0, 'Minimum required must be non-negative'),
  min_grade: z.number().min(-1).max(12, 'Grade must be between -1 and 12'),
  max_grade: z.number().min(-1).max(12, 'Grade must be between -1 and 12'),
  requires_essay: z.boolean().default(false),
}).refine((data) => data.min_grade <= data.max_grade, {
  message: 'Minimum grade must be less than or equal to maximum grade',
});

export type DivisionRead = z.infer<typeof DivisionReadDto>;
export type DivisionWrite = z.infer<typeof DivisionWriteDto>;

/**
 * Canonical Bible Bee Enrollment DTO
 * Represents a child's enrollment in a Bible Bee cycle
 */
export const BibleBeeEnrollmentReadDto = z.object({
  id: z.string(),
  bible_bee_cycle_id: z.string(), // FK to bible_bee_cycles.id
  child_id: z.string(), // FK to children.child_id
  division_id: z.string(), // FK to divisions.id
  auto_enrolled: z.boolean(), // Whether enrollment was automatic or manual
  enrolled_at: z.string(), // ISO timestamp
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const BibleBeeEnrollmentWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  bible_bee_cycle_id: z.string(),
  child_id: z.string(),
  division_id: z.string(),
  auto_enrolled: z.boolean().default(true),
  enrolled_at: z.string().optional(), // ISO timestamp - optional for creates
});

export type BibleBeeEnrollmentRead = z.infer<typeof BibleBeeEnrollmentReadDto>;
export type BibleBeeEnrollmentWrite = z.infer<typeof BibleBeeEnrollmentWriteDto>;

/**
 * Canonical Enrollment Override DTO
 * Represents manual division placement overrides for children
 */
export const EnrollmentOverrideReadDto = z.object({
  id: z.string(),
  bible_bee_cycle_id: z.string(), // FK to bible_bee_cycles.id
  child_id: z.string(), // FK to children.child_id
  division_id: z.string(), // FK to divisions.id
  reason: z.string().optional(), // Reason for the override
  created_by: z.string().optional(), // Admin user who created the override
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const EnrollmentOverrideWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  bible_bee_cycle_id: z.string(),
  child_id: z.string(),
  division_id: z.string(),
  reason: z.string().optional(),
  created_by: z.string().optional(),
});

export type EnrollmentOverrideRead = z.infer<typeof EnrollmentOverrideReadDto>;
export type EnrollmentOverrideWrite = z.infer<typeof EnrollmentOverrideWriteDto>;

/**
 * Canonical Essay Prompt DTO
 * Represents essay requirements for divisions
 */
export const EssayPromptReadDto = z.object({
  id: z.string(),
  bible_bee_cycle_id: z.string(), // FK to bible_bee_cycles.id
  division_id: z.string().optional(), // FK to divisions.id (optional for cycle-wide prompts)
  title: z.string(), // Essay title
  prompt: z.string(), // Essay prompt text
  instructions: z.string().optional(), // Additional instructions
  due_date: z.string().optional(), // Due date for essay submission (ISO timestamp)
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const EssayPromptWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  bible_bee_cycle_id: z.string(),
  division_id: z.string().optional(),
  title: z.string().min(1, 'Essay title is required'),
  prompt: z.string().min(1, 'Essay prompt is required'),
  instructions: z.string().optional(),
  due_date: z.string().optional(), // ISO timestamp
});

export type EssayPromptRead = z.infer<typeof EssayPromptReadDto>;
export type EssayPromptWrite = z.infer<typeof EssayPromptWriteDto>;

/**
 * Canonical Scripture DTO
 * Represents a scripture assignment for a Bible Bee cycle
 */
export const ScriptureReadDto = z.object({
  id: z.string(),
  bible_bee_cycle_id: z.string(), // FK to bible_bee_cycles.id
  reference: z.string(), // Scripture reference (e.g., "Philippians 4:4-5")
  texts: z.record(z.string()), // Object with translation keys (NIV, KJV, NVI) mapping to scripture text
  scripture_number: z.string().optional(), // Scripture number (e.g., "1-2")
  scripture_order: z.number(), // Order within the cycle
  counts_for: z.number(), // How many scriptures this counts as (default: 1)
  category: z.string().optional(), // Category (e.g., "Primary Minimum", "Competition")
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const ScriptureWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  bible_bee_cycle_id: z.string(),
  reference: z.string().min(1, 'Scripture reference is required'),
  texts: z.record(z.string()).refine((texts) => Object.keys(texts).length > 0, {
    message: 'At least one translation text is required',
  }),
  scripture_number: z.string().optional(),
  scripture_order: z.number().min(1, 'Scripture order must be positive'),
  counts_for: z.number().min(1).default(1),
  category: z.string().optional(),
});

export type ScriptureRead = z.infer<typeof ScriptureReadDto>;
export type ScriptureWrite = z.infer<typeof ScriptureWriteDto>;

/**
 * Canonical Student Scripture Progress DTO
 * Represents a child's progress on a specific scripture
 */
export const StudentScriptureReadDto = z.object({
  id: z.string(),
  bible_bee_cycle_id: z.string(), // FK to bible_bee_cycles.id
  child_id: z.string(), // FK to children.child_id
  scripture_id: z.string(), // FK to scriptures.id
  is_completed: z.boolean(), // Whether the child has completed this scripture
  completed_at: z.string().optional(), // When the scripture was completed (ISO timestamp)
  created_at: z.string(), // ISO timestamp
  updated_at: z.string(), // ISO timestamp
});

export const StudentScriptureWriteDto = z.object({
  id: z.string().optional(), // Optional for creates
  bible_bee_cycle_id: z.string(),
  child_id: z.string(),
  scripture_id: z.string(),
  is_completed: z.boolean().default(false),
  completed_at: z.string().optional(), // ISO timestamp
});

export type StudentScriptureRead = z.infer<typeof StudentScriptureReadDto>;
export type StudentScriptureWrite = z.infer<typeof StudentScriptureWriteDto>;


// =====================================
// Bible Bee Aggregate DTOs
// =====================================

/**
 * Canonical Bible Bee Progress Summary DTO
 * Aggregated progress information for a child in a cycle
 */
export const BibleBeeProgressReadDto = z.object({
  child_id: z.string(),
  bible_bee_cycle_id: z.string(),
  division_id: z.string(),
  division_name: z.string(),
  total_scriptures: z.number(), // Total scriptures in the cycle
  required_scriptures: z.number(), // Required scriptures for this division
  completed_scriptures: z.number(), // Scriptures completed by this child
  progress_percentage: z.number(), // Calculated progress percentage
  essay_required: z.boolean(), // Whether essay is required for this division
  enrollment_status: z.enum(['enrolled', 'not_enrolled', 'overridden']),
  last_activity_at: z.string().optional(), // Last activity date (ISO timestamp)
});

export type BibleBeeProgressRead = z.infer<typeof BibleBeeProgressReadDto>;

/**
 * Canonical Division Summary DTO
 * Summary information for a division within a cycle
 */
export const DivisionSummaryReadDto = z.object({
  division_id: z.string(),
  division_name: z.string(),
  minimum_required: z.number(),
  min_grade: z.number(),
  max_grade: z.number(),
  requires_essay: z.boolean(),
  total_enrolled: z.number(), // Total children enrolled in this division
  completed_count: z.number(), // Children who have completed requirements
  in_progress_count: z.number(), // Children currently working on requirements
  not_started_count: z.number(), // Children who haven't started
});

export type DivisionSummaryRead = z.infer<typeof DivisionSummaryReadDto>;