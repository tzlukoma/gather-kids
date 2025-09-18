/**
 * @jest-environment jsdom
 */

import { emitDebugEvent, onDebugEvent, type AnyDebugEvent } from '@/lib/debug/bus';

describe('Debug Event Bus', () => {
  const mockDispatchEvent = jest.fn();
  const mockAddEventListener = jest.fn();
  const mockRemoveEventListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Date.now to return a consistent timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    
    // Mock window methods
    jest.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
      // Simulate the CustomEvent structure that the actual implementation creates
      const mockEvent = {
        ...event,
        isTrusted: false,
        detail: event.detail || {}
      };
      mockDispatchEvent(mockEvent);
      return true;
    });
    jest.spyOn(window, 'addEventListener').mockImplementation(mockAddEventListener);
    jest.spyOn(window, 'removeEventListener').mockImplementation(mockRemoveEventListener);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('emitDebugEvent', () => {
    it('should emit a debug event with timestamp and route', () => {
      const event = {
        type: 'dal:call' as const,
        name: 'Test DAL call',
        method: 'testMethod',
      };

      emitDebugEvent(event);

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            type: 'dal:call',
            name: 'Test DAL call',
            method: 'testMethod',
            timestamp: 1234567890,
            route: '/', // jsdom default route
          }),
        })
      );
    });

    it('should emit an IndexedDB event', () => {
      const event = {
        type: 'idb:op' as const,
        name: 'IDB: open(testdb)',
        operation: 'open',
        database: 'testdb',
      };

      emitDebugEvent(event as any);

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            type: 'idb:op',
            name: 'IDB: open(testdb)',
            operation: 'open',
            database: 'testdb',
            timestamp: 1234567890,
            route: '/', // jsdom default route
          }),
        })
      );
    });

    it('should emit a fetch event', () => {
      const event = {
        type: 'fetch:direct' as const,
        name: 'Direct-Fetch: GET /api/test',
        url: '/api/test',
        method: 'GET',
      };

      emitDebugEvent(event as any);

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            type: 'fetch:direct',
            name: 'Direct-Fetch: GET /api/test',
            url: '/api/test',
            method: 'GET',
            timestamp: 1234567890,
            route: '/', // jsdom default route
          }),
        })
      );
    });
  });

  describe('onDebugEvent', () => {
    it('should add event listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = onDebugEvent(callback);

      expect(mockAddEventListener).toHaveBeenCalledWith('gk:debug', expect.any(Function));
      
      // Call cleanup
      cleanup();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('gk:debug', expect.any(Function));
    });

    it('should call callback when event is triggered', () => {
      const callback = jest.fn();
      let eventHandler: (event: CustomEvent<AnyDebugEvent>) => void;

      // Capture the event handler
      mockAddEventListener.mockImplementation((type, handler) => {
        if (type === 'gk:debug') {
          eventHandler = handler;
        }
      });

      onDebugEvent(callback);

      // Simulate event
      const testEvent = {
        detail: {
          type: 'dal:call' as const,
          name: 'Test call',
          method: 'test',
          timestamp: 1234567890,
          route: '/test',
        },
      } as CustomEvent<AnyDebugEvent>;

      eventHandler!(testEvent);

      expect(callback).toHaveBeenCalledWith(testEvent.detail);
    });
  });
});