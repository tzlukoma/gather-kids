import type { AvatarType } from './types';
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
 * via Supabase Storage.
 */
export class AvatarService {
	static async uploadAvatar(
		entityType: AvatarType,
		entityId: string,
		file: File
	): Promise<string> {
		if (file.size > MAX_AVATAR_SIZE) {
			throw new Error(
				`Avatar exceeds maximum size of ${MAX_AVATAR_SIZE / 1024}KB`
			);
		}

		const processedImage = await this.processImage(file);
		return this.uploadToSupabase(entityType, entityId, processedImage);
	}

	static async getAvatarUrl(
		entityType: AvatarType,
		entityId: string
	): Promise<string | null> {
		return this.getSupabaseAvatarUrl(entityType, entityId);
	}

	static async deleteAvatar(
		entityType: AvatarType,
		entityId: string
	): Promise<void> {
		await this.deleteSupabaseAvatar(entityType, entityId);
	}

	private static async processImage(file: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const reader = new FileReader();

			reader.onload = (e) => {
				img.onload = () => {
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

					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;

					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Could not get canvas context'));
						return;
					}

					ctx.drawImage(img, 0, 0, width, height);

					canvas.toBlob(
						(blob) => {
							if (!blob) {
								reject(new Error('Failed to convert image to WebP'));
								return;
							}
							resolve(blob);
						},
						'image/webp',
						0.85
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

	private static async uploadToSupabase(
		entityType: AvatarType,
		entityId: string,
		image: Blob
	): Promise<string> {
		const filename = `${entityId}.webp`;
		const path = `${entityType}/${filename}`;

		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(path, image, {
				contentType: 'image/webp',
				upsert: true,
			});

		if (uploadError) {
			throw new Error(`Failed to upload avatar: ${uploadError.message}`);
		}

		const tableName = `${entityType}_avatars`;
		const idColumn = `${entityType.slice(0, -1)}_id`;

		const { error: dbError } = await supabase.from(tableName).upsert({
			[idColumn]: entityId,
			storage_path: path,
			media_type: 'image/webp',
			updated_at: new Date().toISOString(),
		});

		if (dbError) {
			throw new Error(`Failed to update avatar reference: ${dbError.message}`);
		}

		const { data } = supabase.storage.from('avatars').getPublicUrl(path);
		return data.publicUrl;
	}

	private static async getSupabaseAvatarUrl(
		entityType: AvatarType,
		entityId: string
	): Promise<string | null> {
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

		const { data: urlData } = supabase.storage
			.from('avatars')
			.getPublicUrl(data.storage_path);

		return urlData.publicUrl;
	}

	private static async deleteSupabaseAvatar(
		entityType: AvatarType,
		entityId: string
	): Promise<void> {
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

		const { error: storageError } = await supabase.storage
			.from('avatars')
			.remove([data.storage_path]);

		if (storageError) {
			throw new Error(`Failed to delete avatar: ${storageError.message}`);
		}

		const { error: dbError } = await supabase
			.from(tableName)
			.delete()
			.eq(idColumn, entityId);

		if (dbError) {
			throw new Error(`Failed to delete avatar reference: ${dbError.message}`);
		}
	}
}
