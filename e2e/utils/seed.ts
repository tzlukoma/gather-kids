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

export async function cleanupTestData() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(url, serviceKey);

  // Clean up test data (optional - for test isolation)
  await supabase.from('ministries').delete().like('ministry_id', 'test_%');
  // Add other cleanup operations as needed
}