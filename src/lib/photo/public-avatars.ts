import { db as dbAdapter } from '@/lib/database/factory';
import type { AuditLogEntry } from '@/lib/types';

export const PUBLIC_AVATARS_BUCKET = 'public-avatars';

export type PhotoAuditAction = 'profile_photo_updated' | 'child_photo_updated';

/** Minimal storage surface used by best-effort deletes (avoids importing supabase-js here). */
export type PhotoStorageClient = {
	storage: {
		from: (bucket: string) => {
			remove: (
				paths: string[]
			) => Promise<{ data: unknown; error: { message: string } | null }>;
		};
	};
};

/**
 * Extract the object path inside `public-avatars` from a public URL or raw path.
 */
export function extractPublicAvatarObjectPath(
	urlOrPath: string | null | undefined
): string | null {
	if (!urlOrPath) return null;

	const trimmed = urlOrPath.trim();
	if (!trimmed) return null;

	const marker = `/object/public/${PUBLIC_AVATARS_BUCKET}/`;
	const markerIdx = trimmed.indexOf(marker);
	if (markerIdx !== -1) {
		const raw = trimmed.slice(markerIdx + marker.length).split('?')[0];
		return raw ? decodeURIComponent(raw) : null;
	}

	// Paths written as `public-avatars/avatars/...` or bare `avatars/...`
	const withBucket = `${PUBLIC_AVATARS_BUCKET}/`;
	if (trimmed.startsWith(withBucket)) {
		return trimmed.slice(withBucket.length).split('?')[0] || null;
	}

	if (trimmed.startsWith('avatars/')) {
		return trimmed.split('?')[0];
	}

	return null;
}

/**
 * Best-effort delete of a public-avatars object. Never throws.
 */
export async function deletePublicAvatarBestEffort(
	client: PhotoStorageClient,
	urlOrPath: string | null | undefined
): Promise<void> {
	const path = extractPublicAvatarObjectPath(urlOrPath);
	if (!path) return;

	try {
		const { error } = await client.storage
			.from(PUBLIC_AVATARS_BUCKET)
			.remove([path]);
		if (error) {
			console.warn('Best-effort public-avatars delete failed:', error.message);
		}
	} catch (error) {
		console.warn('Best-effort public-avatars delete failed:', error);
	}
}

/**
 * Write a photo update/remove row to the existing `audit_log` table.
 * Failures are logged and swallowed so the photo mutation still succeeds.
 *
 * Maps issue #146 shape onto audit_log columns:
 * `{ user_id, action, actor_role, entity_id, before_url, after_url, ts }`
 * → user_id / action / entity_id / changes{actor_role,before_url,after_url} / created_at
 */
export async function logPhotoAudit(params: {
	userId: string;
	action: PhotoAuditAction;
	actorRole?: string | null;
	entityType: AuditLogEntry['entity_type'];
	entityId: string;
	householdId?: string | null;
	beforeUrl?: string | null;
	afterUrl?: string | null;
}): Promise<void> {
	try {
		await dbAdapter.logAudit({
			household_id: params.householdId ?? null,
			user_id: params.userId,
			action: params.action,
			entity_type: params.entityType,
			entity_id: params.entityId,
			changes: {
				actor_role: params.actorRole ?? null,
				before_url: params.beforeUrl ?? null,
				after_url: params.afterUrl ?? null,
			},
		});
	} catch (error) {
		console.error('Failed to write photo audit log:', error);
	}
}
