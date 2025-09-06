/**
 * SIMPLIFIED Script to create registration_cycles table
 * This version focuses only on generating SQL for manual execution
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) {
	console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in environment variables');
	process.exit(1);
}

// Generate the SQL for the table creation
const createTableSQL = `
CREATE TABLE IF NOT EXISTS public.registration_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  cycle_id VARCHAR UNIQUE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT false
);

-- Insert initial cycle data if needed (optional)
INSERT INTO public.registration_cycles (id, name, cycle_id, start_date, end_date, description, active, is_active)
VALUES 
  (gen_random_uuid(), 'Fall 2025', 'cycle_2025_fall', '2025-09-01', '2025-12-31', 'Fall 2025 Registration Cycle', true, true)
ON CONFLICT (cycle_id) DO NOTHING;
`.trim();

console.log('🚀 Registration Cycles Table Creation SQL');
console.log(
	'\nIt appears that automatic table creation is not working due to permission limitations.'
);
console.log('Please follow these manual steps to create the table:\n');

console.log('1. Go to your Supabase SQL Editor:');
console.log(`   ${SUPABASE_URL}/project/sql\n`);

console.log('2. Copy the following SQL:');
console.log('-----------------------------------------------------------');
console.log(createTableSQL);
console.log('-----------------------------------------------------------\n');

console.log('3. Paste it into the SQL Editor and click "Run"\n');

console.log('4. After creating the table, run the seed script:');
console.log('   npm run seed:uat\n');

console.log(
	'✅ This will allow your Bible Bee data to be properly seeded and displayed.'
);
