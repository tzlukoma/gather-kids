import { describe, it, expect } from '@jest/globals';
import { getPostLoginRoute, DEFAULT_ROUTE } from '@/lib/auth-utils';
import { AuthRole } from '@/lib/auth-types';

describe('Auth Utils - User with no role redirect', () => {
  it('should redirect users with no role to register page', () => {
    // Test various scenarios of users with no role
    expect(getPostLoginRoute(null)).toBe('/register');
    expect(getPostLoginRoute(undefined)).toBe('/register');
    expect(getPostLoginRoute([])).toBe('/register');
  });

  it('should redirect users with valid roles to their appropriate pages', () => {
    expect(getPostLoginRoute(AuthRole.ADMIN)).toBe('/dashboard');
    expect(getPostLoginRoute(AuthRole.MINISTRY_LEADER)).toBe('/dashboard/rosters');
    expect(getPostLoginRoute(AuthRole.GUARDIAN)).toBe('/household');
    expect(getPostLoginRoute(AuthRole.VOLUNTEER)).toBe('/dashboard');
  });

  it('should use register as default route for users without roles', () => {
    expect(DEFAULT_ROUTE).toBe('/register');
  });
});