

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { Household, Guardian, EmergencyContact, Child, RegistrationCycle, Registration, Ministry, MinistryEnrollment, User, Event, Attendance, Incident, LeaderAssignment } from './types';
import { subYears, formatISO, differenceInYears, parseISO } from 'date-fns';

const USER_IDS: { [key: string]: string } = {};

const CYCLE_IDS = {
    prior: '2024',
    current: '2025',
};

const MINISTRY_IDS: { [key: string]: string } = {};

const EVENT_IDS = {
    sundaySchool: 'evt_sunday_school',
    childrensChurch: 'evt_childrens_church',
    teenChurch: 'evt_teen_church',
};

const HOUSEHOLD_IDS: { [key: string]: string } = {};

// Return a numeric grade string so Bible Bee grade rules can be applied reliably:
// Kindergarten -> 0, 1st grade -> 1, etc. Cap at 12.
const getGradeFromAge = (age: number): string => {
    if (age <= 4) return '0'; // Pre-K -> treat as Kindergarten (0)
    if (age === 5) return '0'; // Kindergarten
    if (age >= 6) {
        const grade = age - 5;
        return String(Math.min(12, grade));
    }
    return '0';
}

const generateHouseholdsAndChildren = (): { households: Household[], children: Child[], guardians: Guardian[], emergencyContacts: EmergencyContact[] } => {
    const households: Household[] = [];
    const children: Child[] = [];
    const guardians: Guardian[] = [];
    const emergencyContacts: EmergencyContact[] = [];

    const families = [
        { lastName: 'Smith', guardian: { f: 'John', l: 'Smith', email: 'reg.overwrite@example.com' }, kids: [{ f: 'Emma', age: 5, allergies: 'Peanuts' }, { f: 'Liam', age: 8 }] },
        { lastName: 'Johnson', guardian: { f: 'Mary', l: 'Johnson', email: 'reg.prefill@example.com' }, kids: [{ f: 'Olivia', age: 4 }, { f: 'Noah', age: 7, allergies: 'Pollen' }, { f: 'Ava', age: 10 }] },
        { lastName: 'Williams', guardian: { f: 'James', l: 'Williams' }, kids: [{ f: 'Isabella', age: 14, mobile: '555-555-3001' }] },
        { lastName: 'Brown', guardian: { f: 'Patricia', l: 'Brown' }, kids: [{ f: 'Sophia', age: 9 }, { f: 'Mason', age: 12 }] },
        { lastName: 'Jones', guardian: { f: 'Robert', l: 'Jones' }, kids: [{ f: 'Mia', age: 3 }, { f: 'Ethan', age: 11 }] },
        { lastName: 'Garcia', guardian: { f: 'Maria', l: 'Garcia' }, kids: [{ f: 'Abigail', age: 6 }, { f: 'Benjamin', age: 13, mobile: '555-555-3002' }] },
        { lastName: 'Miller', guardian: { f: 'David', l: 'Miller' }, kids: [{ f: 'Emily', age: 16, mobile: '555-555-3003' }] },
        { lastName: 'Davis', guardian: { f: 'Linda', l: 'Davis' }, kids: [{ f: 'Charlotte', age: 2 }, { f: 'Henry', age: 5 }] },
        { lastName: 'Rodriguez', guardian: { f: 'Richard', l: 'Rodriguez' }, kids: [{ f: 'Harper', age: 10 }] },
        { lastName: 'Martinez', guardian: { f: 'Susan', l: 'Martinez' }, kids: [{ f: 'Evelyn', age: 7 }, { f: 'Jack', age: 15, mobile: '555-555-3004' }] },
        { lastName: 'Hernandez', guardian: { f: 'Joseph', l: 'Hernandez' }, kids: [{ f: 'Aria', age: 8 }] },
        { lastName: 'Lopez', guardian: { f: 'Karen', l: 'Lopez' }, kids: [{ f: 'Grace', age: 6 }, { f: 'Lucas', age: 9 }] },
        { lastName: 'Gonzalez', guardian: { f: 'Thomas', l: 'Gonzalez' }, kids: [{ f: 'Chloe', age: 11 }, { f: 'Daniel', age: 14, mobile: '555-555-3005' }] },
        { lastName: 'Wilson', guardian: { f: 'Nancy', l: 'Wilson' }, kids: [{ f: 'Zoey', age: 4 }, { f: 'Leo', age: 7 }] },
        { lastName: 'Anderson', guardian: { f: 'Mark', l: 'Anderson' }, kids: [{ f: 'Penelope', age: 12 }] },
        { lastName: 'Thomas', guardian: { f: 'Sandra', l: 'Thomas' }, kids: [{ f: 'Riley', age: 5 }, { f: 'Owen', age: 8 }] },
        { lastName: 'Taylor', guardian: { f: 'Paul', l: 'Taylor' }, kids: [{ f: 'Layla', age: 10 }, { f: 'Wyatt', age: 13, mobile: '555-555-3006' }] },
        { lastName: 'Moore', guardian: { f: 'Betty', l: 'Moore' }, kids: [{ f: 'Nora', age: 3 }, { f: 'Caleb', age: 6 }] },
        { lastName: 'Jackson', guardian: { f: 'Steven', l: 'Jackson' }, kids: [{ f: 'Hannah', age: 15, mobile: '555-555-3007' }, { f: 'Isaac', age: 17, mobile: '555-555-3008' }] },
        { lastName: 'White', guardian: { f: 'Donna', l: 'White' }, kids: [{ f: 'Stella', age: 9 }, { f: 'Gabriel', age: 12, allergies: 'Dairy' }] },
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
            email: family.guardian.email || `${family.guardian.f.toLowerCase()}@example.com`,
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
            } while (birthdaysPerMonth[birthMonth] >= 4); // Allow up to 4 birthdays per month with 20 families

            birthdaysPerMonth[birthMonth]++;

            const birthYear = new Date().getFullYear() - kid.age;
            const birthDay = Math.floor(Math.random() * 28) + 1; // 1-28 to be safe
            const dob = new Date(birthYear, birthMonth, birthDay);

            const k = kid as any;
            children.push({
                child_id: `c_${householdId}_${childCounter++}`,
                household_id: householdId,
                first_name: kid.f,
                last_name: family.lastName,
                dob: formatISO(dob, { representation: 'date' }),
                grade: getGradeFromAge(kid.age),
                allergies: k.allergies,
                child_mobile: k.mobile,
                is_active: !k.inactive,
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

    const leaders: User[] = [
        { user_id: 'user_admin', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_1', name: 'Sarah Lee', email: 'leader.sundayschool@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_2', name: 'Michael Chen', email: 'michael.chen@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_3', name: 'Jessica Rodriguez', email: 'jessica.r@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_4', name: 'David Kim', email: 'david.kim@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'pending' },
        { user_id: 'user_leader_5', name: 'Emily White', email: 'emily.w@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_6', name: 'Daniel Green', email: 'daniel.g@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_7', name: 'Laura Black', email: 'laura.b@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'expired' },
        { user_id: 'user_leader_8', name: 'Brian Hall', email: 'brian.h@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_9', name: 'Nancy Adams', email: 'nancy.a@example.com', role: 'MINISTRY_LEADER', is_active: false, background_check_status: 'clear' },
        { user_id: 'user_leader_10', name: 'Kevin Clark', email: 'kevin.c@example.com', role: 'MINISTRY_LEADER', is_active: false, background_check_status: 'na' },

        // New Leaders
        { user_id: 'user_leader_11', name: 'Chris Evans', email: 'leader.khalfani@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_12', name: 'Megan Young', email: 'leader.joybells@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
        { user_id: 'user_leader_13', name: 'Tom Allen', email: 'leader.inactive@example.com', role: 'MINISTRY_LEADER', is_active: false, background_check_status: 'clear' },
        // Bible Bee Primary Leader
        { user_id: 'user_leader_14', name: 'Alex Pastor', email: 'leader.biblebee@example.com', role: 'MINISTRY_LEADER', is_active: true, background_check_status: 'clear' },
    ];
    leaders.forEach(l => USER_IDS[l.name.split(' ')[0]] = l.user_id);


    await (db as any).transaction('rw', db.users, db.registration_cycles, db.ministries, db.events, db.households, db.children, db.guardians, db.emergency_contacts, db.registrations, db.ministry_enrollments, db.leader_assignments, db.attendance, db.incidents,
        // Bible Bee stores
        db.competitionYears, db.scriptures, db.gradeRules, db.studentScriptures, db.studentEssays,
        async () => {

            await db.users.bulkPut(leaders);

            await db.registration_cycles.bulkPut([
                { cycle_id: CYCLE_IDS.prior, start_date: '2023-08-01', end_date: '2024-07-31', is_active: false },
                { cycle_id: CYCLE_IDS.current, start_date: '2024-08-01', end_date: '2025-07-31', is_active: true },
            ]);

            const ministryData: Omit<Ministry, 'ministry_id' | 'created_at' | 'updated_at'>[] = [
                { name: 'Sunday School', code: 'min_sunday_school', enrollment_type: 'enrolled', data_profile: 'SafetyAware', is_active: true },
                { name: "Acolyte Ministry", code: "acolyte", enrollment_type: 'enrolled', details: "Thank you for registering for the Acolyte Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child\'s participation.", data_profile: 'Basic', is_active: true },
                { name: "Bible Bee", code: "bible-bee", enrollment_type: 'enrolled', description: "Registration open until Oct. 8, 2025", open_at: `2025-01-01`, close_at: `2025-10-08`, details: "Bible Bee is a competitive program that encourages scripture memorization. Materials must be purchased separately.", data_profile: 'Basic', is_active: true },
                { name: "Dance Ministry", code: "dance", enrollment_type: 'enrolled', details: "Thank you for registering for the Dance Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child\'s participation.", data_profile: 'Basic', is_active: true },
                { name: "Media Production Ministry", code: "media-production", enrollment_type: 'enrolled', details: "Thank you for registering for the Media Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child\'s participation.", data_profile: 'Basic', is_active: true },
                { name: "Mentoring Ministry-Boys (Khalfani)", code: "mentoring-boys", enrollment_type: 'enrolled', details: "The Khalfani ministry provides mentorship for young boys through various activities and discussions.", data_profile: 'Basic', is_active: true },
                { name: "Mentoring Ministry-Girls (Nailah)", code: "mentoring-girls", enrollment_type: 'enrolled', details: "The Nailah ministry provides mentorship for young girls, focusing on empowerment and personal growth.", data_profile: 'Basic', is_active: true },
                { name: "New Generation Teen Fellowship", code: "teen-fellowship", enrollment_type: 'enrolled', details: "Thank you for registering for New Generation Teen Fellowship.\n\nOn 3rd Sundays, during the 10:30 AM service,  New Generation Teen Fellowship will host Teen Church in the Family Life Enrichment Center.  Teens may sign themselves in and out of the service.\n\nYou will receive more information about ministry activities from minstry leaders.", data_profile: 'Basic', custom_questions: [{ id: "teen_podcast", text: "Podcast & YouTube Channel Projects", type: "checkbox" }, { id: "teen_social_media", text: "Social Media Team", type: "checkbox" }, { id: "teen_community_service", text: "Leading Community Service Projects", type: "checkbox" }], is_active: true },
                { name: "Symphonic Orchestra", code: "symphonic-orchestra", enrollment_type: 'enrolled', data_profile: 'Basic', details: "The Symphonic Orchestra is for experienced musicians. Auditions may be required.", is_active: true },
                { name: "Youth Choirs- Joy Bells (Ages 4-8)", code: "choir-joy-bells", enrollment_type: 'enrolled', min_age: 4, max_age: 8, details: "Joy Bells is our introductory choir for the youngest voices. Practices are held after the 11 AM service.", data_profile: 'Basic', is_active: true },
                { name: "Youth Choirs- Keita Praise Choir (Ages 9-12)", code: "choir-keita", enrollment_type: 'enrolled', min_age: 9, max_age: 12, details: "Keita Praise Choir builds on foundational skills and performs once a month. Practices are on Wednesdays.", data_profile: 'Basic', is_active: true },
                { name: "Youth Choirs- New Generation Teen Choir (Ages 13-18)", code: "choir-teen", enrollment_type: 'enrolled', min_age: 13, max_age: 18, details: "The Teen Choir performs contemporary gospel music and leads worship during Youth Sundays.", data_profile: 'Basic', is_active: true },
                { name: "Youth Ushers", code: "youth-ushers", enrollment_type: 'enrolled', details: "Thank you for registering for the Youth Ushers Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child\'s participation.", data_profile: 'Basic', is_active: true },
                { name: "Children's Musical", code: "childrens-musical", enrollment_type: 'expressed_interest', data_profile: 'Basic', communicate_later: true, is_active: true },
                { name: "Confirmation", code: "confirmation", enrollment_type: 'expressed_interest', data_profile: 'Basic', communicate_later: true, is_active: true },
                { name: "International Travel", code: "international-travel", enrollment_type: 'expressed_interest', data_profile: 'Basic', is_active: true },
                { name: "New Jersey Orators", code: "orators", enrollment_type: 'expressed_interest', data_profile: 'Basic', optional_consent_text: "I agree to share my contact information with New Jersey Orators. New Jersey Orators is not a part of Cathedral International, but Cathedral hosts the Perth Amboy Chapter. Registration can take place through their website at oratorsinc.org.", is_active: true },
                { name: "Nursery", code: "nursery", enrollment_type: 'expressed_interest', data_profile: 'Basic', communicate_later: true, is_active: true },
                { name: "Vacation Bible School", code: "vbs", enrollment_type: 'expressed_interest', data_profile: 'Basic', communicate_later: true, is_active: true },
                { name: "College Tour", code: "college-tour", enrollment_type: 'expressed_interest', data_profile: 'Basic', is_active: true },
            ];

            const fullMinistries = ministryData.map(m => {
                const fullM = { ...m, ministry_id: m.code, created_at: now, updated_at: now };
                MINISTRY_IDS[m.code] = fullM.ministry_id;
                return fullM;
            });
            await db.ministries.bulkPut(fullMinistries);

            await db.events.bulkPut([
                { event_id: EVENT_IDS.sundaySchool, name: 'Sunday School', timeslots: [{ id: 'ts_0900', start_local: '09:00', end_local: '10:30' }] },
                { event_id: EVENT_IDS.childrensChurch, name: "Children's Church", timeslots: [{ id: 'ts_0900', start_local: '09:00', end_local: '10:30' }] },
                { event_id: EVENT_IDS.teenChurch, name: "Teen Church", timeslots: [{ id: 'ts_0900', start_local: '09:00', end_local: '10:30' }] }
            ]);

            await db.households.bulkPut(households);
            await db.children.bulkPut(children);
            await db.guardians.bulkPut(guardians);
            await db.emergency_contacts.bulkPut(emergencyContacts);

            // --- BIBLE BEE COMPETITION YEARS, GRADE RULES, SCRIPTURES ---
            const compYearPriorId = crypto.randomUUID();
            const compYearCurrentId = crypto.randomUUID();
            const nowIso = new Date().toISOString();
            await db.competitionYears.bulkPut([
                { id: compYearPriorId, year: Number(CYCLE_IDS.prior), name: `${CYCLE_IDS.prior} Bible Bee`, description: 'Prior year Bible Bee', opensAt: '2024-01-01', closesAt: '2024-10-01', createdAt: nowIso, updatedAt: nowIso },
                { id: compYearCurrentId, year: Number(CYCLE_IDS.current), name: `${CYCLE_IDS.current} Bible Bee`, description: 'Current year Bible Bee', opensAt: '2025-01-01', closesAt: '2025-10-08', createdAt: nowIso, updatedAt: nowIso },
            ]);

            // Grade groups
            // Kindergarten - 4th grade => minGrade 0, maxGrade 4 (scripture)
            // 5th - 8th grade => minGrade 5, maxGrade 8 (scripture)
            // 9th Grade - 12th Grade => minGrade 9, maxGrade 12 (essay)
            // Use small target counts so seeded progress can reach Complete for tests
            const ruleKto4 = { id: crypto.randomUUID(), competitionYearId: compYearCurrentId, minGrade: 0, maxGrade: 4, type: 'scripture' as const, targetCount: 4, promptText: undefined as any, instructions: undefined as any, createdAt: nowIso, updatedAt: nowIso };
            const rule5to8 = { id: crypto.randomUUID(), competitionYearId: compYearCurrentId, minGrade: 5, maxGrade: 8, type: 'scripture' as const, targetCount: 6, promptText: undefined as any, instructions: undefined as any, createdAt: nowIso, updatedAt: nowIso };
            const rule9up = { id: crypto.randomUUID(), competitionYearId: compYearCurrentId, minGrade: 9, maxGrade: 12, type: 'essay' as const, targetCount: undefined as any, promptText: 'Write a 500-word reflection on the role of scripture in daily life.', instructions: 'Submit a 500-word essay.', createdAt: nowIso, updatedAt: nowIso };
            await db.gradeRules.bulkPut([ruleKto4, rule5to8, rule9up]);

            // Fix any previously-seeded grade rules that used 99 as an open-ended max and cap at 12
            const existingRules = await db.gradeRules.toArray();
            const rulesToUpdate: any[] = [];
            for (const r of existingRules) {
                if (typeof r.maxGrade === 'number' && r.maxGrade >= 99 && r.minGrade >= 9) {
                    rulesToUpdate.push({ ...r, maxGrade: 12, updatedAt: nowIso });
                }
            }
            if (rulesToUpdate.length) await db.gradeRules.bulkPut(rulesToUpdate);

            // Add a short set of example scriptures for the competition (same list for prior and current)
            const sampleScriptures = [
                { reference: 'John 3:16', text: 'For God so loved the world...', sortOrder: 1 },
                { reference: 'Psalm 23:1', text: 'The Lord is my shepherd...', sortOrder: 2 },
                { reference: 'Philippians 4:13', text: 'I can do all things through Christ...', sortOrder: 3 },
                { reference: 'Proverbs 3:5', text: 'Trust in the Lord with all your heart...', sortOrder: 4 },
                { reference: 'Matthew 5:9', text: 'Blessed are the peacemakers...', sortOrder: 5 },
                { reference: 'Romans 8:28', text: 'And we know that in all things God works for the good...', sortOrder: 6 },
                { reference: 'Galatians 5:22', text: 'But the fruit of the Spirit is love, joy, peace...', sortOrder: 7 },
                { reference: 'Ephesians 2:8', text: 'For by grace you have been saved through faith...', sortOrder: 8 },
            ];
            const scriptureRecords: any[] = [];
            for (const s of sampleScriptures) {
                scriptureRecords.push({ id: crypto.randomUUID(), competitionYearId: compYearCurrentId, reference: s.reference, text: s.text, sortOrder: s.sortOrder, createdAt: nowIso, updatedAt: nowIso });
                scriptureRecords.push({ id: crypto.randomUUID(), competitionYearId: compYearPriorId, reference: s.reference, text: s.text, sortOrder: s.sortOrder, createdAt: nowIso, updatedAt: nowIso });
            }
            await db.scriptures.bulkPut(scriptureRecords);

            const registrations: Registration[] = [];
            const enrollments: MinistryEnrollment[] = [];

            // --- HISTORICAL DATA (2024 CYCLE) ---
            for (const child of children) {
                registrations.push({ registration_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.prior, status: 'active', pre_registered_sunday_school: true, consents: [], submitted_at: now, submitted_via: 'import' });
                enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.prior, ministry_id: MINISTRY_IDS['min_sunday_school'], status: 'enrolled' });
            }

            // --- CURRENT DATA (2025 CYCLE) ---
            const householdsToRegisterCurrent = households.filter(h => h.name !== 'Johnson Household');
            const activeChildrenForCurrentCycle = children.filter(c => c.is_active && householdsToRegisterCurrent.some(h => h.household_id === c.household_id));
            let oratorsCount = 0;


            for (const household of householdsToRegisterCurrent) {
                const childrenInHousehold = children.filter(c => c.household_id === household.household_id && c.is_active);
                for (const child of childrenInHousehold) {
                    registrations.push({ registration_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, status: 'active', pre_registered_sunday_school: true, consents: [], submitted_at: now, submitted_via: 'import' });

                    // Auto-enroll in Sunday School
                    enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['min_sunday_school'], status: 'enrolled' });

                    const age = differenceInYears(today, parseISO(child.dob!));

                    // Assign to various ministries based on age and family
                    if (age >= 9 && age <= 12 && household.name === 'Brown Household') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['choir-keita'], status: 'enrolled' });
                    }
                    if (age >= 13 && household.name === 'Williams Household') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['teen-fellowship'], status: 'enrolled', custom_fields: { teen_podcast: true } });
                    }
                    if (age >= 13 && household.name === 'Miller Household') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['college-tour'], status: 'expressed_interest' });
                    }
                    if (age >= 6 && age <= 10 && household.name === 'Garcia Household') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['vbs'], status: 'expressed_interest' });
                    }
                    if (child.last_name === 'Garcia' && child.first_name === 'Benjamin') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['mentoring-boys'], status: 'enrolled' });
                    }
                    if (child.last_name === 'Martinez' && child.first_name === 'Jack') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['mentoring-boys'], status: 'enrolled' });
                    }
                    if (child.last_name === 'Davis' && child.first_name === 'Henry') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['choir-joy-bells'], status: 'enrolled' });
                    }
                    if (child.last_name === 'Wilson' && child.first_name === 'Leo') {
                        enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['choir-joy-bells'], status: 'enrolled' });
                    }
                }
            }

            // Ensure at least 7 kids are in Orators
            for (const child of activeChildrenForCurrentCycle) {
                if (oratorsCount < 7) {
                    enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['orators'], status: 'expressed_interest' });
                    oratorsCount++;
                } else {
                    break;
                }
            }

            // Ensure at least 20 kids are enrolled in Bible Bee for the current cycle
            let bibleBeeCount = 0;
            for (const child of activeChildrenForCurrentCycle) {
                if (bibleBeeCount >= 20) break;
                enrollments.push({ enrollment_id: uuidv4(), child_id: child.child_id, cycle_id: CYCLE_IDS.current, ministry_id: MINISTRY_IDS['bible-bee'], status: 'enrolled' });
                bibleBeeCount++;
            }

            // Create student scripture/essay records for the bible bee kids across current and prior years
            const bibleBeeChildren = enrollments.filter(e => e.ministry_id === MINISTRY_IDS['bible-bee'] && e.cycle_id === CYCLE_IDS.current).map(e => e.child_id);
            const uniqueBibleBeeChildren = Array.from(new Set(bibleBeeChildren)).slice(0, 20);

            const studentScripturesToInsert: any[] = [];
            const studentEssaysToInsert: any[] = [];

            // simple helper to get grade number from child's grade field
            const gradeNumber = (g: any) => {
                const n = Number(g);
                return isNaN(n) ? 0 : n;
            };

            // distribute progress: first 6 complete, next 8 in-progress, rest not started
            for (let i = 0; i < uniqueBibleBeeChildren.length; i++) {
                const childId = uniqueBibleBeeChildren[i];
                const child = children.find(c => c.child_id === childId)!;
                const gnum = gradeNumber(child.grade);

                if (gnum >= 9) {
                    // essay participant
                    // Current year: some essays submitted to simulate Complete
                    const essayStatusCurrent = i % 5 === 0 ? 'submitted' : 'assigned';
                    studentEssaysToInsert.push({ id: uuidv4(), childId, competitionYearId: compYearCurrentId, status: essayStatusCurrent, promptText: rule9up.promptText, instructions: rule9up.instructions, createdAt: nowIso, updatedAt: nowIso });
                    // prior year: mark as completed/submitted for history
                    studentEssaysToInsert.push({ id: uuidv4(), childId, competitionYearId: compYearPriorId, status: 'submitted', promptText: rule9up.promptText, instructions: rule9up.instructions, createdAt: nowIso, updatedAt: nowIso });
                } else if (gnum >= 5) {
                    // 5-8 => 15 scriptures; assign 5 sample scriptures as entries for simplicity
                    const assignedScriptures = scriptureRecords.slice(0, Math.min(scriptureRecords.length, rule5to8.targetCount || scriptureRecords.length));
                    // Determine progress state
                    const isComplete = i < 6; // first 6 overall marked complete
                    const isInProgress = i >= 6 && i < 14; // next 8 in-progress
                    for (let idx = 0; idx < assignedScriptures.length; idx++) {
                        const s = assignedScriptures[idx];
                        const statusCurrent = isComplete ? 'completed' : isInProgress && idx === 0 ? 'completed' : 'assigned';
                        studentScripturesToInsert.push({ id: uuidv4(), childId, competitionYearId: compYearCurrentId, scriptureId: s.id, status: statusCurrent, createdAt: nowIso, updatedAt: nowIso });
                        studentScripturesToInsert.push({ id: uuidv4(), childId, competitionYearId: compYearPriorId, scriptureId: s.id, status: 'completed', createdAt: nowIso, updatedAt: nowIso });
                    }
                } else {
                    // K-4 => 10 scriptures; assign 3-4 sample scriptures
                    const assignedScriptures = scriptureRecords.slice(0, Math.min(scriptureRecords.length, ruleKto4.targetCount || scriptureRecords.length));
                    const isComplete = i < 6; // mirror distribution
                    const isInProgress = i >= 6 && i < 14;
                    for (let idx = 0; idx < assignedScriptures.length; idx++) {
                        const s = assignedScriptures[idx];
                        const statusCurrent = isComplete ? 'completed' : isInProgress && idx === 0 ? 'completed' : 'assigned';
                        studentScripturesToInsert.push({ id: uuidv4(), childId, competitionYearId: compYearCurrentId, scriptureId: s.id, status: statusCurrent, createdAt: nowIso, updatedAt: nowIso });
                        studentScripturesToInsert.push({ id: uuidv4(), childId, competitionYearId: compYearPriorId, scriptureId: s.id, status: 'completed', createdAt: nowIso, updatedAt: nowIso });
                    }
                }
            }

            if (studentScripturesToInsert.length) await db.studentScriptures.bulkPut(studentScripturesToInsert);
            if (studentEssaysToInsert.length) await db.studentEssays.bulkPut(studentEssaysToInsert);

            await db.registrations.bulkPut(registrations);
            await db.ministry_enrollments.bulkPut(enrollments);

            const leaderAssignments: LeaderAssignment[] = [
                // user_leader_1 -> Sunday School only
                { assignment_id: uuidv4(), leader_id: 'user_leader_1', ministry_id: MINISTRY_IDS['min_sunday_school'], cycle_id: CYCLE_IDS.current, role: 'Volunteer' },
                // user_leader_11 -> Mentoring Boys
                { assignment_id: uuidv4(), leader_id: 'user_leader_11', ministry_id: MINISTRY_IDS['mentoring-boys'], cycle_id: CYCLE_IDS.current, role: 'Primary' },
                // user_leader_12 -> Joy Bells AND Sunday School
                { assignment_id: uuidv4(), leader_id: 'user_leader_12', ministry_id: MINISTRY_IDS['choir-joy-bells'], cycle_id: CYCLE_IDS.current, role: 'Primary' },
                { assignment_id: uuidv4(), leader_id: 'user_leader_12', ministry_id: MINISTRY_IDS['min_sunday_school'], cycle_id: CYCLE_IDS.current, role: 'Volunteer' },
                // user_leader_13 -> prior acolyte assignment
                { assignment_id: uuidv4(), leader_id: 'user_leader_13', ministry_id: MINISTRY_IDS['acolyte'], cycle_id: CYCLE_IDS.prior, role: 'Primary' },
                // user_leader_14 -> Bible Bee Primary
                { assignment_id: uuidv4(), leader_id: 'user_leader_14', ministry_id: MINISTRY_IDS['bible-bee'], cycle_id: CYCLE_IDS.current, role: 'Primary' },
            ];
            await db.leader_assignments.bulkPut(leaderAssignments);

            // --- TODAY's DATA ---
            const checkedInChildren = children.filter(c => c.is_active).slice(0, 8);
            const attendance: Attendance[] = [];
            for (let i = 0; i < checkedInChildren.length; i++) {
                attendance.push({
                    attendance_id: `att_${i}`,
                    event_id: EVENT_IDS.sundaySchool,
                    child_id: checkedInChildren[i].child_id,
                    date: today.toISOString().split('T')[0],
                    timeslot_id: i % 2 === 0 ? 'ts_0900' : 'ts_1100',
                    check_in_at: today.toISOString(),
                    checked_in_by: 'user_leader_1'
                });
            }
            await db.attendance.bulkPut(attendance);

            await db.incidents.bulkPut([
                { incident_id: 'inc_1', child_id: checkedInChildren[0].child_id, child_name: `${checkedInChildren[0].first_name} ${checkedInChildren[0].last_name}`, event_id: EVENT_IDS.sundaySchool, description: 'Scraped knee on the playground.', severity: 'low', leader_id: 'user_leader_1', timestamp: now, admin_acknowledged_at: now },
                { incident_id: 'inc_2', child_id: checkedInChildren[1].child_id, child_name: `${checkedInChildren[1].first_name} ${checkedInChildren[1].last_name}`, event_id: EVENT_IDS.sundaySchool, description: 'Feeling unwell, slight fever.', severity: 'medium', leader_id: 'user_leader_2', timestamp: now, admin_acknowledged_at: null },
                { incident_id: 'inc_3', child_id: checkedInChildren[2].child_id, child_name: `${checkedInChildren[2].first_name} ${checkedInChildren[2].last_name}`, event_id: EVENT_IDS.sundaySchool, description: 'Did not want to participate in activity.', severity: 'low', leader_id: 'user_leader_13', timestamp: subYears(new Date(), 1).toISOString(), admin_acknowledged_at: subYears(new Date(), 1).toISOString() },
                { incident_id: 'inc_4', child_id: checkedInChildren[3].child_id, child_name: `${checkedInChildren[3].first_name} ${checkedInChildren[3].last_name}`, event_id: EVENT_IDS.sundaySchool, description: 'Shared toys nicely with another child.', severity: 'low', leader_id: 'user_leader_13', timestamp: now, admin_acknowledged_at: null },
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

