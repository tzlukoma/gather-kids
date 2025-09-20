import { canUpdateChildPhoto, canUpdateUserAvatar } from '@/lib/permissions';
import { AuthRole, type BaseUser } from '@/lib/auth-types';
import type { Child } from '@/lib/types';

describe('Photo Upload Permissions', () => {
  const mockAdmin: BaseUser = {
    uid: 'admin-123',
    email: 'admin@example.com',
    displayName: 'Admin User',
    metadata: { role: AuthRole.ADMIN, household_id: 'household-1' },
    is_active: true,
  };

  const mockGuardian: BaseUser = {
    uid: 'guardian-123',
    email: 'guardian@example.com',
    displayName: 'Guardian User',
    metadata: { role: AuthRole.GUARDIAN, household_id: 'household-1' },
    is_active: true,
  };

  const mockMinistryLeader: BaseUser = {
    uid: 'leader-123',
    email: 'leader@example.com',
    displayName: 'Ministry Leader',
    metadata: { role: AuthRole.MINISTRY_LEADER },
    is_active: true,
  };

  const mockChild: Child = {
    child_id: 'child-123',
    household_id: 'household-1',
    first_name: 'Test',
    last_name: 'Child',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  const mockOtherChild: Child = {
    child_id: 'child-456',
    household_id: 'household-2',
    first_name: 'Other',
    last_name: 'Child',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  describe('canUpdateChildPhoto', () => {
    it('returns false for null user', () => {
      expect(canUpdateChildPhoto(null, mockChild)).toBe(false);
    });

    it('allows admin to update any child photo', () => {
      expect(canUpdateChildPhoto(mockAdmin, mockChild)).toBe(true);
      expect(canUpdateChildPhoto(mockAdmin, mockOtherChild)).toBe(true);
    });

    it('allows guardian to update their own household children', () => {
      expect(canUpdateChildPhoto(mockGuardian, mockChild)).toBe(true);
    });

    it('prevents guardian from updating other household children', () => {
      expect(canUpdateChildPhoto(mockGuardian, mockOtherChild)).toBe(false);
    });

    it('prevents guardian without household_id from updating any child', () => {
      const guardianWithoutHousehold = {
        ...mockGuardian,
        metadata: { role: AuthRole.GUARDIAN },
      };
      expect(canUpdateChildPhoto(guardianWithoutHousehold, mockChild)).toBe(false);
    });

    it('prevents ministry leader from updating child photos', () => {
      expect(canUpdateChildPhoto(mockMinistryLeader, mockChild)).toBe(false);
    });

    it('prevents volunteer from updating child photos', () => {
      const volunteer: BaseUser = {
        ...mockGuardian,
        metadata: { role: AuthRole.VOLUNTEER },
      };
      expect(canUpdateChildPhoto(volunteer, mockChild)).toBe(false);
    });

    it('prevents guest from updating child photos', () => {
      const guest: BaseUser = {
        ...mockGuardian,
        metadata: { role: AuthRole.GUEST },
      };
      expect(canUpdateChildPhoto(guest, mockChild)).toBe(false);
    });
  });

  describe('canUpdateUserAvatar', () => {
    it('returns false for null user', () => {
      expect(canUpdateUserAvatar(null)).toBe(false);
    });

    it('allows any logged-in user to update their avatar', () => {
      expect(canUpdateUserAvatar(mockAdmin)).toBe(true);
      expect(canUpdateUserAvatar(mockGuardian)).toBe(true);
      expect(canUpdateUserAvatar(mockMinistryLeader)).toBe(true);
    });

    it('allows volunteers and guests to update their avatar', () => {
      const volunteer: BaseUser = {
        ...mockGuardian,
        metadata: { role: AuthRole.VOLUNTEER },
      };
      const guest: BaseUser = {
        ...mockGuardian,
        metadata: { role: AuthRole.GUEST },
      };

      expect(canUpdateUserAvatar(volunteer)).toBe(true);
      expect(canUpdateUserAvatar(guest)).toBe(true);
    });
  });
});