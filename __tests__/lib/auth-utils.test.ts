import { 
  getUserRole, 
  getPostLoginRoute, 
  getUserRoleFromMetadata,
  getPostLoginRouteFromUser,
  ROLE_PRIORITY, 
  ROLE_ROUTES,
  DEFAULT_ROUTE 
} from '@/lib/auth-utils';
import { AuthRole } from '@/lib/auth-types';

describe('auth-utils', () => {
  describe('getUserRole', () => {
    it('returns null for null input', () => {
      expect(getUserRole(null)).toBe(null);
    });

    it('returns null for undefined input', () => {
      expect(getUserRole(undefined)).toBe(null);
    });

    it('returns the role for single string role', () => {
      expect(getUserRole(AuthRole.ADMIN)).toBe(AuthRole.ADMIN);
      expect(getUserRole(AuthRole.MINISTRY_LEADER)).toBe(AuthRole.MINISTRY_LEADER);
      expect(getUserRole(AuthRole.GUARDIAN)).toBe(AuthRole.GUARDIAN);
      expect(getUserRole(AuthRole.VOLUNTEER)).toBe(AuthRole.VOLUNTEER);
    });

    it('returns null for empty array', () => {
      expect(getUserRole([])).toBe(null);
    });

    it('returns the single role from array with one role', () => {
      expect(getUserRole([AuthRole.ADMIN])).toBe(AuthRole.ADMIN);
      expect(getUserRole([AuthRole.GUARDIAN])).toBe(AuthRole.GUARDIAN);
    });

    it('returns highest priority role from multiple roles', () => {
      // ADMIN has highest priority (1)
      expect(getUserRole([AuthRole.GUARDIAN, AuthRole.ADMIN])).toBe(AuthRole.ADMIN);
      expect(getUserRole([AuthRole.MINISTRY_LEADER, AuthRole.ADMIN, AuthRole.VOLUNTEER])).toBe(AuthRole.ADMIN);
      
      // MINISTRY_LEADER has priority over GUARDIAN and VOLUNTEER
      expect(getUserRole([AuthRole.GUARDIAN, AuthRole.MINISTRY_LEADER])).toBe(AuthRole.MINISTRY_LEADER);
      expect(getUserRole([AuthRole.VOLUNTEER, AuthRole.MINISTRY_LEADER, AuthRole.GUARDIAN])).toBe(AuthRole.MINISTRY_LEADER);
      
      // GUARDIAN has priority over VOLUNTEER
      expect(getUserRole([AuthRole.VOLUNTEER, AuthRole.GUARDIAN])).toBe(AuthRole.GUARDIAN);
    });
  });

  describe('getPostLoginRoute', () => {
    it('returns register route for null/undefined roles (users without roles)', () => {
      expect(getPostLoginRoute(null)).toBe('/register');
      expect(getPostLoginRoute(undefined)).toBe('/register');
      expect(getPostLoginRoute([])).toBe('/register');
    });

    it('returns correct route for each role', () => {
      expect(getPostLoginRoute(AuthRole.ADMIN)).toBe('/dashboard');
      expect(getPostLoginRoute(AuthRole.MINISTRY_LEADER)).toBe('/dashboard/rosters');
      expect(getPostLoginRoute(AuthRole.GUARDIAN)).toBe('/household');
      expect(getPostLoginRoute(AuthRole.VOLUNTEER)).toBe('/dashboard');
    });

    it('returns route based on highest priority role for multiple roles', () => {
      // ADMIN takes priority
      expect(getPostLoginRoute([AuthRole.GUARDIAN, AuthRole.ADMIN])).toBe('/dashboard');
      
      // MINISTRY_LEADER takes priority over GUARDIAN
      expect(getPostLoginRoute([AuthRole.GUARDIAN, AuthRole.MINISTRY_LEADER])).toBe('/dashboard/rosters');
      
      // GUARDIAN takes priority over VOLUNTEER
      expect(getPostLoginRoute([AuthRole.VOLUNTEER, AuthRole.GUARDIAN])).toBe('/household');
    });
  });

  describe('getUserRoleFromMetadata', () => {
    it('returns null for null user', () => {
      expect(getUserRoleFromMetadata(null)).toBe(null);
    });

    it('returns null for user without metadata', () => {
      expect(getUserRoleFromMetadata({})).toBe(null);
    });

    it('returns null for user with empty metadata', () => {
      expect(getUserRoleFromMetadata({ metadata: {} })).toBe(null);
    });

    it('returns role from user metadata', () => {
      const user = { metadata: { role: AuthRole.ADMIN } };
      expect(getUserRoleFromMetadata(user)).toBe(AuthRole.ADMIN);
    });
  });

  describe('getPostLoginRouteFromUser', () => {
    it('returns register route for null user (no role assigned)', () => {
      expect(getPostLoginRouteFromUser(null)).toBe('/register');
    });

    it('returns register route for user without role (no role assigned)', () => {
      expect(getPostLoginRouteFromUser({})).toBe('/register');
    });

    it('returns correct route based on user role', () => {
      const adminUser = { metadata: { role: AuthRole.ADMIN } };
      expect(getPostLoginRouteFromUser(adminUser)).toBe('/dashboard');

      const guardianUser = { metadata: { role: AuthRole.GUARDIAN } };
      expect(getPostLoginRouteFromUser(guardianUser)).toBe('/household');

      const leaderUser = { metadata: { role: AuthRole.MINISTRY_LEADER } };
      expect(getPostLoginRouteFromUser(leaderUser)).toBe('/dashboard/rosters');
    });
  });

  describe('ROLE_PRIORITY', () => {
    it('has correct priority order', () => {
      expect(ROLE_PRIORITY[AuthRole.ADMIN]).toBe(1); // Highest priority
      expect(ROLE_PRIORITY[AuthRole.MINISTRY_LEADER]).toBe(2);
      expect(ROLE_PRIORITY[AuthRole.GUARDIAN]).toBe(3);
      expect(ROLE_PRIORITY[AuthRole.VOLUNTEER]).toBe(4); // Lowest priority
    });

    it('admin has higher priority than all other roles', () => {
      expect(ROLE_PRIORITY[AuthRole.ADMIN]).toBeLessThan(ROLE_PRIORITY[AuthRole.MINISTRY_LEADER]);
      expect(ROLE_PRIORITY[AuthRole.ADMIN]).toBeLessThan(ROLE_PRIORITY[AuthRole.GUARDIAN]);
      expect(ROLE_PRIORITY[AuthRole.ADMIN]).toBeLessThan(ROLE_PRIORITY[AuthRole.VOLUNTEER]);
    });

    it('ministry leader has higher priority than guardian and volunteer', () => {
      expect(ROLE_PRIORITY[AuthRole.MINISTRY_LEADER]).toBeLessThan(ROLE_PRIORITY[AuthRole.GUARDIAN]);
      expect(ROLE_PRIORITY[AuthRole.MINISTRY_LEADER]).toBeLessThan(ROLE_PRIORITY[AuthRole.VOLUNTEER]);
    });

    it('guardian has higher priority than volunteer', () => {
      expect(ROLE_PRIORITY[AuthRole.GUARDIAN]).toBeLessThan(ROLE_PRIORITY[AuthRole.VOLUNTEER]);
    });
  });

  describe('ROLE_ROUTES', () => {
    it('has routes defined for all roles', () => {
      expect(ROLE_ROUTES[AuthRole.ADMIN]).toBeDefined();
      expect(ROLE_ROUTES[AuthRole.MINISTRY_LEADER]).toBeDefined();
      expect(ROLE_ROUTES[AuthRole.GUARDIAN]).toBeDefined();
      expect(ROLE_ROUTES[AuthRole.VOLUNTEER]).toBeDefined();
    });

    it('has correct routes for each role', () => {
      expect(ROLE_ROUTES[AuthRole.ADMIN]).toBe('/dashboard');
      expect(ROLE_ROUTES[AuthRole.MINISTRY_LEADER]).toBe('/dashboard/rosters');
      expect(ROLE_ROUTES[AuthRole.GUARDIAN]).toBe('/household');
      expect(ROLE_ROUTES[AuthRole.VOLUNTEER]).toBe('/dashboard');
    });
  });

  describe('Integration: Priority role selection scenarios', () => {
    it('handles admin + guardian user (admin takes priority)', () => {
      const roles = [AuthRole.GUARDIAN, AuthRole.ADMIN];
      expect(getUserRole(roles)).toBe(AuthRole.ADMIN);
      expect(getPostLoginRoute(roles)).toBe('/dashboard');
    });

    it('handles ministry leader + guardian user (leader takes priority)', () => {
      const roles = [AuthRole.GUARDIAN, AuthRole.MINISTRY_LEADER];
      expect(getUserRole(roles)).toBe(AuthRole.MINISTRY_LEADER);
      expect(getPostLoginRoute(roles)).toBe('/dashboard/rosters');
    });

    it('handles guardian only user', () => {
      const roles = [AuthRole.GUARDIAN];
      expect(getUserRole(roles)).toBe(AuthRole.GUARDIAN);
      expect(getPostLoginRoute(roles)).toBe('/household');
    });

    it('handles all roles together (admin takes priority)', () => {
      const roles = [AuthRole.VOLUNTEER, AuthRole.GUARDIAN, AuthRole.MINISTRY_LEADER, AuthRole.ADMIN];
      expect(getUserRole(roles)).toBe(AuthRole.ADMIN);
      expect(getPostLoginRoute(roles)).toBe('/dashboard');
    });
  });
});