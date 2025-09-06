import { v4 as uuidv4 } from 'uuid';
import { db as dexieDb } from '../db'; // Direct Dexie database for demo mode
import type { AvatarType, EntityWithAvatar } from './types';
import { isSupabaseMode } from '../database/utils';
import { supabase } from '../supabaseClient';

/**
 * Maximum file size (in bytes) for original uploads
 * 512KB is plenty for profile pictures
 */
export const MAX_AVATAR_SIZE = 512 * 1024;

/**
 * Target dimensions for avatars
 * Small enough for efficient storage but large enough for display
 */
export const TARGET_AVATAR_SIZE = 200;

/**
 * Avatar service that handles uploading, retrieving, and managing avatars
 * Works with both Demo mode (IndexedDB) and Supabase mode
 */
export class AvatarService {
	/**
	 * Upload an avatar for a specific entity
	 */
	static async uploadAvatar(
		entityType: AvatarType,
		entityId: string,
		file: File
	): Promise<string> {
		// Validate file size
		if (file.size > MAX_AVATAR_SIZE) {
			throw new Error(
				`Avatar exceeds maximum size of ${MAX_AVATAR_SIZE / 1024}KB`
			);
		}

		// Process image to WebP format and resize
		const processedImage = await this.processImage(file);

		// Store based on mode
		if (isSupabaseMode()) {
			return this.uploadToSupabase(entityType, entityId, processedImage);
		} else {
			return this.storeInIndexedDB(entityType, entityId, processedImage);
		}
	}

	/**
	 * Get the URL or data for an avatar
	 */
	static async getAvatarUrl(
		entityType: AvatarType,
		entityId: string
	): Promise<string | null> {
		if (isSupabaseMode()) {
			return this.getSupabaseAvatarUrl(entityType, entityId);
		} else {
			return this.getIndexedDBAvatar(entityType, entityId);
		}
	}

	/**
	 * Delete an avatar
	 */
	static async deleteAvatar(
		entityType: AvatarType,
		entityId: string
	): Promise<void> {
		if (isSupabaseMode()) {
			await this.deleteSupabaseAvatar(entityType, entityId);
		} else {
			await this.deleteIndexedDBAvatar(entityType, entityId);
		}
	}

	/**
	 * Process image to WebP format and resize to target dimensions
	 */
	private static async processImage(file: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const reader = new FileReader();

			reader.onload = (e) => {
				img.onload = () => {
					// Calculate dimensions while maintaining aspect ratio
					let width = img.width;
					let height = img.height;

					if (width > height) {
						if (width > TARGET_AVATAR_SIZE) {
							height *= TARGET_AVATAR_SIZE / width;
							width = TARGET_AVATAR_SIZE;
						}
					} else {
						if (height > TARGET_AVATAR_SIZE) {
							width *= TARGET_AVATAR_SIZE / height;
							height = TARGET_AVATAR_SIZE;
						}
					}

					// Draw resized image to canvas
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;

					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Could not get canvas context'));
						return;
					}

					ctx.drawImage(img, 0, 0, width, height);

					// Convert to WebP
					canvas.toBlob(
						(blob) => {
							if (!blob) {
								reject(new Error('Failed to convert image to WebP'));
								return;
							}
							resolve(blob);
						},
						'image/webp',
						0.85 // Quality level
					);
				};

				img.onerror = () => {
					reject(new Error('Failed to load image'));
				};

				img.src = e.target?.result as string;
			};

			reader.onerror = () => {
				reject(new Error('Failed to read file'));
			};

			reader.readAsDataURL(file);
		});
	}

	/**
	 * Upload processed image to Supabase Storage
	 */
	private static async uploadToSupabase(
		entityType: AvatarType,
		entityId: string,
		image: Blob
	): Promise<string> {
		// Generate storage path
		const filename = `${entityId}.webp`;
		const path = `${entityType}/${filename}`;

		// Upload to Supabase Storage
		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(path, image, {
				contentType: 'image/webp',
				upsert: true,
			});

		if (uploadError) {
			throw new Error(`Failed to upload avatar: ${uploadError.message}`);
		}

		// Create or update reference in database
		const tableName = `${entityType}_avatars`;
		const idColumn = `${entityType.slice(0, -1)}_id`; // Remove trailing 's' from entityType

		const { error: dbError } = await supabase.from(tableName).upsert({
			[idColumn]: entityId,
			storage_path: path,
			media_type: 'image/webp',
			updated_at: new Date().toISOString(),
		});

		if (dbError) {
			throw new Error(`Failed to update avatar reference: ${dbError.message}`);
		}

		// Get and return public URL
		const { data } = supabase.storage.from('avatars').getPublicUrl(path);

		return data.publicUrl;
	}

	/**
	 * Store avatar as base64 string in IndexedDB (Demo mode)
	 */
	private static async storeInIndexedDB(
		entityType: AvatarType,
		entityId: string,
		image: Blob
	): Promise<string> {
		// Convert blob to base64
		const base64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(image);
		});

		// For now, only support children in demo mode (they have photo_url field)
		// TODO: Add photo_url field to Guardian and LeaderProfile types for full support
		switch (entityType) {
			case 'children':
				await dexieDb.children.update(entityId, {
					photo_url: base64,
					updated_at: new Date().toISOString(),
				});
				break;
			case 'guardians':
				// TODO: Add photo_url field to Guardian type
				throw new Error('Guardian avatars not yet supported in demo mode');
			case 'leaders':
				// TODO: Add photo_url field to LeaderProfile type
				throw new Error('Leader avatars not yet supported in demo mode');
			default:
				throw new Error(`Unsupported entity type: ${entityType}`);
		}

		return base64;
	}

	/**
	 * Get avatar URL from Supabase
	 */
	private static async getSupabaseAvatarUrl(
		entityType: AvatarType,
		entityId: string
	): Promise<string | null> {
		// Get reference from database
		const tableName = `${entityType}_avatars`;
		const idColumn = `${entityType.slice(0, -1)}_id`;

		const { data, error } = await supabase
			.from(tableName)
			.select('storage_path')
			.eq(idColumn, entityId)
			.single();

		if (error || !data) {
			return null;
		}

		// Get public URL
		const { data: urlData } = supabase.storage
			.from('avatars')
			.getPublicUrl(data.storage_path);

		return urlData.publicUrl;
	}

	/**
	 * Get avatar data from IndexedDB
	 */
	private static async getIndexedDBAvatar(
		entityType: AvatarType,
		entityId: string
	): Promise<string | null> {
		// For now, only support children in demo mode (they have photo_url field)
		// TODO: Add photo_url field to Guardian and LeaderProfile types for full support
		switch (entityType) {
			case 'children':
				const child = await dexieDb.children.get(entityId);
				return child?.photo_url || null;
			case 'guardians':
				// TODO: Add photo_url field to Guardian type
				return null;
			case 'leaders':
				// TODO: Add photo_url field to LeaderProfile type
				return null;
			default:
				throw new Error(`Unsupported entity type: ${entityType}`);
		}
	}

	/**
	 * Delete avatar from Supabase
	 */
	private static async deleteSupabaseAvatar(
		entityType: AvatarType,
		entityId: string
	): Promise<void> {
		// Get reference from database
		const tableName = `${entityType}_avatars`;
		const idColumn = `${entityType.slice(0, -1)}_id`;

		const { data, error } = await supabase
			.from(tableName)
			.select('storage_path')
			.eq(idColumn, entityId)
			.single();

		if (error || !data) {
			return;
		}

		// Delete from storage
		const { error: storageError } = await supabase.storage
			.from('avatars')
			.remove([data.storage_path]);

		if (storageError) {
			throw new Error(`Failed to delete avatar: ${storageError.message}`);
		}

		// Delete reference
		const { error: dbError } = await supabase
			.from(tableName)
			.delete()
			.eq(idColumn, entityId);

		if (dbError) {
			throw new Error(`Failed to delete avatar reference: ${dbError.message}`);
		}
	}

	/**
	 * Delete avatar from IndexedDB
	 */
	private static async deleteIndexedDBAvatar(
		entityType: AvatarType,
		entityId: string
	): Promise<void> {
		// For now, only support children in demo mode (they have photo_url field)
		// TODO: Add photo_url field to Guardian and LeaderProfile types for full support
		switch (entityType) {
			case 'children':
				await dexieDb.children.update(entityId, {
					photo_url: undefined,
					updated_at: new Date().toISOString(),
				});
				break;
			case 'guardians':
				// TODO: Add photo_url field to Guardian type
				break;
			case 'leaders':
				// TODO: Add photo_url field to LeaderProfile type
				break;
			default:
				throw new Error(`Unsupported entity type: ${entityType}`);
		}
	}
}