# Issue: Implement Avatar Storage with Supabase

## Overview

This issue focuses on implementing avatar storage functionality using Supabase Storage for the gatherKids application. The solution will support storing profile images for children, guardians, and staff members, with different storage approaches for Demo mode (base64 in IndexedDB) versus DEV/UAT/PROD environments (Supabase Storage with Postgres references).

## Objectives

1. Create a Supabase Storage bucket specifically for avatars
2. Implement client-side image processing for size/format optimization
3. Design and implement database schemas to store avatar references
4. Create a unified API for avatar management that works across both backends
5. Build UI components for avatar upload, display, and management

## Detailed Requirements

### 1. Storage Infrastructure Setup

**File: `scripts/setup-avatar-storage.js`**

Create a script to set up the avatar storage infrastructure:

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

// Environment setup
const useLocal = process.argv.includes('--local');
const projectRef = process.env.SUPABASE_PROJECT_REF;

try {
	// Determine command based on environment
	let baseCommand = useLocal
		? 'supabase'
		: `supabase --project-ref ${projectRef}`;

	console.log('🪣 Setting up avatar storage bucket...');

	// Create the avatars bucket (public for MVP, can be made private later)
	execSync(`${baseCommand} storage create bucket avatars --public`, {
		stdio: 'inherit',
	});

	// Create migration file for child_avatars table
	const timestamp = Date.now();
	const migrationFile = `./supabase/migrations/${timestamp}_add_avatar_tables.sql`;

	const sqlContent = `
-- Create table for storing avatar references
CREATE TABLE IF NOT EXISTS child_avatars (
  child_id uuid PRIMARY KEY REFERENCES children(child_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardian_avatars (
  guardian_id uuid PRIMARY KEY REFERENCES guardians(guardian_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leader_avatars (
  leader_id uuid PRIMARY KEY REFERENCES leader_profiles(leader_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add row level security policies
ALTER TABLE child_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE leader_avatars ENABLE ROW LEVEL SECURITY;

-- Child avatar policies
CREATE POLICY family_read_child_avatars ON child_avatars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN user_households uh ON uh.household_id = c.household_id
      WHERE c.child_id = child_avatars.child_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_upsert_child_avatars ON child_avatars
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c
      JOIN user_households uh ON uh.household_id = c.household_id
      WHERE c.child_id = child_avatars.child_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_update_child_avatars ON child_avatars
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN user_households uh ON uh.household_id = c.household_id
      WHERE c.child_id = child_avatars.child_id AND uh.user_id = auth.uid()::text
    )
  );

-- Guardian avatar policies
CREATE POLICY family_read_guardian_avatars ON guardian_avatars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN user_households uh ON uh.household_id = g.household_id
      WHERE g.guardian_id = guardian_avatars.guardian_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_upsert_guardian_avatars ON guardian_avatars
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN user_households uh ON uh.household_id = g.household_id
      WHERE g.guardian_id = guardian_avatars.guardian_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_update_guardian_avatars ON guardian_avatars
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN user_households uh ON uh.household_id = g.household_id
      WHERE g.guardian_id = guardian_avatars.guardian_id AND uh.user_id = auth.uid()::text
    )
  );

-- Leader avatar policies (can be managed by admins)
CREATE POLICY admin_manage_leader_avatars ON leader_avatars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- Allow leaders to manage their own avatars
CREATE POLICY leader_manage_own_avatar ON leader_avatars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leader_profiles WHERE leader_id = leader_avatars.leader_id AND user_id = auth.uid()::text
    )
  );

-- Allow all authenticated users to view leader avatars
CREATE POLICY all_view_leader_avatars ON leader_avatars
  FOR SELECT USING (auth.role() = 'authenticated');
  `;

	fs.writeFileSync(migrationFile, sqlContent);
	console.log(`✅ Created migration file: ${migrationFile}`);

	// Apply the migration if local
	if (useLocal) {
		console.log('🔄 Applying migration to local database...');
		execSync('supabase db reset', { stdio: 'inherit' });
	}

	console.log('✅ Avatar storage setup complete!');
} catch (error) {
	console.error('❌ Failed to set up avatar storage:', error.message);
	process.exit(1);
}
```

Make the script executable:

```bash
chmod +x scripts/setup-avatar-storage.js
```

### 2. Avatar Service Implementation

Create a unified avatar service to handle image operations:

**File: `src/lib/avatar/avatar-service.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/factory';
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

		// Determine table and field based on entity type
		let table;
		let idField;

		switch (entityType) {
			case 'children':
				table = db.children;
				idField = 'child_id';
				break;
			case 'guardians':
				table = db.guardians;
				idField = 'guardian_id';
				break;
			case 'leaders':
				table = db.leader_profiles;
				idField = 'leader_id';
				break;
			default:
				throw new Error(`Unsupported entity type: ${entityType}`);
		}

		// Update entity with avatar data
		await table.update(entityId, {
			avatar_base64: base64,
			updated_at: new Date().toISOString(),
		});

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
		// Determine table based on entity type
		let table;
		let idField;

		switch (entityType) {
			case 'children':
				table = db.children;
				idField = 'child_id';
				break;
			case 'guardians':
				table = db.guardians;
				idField = 'guardian_id';
				break;
			case 'leaders':
				table = db.leader_profiles;
				idField = 'leader_id';
				break;
			default:
				throw new Error(`Unsupported entity type: ${entityType}`);
		}

		// Get entity with avatar data
		const entity = await table.get(entityId);
		return entity?.avatar_base64 || null;
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
		// Determine table based on entity type
		let table;
		let idField;

		switch (entityType) {
			case 'children':
				table = db.children;
				idField = 'child_id';
				break;
			case 'guardians':
				table = db.guardians;
				idField = 'guardian_id';
				break;
			case 'leaders':
				table = db.leader_profiles;
				idField = 'leader_id';
				break;
			default:
				throw new Error(`Unsupported entity type: ${entityType}`);
		}

		// Update entity to remove avatar data
		await table.update(entityId, {
			avatar_base64: null,
			updated_at: new Date().toISOString(),
		});
	}
}
```

**File: `src/lib/avatar/types.ts`**

```typescript
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
```

**File: `src/lib/database/utils.ts`**

```typescript
/**
 * Check if the application is running in Supabase mode
 */
export function isSupabaseMode(): boolean {
	// Check if running in browser environment
	if (typeof window === 'undefined') {
		return process.env.NEXT_PUBLIC_DATABASE_MODE === 'supabase';
	}

	// Browser environment
	return process.env.NEXT_PUBLIC_DATABASE_MODE === 'supabase';
}
```

### 3. UI Components for Avatar Management

Create React components for avatar upload and display:

**File: `src/components/avatar/AvatarUpload.tsx`**

```tsx
import { useState, useRef } from 'react';
import { AvatarService } from '@/lib/avatar/avatar-service';
import type { AvatarType } from '@/lib/avatar/types';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
	entityType: AvatarType;
	entityId: string;
	currentUrl?: string | null;
	size?: 'sm' | 'md' | 'lg';
	onUploadComplete?: (url: string) => void;
	className?: string;
}

export function AvatarUpload({
	entityType,
	entityId,
	currentUrl,
	size = 'md',
	onUploadComplete,
	className,
}: AvatarUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl || null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Size mapping
	const sizeMap = {
		sm: 'h-12 w-12',
		md: 'h-24 w-24',
		lg: 'h-32 w-32',
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);

		try {
			const url = await AvatarService.uploadAvatar(entityType, entityId, file);
			setAvatarUrl(url);
			if (onUploadComplete) {
				onUploadComplete(url);
			}
			toast({ title: 'Avatar uploaded successfully' });
		} catch (error) {
			console.error('Avatar upload failed:', error);
			toast({
				title: 'Upload failed',
				description: error instanceof Error ? error.message : 'Unknown error',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);

			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleDelete = async () => {
		if (!confirm('Are you sure you want to remove this avatar?')) return;

		setIsUploading(true);

		try {
			await AvatarService.deleteAvatar(entityType, entityId);
			setAvatarUrl(null);
			if (onUploadComplete) {
				onUploadComplete('');
			}
			toast({ title: 'Avatar removed successfully' });
		} catch (error) {
			console.error('Avatar removal failed:', error);
			toast({
				title: 'Removal failed',
				description: 'Could not remove the avatar',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className={cn('flex flex-col items-center gap-2', className)}>
			<div
				className={cn(
					'relative border rounded-full overflow-hidden bg-muted flex items-center justify-center',
					sizeMap[size]
				)}>
				{avatarUrl ? (
					<Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
				) : (
					<span className="text-muted-foreground text-2xl">
						{entityType === 'children'
							? 'C'
							: entityType === 'guardians'
							? 'G'
							: 'L'}
					</span>
				)}

				{isUploading && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<Loader2 className="animate-spin text-white" size={24} />
					</div>
				)}
			</div>

			<div className="flex gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => fileInputRef.current?.click()}
					disabled={isUploading}>
					<Upload size={14} className="mr-1" />
					{avatarUrl ? 'Change' : 'Upload'}
				</Button>

				{avatarUrl && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={handleDelete}
						disabled={isUploading}>
						<X size={14} className="mr-1" />
						Remove
					</Button>
				)}
			</div>

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept="image/*"
				className="hidden"
			/>

			<p className="text-xs text-muted-foreground mt-1">
				Upload an image (max {AvatarService.MAX_AVATAR_SIZE / 1024}KB)
			</p>
		</div>
	);
}
```

**File: `src/components/avatar/Avatar.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { AvatarService } from '@/lib/avatar/avatar-service';
import type { AvatarType } from '@/lib/avatar/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AvatarProps {
	entityType: AvatarType;
	entityId: string;
	size?: 'xs' | 'sm' | 'md' | 'lg';
	fallback?: string;
	className?: string;
}

export function Avatar({
	entityType,
	entityId,
	size = 'md',
	fallback,
	className,
}: AvatarProps) {
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Size mapping
	const sizeMap = {
		xs: 'h-8 w-8 text-xs',
		sm: 'h-10 w-10 text-sm',
		md: 'h-16 w-16 text-lg',
		lg: 'h-24 w-24 text-xl',
	};

	useEffect(() => {
		const fetchAvatar = async () => {
			if (!entityId) return;

			try {
				const url = await AvatarService.getAvatarUrl(entityType, entityId);
				setAvatarUrl(url);
			} catch (error) {
				console.error('Error fetching avatar:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAvatar();
	}, [entityType, entityId]);

	if (isLoading) {
		return (
			<Skeleton className={cn('rounded-full', sizeMap[size], className)} />
		);
	}

	return (
		<div
			className={cn(
				'relative rounded-full overflow-hidden bg-muted flex items-center justify-center',
				sizeMap[size],
				className
			)}>
			{avatarUrl ? (
				<Image
					src={avatarUrl}
					alt="Avatar"
					fill
					className="object-cover"
					onError={() => setAvatarUrl(null)}
				/>
			) : (
				<div className="flex items-center justify-center w-full h-full">
					{fallback ? (
						<span className="font-medium text-muted-foreground">
							{fallback.substring(0, 2).toUpperCase()}
						</span>
					) : (
						<User className="text-muted-foreground w-1/2 h-1/2" />
					)}
				</div>
			)}
		</div>
	);
}
```

### 4. Integration with Existing Forms

Update child registration form to include avatar upload:

**File: `src/components/registration/ChildInfoForm.tsx` (example)**

```tsx
// Add to imports
import { AvatarUpload } from '@/components/avatar/AvatarUpload';

// Inside the form component
function ChildInfoForm({ child, onSave }) {
	// Existing form code

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row gap-8">
				<AvatarUpload
					entityType="children"
					entityId={child.child_id}
					currentUrl={child.avatarUrl}
					size="lg"
					onUploadComplete={(url) => {
						// Update form state with new avatar URL if needed
						// or just let the AvatarService handle the storage
					}}
				/>

				<div className="flex-1 space-y-4">{/* Existing form fields */}</div>
			</div>

			{/* Rest of the form */}
		</div>
	);
}
```

### 5. Data Access Layer Updates

Update the data access layer to include avatar functionality:

**File: `src/lib/dal.ts` (append)**

```typescript
/**
 * Get avatar URL for a child
 */
export async function getChildAvatarUrl(
	childId: string
): Promise<string | null> {
	return AvatarService.getAvatarUrl('children', childId);
}

/**
 * Get avatar URL for a guardian
 */
export async function getGuardianAvatarUrl(
	guardianId: string
): Promise<string | null> {
	return AvatarService.getAvatarUrl('guardians', guardianId);
}

/**
 * Get avatar URL for a leader
 */
export async function getLeaderAvatarUrl(
	leaderId: string
): Promise<string | null> {
	return AvatarService.getAvatarUrl('leaders', leaderId);
}

/**
 * Get child profile data including avatar
 */
export async function getChildWithAvatar(childId: string) {
	const child = await db.children.get(childId);
	if (!child) return null;

	const avatarUrl = await getChildAvatarUrl(childId);

	return {
		...child,
		avatarUrl,
	};
}

// Similar methods for guardians and leaders
```

### 6. Database Schema Updates for IndexedDB

Update the IndexedDB schema to include avatar storage for demo mode:

**File: `src/lib/db.ts` (update)**

```typescript
// Add to existing schema
this.version(14)
	.stores({
		// Existing stores
	})
	.upgrade((tx) => {
		// Add avatar_base64 field to entities
		return Promise.all([
			tx
				.table('children')
				.toCollection()
				.modify((child) => {
					child.avatar_base64 = null;
				}),
			tx
				.table('guardians')
				.toCollection()
				.modify((guardian) => {
					guardian.avatar_base64 = null;
				}),
			tx
				.table('leader_profiles')
				.toCollection()
				.modify((leader) => {
					leader.avatar_base64 = null;
				}),
		]);
	});
```

## Testing Requirements

1. **Image Processing**: Test resizing and format conversion
2. **Storage Operations**: Test upload, retrieval, and deletion in both modes
3. **Edge Cases**: Test with different image formats and sizes
4. **Performance**: Test with large batches of images
5. **UI Components**: Test rendering with and without avatars

## Acceptance Criteria

- [ ] Supabase Storage bucket is properly created and configured
- [ ] Database schema includes tables for avatar references
- [ ] Avatar service correctly handles both storage modes
- [ ] Client-side image processing properly optimizes images
- [ ] UI components for avatar upload and display work correctly
- [ ] Integration with existing forms and profiles
- [ ] Documentation explains avatar functionality and usage
- [ ] Tests verify functionality in both storage modes

## Technical Notes

1. **Security**: RLS policies ensure users can only access avatars they have permission to see
2. **Performance**: Images are optimized to balance quality and size
3. **Progressive Enhancement**: UI degrades gracefully when avatars are not available
4. **Caching**: Consider browser caching for frequently accessed avatars
5. **Error Handling**: Handle failed uploads and missing images gracefully

## Implementation Strategy

1. Set up Supabase Storage infrastructure
2. Create database schema for avatar references
3. Implement client-side image processing
4. Build the avatar service
5. Create UI components
6. Update existing forms and profiles
7. Write tests for the implementation

## Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [WebP Image Format](https://developers.google.com/speed/webp)
- [Canvas API for Image Processing](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Next.js Image Component](https://nextjs.org/docs/basic-features/image-optimization)

## Time Estimate

- Storage infrastructure setup: 2-3 hours
- Database schema design: 1-2 hours
- Avatar service implementation: 4-6 hours
- UI components: 3-4 hours
- Form integration: 2-3 hours
- Testing: 3-4 hours
- Documentation: 1-2 hours

Total: 16-24 hours
