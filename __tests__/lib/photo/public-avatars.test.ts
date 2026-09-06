/**
 * @jest-environment node
 */

import {
	PUBLIC_AVATARS_BUCKET,
	extractPublicAvatarObjectPath,
	deletePublicAvatarBestEffort,
	logPhotoAudit,
} from '@/lib/photo/public-avatars';

const mockLogAudit = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/lib/database/factory', () => ({
	db: {
		logAudit: (...args: unknown[]) => mockLogAudit(...args),
	},
}));

describe('extractPublicAvatarObjectPath', () => {
	it('parses a public storage URL', () => {
		const url = `https://xyz.supabase.co/storage/v1/object/public/${PUBLIC_AVATARS_BUCKET}/avatars/users/u1-1.webp`;
		expect(extractPublicAvatarObjectPath(url)).toBe('avatars/users/u1-1.webp');
	});

	it('strips query strings', () => {
		const url = `https://xyz.supabase.co/storage/v1/object/public/${PUBLIC_AVATARS_BUCKET}/avatars/children/c1.jpg?t=1`;
		expect(extractPublicAvatarObjectPath(url)).toBe('avatars/children/c1.jpg');
	});

	it('accepts bare avatars/ paths', () => {
		expect(extractPublicAvatarObjectPath('avatars/users/a.png')).toBe(
			'avatars/users/a.png'
		);
	});

	it('accepts bucket-prefixed paths', () => {
		expect(
			extractPublicAvatarObjectPath(`${PUBLIC_AVATARS_BUCKET}/avatars/users/a.png`)
		).toBe('avatars/users/a.png');
	});

	it('returns null for empty/unknown values', () => {
		expect(extractPublicAvatarObjectPath(null)).toBeNull();
		expect(extractPublicAvatarObjectPath('')).toBeNull();
		expect(extractPublicAvatarObjectPath('https://example.com/foo.png')).toBeNull();
	});
});

describe('deletePublicAvatarBestEffort', () => {
	beforeEach(() => {
		mockRemove.mockReset();
		mockRemove.mockResolvedValue({ data: null, error: null });
	});

	it('removes the object path and never throws on storage errors', async () => {
		mockRemove.mockResolvedValueOnce({
			data: null,
			error: { message: 'boom' },
		});
		const client = {
			storage: {
				from: jest.fn(() => ({ remove: mockRemove })),
			},
		} as any;

		await expect(
			deletePublicAvatarBestEffort(
				client,
				`https://xyz.supabase.co/storage/v1/object/public/${PUBLIC_AVATARS_BUCKET}/avatars/users/old.webp`
			)
		).resolves.toBeUndefined();

		expect(client.storage.from).toHaveBeenCalledWith(PUBLIC_AVATARS_BUCKET);
		expect(mockRemove).toHaveBeenCalledWith(['avatars/users/old.webp']);
	});

	it('no-ops when path cannot be extracted', async () => {
		const client = {
			storage: { from: jest.fn(() => ({ remove: mockRemove })) },
		} as any;
		await deletePublicAvatarBestEffort(client, null);
		expect(client.storage.from).not.toHaveBeenCalled();
	});
});

describe('logPhotoAudit', () => {
	beforeEach(() => {
		mockLogAudit.mockReset();
		mockLogAudit.mockResolvedValue(undefined);
	});

	it('writes profile_photo_updated into audit_log via dbAdapter', async () => {
		await logPhotoAudit({
			userId: 'user-1',
			action: 'profile_photo_updated',
			actorRole: 'GUARDIAN',
			entityType: 'household',
			entityId: 'user-1',
			householdId: 'hh-1',
			beforeUrl: 'old',
			afterUrl: 'new',
		});

		expect(mockLogAudit).toHaveBeenCalledWith({
			household_id: 'hh-1',
			user_id: 'user-1',
			action: 'profile_photo_updated',
			entity_type: 'household',
			entity_id: 'user-1',
			changes: {
				actor_role: 'GUARDIAN',
				before_url: 'old',
				after_url: 'new',
			},
		});
	});

	it('swallows audit failures', async () => {
		mockLogAudit.mockRejectedValueOnce(new Error('db down'));
		await expect(
			logPhotoAudit({
				userId: 'user-1',
				action: 'child_photo_updated',
				entityType: 'child',
				entityId: 'child-1',
				beforeUrl: null,
				afterUrl: null,
			})
		).resolves.toBeUndefined();
	});
});
