import type { BaseUser } from '@/lib/auth-types';
import { AuthRole } from '@/lib/auth-types';

/**
 * Check if a user can edit a specific household
 * @param user - The authenticated user
 * @param householdId - The household ID to check permissions for
 * @returns true if user can edit the household, false otherwise
 */
export function canEditHousehold(user: BaseUser | null, householdId: string): boolean {
  if (!user) return false;
  
  // Admin can edit any household
  if (user.metadata?.role === AuthRole.ADMIN) return true;
  
  // Guardian can edit their own household
  if (user.metadata?.role === AuthRole.GUARDIAN && 
      user.metadata?.household_id === householdId) {
    return true;
  }
  
  return false;
}
