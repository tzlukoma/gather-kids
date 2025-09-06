/**
 * @jest-environment jsdom
 */

import { isDebugOn, setDebugFlag, DEBUG_LS_KEY } from '@/lib/debug/flag';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock CustomEvent
global.CustomEvent = jest.fn();

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockDispatchEvent = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

describe('Debug Flag Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.CustomEvent as jest.Mock).mockClear();
  });

  describe('isDebugOn', () => {
    it('should return false when localStorage returns null', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(isDebugOn()).toBe(false);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(DEBUG_LS_KEY);
    });

    it('should return false when localStorage returns "0"', () => {
      localStorageMock.getItem.mockReturnValue('0');
      expect(isDebugOn()).toBe(false);
    });

    it('should return true when localStorage returns "1"', () => {
      localStorageMock.getItem.mockReturnValue('1');
      expect(isDebugOn()).toBe(true);
    });
  });

  describe('setDebugFlag', () => {
    it('should set localStorage to "1" when enabled is true', () => {
      setDebugFlag(true);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(DEBUG_LS_KEY, '1');
      expect(global.CustomEvent).toHaveBeenCalledWith('gk:debug-flag-change', {
        detail: { enabled: true }
      });
      expect(mockDispatchEvent).toHaveBeenCalled();
    });

    it('should remove localStorage item when enabled is false', () => {
      setDebugFlag(false);
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(DEBUG_LS_KEY);
      expect(global.CustomEvent).toHaveBeenCalledWith('gk:debug-flag-change', {
        detail: { enabled: false }
      });
      expect(mockDispatchEvent).toHaveBeenCalled();
    });
  });
});