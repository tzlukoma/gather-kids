import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/featureFlags';
import { saveProfile } from '@/lib/dal';
import type { BaseUser } from '@/lib/auth-types';

// Handle multipart form data in demo mode
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

// Get current user from demo mode or Supabase
async function getCurrentUser(request: NextRequest): Promise<BaseUser | null> {
	if (isDemo()) {
		// In demo mode, user data comes from the request body
		const { userData } = await parseFormData(request);
		return userData;
	} else {
		// In production mode, get user from Supabase session
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
}

export async function POST(request: NextRequest) {
	try {
		// Get current user
		const user = await getCurrentUser(request);
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const { file } = await parseFormData(request);
		if (!file) {
			return NextResponse.json(
				{ error: 'No file provided' },
				{ status: 400 }
			);
		}

		// Validate file type and size
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

		let photoUrl: string;

		if (isDemo()) {
			// In demo mode, convert file to base64 data URL
			const buffer = await file.arrayBuffer();
			const base64 = Buffer.from(buffer).toString('base64');
			photoUrl = `data:${file.type};base64,${base64}`;
		} else {
			// In production mode, upload to Supabase Storage
			const timestamp = Date.now();
			const extension = file.name.split('.').pop() || 'jpg';
			const filename = `${user.uid || user.id}-${timestamp}.${extension}`;
			const storagePath = `avatars/users/${filename}`;

			const { error: uploadError } = await supabase.storage
				.from('public-avatars')
				.upload(storagePath, file, {
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

			// Get public URL
			const { data: urlData } = supabase.storage
				.from('public-avatars')
				.getPublicUrl(storagePath);

			photoUrl = urlData.publicUrl;
		}

		// Update user profile in database
		await saveProfile(user.uid || user.id || '', {
			photoPath: photoUrl,
		});

		// Create audit log entry
		// TODO: Implement audit logging when audit system is available

		return NextResponse.json({
			success: true,
			photoUrl,
		});

	} catch (error) {
		console.error('Error uploading user photo:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Get current user
		const user = await getCurrentUser(request);
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		// Update user profile to remove photo
		await saveProfile(user.uid || user.id || '', {
			photoPath: undefined,
		});

		// TODO: Delete old photo from storage if not in demo mode
		// TODO: Create audit log entry

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