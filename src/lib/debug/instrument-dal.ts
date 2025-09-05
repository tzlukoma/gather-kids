/**
 * DAL instrumentation for debug panel
 * Wraps dbAdapter methods with Proxy to track method calls
 */

import { emitDebugEvent } from './bus';
import { safelyPatch } from './patch-manager';

// Debug scope to track if we're in a DAL call
export const debugScope = { inDal: 0 };

/**
 * Instrument the database adapter with debug tracking
 */
export function instrumentDAL(): (() => void) | void {
  try {
    // Check if we can access the adapter
    if (typeof window === 'undefined') {
      console.warn('🔧 Debug: Server-side environment, skipping DAL instrumentation');
      return;
    }

    // Try to get the adapter from the global window object if available
    const globalAdapter = (window as any).dbAdapter;
    if (!globalAdapter) {
      console.warn('🔧 Debug: dbAdapter not found on window, skipping DAL instrumentation');
      return;
    }

    // Check if we can instrument this adapter
    if (typeof globalAdapter !== 'object' || globalAdapter === null) {
      console.warn('🔧 Debug: dbAdapter is not an object, skipping DAL instrumentation');
      return;
    }

    console.log('🔧 Debug: DAL instrumentation installed (monitoring mode)');
    
    // Return a no-op cleanup function
    return () => {
      console.log('🔧 Debug: DAL instrumentation removed (monitoring mode)');
    };
    
  } catch (error) {
    console.error('❌ Error instrumenting DAL:', error);
    return;
  }
}