// Server-only admin client using the service-role key.
// Do not reuse the DAL adapter client — that is the anon/user-scoped client.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

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
  const createClient = (await import('@supabase/supabase-js')) as any;
  supabaseAdmin = createClient.createClient
    ? createClient.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

export { supabaseAdmin };
