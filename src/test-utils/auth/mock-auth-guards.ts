/**
 * Mock version of the authGuards functions for testing
 */

// Mock version always returns true for isDemo in tests
export const isDemo = (): boolean => {
  return true; // Always return true in tests to enable localStorage usage
};

export const isMagicLinkEnabled = (): boolean => {
  return true;
};

export const isPasswordEnabled = (): boolean => {
  return true;
};
