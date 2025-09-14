
import Dexie, { type EntityTable } from 'dexie';
import type { Household, Guardian, EmergencyContact, Child, RegistrationCycle, ChildYearProfile, Registration, Ministry, MinistryEnrollment, LeaderAssignment, LeaderProfile, MinistryLeaderMembership, MinistryAccount, MinistryGroup, MinistryGroupMember, User, Event, Attendance, Incident, AuditLog, CompetitionYear, Scripture, GradeRule, StudentScripture, StudentEssay, BrandingSettings, BibleBeeYear, BibleBeeCycle, Division, EssayPrompt, Enrollment, EnrollmentOverride, UserHousehold, FormDraft } from './types';

// prettier-ignore
class GatherKidsDB extends Dexie {
    households!: EntityTable<Household, 'household_id'>;
    guardians!: EntityTable<Guardian, 'guardian_id'>;
    emergency_contacts!: EntityTable<EmergencyContact, 'contact_id'>;
    children!: EntityTable<Child, 'child_id'>;
    registration_cycles!: EntityTable<RegistrationCycle, 'cycle_id'>;
    child_year_profiles!: EntityTable<ChildYearProfile, 'child_year_profile_id'>;
    registrations!: EntityTable<Registration, 'registration_id'>;
    ministries!: EntityTable<Ministry, 'ministry_id'>;
    ministry_enrollments!: EntityTable<MinistryEnrollment, 'enrollment_id'>;
    leader_assignments!: EntityTable<LeaderAssignment, 'assignment_id'>; // Legacy
    // NEW: Leader Management Tables
    leader_profiles!: EntityTable<LeaderProfile, 'leader_id'>;
    ministry_leader_memberships!: EntityTable<MinistryLeaderMembership, 'membership_id'>;
    ministry_accounts!: EntityTable<MinistryAccount, 'ministry_id'>;
    // NEW: Ministry Groups Tables
    ministry_groups!: EntityTable<MinistryGroup, 'id'>;
    ministry_group_members!: EntityTable<MinistryGroupMember, 'group_id'>;
    users!: EntityTable<User, 'user_id'>;
    events!: EntityTable<Event, 'event_id'>;
    attendance!: EntityTable<Attendance, 'attendance_id'>;
    incidents!: EntityTable<Incident, 'incident_id'>;
    audit_logs!: EntityTable<AuditLog, 'log_id'>;
    // Bible Bee stores (original)
    competitionYears!: EntityTable<CompetitionYear, 'id'>;
    scriptures!: EntityTable<Scripture, 'id'>;
    gradeRules!: EntityTable<GradeRule, 'id'>;
    studentScriptures!: EntityTable<StudentScripture, 'id'>;
    studentEssays!: EntityTable<StudentEssay, 'id'>;
    // New Bible Bee stores
    bible_bee_years!: EntityTable<BibleBeeYear, 'id'>;
    bible_bee_cycles!: EntityTable<BibleBeeCycle, 'id'>;
    divisions!: EntityTable<Division, 'id'>;
    essay_prompts!: EntityTable<EssayPrompt, 'id'>;
    enrollments!: EntityTable<Enrollment, 'id'>;
    enrollment_overrides!: EntityTable<EnrollmentOverride, 'id'>;
    // Branding settings
    branding_settings!: EntityTable<BrandingSettings, 'setting_id'>;
    // User household mappings for Supabase auth
    user_households!: EntityTable<UserHousehold, 'user_household_id'>;
    // Form drafts for persisting user form state
    form_drafts!: EntityTable<FormDraft, 'id'>;

    constructor() {
        super('gatherKidsDB');
        this.version(15).stores({
            households: 'household_id, created_at, [city+state+zip]',
            guardians: 'guardian_id, household_id, mobile_phone, email',
            emergency_contacts: 'contact_id, household_id, mobile_phone',
            children: 'child_id, household_id, is_active, [last_name+first_name]',
            registration_cycles: 'cycle_id, is_active',
            child_year_profiles: 'child_year_profile_id, [child_id+cycle_id], cycle_id',
            registrations: 'registration_id, [child_id+cycle_id], [cycle_id+status]',
            ministries: 'ministry_id, code, enrollment_type, is_active',
            ministry_enrollments: 'enrollment_id, [ministry_id+cycle_id], [child_id+cycle_id], cycle_id',
            leader_assignments: 'assignment_id, [leader_id+cycle_id], [ministry_id+cycle_id]', // Legacy
            // NEW: Leader Management Tables
            leader_profiles: 'leader_id, email, phone, [first_name+last_name], is_active',
            ministry_leader_memberships: 'membership_id, [ministry_id+leader_id], ministry_id, leader_id, is_active',
            ministry_accounts: 'ministry_id, email',
            users: 'user_id, email, role, is_active, [last_name+first_name]',
            events: 'event_id, name',
            attendance: 'attendance_id, date, [event_id+date], [child_id+date]',
            incidents: 'incident_id, child_id, admin_acknowledged_at, timestamp, leader_id',
            audit_logs: 'log_id, [actor_user_id+timestamp], target_id',
            // Bible Bee (original)
            competitionYears: 'id, year',
            scriptures: 'id, competitionYearId, sortOrder, year_id, scripture_order, scripture_number',
            gradeRules: 'id, competitionYearId, [competitionYearId+minGrade+maxGrade], type',
            studentScriptures: 'id, childId, competitionYearId, scriptureId, status',
            studentEssays: 'id, childId, competitionYearId, status',
            // New Bible Bee stores
            bible_bee_years: 'id, label, is_active',
            divisions: 'id, year_id, [year_id+name], [year_id+min_grade+max_grade]',
            essay_prompts: 'id, year_id, [year_id+division_name]',
            enrollments: 'id, [year_id+child_id], year_id, child_id, division_id',
            enrollment_overrides: 'id, [year_id+child_id], year_id, child_id, division_id',
            // Branding settings
            branding_settings: 'setting_id, org_id, created_at, updated_at',
            // User household mappings for Supabase auth
            user_households: 'user_household_id, [auth_user_id+household_id], auth_user_id, household_id',
            // Form drafts for persisting user form state
            form_drafts: 'id, [user_id+form_name], user_id, form_name, updated_at',
        });
        
        // Version 16: Add bible_bee_cycles table
        this.version(16).stores({
            households: 'household_id, created_at, [city+state+zip]',
            guardians: 'guardian_id, household_id, mobile_phone, email',
            emergency_contacts: 'contact_id, household_id, mobile_phone',
            children: 'child_id, household_id, is_active, [last_name+first_name]',
            registration_cycles: 'cycle_id, is_active',
            child_year_profiles: 'child_year_profile_id, [child_id+cycle_id], cycle_id',
            registrations: 'registration_id, [child_id+cycle_id], [cycle_id+status]',
            ministries: 'ministry_id, code, enrollment_type, is_active',
            ministry_enrollments: 'enrollment_id, [ministry_id+cycle_id], [child_id+cycle_id], cycle_id',
            leader_assignments: 'assignment_id, [leader_id+cycle_id], [ministry_id+cycle_id]', // Legacy
            // NEW: Leader Management Tables
            leader_profiles: 'leader_id, email, phone, [first_name+last_name], is_active',
            ministry_leader_memberships: 'membership_id, [ministry_id+leader_id], ministry_id, leader_id, is_active',
            ministry_accounts: 'ministry_id, email',
            users: 'user_id, email, role, is_active, [last_name+first_name]',
            events: 'event_id, name',
            attendance: 'attendance_id, date, [event_id+date], [child_id+date]',
            incidents: 'incident_id, child_id, admin_acknowledged_at, timestamp, leader_id',
            audit_logs: 'log_id, [actor_user_id+timestamp], target_id',
            // Bible Bee (original)
            competitionYears: 'id, year',
            scriptures: 'id, competitionYearId, sortOrder, year_id, scripture_order, scripture_number',
            gradeRules: 'id, competitionYearId, [competitionYearId+minGrade+maxGrade], type',
            studentScriptures: 'id, childId, competitionYearId, scriptureId, status',
            studentEssays: 'id, childId, competitionYearId, status',
            // New Bible Bee stores
            bible_bee_years: 'id, label, is_active',
            bible_bee_cycles: 'id, cycle_id, name, is_active',
            divisions: 'id, year_id, [year_id+name], [year_id+min_grade+max_grade]',
            essay_prompts: 'id, year_id, [year_id+division_name]',
            enrollments: 'id, [year_id+child_id], year_id, child_id, division_id',
            enrollment_overrides: 'id, [year_id+child_id], year_id, child_id, division_id',
            // Branding settings
            branding_settings: 'setting_id, org_id, created_at, updated_at',
            // User household mappings for Supabase auth
            user_households: 'user_household_id, [auth_user_id+household_id], auth_user_id, household_id',
            // Form drafts for persisting user form state
            form_drafts: 'id, [user_id+form_name], user_id, form_name, updated_at',
        });
        
        // Version 17: Add ministry groups tables for group-level RBAC
        this.version(17).stores({
            households: 'household_id, created_at, [city+state+zip]',
            guardians: 'guardian_id, household_id, mobile_phone, email',
            emergency_contacts: 'contact_id, household_id, mobile_phone',
            children: 'child_id, household_id, is_active, [last_name+first_name]',
            registration_cycles: 'cycle_id, is_active',
            child_year_profiles: 'child_year_profile_id, [child_id+cycle_id], cycle_id',
            registrations: 'registration_id, [child_id+cycle_id], [cycle_id+status]',
            ministries: 'ministry_id, code, enrollment_type, is_active',
            ministry_enrollments: 'enrollment_id, [ministry_id+cycle_id], [child_id+cycle_id], cycle_id',
            leader_assignments: 'assignment_id, [leader_id+cycle_id], [ministry_id+cycle_id]', // Legacy
            // NEW: Leader Management Tables
            leader_profiles: 'leader_id, email, phone, [first_name+last_name], is_active',
            ministry_leader_memberships: 'membership_id, [ministry_id+leader_id], ministry_id, leader_id, is_active',
            ministry_accounts: 'ministry_id, email',
            // NEW: Ministry Groups Tables
            ministry_groups: 'id, code, name, is_active',
            ministry_group_members: '[group_id+ministry_id], group_id, ministry_id',
            users: 'user_id, email, role, is_active, [last_name+first_name]',
            events: 'event_id, name',
            attendance: 'attendance_id, date, [event_id+date], [child_id+date]',
            incidents: 'incident_id, child_id, admin_acknowledged_at, timestamp, leader_id',
            audit_logs: 'log_id, [actor_user_id+timestamp], target_id',
            // Bible Bee (original)
            competitionYears: 'id, year',
            scriptures: 'id, competitionYearId, sortOrder, year_id, scripture_order, scripture_number',
            gradeRules: 'id, competitionYearId, [competitionYearId+minGrade+maxGrade], type',
            studentScriptures: 'id, childId, competitionYearId, scriptureId, status',
            studentEssays: 'id, childId, competitionYearId, status',
            // New Bible Bee stores
            bible_bee_years: 'id, label, is_active',
            bible_bee_cycles: 'id, cycle_id, name, is_active',
            divisions: 'id, year_id, [year_id+name], [year_id+min_grade+max_grade]',
            essay_prompts: 'id, year_id, [year_id+division_name]',
            enrollments: 'id, [year_id+child_id], year_id, child_id, division_id',
            enrollment_overrides: 'id, [year_id+child_id], year_id, child_id, division_id',
            // Branding settings
            branding_settings: 'setting_id, org_id, created_at, updated_at',
            // User household mappings for Supabase auth
            user_households: 'user_household_id, [auth_user_id+household_id], auth_user_id, household_id',
            // Form drafts for persisting user form state
            form_drafts: 'id, [user_id+form_name], user_id, form_name, updated_at',
        });
    }
}

export const db = new GatherKidsDB();

// Make database available in window for debugging
if (typeof window !== 'undefined') {
    // @ts-expect-error - expose Dexie DB for debugging in dev only
    window.gatherKidsDB = db;
}
