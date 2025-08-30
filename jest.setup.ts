// jest.setup.js
import '@testing-library/jest-dom';
// Setup in-memory Dexie-like mocks for Node/Jest so tests that expect
// `@/lib/db` to exist will work when IndexedDB is not available.
import { setupDexieMockIfNeeded } from '@/test-utils/dexie-mock';

setupDexieMockIfNeeded();

// Mock ResizeObserver for tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}));

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}
