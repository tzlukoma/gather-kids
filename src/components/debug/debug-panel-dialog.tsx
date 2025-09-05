/**
 * Debug panel dialog component
 * Main dialog that reuses Auth Debug Panel styles and patterns
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bug } from 'lucide-react';
import { DebugFooterIcon } from './debug-footer-icon';
import { DebugPanelContent } from './debug-panel-content';
import { isDebugOn, onDebugFlagChange } from '@/lib/debug/flag';

export function DebugPanelDialog() {
  const [open, setOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    // Set initial state
    setDebugEnabled(isDebugOn());

    // Subscribe to flag changes
    const unsubscribe = onDebugFlagChange((enabled) => {
      setDebugEnabled(enabled);
      // Close dialog if debug is disabled
      if (!enabled && open) {
        setOpen(false);
      }
    });
    
    return unsubscribe;
  }, [open]);

  // Don't render anything if debug is not enabled
  if (!debugEnabled) {
    return null;
  }

  return (
    <>
      {/* Footer trigger icon */}
      <DebugFooterIcon onClick={() => setOpen(true)} />
      
      {/* Debug panel dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Panel
            </DialogTitle>
            <DialogDescription>
              Development information for debugging data source usage and operations.
            </DialogDescription>
          </DialogHeader>

          <DebugPanelContent />
        </DialogContent>
      </Dialog>
    </>
  );
}