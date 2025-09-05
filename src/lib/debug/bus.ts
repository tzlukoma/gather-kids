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
  
  window.dispatchEvent(new CustomEvent('gk:debug', { 
    detail: fullEvent 
  }));
}

/**
 * Subscribe to debug events
 */
export function onDebugEvent(callback: (event: AnyDebugEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: CustomEvent<AnyDebugEvent>) => {
    callback(event.detail);
  };
  
  window.addEventListener('gk:debug', handler as EventListener);
  
  // Return cleanup function
  return () => {
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