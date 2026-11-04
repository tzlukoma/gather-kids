import { AuthRole, type BaseUser } from '@/lib/auth-types';
import type { Child } from '@/lib/types';

/**
 * Determines if a user can update a child's photo based on their role and relationship
 * @param user - The current user
 * @param child - The child whose photo might be updated
 * @returns true if the user can update the photo, false otherwise
 */
export function canUpdateChildPhoto(user: BaseUser | null, child: Child): boolean {
	if (!user) return false;

	// Admins can update any child's photo
	if (user.metadata.role === AuthRole.ADMIN) {
		return true;
	}

	// Guardians can only update photos for children in their own household
	if (user.metadata.role === AuthRole.GUARDIAN && user.metadata.household_id) {
		return child.household_id === user.metadata.household_id;
	}

	// Other roles (ministry leaders, volunteers, guests) cannot update photos
	return false;
}

/**
 * Determines if a user can update their own avatar/profile photo
 * @param user - The current user
 * @returns true if the user can update their avatar, false otherwise
 */
export function canUpdateUserAvatar(user: BaseUser | null): boolean {
	// Any logged-in user can update their own avatar
	return !!user;
}
/**
 * Whether to offer the check-in screen's Transfer action (#561).
 *
 * Presentation only: `transfer_attendance` decides in the database whether
 * this user may move this particular child (an admin, or a leader of a
 * ministry the child is enrolled in — the same rule as check-in and
 * check-out). Guardians, volunteers and guests can open the screen but never
 * move a child, so the action is not shown to them.
 */
export function canTransferCheckIn(user: BaseUser | null): boolean {
	if (!user) return false;
	return (
		user.metadata.role === AuthRole.ADMIN ||
		user.metadata.role === AuthRole.MINISTRY_LEADER
	);
}
