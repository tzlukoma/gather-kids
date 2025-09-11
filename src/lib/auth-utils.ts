import { AuthRole } from './auth-types';

/**
 * Role priority order for users with multiple roles
 * Higher priority roles take precedence in redirects
 */
export const ROLE_PRIORITY: Record<AuthRole, number> = {
  [AuthRole.ADMIN]: 1,           // Highest priority
  [AuthRole.MINISTRY_LEADER]: 2,
  [AuthRole.GUARDIAN]: 3,
  [AuthRole.VOLUNTEER]: 4,
  [AuthRole.GUEST]: 5            // Lowest priority - unregistered users
} as const;

/**
 * Route mapping for each role after successful login
 */
export const ROLE_ROUTES: Record<AuthRole, string> = {
  [AuthRole.ADMIN]: '/dashboard',
  [AuthRole.MINISTRY_LEADER]: '/dashboard/rosters', // Note: Issue specified '/roster' but app uses '/dashboard/rosters'
  [AuthRole.GUARDIAN]: '/household',
  [AuthRole.VOLUNTEER]: '/dashboard', // Fallback to dashboard for volunteers
  [AuthRole.GUEST]: '/register'        // Unregistered users go to registration
} as const;

/**
 * Default fallback route for users with no assigned role
 * Redirects to register page where authenticated users skip email lookup
 */
export const DEFAULT_ROUTE = '/register';

/**
 * Determines the primary role for a user based on priority rules
 * In the current demo system, users have single roles, but this function
 * is designed to handle multiple roles for future Supabase implementation
 * 
 * @param roles - Array of roles the user has (or single role)
 * @returns The highest priority role, or null if no roles provided
 */
export function getUserRole(roles: AuthRole | AuthRole[] | null | undefined): AuthRole | null {
  if (!roles) {
    return null;
  }

  // Handle single role (current demo system)
  if (typeof roles === 'string') {
    return roles as AuthRole;
  }

  // Handle multiple roles (future multi-role support)
  if (Array.isArray(roles) && roles.length > 0) {
    // Sort by priority (lowest number = highest priority)
    const sortedRoles = roles.sort((a, b) => ROLE_PRIORITY[a] - ROLE_PRIORITY[b]);
    return sortedRoles[0];
  }

  return null;
}

/**
 * Gets the redirect route for a user based on their role(s)
 * Applies priority rules if user has multiple roles
 * 
 * @param roles - User's role(s) 
 * @returns Route to redirect to after login
 */
export function getPostLoginRoute(roles: AuthRole | AuthRole[] | null | undefined): string {
  const primaryRole = getUserRole(roles);
  
  if (!primaryRole) {
    return DEFAULT_ROUTE;
  }

  return ROLE_ROUTES[primaryRole] || DEFAULT_ROUTE;
}

/**
 * For demo mode compatibility - gets role from user metadata
 * 
 * @param user - User object with metadata containing role
 * @returns The user's primary role
 */
export function getUserRoleFromMetadata(user: { metadata?: { role?: AuthRole } } | null): AuthRole | null {
  if (!user?.metadata?.role) {
    return null;
  }
  
  return getUserRole(user.metadata.role);
}

/**
 * Gets the post-login redirect route from user metadata
 * 
 * @param user - User object with metadata containing role
 * @returns Route to redirect to after login
 */
export function getPostLoginRouteFromUser(user: { metadata?: { role?: AuthRole } } | null): string {
  const role = getUserRoleFromMetadata(user);
  return getPostLoginRoute(role);
}