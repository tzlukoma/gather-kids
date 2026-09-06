import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getMeProfile, saveProfile } from '@/lib/dal';
import type { BaseUser } from '@/lib/auth-types';
import {
	PUBLIC_AVATARS_BUCKET,
	deletePublicAvatarBestEffort,
	logPhotoAudit,
} from '@/lib/photo/public-avatars';

function createPhotoStorageClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error('Supabase configuration is required for photo storage');
	}
	return createClient(url, key, { auth: { persistSession: false } });
}


// Handle multipart form data
async function parseFormData(request: NextRequest) {
	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const userId = formData.get('userId') as string | null;
	const userData = formData.get('userData') as string | null;

	return {
		file,
		userId,
		userData: userData ? JSON.parse(userData) : null,
	};
}

// Get current user from Supabase session
async function getCurrentUser(request: NextRequest): Promise<BaseUser | null> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.substring(7);
	const { data: { user }, error } = await supabase.auth.getUser(token);

	if (error || !user) {
		return null;
	}

	return {
		uid: user.id,
		email: user.email || '',
		displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
		metadata: {
			role: user.user_metadata?.role,
			household_id: user.user_metadata?.household_id,
		},
		is_active: true,
	} as BaseUser;
}

function userIdOf(user: BaseUser): string {
	return user.uid || (user as { id?: string }).id || '';
}

export async function POST(request: NextRequest) {
	let uploadedPath: string | null = null;
	let storageClient: ReturnType<typeof createPhotoStorageClient> | null = null;

	try {
		const user = await getCurrentUser(request);
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const userId = userIdOf(user);
		const { file } = await parseFormData(request);
		if (!file) {
			return NextResponse.json(
				{ error: 'No file provided' },
				{ status: 400 }
			);
		}

		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
				{ status: 400 }
			);
		}

		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: 'File size too large. Maximum size is 10MB.' },
				{ status: 400 }
			);
		}

		const beforeProfile = await getMeProfile(userId);
		const beforeUrl = beforeProfile?.photo_url || beforeProfile?.avatar_path || null;

		storageClient = createPhotoStorageClient();
		const timestamp = Date.now();
		const extension = file.name.split('.').pop() || 'jpg';
		const filename = `${userId}-${timestamp}.${extension}`;
		uploadedPath = `avatars/users/${filename}`;

		const { error: uploadError } = await storageClient.storage
			.from(PUBLIC_AVATARS_BUCKET)
			.upload(uploadedPath, file, {
				contentType: file.type,
				upsert: true,
			});

		if (uploadError) {
			console.error('Storage upload error:', uploadError);
			return NextResponse.json(
				{ error: 'Failed to upload image' },
				{ status: 500 }
			);
		}

		const { data: urlData } = storageClient.storage
			.from(PUBLIC_AVATARS_BUCKET)
			.getPublicUrl(uploadedPath);

		const photoUrl = urlData.publicUrl;

		try {
			await saveProfile(userId, {
				photoPath: photoUrl,
			});
		} catch (dbError) {
			console.error('Profile photo DB update failed; rolling back upload:', dbError);
			await deletePublicAvatarBestEffort(storageClient, uploadedPath);
			return NextResponse.json(
				{ error: 'Failed to update profile photo' },
				{ status: 500 }
			);
		}

		// Keep old photo until DB succeeds; then best-effort cleanup.
		if (beforeUrl && beforeUrl !== photoUrl) {
			await deletePublicAvatarBestEffort(storageClient, beforeUrl);
		}

		await logPhotoAudit({
			userId,
			action: 'profile_photo_updated',
			actorRole: user.metadata?.role,
			entityType: 'household',
			entityId: userId,
			householdId: user.metadata?.household_id ?? null,
			beforeUrl,
			afterUrl: photoUrl,
		});

		return NextResponse.json({
			success: true,
			photoUrl,
		});

	} catch (error) {
		console.error('Error uploading user photo:', error);
		if (storageClient && uploadedPath) {
			await deletePublicAvatarBestEffort(storageClient, uploadedPath);
		}
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const user = await getCurrentUser(request);
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const userId = userIdOf(user);
		const beforeProfile = await getMeProfile(userId);
		const beforeUrl = beforeProfile?.photo_url || beforeProfile?.avatar_path || null;

		await saveProfile(userId, {
			photoPath: null,
		});

		const storageClient = createPhotoStorageClient();
		await deletePublicAvatarBestEffort(storageClient, beforeUrl);

		await logPhotoAudit({
			userId,
			action: 'profile_photo_updated',
			actorRole: user.metadata?.role,
			entityType: 'household',
			entityId: userId,
			householdId: user.metadata?.household_id ?? null,
			beforeUrl,
			afterUrl: null,
		});

		return NextResponse.json({
			success: true,
		});

	} catch (error) {
		console.error('Error removing user photo:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
