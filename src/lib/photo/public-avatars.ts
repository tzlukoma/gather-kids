import { db as dbAdapter } from '@/lib/database/factory';
import type { DatabaseAdapter } from '@/lib/database/types';
import type { AuditLogEntry } from '@/lib/types';

// Photos are `avatars` rows (#529). The helpers for the `public-avatars`
// storage bucket are gone: no migration creates that bucket, and nothing
// writes to it any more.

export type PhotoAuditAction = 'profile_photo_updated' | 'child_photo_updated';

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
}, adapter: DatabaseAdapter = dbAdapter): Promise<void> {
	// `audit_log` admits a row only when `user_id` is the caller, so a server
	// route passes an adapter bound to the caller's session.
	try {
		await adapter.logAudit({
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
