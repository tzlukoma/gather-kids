// jest.setup.js
import '@testing-library/jest-dom';

// Mock authGuards for testing
jest.mock('@/lib/authGuards', () => {
  return {
    isMagicLinkEnabled: () => true,
    isPasswordEnabled: () => true,
  };
});

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
