

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

const MINISTRY_IDS: { [key: string]: string } = {};

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
        { lastName: 'Smith', guardian: { f: 'John', l: 'Smith' }, kids: [{ f: 'Emma', age: 5, allergies: 'Peanuts' }, { f: 'Liam', age: 8 }] },
        { lastName: 'Johnson', guardian: { f: 'Mary', l: 'Johnson' }, kids: [{ f: 'Olivia', age: 4 }, { f: 'Noah', age: 7, allergies: 'Pollen' }, { f: 'Ava', age: 10 }] },
        { lastName: 'Williams', guardian: { f: 'James', l: 'Williams' }, kids: [{ f: 'Isabella', age: 14 }] },
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
                allergies: kid.allergies,
                child_mobile: `555-555-22${childCounter < 10 ? '0' : ''}${childCounter}`,
                is_active: true,
                special_needs: false,
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
        
        await db.users.bulkPut([
            { user_id: USER_IDS.admin, name: 'Admin User', email: 'admin@gatherkids.com', role: 'admin', background_check_status: 'clear' },
            { user_id: USER_IDS.leader1, name: 'Leader One', email: 'leader1@gatherkids.com', role: 'leader', background_check_status: 'clear' },
            { user_id: USER_IDS.leader2, name: 'Leader Two', email: 'leader2@gatherkids.com', role: 'leader', background_check_status: 'pending' },
        ]);

        await db.registration_cycles.bulkPut([
            { cycle_id: CYCLE_IDS.prior, start_date: '2023-08-01', end_date: '2024-07-31', is_active: false },
            { cycle_id: CYCLE_IDS.current, start_date: '2024-08-01', end_date: '2025-07-31', is_active: true },
        ]);
        
        const ministryData: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at'>[] = [
            { name: 'Sunday School', code: 'min_sunday_school', enrollment_type: 'enrolled', data_profile: 'SafetyAware' },
            { name: "Acolyte Ministry", code: "acolyte", enrollment_type: 'enrolled', details: "Thank you for registering for the Acolyte Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.", data_profile: 'Basic' },
            { name: "Bible Bee", code: "bible-bee", enrollment_type: 'enrolled', description: "Registration open until Oct. 8, 2023", open_at: `2023-01-01`, close_at: `2023-10-08`, details: "Bible Bee is a competitive program that encourages scripture memorization. Materials must be purchased separately.", data_profile: 'Basic' },
            { name: "Dance Ministry", code: "dance", enrollment_type: 'enrolled', details: "Thank you for registering for the Dance Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.", data_profile: 'Basic' },
            { name: "Media Production Ministry", code: "media-production", enrollment_type: 'enrolled', details: "Thank you for registering for the Media Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.", data_profile: 'Basic' },
            { name: "Mentoring Ministry-Boys (Khalfani)", code: "mentoring-boys", enrollment_type: 'enrolled', details: "The Khalfani ministry provides mentorship for young boys through various activities and discussions.", data_profile: 'Basic' },
            { name: "Mentoring Ministry-Girls (Nailah)", code: "mentoring-girls", enrollment_type: 'enrolled', details: "The Nailah ministry provides mentorship for young girls, focusing on empowerment and personal growth.", data_profile: 'Basic' },
            { name: "New Generation Teen Fellowship", code: "teen-fellowship", enrollment_type: 'enrolled', details: "Thank you for registering for New Generation Teen Fellowship.\n\nOn 3rd Sundays, during the 10:30 AM service,  New Generation Teen Fellowship will host Teen Church in the Family Life Enrichment Center.  Teens may sign themselves in and out of the service.\n\nYou will receive more information about ministry activities from minstry leaders.", data_profile: 'Basic', custom_questions: [{id: "teen_podcast", text: "Podcast & YouTube Channel Projects", type: "checkbox"}, {id: "teen_social_media", text: "Social Media Team", type: "checkbox"}, {id: "teen_community_service", text: "Leading Community Service Projects", type: "checkbox"}] },
            { name: "Youth Choirs- Joy Bells (Ages 4-8)", code: "choir-joy-bells", enrollment_type: 'enrolled', min_age: 4, max_age: 8, details: "Joy Bells is our introductory choir for the youngest voices. Practices are held after the 11 AM service.", data_profile: 'Basic' },
            { name: "Youth Choirs- Keita Praise Choir (Ages 9-12)", code: "choir-keita", enrollment_type: 'enrolled', min_age: 9, max_age: 12, details: "Keita Praise Choir builds on foundational skills and performs once a month. Practices are on Wednesdays.", data_profile: 'Basic' },
            { name: "Youth Choirs- New Generation Teen Choir (Ages 13-18)", code: "choir-teen", enrollment_type: 'enrolled', min_age: 13, max_age: 18, details: "The Teen Choir performs contemporary gospel music and leads worship during Youth Sundays.", data_profile: 'Basic' },
            { name: "Youth Ushers", code: "youth-ushers", enrollment_type: 'enrolled', details: "Thank you for registering for the Youth Ushers Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation.", data_profile: 'Basic' },
            { name: "Children's Musical", code: "childrens-musical", enrollment_type: 'interest_only', data_profile: 'Basic' },
            { name: "Confirmation", code: "confirmation", enrollment_type: 'interest_only', data_profile: 'Basic' },
            { name: "New Jersey Orators", code: "orators", enrollment_type: 'interest_only', data_profile: 'Basic' },
            { name: "Nursery", code: "nursery", enrollment_type: 'interest_only', data_profile: 'Basic' },
            { name: "Vacation Bible School", code: "vbs", enrollment_type: 'interest_only', data_profile: 'Basic' },
            { name: "College Tour", code: "college-tour", enrollment_type: 'interest_only', data_profile: 'Basic' },
        ];

        const fullMinistries = ministryData.map(m => {
            const fullM = { ...m, ministry_id: m.code, created_at: now, updated_at: now };
            MINISTRY_IDS[m.code] = fullM.ministry_id;
            return fullM;
        });
        await db.ministries.bulkPut(fullMinistries);

        await db.events.bulkPut([
            { event_id: EVENT_IDS.sundaySchool, name: 'Sunday School / Children’s Church', timeslots: [{id: 'ts_0900', start_local: '09:00', end_local: '10:30'}, {id: 'ts_1100', start_local: '11:00', end_local: '12:30'}] }
        ]);

        await db.households.bulkPut(households);
        await db.children.bulkPut(children);
        await db.guardians.bulkPut(guardians);
        await db.emergency_contacts.bulkPut(emergencyContacts);
        
        const registrations: Registration[] = [];
        const enrollments: MinistryEnrollment[] = [];

        // --- HISTORICAL DATA (2024 CYCLE) ---
        for (const child of children) {
            // Only create historical data for the first two families
            if (child.household_id === HOUSEHOLD_IDS.Smith || child.household_id === HOUSEHOLD_IDS.Johnson) {
                // Every child was registered for Sunday School last year
                 enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.prior, ministry_id: MINISTRY_IDS['min_sunday_school'], status: 'enrolled' });
            }
        }
        // Last year, Liam Smith (age 8 now, 7 then) was in Joy Bells
        const liam = children.find(c => c.first_name === 'Liam');
        if (liam) {
            enrollments.push({ enrollment_id: uuidv4(), child_id: liam.child_id, cycle_id: CYCLE_IDS.prior, ministry_id: MINISTRY_IDS['choir-joy-bells'], status: 'enrolled' });
        }


        // --- CURRENT DATA (2025 CYCLE) ---
        for (const child of children) {
            // Auto-enroll all children in Sunday School for the current year
            enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['min_sunday_school'], status: 'enrolled' });

            const age = differenceInYears(today, parseISO(child.dob!));
            
            if (child.first_name === 'Isabella') { // Williams, age 14
                enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['teen-fellowship'], status: 'enrolled', custom_fields: { teen_podcast: true, teen_community_service: true } });
                enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['choir-teen'], status: 'enrolled' });
            }
            
            if (child.first_name === 'Liam') { // Smith, age 8
                 enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['acolyte'], status: 'enrolled' });
                 enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['choir-joy-bells'], status: 'enrolled' });
            }
             if (child.first_name === 'Mason') { // Brown, age 12
                 enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['media-production'], status: 'enrolled' });
                 enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['choir-keita'], status: 'enrolled' });
                 enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['vbs'], status: 'interest_only' });
            }
        }
        
        await db.registrations.bulkPut(registrations);
        await db.ministry_enrollments.bulkPut(enrollments);

        // --- TODAY's DATA ---
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
