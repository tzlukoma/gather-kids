/**
 * DAL instrumentation for debug panel
 * Wraps dbAdapter methods with Proxy to track method calls
 */

import { emitDebugEvent } from './bus';
import { safelyPatch } from './patch-manager';

// Debug scope to track if we're in a DAL call
export const debugScope = { inDal: 0 };

// Store original methods for cleanup
let originalMethods: Map<string, Function> = new Map();
let instrumentedAdapter: any = null;

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

    // Wait a bit for the adapter to be available
    const tryInstrument = () => {
      const globalAdapter = (window as any).gatherKidsDbAdapter;
      if (!globalAdapter) {
        console.warn('🔧 Debug: dbAdapter not yet available, retrying...');
        setTimeout(tryInstrument, 100);
        return;
      }

      // Check if we can instrument this adapter
      if (typeof globalAdapter !== 'object' || globalAdapter === null) {
        console.warn('🔧 Debug: dbAdapter is not an object, skipping DAL instrumentation');
        return;
      }

      instrumentedAdapter = globalAdapter;

      // Get all method names from the adapter
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(globalAdapter))
        .concat(Object.getOwnPropertyNames(globalAdapter))
        .filter(name => 
          typeof (globalAdapter as any)[name] === 'function' && 
          name !== 'constructor' &&
          !name.startsWith('_')
        );

      // Remove duplicates
      const uniqueMethods = [...new Set(methods)];

      // Store original methods and wrap them
      uniqueMethods.forEach(methodName => {
        const originalMethod = (globalAdapter as any)[methodName];
        if (typeof originalMethod === 'function' && !originalMethods.has(methodName)) {
          originalMethods.set(methodName, originalMethod);

          // Wrap the method
          (globalAdapter as any)[methodName] = function(this: any, ...args: any[]) {
            // Increment scope counter
            debugScope.inDal++;

            // Emit debug event
            emitDebugEvent({
              type: 'dal:call',
              name: `dbAdapter.${methodName}()`,
              method: methodName,
            } as any);

            try {
              // Call original method
              const result = originalMethod.apply(this, args);
              
              // If it's a promise, handle it
              if (result && typeof result.then === 'function') {
                return result.finally(() => {
                  debugScope.inDal--;
                });
              } else {
                debugScope.inDal--;
                return result;
              }
            } catch (error) {
              debugScope.inDal--;
              throw error;
            }
          };
        }
      });

      console.log(`🔧 Debug: DAL instrumentation installed (${uniqueMethods.length} methods wrapped)`);
    };

    // Start trying to instrument
    tryInstrument();

    // Return cleanup function
    return () => {
      try {
        if (instrumentedAdapter && originalMethods.size > 0) {
          // Restore original methods
          originalMethods.forEach((originalMethod, methodName) => {
            instrumentedAdapter[methodName] = originalMethod;
          });
          originalMethods.clear();
          instrumentedAdapter = null;
          console.log('🔧 Debug: DAL instrumentation removed');
        }
      } catch (error) {
        console.error('❌ Error cleaning up DAL instrumentation:', error);
      }
    };
    
  } catch (error) {
    console.error('❌ Error instrumenting DAL:', error);
    return;
  }
}