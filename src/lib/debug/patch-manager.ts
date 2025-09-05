/**
 * Patch manager for debug instrumentation
 * Handles installation and removal of debug patches
 */

import { isDebugOn } from './flag';

export type DebugPatchInstaller = () => (() => void) | void;

// Global state to track installed patches
let installedPatches: (() => void)[] = [];
let isPatched = false;

/**
 * Install debug patches when debug is enabled
 */
export function installDebugPatches(installers: DebugPatchInstaller[]): void {
  // Only install if debug is on and not already patched
  if (!isDebugOn() || isPatched) {
    return;
  }

  try {
    for (const installer of installers) {
      const cleanup = installer();
      if (cleanup && typeof cleanup === 'function') {
        installedPatches.push(cleanup);
      }
    }
    isPatched = true;
    console.log('🔧 Debug patches installed');
  } catch (error) {
    console.error('❌ Error installing debug patches:', error);
    // Clean up any partial installations
    uninstallDebugPatches();
  }
}

/**
 * Uninstall all debug patches
 */
export function uninstallDebugPatches(): void {
  try {
    for (const cleanup of installedPatches) {
      cleanup();
    }
    installedPatches = [];
    isPatched = false;
    console.log('🔧 Debug patches uninstalled');
  } catch (error) {
    console.error('❌ Error uninstalling debug patches:', error);
  }
}

/**
 * Check if patches are currently installed
 */
export function areDebugPatchesInstalled(): boolean {
  return isPatched;
}

/**
 * Reinstall patches (useful for hot reloading)
 */
export function reinstallDebugPatches(installers: DebugPatchInstaller[]): void {
  uninstallDebugPatches();
  installDebugPatches(installers);
}

/**
 * Safe wrapper for patch operations that won't break app functionality
 */
export function safelyPatch<T>(original: T, patched: T, name: string): T {
  try {
    return patched;
  } catch (error) {
    console.error(`❌ Error patching ${name}:`, error);
    return original;
  }
}