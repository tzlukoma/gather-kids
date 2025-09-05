/**
 * Debug installer component
 * Mounts at app root and manages debug panel lifecycle
 */

'use client';

import { useEffect, useCallback } from 'react';
import { isDebugOn, onDebugFlagChange, setDebugFlag } from './flag';
import { installDebugPatches, uninstallDebugPatches } from './patch-manager';
import { instrumentDAL } from './instrument-dal';
import { instrumentIndexedDB } from './instrument-indexeddb';
import { instrumentFetch } from './instrument-fetch';

export function DebugInstaller() {
  // Install/uninstall patches based on debug flag
  const handleDebugFlagChange = useCallback((enabled: boolean) => {
    console.log(`🔧 Debug installer: Debug panel ${enabled ? 'ENABLED' : 'DISABLED'}`);
    if (enabled) {
      console.log('🔧 Debug installer: Installing debug patches...');
      installDebugPatches([
        instrumentDAL,
        instrumentIndexedDB, 
        instrumentFetch,
      ]);
      console.log('🔧 Debug installer: All patches installed successfully');
    } else {
      console.log('🔧 Debug installer: Uninstalling debug patches...');
      uninstallDebugPatches();
      console.log('🔧 Debug installer: All patches uninstalled');
    }
  }, []);

  // Hotkey handler for Ctrl+Shift+D
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      setDebugFlag(!isDebugOn());
    }
  }, []);

  useEffect(() => {
    // Install patches if debug is already enabled
    if (isDebugOn()) {
      handleDebugFlagChange(true);
    }

    // Subscribe to flag changes
    const unsubscribe = onDebugFlagChange(handleDebugFlagChange);

    // Add hotkey listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
      uninstallDebugPatches();
    };
  }, [handleDebugFlagChange, handleKeyDown]);

  // This component doesn't render anything
  return null;
}