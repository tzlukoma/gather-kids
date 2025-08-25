// jest.setup.js
import '@testing-library/jest-dom';
// Setup in-memory Dexie-like mocks for Node/Jest so tests that expect
// `@/lib/db` to exist will work when IndexedDB is not available.
import { setupDexieMockIfNeeded } from '@/test-utils/dexie-mock';

setupDexieMockIfNeeded();

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}
