

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { gradeToCode } from './gradeUtils';
import type { Household, Guardian, EmergencyContact, Child, RegistrationCycle, Registration, Ministry, MinistryEnrollment, MinistryAccount, User, Event, Attendance, Incident, LeaderAssignment, BibleBeeYear, Division, Enrollment, Scripture } from './types';
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
            // randomly assign a preferred scripture translation for demo purposes
            preferredScriptureTranslation: Math.random() < 0.33 ? 'NIV' : Math.random() < 0.5 ? 'KJV' : 'NLT',
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

            const kidInfo = kid as { age: number; allergies?: string; mobile?: string; inactive?: boolean };
            children.push({
                child_id: `c_${householdId}_${childCounter++}`,
                household_id: householdId,
                first_name: kid.f,
                last_name: family.lastName,
                dob: formatISO(dob, { representation: 'date' }),
                grade: getGradeFromAge(kidInfo.age),
                allergies: kidInfo.allergies ?? undefined,
                child_mobile: kidInfo.mobile ?? undefined,
                is_active: !kidInfo.inactive,
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


    await (db as any).transaction('rw', db.users, db.registration_cycles, db.ministries, db.ministry_accounts, db.events, db.households, db.children, db.guardians, db.emergency_contacts, db.registrations, db.ministry_enrollments, db.leader_assignments, db.attendance, db.incidents,
        // New Bible Bee stores
        db.bible_bee_years, db.divisions, db.enrollments, db.scriptures, db.studentScriptures,
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

            // Create demo ministry accounts with emails that match the demo leader accounts
            const demoMinistryAccounts: MinistryAccount[] = [
                {
                    ministry_id: MINISTRY_IDS['mentoring-boys'], // "Mentoring Ministry-Boys (Khalfani)"
                    email: 'leader.khalfani@example.com',
                    display_name: 'Mentoring Ministry-Boys (Khalfani)',
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                },
                {
                    ministry_id: MINISTRY_IDS['choir-joy-bells'], // "Youth Choirs- Joy Bells (Ages 4-8)"
                    email: 'leader.joybells@example.com',
                    display_name: 'Youth Choirs- Joy Bells (Ages 4-8)',
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                },
                {
                    ministry_id: MINISTRY_IDS['bible-bee'], // "Bible Bee"
                    email: 'leader.biblebee@example.com',
                    display_name: 'Bible Bee',
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                },
                {
                    ministry_id: MINISTRY_IDS['min_sunday_school'], // "Sunday School" 
                    email: 'leader.sundayschool@example.com',
                    display_name: 'Sunday School',
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                },
            ];
            await db.ministry_accounts.bulkPut(demoMinistryAccounts);

            await db.events.bulkPut([
                { event_id: EVENT_IDS.sundaySchool, name: 'Sunday School', timeslots: [{ id: 'ts_0900', start_local: '09:00', end_local: '10:30' }] },
                { event_id: EVENT_IDS.childrensChurch, name: "Children's Church", timeslots: [{ id: 'ts_0900', start_local: '09:00', end_local: '10:30' }] },
                { event_id: EVENT_IDS.teenChurch, name: "Teen Church", timeslots: [{ id: 'ts_0900', start_local: '09:00', end_local: '10:30' }] }
            ]);

            await db.households.bulkPut(households);
            await db.children.bulkPut(children);
            await db.guardians.bulkPut(guardians);
            await db.emergency_contacts.bulkPut(emergencyContacts);

            // --- MODERN BIBLE BEE SYSTEM (New Schema Only) ---
            // Create a Bible Bee year for the current registration cycle
            const bibleBeeYearId = uuidv4();
            const bibleBeeYear: BibleBeeYear = {
                id: bibleBeeYearId,
                label: 'Bible Bee 2025',
                cycle_id: CYCLE_IDS.current,
                is_active: true,
                created_at: now,
            };
            await db.bible_bee_years.put(bibleBeeYear);

            // Create divisions for the Bible Bee year
            const divisions: Division[] = [
                {
                    id: uuidv4(),
                    year_id: bibleBeeYearId,
                    name: 'Primary (Kindergarten - 3rd)',
                    minimum_required: 15,
                    min_grade: 0,
                    max_grade: 3,
                    created_at: now,
                    updated_at: now,
                },
                {
                    id: uuidv4(),
                    year_id: bibleBeeYearId,
                    name: 'Elementary (4th - 6th)',
                    minimum_required: 25,
                    min_grade: 4,
                    max_grade: 6,
                    created_at: now,
                    updated_at: now,
                },
                {
                    id: uuidv4(),
                    year_id: bibleBeeYearId,
                    name: 'Middle School (7th - 9th)',
                    minimum_required: 35,
                    min_grade: 7,
                    max_grade: 9,
                    created_at: now,
                    updated_at: now,
                },
                {
                    id: uuidv4(),
                    year_id: bibleBeeYearId,
                    name: 'High School (10th - 12th)',
                    minimum_required: 35,
                    min_grade: 10,
                    max_grade: 12,
                    created_at: now,
                    updated_at: now,
                },
            ];
            await db.divisions.bulkPut(divisions);

            // Create sample scriptures for the Bible Bee year
            const sampleScriptures: Scripture[] = [];
            const scriptureData = [
                { ref: 'Philippians 4:4-5', text: '<sup>4</sup> Rejoice in the Lord always. I will say it again: Rejoice! <sup>5</sup> Let your gentleness be evident to all. The Lord is near.', translations: { NIV: '<sup>4</sup> Rejoice in the Lord always. I will say it again: Rejoice! <sup>5</sup> Let your gentleness be evident to all. The Lord is near.', KJV: '<sup>4</sup> Rejoice in the Lord alway: and again I say, Rejoice. <sup>5</sup> Let your moderation be known unto all men. The Lord is at hand.' }},
                { ref: 'Philippians 4:6', text: '<sup>6</sup> Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', translations: { NIV: '<sup>6</sup> Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', KJV: '<sup>6</sup> Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' }},
                { ref: 'Philippians 4:7', text: '<sup>7</sup> And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', translations: { NIV: '<sup>7</sup> And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', KJV: '<sup>7</sup> And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.' }},
                { ref: 'Philippians 4:8', text: '<sup>8</sup> Finally, brothers and sisters, whatever is true, whatever is noble, whatever is right, whatever is pure, whatever is lovely, whatever is admirable—if anything is excellent or praiseworthy—think about such things.', translations: { NIV: '<sup>8</sup> Finally, brothers and sisters, whatever is true, whatever is noble, whatever is right, whatever is pure, whatever is lovely, whatever is admirable—if anything is excellent or praiseworthy—think about such things.', KJV: '<sup>8</sup> Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things.' }},
                { ref: 'Philippians 4:9', text: '<sup>9</sup> Whatever you have learned or received or heard from me, or seen in me—put it into practice. And the God of peace will be with you.', translations: { NIV: '<sup>9</sup> Whatever you have learned or received or heard from me, or seen in me—put it into practice. And the God of peace will be with you.', KJV: '<sup>9</sup> Those things, which ye have both learned, and received, and heard, and seen in me, do: and the God of peace shall be with you.' }},
                { ref: 'Philippians 4:12-13', text: '<sup>12</sup> I know what it is to be in need, and I know what it is to have plenty. I have learned the secret of being content in any and every situation, whether well fed or hungry, whether living in plenty or in want. <sup>13</sup> I can do all this through him who gives me strength.', translations: { NIV: '<sup>12</sup> I know what it is to be in need, and I know what it is to have plenty. I have learned the secret of being content in any and every situation, whether well fed or hungry, whether living in plenty or in want. <sup>13</sup> I can do all this through him who gives me strength.', KJV: '<sup>12</sup> I know both how to be abased, and I know how to abound: every where and in all things I am instructed both to be full and to be hungry, both to abound and to suffer need. <sup>13</sup> I can do all things through Christ which strengtheneth me.' }},
                { ref: 'Philippians 4:19', text: '<sup>19</sup> And my God will meet all your needs according to the riches of his glory in Christ Jesus.', translations: { NIV: '<sup>19</sup> And my God will meet all your needs according to the riches of his glory in Christ Jesus.', KJV: '<sup>19</sup> But my God shall supply all your need according to his riches in glory by Christ Jesus.' }},
                { ref: 'Lamentations 3:22', text: '<sup>22</sup> Because of the Lord\'s great love we are not consumed, for his compassions never fail.', translations: { NIV: '<sup>22</sup> Because of the Lord\'s great love we are not consumed, for his compassions never fail.', KJV: '<sup>22</sup> It is of the Lord\'s mercies that we are not consumed, because his compassions fail not.' }},
                { ref: 'Matthew 7:1-2', text: '<sup>1</sup> Do not judge, or you too will be judged. <sup>2</sup> For in the same way you judge others, you will be judged, and with the measure you use, it will be measured to you.', translations: { NIV: '<sup>1</sup> Do not judge, or you too will be judged. <sup>2</sup> For in the same way you judge others, you will be judged, and with the measure you use, it will be measured to you.', KJV: '<sup>1</sup> Judge not, that ye be not judged. <sup>2</sup> For with what judgment ye judge, ye shall be judged: and with what measure ye mete, it shall be measured to you again.' }},
                { ref: 'Matthew 7:7-8', text: '<sup>7</sup> Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. <sup>8</sup> For everyone who asks receives; the one who seeks finds; and to the one who knocks, the door will be opened.', translations: { NIV: '<sup>7</sup> Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. <sup>8</sup> For everyone who asks receives; the one who seeks finds; and to the one who knocks, the door will be opened.', KJV: '<sup>7</sup> Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you: <sup>8</sup> For every one that asketh receiveth; and he that seeketh findeth; and to him that knocketh it shall be opened.' }},
            ];

            scriptureData.forEach((data, index) => {
                sampleScriptures.push({
                    id: uuidv4(),
                    competitionYearId: bibleBeeYearId, // For legacy compatibility
                    year_id: bibleBeeYearId,
                    reference: data.ref,
                    text: data.text,
                    translation: 'NIV',
                    texts: data.translations,
                    scripture_number: String(index + 1),
                    scripture_order: index + 1,
                    createdAt: now,
                    updatedAt: now,
                });
            });
            await db.scriptures.bulkPut(sampleScriptures);

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
            const bibleBeeEnrollments: Enrollment[] = [];
            for (const child of activeChildrenForCurrentCycle) {
                if (bibleBeeCount >= 20) break;
                
                // Determine appropriate division for this child
                const gradeNum = gradeToCode(child.grade) ?? 0;
                const appropriateDivision = divisions.find(d => gradeNum >= d.min_grade && gradeNum <= d.max_grade);
                
                if (appropriateDivision) {
                    bibleBeeEnrollments.push({
                        id: uuidv4(),
                        child_id: child.child_id,
                        year_id: bibleBeeYearId,
                        division_id: appropriateDivision.id,
                        auto_enrolled: false,
                        enrolled_at: now,
                    });
                    
                    // CRITICAL FIX: Also create traditional ministry enrollment for backward compatibility
                    // This ensures Bible Bee enrollments show up in Rosters page and other legacy views
                    enrollments.push({ 
                        enrollment_id: uuidv4(), 
                        child_id: child.child_id, 
                        cycle_id: CYCLE_IDS.current, 
                        ministry_id: MINISTRY_IDS['bible-bee'], 
                        status: 'enrolled' 
                    });
                    
                    bibleBeeCount++;
                }
            }
            await db.enrollments.bulkPut(bibleBeeEnrollments);

            // Create student scripture assignments for the Bible Bee enrolled children
            const studentScripturesToInsert: Array<{ id: string; childId: string; competitionYearId: string; scriptureId: string; status: 'assigned' | 'completed'; createdAt: string; updatedAt: string }> = [];
            
            for (let i = 0; i < bibleBeeEnrollments.length; i++) {
                const enrollment = bibleBeeEnrollments[i];
                const child = children.find(c => c.child_id === enrollment.child_id)!;
                const gradeNum = gradeToCode(child.grade) ?? 0;
                
                // Assign scriptures based on progress simulation
                const isComplete = i < 6; // first 6 are complete
                const isInProgress = i >= 6 && i < 14; // next 8 are in-progress
                
                for (let scriptureIndex = 0; scriptureIndex < sampleScriptures.length; scriptureIndex++) {
                    const scripture = sampleScriptures[scriptureIndex];
                    let status: 'assigned' | 'completed' = 'assigned';
                    if (isComplete) {
                        status = 'completed';
                    } else if (isInProgress && scriptureIndex < 3) {
                        status = 'completed'; // partial completion for in-progress
                    }
                    
                    studentScripturesToInsert.push({
                        id: uuidv4(),
                        childId: enrollment.child_id,
                        competitionYearId: bibleBeeYearId, // Use the Bible Bee year ID
                        scriptureId: scripture.id,
                        status,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }
            
            if (studentScripturesToInsert.length) {
                await db.studentScriptures.bulkPut(studentScripturesToInsert);
            }

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
                // volunteer slot intentionally left empty for demo (no volunteer account)
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

