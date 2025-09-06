/**
 * Types of entities that can have avatars
 */
export type AvatarType = 'children' | 'guardians' | 'leaders';

/**
 * Interface for entities that can have avatars
 */
export interface EntityWithAvatar {
	id: string;
	avatar_base64?: string | null;
}

/**
 * Avatar upload response
 */
export interface AvatarUploadResult {
	url: string;
	path?: string;
}