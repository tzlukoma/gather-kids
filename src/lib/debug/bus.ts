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
 * Global event store for persistent event storage
 */
class DebugEventStore {
  private events: AnyDebugEvent[] = [];
  private maxEvents = 100;

  addEvent(event: AnyDebugEvent) {
    this.events.unshift(event); // Add to beginning (newest first)
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
  }

  getEvents(): AnyDebugEvent[] {
    return [...this.events]; // Return copy
  }

  clearEvents() {
    this.events = [];
  }

  getEventCount(): number {
    return this.events.length;
  }
}

// Global store instance
const globalEventStore = new DebugEventStore();

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
  
  // Store event globally for persistence
  globalEventStore.addEvent(fullEvent);

  // Dispatch event for debug panel UI (no console spam — use Ctrl+Shift+D panel)
  try {
    window.dispatchEvent(new CustomEvent('gk:debug', {
      detail: fullEvent
    }));
  } catch (error) {
    console.error('Debug event dispatch failed:', error);
  }
}

/**
 * Subscribe to debug events
 */
export function onDebugEvent(callback: (event: AnyDebugEvent) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: CustomEvent<AnyDebugEvent>) => {
    callback(event.detail);
  };

  window.addEventListener('gk:debug', handler as EventListener);

  return () => {
    window.removeEventListener('gk:debug', handler as EventListener);
  };
}

/**
 * Get all stored debug events
 */
export function getAllDebugEvents(): AnyDebugEvent[] {
  return globalEventStore.getEvents();
}

/**
 * Clear all stored debug events
 */
export function clearAllDebugEvents(): void {
  globalEventStore.clearEvents();
}

/**
 * Get current event count
 */
export function getDebugEventCount(): number {
  return globalEventStore.getEventCount();
}

/**
 * Get current route for debug events
 */
export function getCurrentRoute(): string {
  if (typeof window === 'undefined') return 'SSR';
  return window.location.pathname;
}