

export interface CustomQuestion {
    id: string;
    text: string;
    type: 'radio' | 'checkbox' | 'text';
    options?: string[];
}

export interface Household {
    household_id: string; // PK
    name?: string;
    preferredScriptureTranslation?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    primary_email?: string; // For settings profile management
    primary_phone?: string; // For settings profile management
    photo_url?: string; // Avatar path for settings profile management
    avatar_path?: string; // Alternative avatar field name
    created_at: string;
    updated_at: string;
}

export interface Guardian {
    guardian_id: string; // PK
    household_id: string; // FK
    first_name: string;
    last_name: string;
    mobile_phone: string;
    email?: string;
    relationship: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmergencyContact {
    contact_id: string; // PK
    household_id: string; // FK
    first_name: string;
    last_name: string;
    mobile_phone: string;
    relationship: string;
}

export interface Child {
    child_id: string; // PK
    household_id: string; // FK
    first_name: string;
    last_name: string;
    dob?: string; // ISO
    grade?: string;
    child_mobile?: string;
    allergies?: string;
    medical_notes?: string;
    special_needs?: boolean;
    special_needs_notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    photo_url?: string;
}

export interface RegistrationCycle {
    cycle_id: string; // PK (e.g., "2026")
    name: string; // Display name (e.g., "Fall 2026")
    start_date: string; // ISO
    end_date: string; // ISO
    is_active: boolean;
}

export interface ChildYearProfile {
    child_year_profile_id: string; // PK
    child_id: string; // FK
    cycle_id: string; // FK
    grade_this_year?: string;
    homeroom?: string;
    accommodations?: string;
    emergency_contact_ref?: string;
}

export interface Consent {
    type: 'liability' | 'photoRelease' | 'custom';
    text?: string; // For custom consents
    accepted_at: string | null;
    signer_id: string;
    signer_name: string;
}

export interface Registration {
    registration_id: string; // PK
    child_id: string; // FK
    cycle_id: string; // FK
    status: 'active' | 'pending' | 'inactive';
    pre_registered_sunday_school: boolean;
    consents: Consent[];
    submitted_via: 'web' | 'import';
    submitted_at: string;
}

export interface Ministry {
    ministry_id: string; // PK
    name: string;
    code: string;
    email?: string; // Email address for the ministry
    enrollment_type: 'enrolled' | 'expressed_interest';
    min_age?: number;
    max_age?: number;
    min_grade?: string;
    max_grade?: string;
    open_at?: string; // ISO
    close_at?: string; // ISO
    data_profile: 'Basic' | 'SafetyAware';
    created_at: string;
    updated_at: string;
    details?: string;
    description?: string;
    custom_questions?: CustomQuestion[];
    communicate_later?: boolean;
    optional_consent_text?: string;
    is_active?: boolean;
}

export interface MinistryEnrollment {
    enrollment_id: string; // PK
    child_id: string; // FK
    cycle_id: string; // FK
    ministry_id: string; // FK
    status: 'enrolled' | 'withdrawn' | 'expressed_interest';
    custom_fields?: object;
    notes?: string;
}

// Legacy - keeping for backward compatibility during migration
export interface LeaderAssignment {
    assignment_id: string; // PK
    leader_id: string; // FK to users
    ministry_id: string; // FK
    cycle_id: string; // FK
    role: 'Primary' | 'Volunteer';
}

// NEW: Leader Profiles (non-user records)
export interface LeaderProfile {
    leader_id: string; // PK (cuid/uuid)
    first_name: string;
    last_name: string;
    email?: string; // nullable, unique if present, lowercase
    phone?: string; // nullable, normalized
    photo_url?: string; // Avatar path for settings profile management
    avatar_path?: string; // Alternative avatar field name
    notes?: string; // nullable
    background_check_complete?: boolean; // nullable, default false
    ministryCount?: number;
    is_active: boolean; // default true
    created_at: string;
    updated_at: string;
}

// NEW: Ministry Leader Memberships (many-to-many with role)
export interface MinistryLeaderMembership {
    membership_id: string; // PK
    ministry_id: string; // FK → ministries
    leader_id: string; // FK → leader_profiles
    role_type: 'PRIMARY' | 'VOLUNTEER';
    is_active: boolean; // default true
    notes?: string; // nullable
    created_at: string;
    updated_at: string;
}

// NEW: Ministry Accounts (one per ministry for RBAC)
export interface MinistryAccount {
    ministry_id: string; // FK, unique
    email: string; // unique, lowercase
    display_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// NEW: Ministry Groups (for grouping ministries with shared RBAC)
export interface MinistryGroup {
    id: string; // PK
    code: string; // unique, e.g., 'choirs'
    name: string; // display name, e.g., 'Choirs'
    description?: string;
    email?: string; // contact email for digest notifications
    // Group-level consent management
    custom_consent_text?: string; // Custom consent text for this group
    custom_consent_required?: boolean; // Whether consent is required for this group
    created_at: string;
    updated_at: string;
}

// NEW: Ministry Group Members (many-to-many: ministries ↔ groups)
export interface MinistryGroupMember {
    group_id: string; // FK to ministry_groups.id
    ministry_id: string; // FK to ministries.ministry_id
    created_at: string;
}



export interface User {
    user_id: string; // PK
    name: string;
    email: string;
    mobile_phone?: string;
    role: 'ADMIN' | 'MINISTRY_LEADER' | 'GUARDIAN' | 'VOLUNTEER';
    is_active: boolean;
    background_check_status?: 'clear' | 'pending' | 'expired' | 'na';
    expires_at?: string; // ISO
}

export interface EventTimeslot {
    id: string;
    start_local: string; // HH:mm
    end_local: string; // HH:mm
}

export interface Event {
    event_id: string; // PK
    name: string;
    location_label?: string;
    timeslots: EventTimeslot[];
}

export interface Attendance {
    attendance_id: string; // PK
    event_id: string; // FK
    child_id: string; // FK
    date: string; // YYYY-MM-DD
    timeslot_id?: string;
    check_in_at?: string; // ISO
    checked_in_by?: string; // FK to users
    check_out_at?: string; // ISO
    checked_out_by?: string; // FK to users
    picked_up_by?: string;
    pickup_method?: 'name_last4' | 'PIN' | 'other';
    notes?: string;
    first_time_flag?: boolean;
}

export type IncidentSeverity = 'low' | 'medium' | 'high';

export interface Incident {
    incident_id: string; // PK
    child_id: string; // FK
    child_name: string; // Denormalized for easy display
    event_id?: string; // FK
    description: string;
    severity: IncidentSeverity;
    leader_id: string; // FK to users
    timestamp: string; // ISO
    admin_acknowledged_at?: string | null; // ISO
}

export interface AuditLog {
    log_id: string; // PK
    actor_user_id: string;
    action: string;
    target_type: string;
    target_id: string;
    timestamp: string; // ISO
    diff?: object;
    fields_returned?: string[];
}

// --- Bible Bee domain types ---
export interface CompetitionYear {
    id: string;
    year: number;
    name?: string;
    description?: string;
    opensAt?: string;
    closesAt?: string;
    createdAt: string;
    updatedAt: string;
}

// New Bible Bee Year interface (enhanced CompetitionYear)
// Bible Bee Cycle interface (replaces BibleBeeYear)
export interface BibleBeeCycle {
    id: string;
    cycle_id: string; // FK to registration_cycles
    name: string; // Human-readable name (e.g., "Fall 2025 Bible Bee")
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

// Legacy BibleBeeYear interface - kept for backwards compatibility during transition
export interface BibleBeeYear {
    id: string;
    year?: number;
    name?: string; // The human-readable name for the Bible Bee year
    // Backwards-compatible fields: some code and generated types use `label` and `cycle_id`.
    label?: string;
    cycle_id?: string;
    description?: string;
    is_active: boolean;
    registration_open_date?: string;
    registration_close_date?: string;
    competition_start_date?: string;
    competition_end_date?: string;
    created_at: string;
    updated_at?: string;
}

// New Division interface
export interface Division {
    id: string;
    bible_bee_cycle_id: string; // FK to bible_bee_cycles (was year_id)
    name: string;
    minimum_required: number;
    min_last_order?: number; // calculated minimum boundary
    min_grade: number; // 0-12
    max_grade: number; // 0-12
    created_at: string;
    updated_at: string;
}

export interface Scripture {
    id: string;
    bible_bee_cycle_id: string; // FK to bible_bee_cycles (canonical)
    reference: string;
    text: string;
    translation?: string;
    // Enhanced texts field for NIV/KJV/NIV-Spanish
    texts?: { [key: string]: string };
    bookLangAlt?: string;
    sortOrder?: number;
    // New fields for enhanced scripture system
    scripture_number?: string; // e.g., "1-2"
    scripture_order?: number; // controls display & min cut-offs
    counts_for?: number; // how many this entry counts for
    category?: string; // e.g., "Primary Minimum", "Competition"
    created_at: string;
    updated_at: string;
}

export interface GradeRule {
    id: string;
    competitionYearId: string;
    minGrade: number;
    maxGrade: number;
    type: 'scripture' | 'essay';
    targetCount?: number;
    promptText?: string;
    instructions?: string;
    createdAt: string;
    updatedAt: string;
}

// New Essay Prompt interface
export interface EssayPrompt {
    id: string;
    bible_bee_cycle_id: string; // FK to bible_bee_cycles
    division_id?: string; // FK to divisions (optional for cycle-wide prompts)
    title: string; // Essay title
    prompt: string; // Essay prompt text
    instructions?: string; // Additional instructions
    due_date: string; // ISO date
    created_at: string;
    updated_at: string;
}

// New Enrollment interface (join table)
export interface Enrollment {
    id: string;
    bible_bee_cycle_id: string; // FK to bible_bee_cycles
    child_id: string; // FK to children
    division_id: string; // FK to divisions
    auto_enrolled: boolean;
    enrolled_at: string;
}

// New Enrollment Override interface
export interface EnrollmentOverride {
    id: string;
    bible_bee_cycle_id: string; // FK to bible_bee_cycles
    child_id: string; // FK to children
    division_id: string; // FK to divisions
    reason?: string;
    created_by?: string; // admin user id/email
    created_at: string;
}

export interface StudentScripture {
    id: string;
    child_id: string; // FK to children
    bible_bee_cycle_id: string; // FK to bible_bee_cycles
    scripture_id: string; // FK to scriptures
    is_completed: boolean;
    completed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface StudentEssay {
    id: string;
    child_id: string; // FK to children
    bible_bee_cycle_id: string; // FK to bible_bee_cycles (canonical)
    essay_prompt_id: string; // FK to essay_prompts
    status: 'assigned' | 'submitted';
    submitted_at?: string;
    created_at: string;
    updated_at: string;
}

// --- Branding Settings ---
export interface BrandingSettings {
    setting_id: string; // PK
    org_id: string; // Organization identifier (for multi-tenant support)
    logo_url?: string; // File URL for production, base64 data URL for demo
    app_name?: string; // Custom app name
    description?: string; // Custom description/tagline
    use_logo_only?: boolean; // When true, show only logo in headers (logo required)
    youtube_url?: string; // YouTube social link
    instagram_url?: string; // Instagram social link
    created_at: string;
    updated_at: string;
}

export interface UserHousehold {
    user_household_id: string; // PK
    auth_user_id: string; // Supabase auth user ID
    household_id: string; // FK to households
    created_at: string;
}

export interface FormDraft {
    id: string; // `${form_name}::${user_id}`
    form_name: string;
    user_id: string;
    payload: any; // JSON object containing form data
    version: number;
    updated_at: string;
}
