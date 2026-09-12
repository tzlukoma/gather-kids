import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

export async function cleanupTestData() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(url, serviceKey);

  // Clean up test data (optional - for test isolation)
  await supabase.from('ministries').delete().like('ministry_id', 'test_%');
  // Add other cleanup operations as needed
}