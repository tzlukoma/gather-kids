

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

export interface LeaderAssignment {
    assignment_id: string; // PK
    leader_id: string; // FK to users
    ministry_id: string; // FK
    cycle_id: string; // FK
    role: 'Primary' | 'Volunteer';
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

export interface Scripture {
    id: string;
    competitionYearId: string;
    reference: string;
    text: string;
    translation?: string;
    // Flattened map of translation key -> text. Example: { NIV: '...', KJV: '...' }
    texts?: { [key: string]: string };
    bookLangAlt?: string;
    sortOrder?: number;
    createdAt: string;
    updatedAt: string;
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

export interface StudentScripture {
    id: string;
    childId: string;
    competitionYearId: string;
    scriptureId: string;
    status: 'assigned' | 'completed';
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StudentEssay {
    id: string;
    childId: string;
    competitionYearId: string;
    status: 'assigned' | 'submitted';
    submittedAt?: string;
    promptText: string;
    instructions?: string;
    createdAt: string;
    updatedAt: string;
}
