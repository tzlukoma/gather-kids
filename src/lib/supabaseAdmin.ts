// Server-only admin client: prefer the app's DAL/adapter if available.
import { db as dbAdapter } from './database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let supabaseAdmin: any;

// If the application adapter exposes a direct client (SupabaseAdapter), use it.
// This keeps direct `@supabase` imports centralized in the adapter implementation.
try {
  if ((dbAdapter as any)?.client) {
    // Use adapter's internal client for admin operations when present
    supabaseAdmin = (dbAdapter as any).client;
  }
} catch (e) {
  // ignore
}

// Fallback: if no adapter client and we have no service key, use a non-connecting mock
if (!supabaseAdmin) {
  if (supabaseUrl.includes('dummy.supabase.co') || !supabaseKey || supabaseKey === 'dummy-service-role-key') {
    supabaseAdmin = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        })
      })
    };
  } else {
  // Defer to the adapter to create an admin client when possible; as a last resort
  // keep creating a client inline but mark it as server-only and isolated.
  // Use dynamic import to avoid `require()` and satisfy lint rules.
  // This code path is rare in CI and developer machines; prefer centralizing in DAL.
    const createClient = (await import('@supabase/supabase-js')) as any;
    supabaseAdmin = createClient.createClient
      ? createClient.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
      : createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  }
}

export { supabaseAdmin };
