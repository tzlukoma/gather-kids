/**
 * Debug footer icon trigger component
 * Shows a footer icon when debug is enabled to open the debug panel
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { isDebugOn, onDebugFlagChange } from '@/lib/debug/flag';

interface DebugFooterIconProps {
  onClick: () => void;
}

export function DebugFooterIcon({ onClick }: DebugFooterIconProps) {
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    // Set initial state
    setDebugEnabled(isDebugOn());

    // Subscribe to flag changes
    const unsubscribe = onDebugFlagChange(setDebugEnabled);
    
    return unsubscribe;
  }, []);

  // Don't render if debug is not enabled
  if (!debugEnabled) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="fixed bottom-4 left-4 z-50 bg-background/80 backdrop-blur-sm border-dashed"
      aria-label="Open Debug Panel"
      title="Open Debug Panel (Ctrl+Shift+D)"
    >
      <Bug className="h-4 w-4 mr-2" />
      Debug Panel
    </Button>
  );
}