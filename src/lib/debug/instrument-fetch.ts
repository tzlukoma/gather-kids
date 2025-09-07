/**
 * Fetch instrumentation for debug panel
 * Patches window.fetch to track Supabase and external API calls
 */

import { emitDebugEvent } from './bus';
import { debugScope } from './instrument-dal';
import { safelyPatch } from './patch-manager';

/**
 * Instrument fetch operations for debug tracking
 */
export function instrumentFetch(): (() => void) | void {
  if (typeof window === 'undefined' || !window.fetch) {
    return;
  }

  try {
    // Store original fetch for cleanup
    const originalFetch = window.fetch;
    
    // Get Supabase URL for categorization
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Patch window.fetch
    window.fetch = async function (this: any, input: RequestInfo | URL, init?: RequestInit) {
      let url: string;
      let method: string = 'GET';

      // Extract URL and method from different input types
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method;
      } else {
        url = 'unknown';
      }

      // Override method if provided in init
      if (init?.method) {
        method = init.method;
      }

      // Extract pathname for privacy (no query params, body, headers)
      let pathname: string;
      try {
        const urlObj = new URL(url);
        pathname = urlObj.pathname;
      } catch {
        pathname = url;
      }

      // Determine if this is a Supabase call
      const isSupabaseCall = supabaseUrl && url.includes(supabaseUrl);
      
      if (isSupabaseCall) {
        // Categorize as DAL or Direct based on debug scope
        const type = debugScope.inDal > 0 ? 'fetch:dal' : 'fetch:direct';
        
        emitDebugEvent({
          type,
          name: `${type === 'fetch:dal' ? 'DAL-Fetch' : 'Direct-Fetch'}: ${method} ${pathname}`,
          url: pathname,
          method,
          details: { 
            isDal: debugScope.inDal > 0,
            dalDepth: debugScope.inDal 
          }
        } as any);
      }

      // Call original fetch
      return originalFetch.call(this, input, init);
    };

    console.log('🔧 Debug: Fetch instrumentation installed');

    // Return cleanup function
    return () => {
      try {
        window.fetch = originalFetch;
        console.log('🔧 Debug: Fetch instrumentation removed');
      } catch (error) {
        console.error('❌ Error cleaning up fetch instrumentation:', error);
      }
    };

  } catch (error) {
    console.error('❌ Error instrumenting fetch:', error);
    return;
  }
}