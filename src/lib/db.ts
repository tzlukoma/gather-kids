
import Dexie, { type EntityTable } from 'dexie';
import type { Household, Guardian, EmergencyContact, Child, RegistrationCycle, ChildYearProfile, Registration, Ministry, MinistryEnrollment, LeaderAssignment, User, Event, Attendance, Incident, AuditLog } from './types';

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
    leader_assignments!: EntityTable<LeaderAssignment, 'assignment_id'>;
    users!: EntityTable<User, 'user_id'>;
    events!: EntityTable<Event, 'event_id'>;
    attendance!: EntityTable<Attendance, 'attendance_id'>;
    incidents!: EntityTable<Incident, 'incident_id'>;
    audit_logs!: EntityTable<AuditLog, 'log_id'>;

    constructor() {
        super('gatherKidsDB');
        this.version(8).stores({
            households: 'household_id, created_at, [city+state+zip]',
            guardians: 'guardian_id, household_id, mobile_phone, email',
            emergency_contacts: 'contact_id, household_id, mobile_phone',
            children: 'child_id, household_id, [last_name+first_name]',
            registration_cycles: 'cycle_id, is_active',
            child_year_profiles: 'child_year_profile_id, [child_id+cycle_id], cycle_id',
            registrations: 'registration_id, [child_id+cycle_id], [cycle_id+status]',
            ministries: 'ministry_id, code, enrollment_type, is_active',
            ministry_enrollments: 'enrollment_id, [ministry_id+cycle_id], [child_id+cycle_id], cycle_id',
            leader_assignments: 'assignment_id, [leader_id+cycle_id], [ministry_id+cycle_id]',
            users: 'user_id, email, role, is_active, [last_name+first_name]',
            events: 'event_id, name',
            attendance: 'attendance_id, date, [event_id+date], [child_id+date]',
            incidents: 'incident_id, child_id, admin_acknowledged_at, timestamp, leader_id',
            audit_logs: 'log_id, [actor_user_id+timestamp], target_id',
        });
    }
}

export const db = new GatherKidsDB();
