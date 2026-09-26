import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUserClient, type CallerSupabaseClient } from '@/lib/api-auth';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import type { Database } from '@/lib/database/supabase-types';
import { clearEntityAvatar, getEntityAvatar, updateEntityAvatar } from '@/lib/dal';
import { logPhotoAudit } from '@/lib/photo/public-avatars';

/**
 * The signed-in user's own profile photo (the settings modal).
 *
 * Stored the way child photos are: one `avatars` row, `entity_type = 'user'`,
 * keyed by the caller's auth id, holding the image as a data URL (#529). No
 * storage bucket, and no column on `households` or `leader_profiles`, so it
 * works the same for a guardian and a leader.
 *
 * Who the caller is comes from `requireUserClient()`: the session cookie,
 * validated server-side, and the role from `app_metadata`. Nothing in the
 * request body is an identity. The row and the audit entry are written through
 * a client bound to that session, so the `avatars` and `audit_log` policies
 * judge the caller: a user can write their own photo and nobody else's.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * The image lives in a database row, so it is held well under the old 10MB
 * storage limit. The modal sends a square crop re-encoded as WebP, which is
 * tens of kilobytes.
 */
const MAX_BYTES = 2 * 1024 * 1024;

type CallerClient = SupabaseClient<Database>;

function asCallerClient(client: CallerSupabaseClient): CallerClient {
	return client as unknown as CallerClient;
}

function callerAdapter(client: CallerClient) {
	return new SupabaseAdapter(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
		client
	);
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireUserClient();
		if (!auth.authorized) {
			return auth.response;
		}

		const { userId, role } = auth;
		const client = asCallerClient(auth.supabase);

		const file = (await request.formData()).get('file');
		if (!(file instanceof File)) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}
		if (!ALLOWED_TYPES.includes(file.type)) {
			return NextResponse.json(
				{ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
				{ status: 400 }
			);
		}
		if (file.size > MAX_BYTES) {
			return NextResponse.json(
				{ error: 'File size too large. Maximum size is 2MB.' },
				{ status: 400 }
			);
		}

		const bytes = Buffer.from(await file.arrayBuffer());
		const photoUrl = `data:${file.type};base64,${bytes.toString('base64')}`;

		const beforeUrl = await getEntityAvatar('user', userId, client);
		await updateEntityAvatar('user', userId, photoUrl, client);

		await logPhotoAudit(
			{
				userId,
				action: 'profile_photo_updated',
				actorRole: role,
				entityType: 'household',
				entityId: userId,
				beforeUrl: summarizeForAudit(beforeUrl),
				afterUrl: summarizeForAudit(photoUrl),
			},
			callerAdapter(client)
		);

		return NextResponse.json({ success: true, photoUrl });
	} catch (error) {
		console.error('Error uploading user photo:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE() {
	try {
		const auth = await requireUserClient();
		if (!auth.authorized) {
			return auth.response;
		}

		const { userId, role } = auth;
		const client = asCallerClient(auth.supabase);

		const beforeUrl = await getEntityAvatar('user', userId, client);
		await clearEntityAvatar('user', userId, client);

		await logPhotoAudit(
			{
				userId,
				action: 'profile_photo_updated',
				actorRole: role,
				entityType: 'household',
				entityId: userId,
				beforeUrl: summarizeForAudit(beforeUrl),
				afterUrl: null,
			},
			callerAdapter(client)
		);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error removing user photo:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * The audit row records that the photo changed, not the image: a data URL is
 * the whole picture, and copying it into `audit_log` on every change would
 * keep every photo a user ever replaced.
 */
function summarizeForAudit(url: string | null): string | null {
	if (!url) return null;
	const match = /^data:([^;,]+)[;,]/.exec(url);
	return match ? `${match[1]} (${url.length} chars)` : url;
}
