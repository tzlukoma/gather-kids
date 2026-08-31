/**
 * Debug installer component
 * Mounts at app root and manages debug panel lifecycle
 */

'use client';

import { useEffect, useCallback } from 'react';
import { isDebugOn, onDebugFlagChange, setDebugFlag, syncDebugFlag } from './flag';
import { installDebugPatches, uninstallDebugPatches } from './patch-manager';
import { instrumentDAL } from './instrument-dal';
import { instrumentFetch } from './instrument-fetch';
import { devLog } from '../dev-log';

const panelLog = devLog('debug-panel');

export function DebugInstaller() {
  const handleDebugFlagChange = useCallback((enabled: boolean) => {
    panelLog.log(`Debug panel ${enabled ? 'ENABLED' : 'DISABLED'}`);
    if (enabled) {
      installDebugPatches([
        instrumentDAL,
        instrumentFetch,
      ]);
    } else {
      uninstallDebugPatches();
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      setDebugFlag(!isDebugOn());
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).syncDebugFlag = syncDebugFlag;
    }

    if (isDebugOn()) {
      handleDebugFlagChange(true);
    }

    const unsubscribe = onDebugFlagChange(handleDebugFlagChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
      uninstallDebugPatches();

      if (typeof window !== 'undefined') {
        delete (window as any).syncDebugFlag;
      }
    };
  }, [handleDebugFlagChange, handleKeyDown]);

  return null;
}
