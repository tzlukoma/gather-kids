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

export async function cleanupTestData() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
  const supabase = createClient(url, serviceKey);

  // Clean up test data (optional - for test isolation)
  await supabase.from('ministries').delete().like('ministry_id', 'test_%');
  // Add other cleanup operations as needed
}