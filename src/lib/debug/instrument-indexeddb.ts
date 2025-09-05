/**
 * IndexedDB instrumentation for debug panel
 * Patches IndexedDB operations to track database access
 */

import { emitDebugEvent } from './bus';
import { safelyPatch } from './patch-manager';

/**
 * Instrument IndexedDB operations for debug tracking
 */
export function instrumentIndexedDB(): (() => void) | void {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return;
  }

  try {
    // Store original methods for cleanup
    const originalOpen = window.indexedDB.open;
    const originalDeleteDatabase = window.indexedDB.deleteDatabase;
    const originalTransaction = IDBDatabase.prototype.transaction;

    // Patch indexedDB.open
    window.indexedDB.open = function (this: any, name: string, version?: number) {
      emitDebugEvent({
        type: 'idb:op',
        name: `IDB: open(${name})`,
        operation: 'open',
        database: name,
      } as any);
      
      return originalOpen.call(this, name, version);
    };

    // Patch indexedDB.deleteDatabase
    window.indexedDB.deleteDatabase = function (this: any, name: string) {
      emitDebugEvent({
        type: 'idb:op',
        name: `IDB: deleteDatabase(${name})`,
        operation: 'deleteDatabase',
        database: name,
      } as any);
      
      return originalDeleteDatabase.call(this, name);
    };

    // Patch IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (
      this: any,
      storeNames: string | string[], 
      mode?: IDBTransactionMode
    ) {
      const stores = Array.isArray(storeNames) ? storeNames.join(', ') : storeNames;
      
      emitDebugEvent({
        type: 'idb:op',
        name: `IDB: transaction(${stores})`,
        operation: 'transaction',
        database: this.name,
        details: { stores, mode: mode || 'readonly' }
      } as any);
      
      return originalTransaction.call(this, storeNames, mode);
    };

    console.log('🔧 Debug: IndexedDB instrumentation installed');

    // Return cleanup function
    return () => {
      try {
        window.indexedDB.open = originalOpen;
        window.indexedDB.deleteDatabase = originalDeleteDatabase;
        IDBDatabase.prototype.transaction = originalTransaction;
        console.log('🔧 Debug: IndexedDB instrumentation removed');
      } catch (error) {
        console.error('❌ Error cleaning up IndexedDB instrumentation:', error);
      }
    };

  } catch (error) {
    console.error('❌ Error instrumenting IndexedDB:', error);
    return;
  }
}