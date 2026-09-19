import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TEST_PASSWORD } from './data';

const MIN_MINISTRIES = 5;

export async function seedMinistries() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration for seeding');
  }
  
  const supabase = createClient(url, serviceKey);

  // Load test data from fixtures
  const testDataPath = join(process.cwd(), 'e2e', 'fixtures', 'test-data.json');
  const testDataRaw = readFileSync(testDataPath, 'utf-8');
  const testData = JSON.parse(testDataRaw);
  const ministries = testData.ministries;

  if (ministries.length < MIN_MINISTRIES) {
    throw new Error(`Test data must contain at least ${MIN_MINISTRIES} ministries, but only ${ministries.length} found`);
  }

  const { error } = await supabase
    .from('ministries')
    .upsert(ministries, { 
      onConflict: 'ministry_id',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Ministry seeding failed: ${error.message}`);
  }

  console.log(`Seeded ${ministries.length} test ministries`);
  return ministries;
}

export function createE2EAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE for e2e admin client');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createConfirmedTestUser(email: string, password: string) {
  const supabase = createE2EAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'GUARDIAN' },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create e2e user: ${error?.message || 'no user returned'}`);
  }
  return data.user;
}

export async function deleteTestUser(userId: string) {
  const supabase = createE2EAdminClient();
  await supabase.auth.admin.deleteUser(userId);
}

export const E2E_ACTIVE_CYCLE_ID = 'e2e_active';
export const E2E_PRIOR_CYCLE_ID = 'e2e_prior';
const SUNDAY_SCHOOL_ID = 'min_sunday_school';

function isoDate(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function throwIfError(label: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

/** Active cycle + Sunday School ministry required for /register submit. */
export async function ensureRegistrationSmokeFixtures() {
  const supabase = createE2EAdminClient();

  await throwIfError(
    'deactivate cycles',
    (
      await supabase
        .from('registration_cycles')
        .update({ is_active: false })
        .neq('cycle_id', 'nonexistent')
    ).error,
  );

  await throwIfError(
    'upsert prior cycle',
    (
      await supabase.from('registration_cycles').upsert(
        {
          cycle_id: E2E_PRIOR_CYCLE_ID,
          name: 'E2E Prior Cycle',
          start_date: isoDate(-400),
          end_date: isoDate(-35),
          is_active: false,
        },
        { onConflict: 'cycle_id' },
      )
    ).error,
  );

  await throwIfError(
    'upsert active cycle',
    (
      await supabase.from('registration_cycles').upsert(
        {
          cycle_id: E2E_ACTIVE_CYCLE_ID,
          name: 'E2E Active Cycle',
          start_date: isoDate(-30),
          end_date: isoDate(335),
          is_active: true,
        },
        { onConflict: 'cycle_id' },
      )
    ).error,
  );

  await throwIfError(
    'upsert sunday school',
    (
      await supabase.from('ministries').upsert(
        {
          ministry_id: SUNDAY_SCHOOL_ID,
          name: 'Sunday School',
          code: 'min_sunday_school',
          enrollment_type: 'enrolled',
          data_profile: 'SafetyAware',
          is_active: true,
        },
        { onConflict: 'ministry_id' },
      )
    ).error,
  );
}

export async function createReturningGuardianFixture(email: string, password = TEST_PASSWORD) {
  await ensureRegistrationSmokeFixtures();
  const supabase = createE2EAdminClient();
  const user = await createConfirmedTestUser(email, password);
  const householdId = randomUUID();
  const childId = randomUUID();

  await throwIfError(
    'insert household',
    (
      await supabase.from('households').insert({
        household_id: householdId,
        name: 'Rivera Household',
        address_line1: '200 Returning St',
        city: 'Perth Amboy',
        state: 'NJ',
        zip: '08861',
        email,
      })
    ).error,
  );

  await throwIfError(
    'insert guardian',
    (
      await supabase.from('guardians').insert({
        guardian_id: randomUUID(),
        household_id: householdId,
        first_name: 'Alex',
        last_name: 'Rivera',
        mobile_phone: '5551234567',
        email,
        relationship: 'Parent',
        is_primary: true,
      })
    ).error,
  );

  await throwIfError(
    'insert emergency contact',
    (
      await supabase.from('emergency_contacts').insert({
        household_id: householdId,
        first_name: 'Sam',
        last_name: 'Lee',
        mobile_phone: '5559876543',
        relationship: 'Aunt',
      })
    ).error,
  );

  await throwIfError(
    'insert child',
    (
      await supabase.from('children').insert({
        child_id: childId,
        household_id: householdId,
        first_name: 'Jordan',
        last_name: 'Rivera',
        dob: '2018-06-15',
        grade: 'K',
        allergies: 'none',
        is_active: true,
      })
    ).error,
  );

  await throwIfError(
    'insert prior enrollment',
    (
      await supabase.from('ministry_enrollments').insert({
        enrollment_id: randomUUID(),
        child_id: childId,
        cycle_id: E2E_PRIOR_CYCLE_ID,
        ministry_id: SUNDAY_SCHOOL_ID,
        status: 'enrolled',
      })
    ).error,
  );

  await throwIfError(
    'insert user_households',
    (
      await supabase.from('user_households').insert({
        auth_user_id: user.id,
        household_id: householdId,
      })
    ).error,
  );

  return { user, householdId, childId };
}

/** Household already registered for the active cycle (current-year overwrite). */
export async function createCurrentCycleGuardianFixture(
  email: string,
  password = TEST_PASSWORD,
) {
  await ensureRegistrationSmokeFixtures();
  const supabase = createE2EAdminClient();
  const user = await createConfirmedTestUser(email, password);
  const householdId = randomUUID();
  const childId = randomUUID();

  await throwIfError(
    'insert household',
    (
      await supabase.from('households').insert({
        household_id: householdId,
        name: 'Current Cycle Household',
        address_line1: '300 Current St',
        city: 'Perth Amboy',
        state: 'NJ',
        zip: '08861',
        email,
      })
    ).error,
  );

  await throwIfError(
    'insert guardian',
    (
      await supabase.from('guardians').insert({
        guardian_id: randomUUID(),
        household_id: householdId,
        first_name: 'Alex',
        last_name: 'Current',
        mobile_phone: '5551234567',
        email,
        relationship: 'Parent',
        is_primary: true,
      })
    ).error,
  );

  await throwIfError(
    'insert emergency contact',
    (
      await supabase.from('emergency_contacts').insert({
        household_id: householdId,
        first_name: 'Sam',
        last_name: 'Lee',
        mobile_phone: '5559876543',
        relationship: 'Aunt',
      })
    ).error,
  );

  await throwIfError(
    'insert child',
    (
      await supabase.from('children').insert({
        child_id: childId,
        household_id: householdId,
        first_name: 'Jordan',
        last_name: 'Current',
        dob: '2018-06-15',
        grade: '1st',
        allergies: 'none',
        is_active: true,
      })
    ).error,
  );

  await throwIfError(
    'insert active enrollment',
    (
      await supabase.from('ministry_enrollments').insert({
        enrollment_id: randomUUID(),
        child_id: childId,
        cycle_id: E2E_ACTIVE_CYCLE_ID,
        ministry_id: SUNDAY_SCHOOL_ID,
        status: 'enrolled',
      })
    ).error,
  );

  await throwIfError(
    'insert active registration',
    (
      await supabase.from('registrations').insert({
        registration_id: randomUUID(),
        child_id: childId,
        cycle_id: E2E_ACTIVE_CYCLE_ID,
        status: 'registered',
        pre_registered_sunday_school: true,
        submitted_at: new Date().toISOString(),
        submitted_via: 'e2e',
      })
    ).error,
  );

  await throwIfError(
    'insert user_households',
    (
      await supabase.from('user_households').insert({
        auth_user_id: user.id,
        household_id: householdId,
      })
    ).error,
  );

  return { user, householdId, childId };
}

export async function cleanupTestData() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(url, serviceKey);

  // Clean up test data (optional - for test isolation)
  await supabase.from('ministries').delete().like('ministry_id', 'test_%');
  // Add other cleanup operations as needed
}
/** A second non-Sunday-School ministry, so a saved sibling has a real card to review. */
export const E2E_ACOLYTE_ID = 'min_acolyte';

/**
 * Returning household with two children, both carrying prior-cycle enrollments.
 *
 * `createReturningGuardianFixture` has one child, which cannot exercise the
 * things #397 is about: a grade hint belongs to one child and not the others,
 * and "your other child's ministries are already saved" needs an other child.
 *
 * Grades are stored canonically (`'3'`, `'K'`) because that is what the DAL
 * writes. The wizard used to store the label instead, which is the bug.
 */
export async function createReturningSiblingFixture(
  email: string,
  password = TEST_PASSWORD,
) {
  await ensureRegistrationSmokeFixtures();
  const supabase = createE2EAdminClient();
  const user = await createConfirmedTestUser(email, password);
  const householdId = randomUUID();
  const olderChildId = randomUUID();
  const youngerChildId = randomUUID();

  await throwIfError(
    'upsert acolyte ministry',
    (
      await supabase.from('ministries').upsert(
        {
          ministry_id: E2E_ACOLYTE_ID,
          name: 'Acolytes',
          code: 'min_acolyte',
          enrollment_type: 'enrolled',
          data_profile: 'Basic',
          is_active: true,
        },
        { onConflict: 'ministry_id' },
      )
    ).error,
  );

  await throwIfError(
    'insert household',
    (
      await supabase.from('households').insert({
        household_id: householdId,
        name: 'Okoye Household',
        address_line1: '300 Sibling Way',
        city: 'Perth Amboy',
        state: 'NJ',
        zip: '08861',
        email,
      })
    ).error,
  );

  await throwIfError(
    'insert guardian',
    (
      await supabase.from('guardians').insert({
        guardian_id: randomUUID(),
        household_id: householdId,
        first_name: 'Ada',
        last_name: 'Okoye',
        mobile_phone: '5551234567',
        email,
        relationship: 'Mother',
        is_primary: true,
      })
    ).error,
  );

  await throwIfError(
    'insert emergency contact',
    (
      await supabase.from('emergency_contacts').insert({
        household_id: householdId,
        first_name: 'Sam',
        last_name: 'Lee',
        mobile_phone: '5559876543',
        relationship: 'Aunt',
      })
    ).error,
  );

  await throwIfError(
    'insert children',
    (
      await supabase.from('children').insert([
        {
          child_id: olderChildId,
          household_id: householdId,
          first_name: 'Amara',
          last_name: 'Okoye',
          dob: '2015-04-02',
          grade: '3',
          allergies: 'none',
          is_active: true,
        },
        {
          child_id: youngerChildId,
          household_id: householdId,
          first_name: 'Kofi',
          last_name: 'Okoye',
          dob: '2019-06-11',
          grade: 'K',
          allergies: 'none',
          is_active: true,
        },
      ])
    ).error,
  );

  await throwIfError(
    'insert prior enrollments',
    (
      await supabase.from('ministry_enrollments').insert(
        [olderChildId, youngerChildId].flatMap((childId) =>
          [SUNDAY_SCHOOL_ID, E2E_ACOLYTE_ID].map((ministryId) => ({
            enrollment_id: randomUUID(),
            child_id: childId,
            cycle_id: E2E_PRIOR_CYCLE_ID,
            ministry_id: ministryId,
            status: 'enrolled',
          })),
        ),
      )
    ).error,
  );

  await throwIfError(
    'insert user_households',
    (
      await supabase.from('user_households').insert({
        auth_user_id: user.id,
        household_id: householdId,
      })
    ).error,
  );

  return { user, householdId, olderChildId, youngerChildId };
}

/** Remove everything `createReturningSiblingFixture` created, children first. */
export async function cleanupReturningSiblingFixture(householdId: string) {
  const supabase = createE2EAdminClient();
  const { data: children } = await supabase
    .from('children')
    .select('child_id')
    .eq('household_id', householdId);

  for (const child of children ?? []) {
    await supabase.from('ministry_enrollments').delete().eq('child_id', child.child_id);
    await supabase.from('registrations').delete().eq('child_id', child.child_id);
    await supabase.from('children').delete().eq('child_id', child.child_id);
  }

  await supabase.from('user_households').delete().eq('household_id', householdId);
  await supabase.from('emergency_contacts').delete().eq('household_id', householdId);
  await supabase.from('guardians').delete().eq('household_id', householdId);
  await supabase.from('households').delete().eq('household_id', householdId);
}
