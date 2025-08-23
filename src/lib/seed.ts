
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { Household, Guardian, EmergencyContact, Child, RegistrationCycle, Registration, Ministry, MinistryEnrollment, User, Event, Attendance, Incident } from './types';
import { subYears, formatISO, differenceInYears, parseISO } from 'date-fns';

const USER_IDS = {
    admin: 'user_admin',
    leader1: 'user_leader_1',
    leader2: 'user_leader_2',
};

const CYCLE_IDS = {
    prior: '2024',
    current: '2025',
};

const MINISTRY_IDS = {
    sundaySchool: 'min_sunday_school',
    choirKids: 'min_choir_kids',
    choirYouth: 'min_choir_youth',
    youthGroup: 'min_youth_group',
    bibleBee: 'min_bible_bee',
};

const EVENT_IDS = {
    sundaySchool: 'evt_sunday_school',
};

const HOUSEHOLD_IDS: { [key: string]: string } = {};

const getGradeFromAge = (age: number): string => {
    if (age <= 4) return "Pre-K";
    if (age === 5) return "Kindergarten";
    if (age >= 6 && age <= 17) return `${age - 5}${age - 5 === 1 ? 'st' : age - 5 === 2 ? 'nd' : age - 5 === 3 ? 'rd' : 'th'} Grade`;
    return "12th Grade"; // cap at 12th
}

const generateHouseholdsAndChildren = (): { households: Household[], children: Child[], guardians: Guardian[], emergencyContacts: EmergencyContact[] } => {
    const households: Household[] = [];
    const children: Child[] = [];
    const guardians: Guardian[] = [];
    const emergencyContacts: EmergencyContact[] = [];

    const families = [
        { lastName: 'Smith', guardian: { f: 'John', l: 'Smith' }, kids: [{ f: 'Emma', age: 5 }, { f: 'Liam', age: 8 }] },
        { lastName: 'Johnson', guardian: { f: 'Mary', l: 'Johnson' }, kids: [{ f: 'Olivia', age: 4 }, { f: 'Noah', age: 7 }, { f: 'Ava', age: 10 }] },
        { lastName: 'Williams', guardian: { f: 'James', l: 'Williams' }, kids: [{ f: 'Isabella', age: 6 }] },
        { lastName: 'Brown', guardian: { f: 'Patricia', l: 'Brown' }, kids: [{ f: 'Sophia', age: 9 }, { f: 'Mason', age: 12 }] },
        { lastName: 'Jones', guardian: { f: 'Robert', l: 'Jones' }, kids: [{ f: 'Mia', age: 3 }, { f: 'Ethan', age: 11 }] },
    ];
    
    const birthdaysPerMonth = Array(12).fill(0);

    let householdCounter = 1;
    for (const family of families) {
        const householdId = `h_${householdCounter++}`;
        HOUSEHOLD_IDS[family.lastName] = householdId;
        const now = new Date().toISOString();

        households.push({
            household_id: householdId,
            name: `${family.lastName} Household`,
            address_line1: `${householdCounter * 123} Main St`,
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
            created_at: now,
            updated_at: now,
        });

        const guardianId = `g_${householdCounter}`;
        guardians.push({
            guardian_id: guardianId,
            household_id: householdId,
            first_name: family.guardian.f,
            last_name: family.guardian.l,
            mobile_phone: `555-555-11${householdCounter < 10 ? '0' : ''}${householdCounter}`,
            email: `${family.guardian.f.toLowerCase()}@example.com`,
            relationship: 'Parent',
            is_primary: true,
            created_at: now,
            updated_at: now,
        });

        emergencyContacts.push({
            contact_id: `ec_${householdCounter}`,
            household_id: householdId,
            first_name: 'Jane',
            last_name: 'Doe',
            mobile_phone: '555-555-9999',
            relationship: 'Aunt',
        });

        let childCounter = 1;
        for (const kid of family.kids) {
            let birthMonth: number;
            do {
                birthMonth = Math.floor(Math.random() * 12);
            } while (birthdaysPerMonth[birthMonth] >= 2);
            
            birthdaysPerMonth[birthMonth]++;
            
            const birthYear = new Date().getFullYear() - kid.age;
            const birthDay = Math.floor(Math.random() * 28) + 1; // 1-28 to be safe
            const dob = new Date(birthYear, birthMonth, birthDay);

            children.push({
                child_id: `c_${householdId}_${childCounter++}`,
                household_id: householdId,
                first_name: kid.f,
                last_name: family.lastName,
                dob: formatISO(dob, { representation: 'date' }),
                grade: getGradeFromAge(kid.age),
                is_active: true,
                created_at: now,
                updated_at: now,
            });
        }
    }
    return { households, children, guardians, emergencyContacts };
};


export const seedDB = async () => {
    console.log("Seeding database...");
    const now = new Date().toISOString();
    const today = new Date();

    const { households, children, guardians, emergencyContacts } = generateHouseholdsAndChildren();
    
    await db.transaction('rw', db.users, db.registration_cycles, db.ministries, db.events, db.households, db.children, db.guardians, db.emergency_contacts, db.registrations, db.ministry_enrollments, db.attendance, db.incidents, async () => {
        // Core Data
        await db.users.bulkPut([
            { user_id: USER_IDS.admin, name: 'Admin User', email: 'admin@gatherkids.com', role: 'admin', background_check_status: 'clear' },
            { user_id: USER_IDS.leader1, name: 'Leader One', email: 'leader1@gatherkids.com', role: 'leader', background_check_status: 'clear' },
            { user_id: USER_IDS.leader2, name: 'Leader Two', email: 'leader2@gatherkids.com', role: 'leader', background_check_status: 'pending' },
        ]);

        await db.registration_cycles.bulkPut([
            { cycle_id: CYCLE_IDS.prior, start_date: '2023-08-01', end_date: '2024-07-31', is_active: false },
            { cycle_id: CYCLE_IDS.current, start_date: '2024-08-01', end_date: '2025-07-31', is_active: true },
        ]);

        await db.ministries.bulkPut([
            { ministry_id: MINISTRY_IDS.sundaySchool, name: 'Sunday School', code: 'SUNDAY_SCHOOL', enrollment_type: 'enrolled', data_profile: 'SafetyAware', created_at: now, updated_at: now },
            { ministry_id: MINISTRY_IDS.choirKids, name: 'Kids Choir', code: 'CHOIR_KIDS', enrollment_type: 'enrolled', min_age: 7, max_age: 12, data_profile: 'Basic', created_at: now, updated_at: now },
            { ministry_id: MINISTRY_IDS.youthGroup, name: 'Youth Group', code: 'YOUTH_GROUP', enrollment_type: 'enrolled', min_grade: '6th Grade', max_grade: '12th Grade', data_profile: 'Basic', created_at: now, updated_at: now },
            { ministry_id: MINISTRY_IDS.bibleBee, name: 'Bible Bee', code: 'BIBLE_BEE', enrollment_type: 'interest_only', open_at: '2025-08-01', close_at: '2025-08-31', data_profile: 'Basic', created_at: now, updated_at: now },
        ]);

        await db.events.bulkPut([
            { event_id: EVENT_IDS.sundaySchool, name: 'Sunday School / Children’s Church', timeslots: [{id: 'ts_0900', start_local: '09:00', end_local: '10:30'}, {id: 'ts_1100', start_local: '11:00', end_local: '12:30'}] }
        ]);

        // Generated Data
        await db.households.bulkPut(households);
        await db.children.bulkPut(children);
        await db.guardians.bulkPut(guardians);
        await db.emergency_contacts.bulkPut(emergencyContacts);
        
        // Registrations and Enrollments
        const registrations: Registration[] = [];
        const enrollments: MinistryEnrollment[] = [];
        for (const child of children) {
            registrations.push({
                registration_id: `reg_${child.child_id}`,
                child_id: child.child_id,
                cycle_id: CYCLE_IDS.current,
                status: 'active',
                pre_registered_sunday_school: true,
                consents: [
                    { type: 'liability', accepted_at: now, signer_id: `g_${child.household_id.split('_')[1]}`, signer_name: 'Test Guardian' },
                    { type: 'photoRelease', accepted_at: now, signer_id: `g_${child.household_id.split('_')[1]}`, signer_name: 'Test Guardian' }
                ],
                submitted_at: now,
                submitted_via: 'web',
            });
            // Auto-enroll in sunday school
            enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS.sundaySchool, status: 'enrolled' });
            
            // Enroll in choir if eligible
            const age = differenceInYears(today, parseISO(child.dob!));
            if (age >= 7 && age <= 12) {
                enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS.choirKids, status: 'enrolled' });
            }
        }
        await db.registrations.bulkPut(registrations);
        await db.ministry_enrollments.bulkPut(enrollments);

        // Attendance and Incidents
        const checkedInChildren = children.slice(0, 5);
        const attendance: Attendance[] = [];
        for(let i=0; i<checkedInChildren.length; i++) {
            attendance.push({
                attendance_id: `att_${i}`,
                event_id: EVENT_IDS.sundaySchool,
                child_id: checkedInChildren[i].child_id,
                date: today.toISOString().split('T')[0],
                timeslot_id: i % 2 === 0 ? 'ts_0900' : 'ts_1100',
                check_in_at: today.toISOString(),
                checked_in_by: USER_IDS.leader1
            });
        }
        await db.attendance.bulkPut(attendance);

        await db.incidents.bulkPut([
            { incident_id: 'inc_1', child_id: checkedInChildren[0].child_id, child_name: `${checkedInChildren[0].first_name} ${checkedInChildren[0].last_name}`, event_id: EVENT_IDS.sundaySchool, description: 'Scraped knee on the playground.', severity: 'low', leader_id: USER_IDS.leader1, timestamp: now, admin_acknowledged_at: now },
            { incident_id: 'inc_2', child_id: checkedInChildren[1].child_id, child_name: `${checkedInChildren[1].first_name} ${checkedInChildren[1].last_name}`, event_id: EVENT_IDS.sundaySchool, description: 'Feeling unwell, slight fever.', severity: 'medium', leader_id: USER_IDS.leader2, timestamp: now, admin_acknowledged_at: null },
        ]);
    });
    console.log("Database seeded successfully.");
};

export const resetDB = async () => {
    console.log("Resetting database...");
    await db.delete();
    await db.open();
    console.log("Database reset complete.");
};
