import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client (uses service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// For development with dummy values, create a mock client that won't actually connect
let supabaseAdmin: any;

if (supabaseUrl.includes('dummy.supabase.co') || !supabaseKey || supabaseKey === 'dummy-service-role-key') {
  supabaseAdmin = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    })
  };
} else {
  supabaseAdmin = createClient(
    supabaseUrl,
    supabaseKey,
    { auth: { persistSession: false } }
  );
}

export { supabaseAdmin };
