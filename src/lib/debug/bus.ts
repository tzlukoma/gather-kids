/**
 * Event bus for debug panel communication
 * Provides typed events for different debug operations
 */

export interface DebugEvent {
  type: 'dal:call' | 'idb:op' | 'fetch:direct' | 'fetch:dal' | 'page:summary';
  name: string;
  timestamp: number;
  route: string;
  details?: Record<string, any>;
}

export interface DebugEventDALCall extends DebugEvent {
  type: 'dal:call';
  method: string;
}

export interface DebugEventIDBOp extends DebugEvent {
  type: 'idb:op';
  operation: string;
  database?: string;
}

export interface DebugEventFetch extends DebugEvent {
  type: 'fetch:direct' | 'fetch:dal';
  url: string;
  method: string;
}

export interface DebugEventPageSummary extends DebugEvent {
  type: 'page:summary';
  sources: string[];
  operationCount: number;
}

export type AnyDebugEvent = DebugEventDALCall | DebugEventIDBOp | DebugEventFetch | DebugEventPageSummary;

/**
 * Emit a debug event
 */
export function emitDebugEvent(event: Omit<AnyDebugEvent, 'timestamp' | 'route'>): void {
  if (typeof window === 'undefined') return;
  
  const fullEvent: AnyDebugEvent = {
    ...event,
    timestamp: Date.now(),
    route: window.location.pathname,
  } as AnyDebugEvent;
  
  // Always log to console for real-time debugging (console will be visible in both local and deployed)
  const timestamp = new Date(fullEvent.timestamp).toLocaleTimeString();
  console.log(`🔍 Debug Event [${timestamp}]:`, {
    type: fullEvent.type,
    name: fullEvent.name,
    route: fullEvent.route,
    ...(fullEvent.details && { details: fullEvent.details })
  });
  
  // Dispatch event for debug panel UI
  try {
    window.dispatchEvent(new CustomEvent('gk:debug', { 
      detail: fullEvent 
    }));
    console.log(`🔍 Debug Event dispatched:`, fullEvent.type, fullEvent.name);
  } catch (error) {
    console.error('🔍 Debug Event dispatch failed:', error);
  }
}

/**
 * Subscribe to debug events
 */
export function onDebugEvent(callback: (event: AnyDebugEvent) => void): () => void {
  if (typeof window === 'undefined') {
    console.warn('🔍 onDebugEvent: Server-side environment, returning no-op cleanup');
    return () => {};
  }
  
  console.log('🔍 onDebugEvent: Setting up event listener for gk:debug events');
  
  const handler = (event: CustomEvent<AnyDebugEvent>) => {
    console.log('🔍 onDebugEvent: Received gk:debug event:', event.detail);
    callback(event.detail);
  };
  
  window.addEventListener('gk:debug', handler as EventListener);
  console.log('🔍 onDebugEvent: Event listener added for gk:debug');
  
  // Return cleanup function
  return () => {
    console.log('🔍 onDebugEvent: Removing event listener for gk:debug');
    window.removeEventListener('gk:debug', handler as EventListener);
  };
}

/**
 * Get current route for debug events
 */
export function getCurrentRoute(): string {
  if (typeof window === 'undefined') return 'SSR';
  return window.location.pathname;
}