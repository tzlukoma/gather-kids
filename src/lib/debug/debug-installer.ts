/**
 * Debug installer component
 * Mounts at app root and manages debug panel lifecycle
 */

'use client';

import { useEffect, useCallback } from 'react';
import { isDebugOn, onDebugFlagChange, setDebugFlag, startAutoFlagDetection } from './flag';
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
    console.log('🔧 Debug installer: Initializing...');
    
    // Install patches if debug is already enabled
    const currentlyEnabled = isDebugOn();
    console.log('🔧 Debug installer: Current debug state:', currentlyEnabled);
    
    if (currentlyEnabled) {
      console.log('🔧 Debug installer: Debug is already enabled, installing patches...');
      handleDebugFlagChange(true);
    } else {
      console.log('🔧 Debug installer: Debug is disabled. Enable with localStorage["gk:debug-panel"]="1" or Ctrl+Shift+D');
    }

    // Subscribe to flag changes
    console.log('🔧 Debug installer: Setting up flag change subscription...');
    const unsubscribe = onDebugFlagChange(handleDebugFlagChange);

    // Start auto-detection for localStorage changes
    console.log('🔧 Debug installer: Starting auto flag detection...');
    const stopAutoDetection = startAutoFlagDetection();

    // Add hotkey listener
    console.log('🔧 Debug installer: Setting up hotkey listener (Ctrl+Shift+D)...');
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      console.log('🔧 Debug installer: Cleaning up...');
      unsubscribe();
      if (stopAutoDetection) stopAutoDetection();
      window.removeEventListener('keydown', handleKeyDown);
      uninstallDebugPatches();
    };
  }, [handleDebugFlagChange, handleKeyDown]);

  // This component doesn't render anything
  return null;
}