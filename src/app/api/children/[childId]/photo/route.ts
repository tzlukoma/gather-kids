import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
	updateChildPhoto,
	getHouseholdProfile,
	getEntityAvatar,
} from '@/lib/dal';
import { AuthRole, type BaseUser } from '@/lib/auth-types';
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
	const userData = formData.get('userData') as string | null;

	return {
		file,
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

// Check if user can update this child's photo
async function canUpdateChildPhoto(user: BaseUser, childId: string): Promise<boolean> {
	// Admins can update any child's photo
	if (user.metadata.role === AuthRole.ADMIN) {
		return true;
	}

	// Guardians can only update their own household's children
	if (user.metadata.role === AuthRole.GUARDIAN && user.metadata.household_id) {
		try {
			const householdProfile = await getHouseholdProfile(user.metadata.household_id);
			return householdProfile.children.some(child => child.child_id === childId);
		} catch (error) {
			console.error('Error checking household access:', error);
			return false;
		}
	}

	return false;
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ childId: string }> }
) {
	let uploadedPath: string | null = null;
	let storageClient: ReturnType<typeof createPhotoStorageClient> | null = null;

	try {
		const { childId } = await params;

		const user = await getCurrentUser(request);
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const hasPermission = await canUpdateChildPhoto(user, childId);
		if (!hasPermission) {
			return NextResponse.json(
				{ error: 'Forbidden: You can only update photos for children in your household' },
				{ status: 403 }
			);
		}

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

		const beforeUrl = await getEntityAvatar('child', childId);

		storageClient = createPhotoStorageClient();
		const timestamp = Date.now();
		const extension = file.name.split('.').pop() || 'jpg';
		const filename = `${childId}-${timestamp}.${extension}`;
		uploadedPath = `avatars/children/${filename}`;

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
			await updateChildPhoto(childId, photoUrl);
		} catch (dbError) {
			console.error('Child photo DB update failed; rolling back upload:', dbError);
			await deletePublicAvatarBestEffort(storageClient, uploadedPath);
			return NextResponse.json(
				{ error: 'Failed to update child photo' },
				{ status: 500 }
			);
		}

		if (beforeUrl && beforeUrl !== photoUrl) {
			await deletePublicAvatarBestEffort(storageClient, beforeUrl);
		}

		const userId = userIdOf(user);
		await logPhotoAudit({
			userId,
			action: 'child_photo_updated',
			actorRole: user.metadata?.role,
			entityType: 'child',
			entityId: childId,
			householdId: user.metadata?.household_id ?? null,
			beforeUrl,
			afterUrl: photoUrl,
		});

		return NextResponse.json({
			success: true,
			photoUrl,
		});

	} catch (error) {
		console.error('Error uploading child photo:', error);
		if (storageClient && uploadedPath) {
			await deletePublicAvatarBestEffort(storageClient, uploadedPath);
		}
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ childId: string }> }
) {
	try {
		const { childId } = await params;

		const user = await getCurrentUser(request);
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const hasPermission = await canUpdateChildPhoto(user, childId);
		if (!hasPermission) {
			return NextResponse.json(
				{ error: 'Forbidden: You can only update photos for children in your household' },
				{ status: 403 }
			);
		}

		const beforeUrl = await getEntityAvatar('child', childId);

		await updateChildPhoto(childId, null);

		const storageClient = createPhotoStorageClient();
		await deletePublicAvatarBestEffort(storageClient, beforeUrl);

		const userId = userIdOf(user);
		await logPhotoAudit({
			userId,
			action: 'child_photo_updated',
			actorRole: user.metadata?.role,
			entityType: 'child',
			entityId: childId,
			householdId: user.metadata?.household_id ?? null,
			beforeUrl,
			afterUrl: null,
		});

		return NextResponse.json({
			success: true,
		});

	} catch (error) {
		console.error('Error removing child photo:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
