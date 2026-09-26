/**
 * @jest-environment node
 */

import { logPhotoAudit } from '@/lib/photo/public-avatars';

const mockLogAudit = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/lib/database/factory', () => ({
	db: {
		logAudit: (...args: unknown[]) => mockLogAudit(...args),
	},
}));

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
