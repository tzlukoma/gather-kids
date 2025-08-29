import { getBrandingSettings, saveBrandingSettings, getDefaultBrandingSettings } from '@/lib/dal';
import { BrandingSettings } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Mock the database module
jest.mock('@/lib/db', () => {
    const mockDb = {
        branding_settings: {
            where: jest.fn(),
            add: jest.fn(),
            update: jest.fn(),
        },
    };
    return { db: mockDb };
});

// Mock uuidv4
jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

import { db } from '@/lib/db';

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;
const mockDb = db as any;

describe('Branding DAL Functions', () => {
    const testOrgId = 'test-org';
    const testSettingId = 'test-setting-id';
    const mockDate = '2025-01-01T00:00:00.000Z';

    const existingSettings: BrandingSettings = {
        setting_id: testSettingId,
        org_id: testOrgId,
        app_name: 'ExistingApp',
        description: 'Existing description',
        logo_url: 'existing-logo.png',
        youtube_url: 'https://youtube.com/@existing',
        instagram_url: 'https://instagram.com/existing',
        created_at: mockDate,
        updated_at: mockDate,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock Date.now() to return consistent timestamp
        jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
        mockUuidv4.mockReturnValue(testSettingId);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getBrandingSettings', () => {
        it('should return existing settings for orgId', async () => {
            const mockFirst = jest.fn().mockResolvedValue(existingSettings);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });

            const result = await getBrandingSettings(testOrgId);

            expect(mockDb.branding_settings.where).toHaveBeenCalledWith({ org_id: testOrgId });
            expect(result).toEqual(existingSettings);
        });

        it('should return null when no settings found', async () => {
            const mockFirst = jest.fn().mockResolvedValue(undefined);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });

            const result = await getBrandingSettings(testOrgId);

            expect(result).toBeNull();
        });

        it('should use default orgId when not provided', async () => {
            const mockFirst = jest.fn().mockResolvedValue(null);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });

            await getBrandingSettings();

            expect(mockDb.branding_settings.where).toHaveBeenCalledWith({ org_id: 'default' });
        });
    });

    describe('getDefaultBrandingSettings', () => {
        it('should return default settings', async () => {
            const result = await getDefaultBrandingSettings();

            expect(result).toEqual({
                app_name: 'gatherKids',
                description: "The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
                logo_url: undefined,
                youtube_url: undefined,
                instagram_url: undefined,
            });
        });
    });

    describe('saveBrandingSettings', () => {
        const newSettingsData = {
            app_name: 'NewApp',
            description: 'New description',
            logo_url: 'new-logo.png',
            youtube_url: 'https://youtube.com/@new',
            instagram_url: 'https://instagram.com/new',
        };

        it('should create new settings when none exist', async () => {
            // Mock getBrandingSettings to return null (no existing settings)
            const mockFirst = jest.fn().mockResolvedValue(null);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });
            mockDb.branding_settings.add.mockResolvedValue(testSettingId);

            const result = await saveBrandingSettings(testOrgId, newSettingsData);

            expect(mockDb.branding_settings.add).toHaveBeenCalledWith({
                setting_id: testSettingId,
                org_id: testOrgId,
                ...newSettingsData,
                created_at: mockDate,
                updated_at: mockDate,
            });
            expect(result).toBe(testSettingId);
        });

        it('should update existing settings', async () => {
            // Mock getBrandingSettings to return existing settings
            const mockFirst = jest.fn().mockResolvedValue(existingSettings);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });
            mockDb.branding_settings.update.mockResolvedValue(1);

            const result = await saveBrandingSettings(testOrgId, newSettingsData);

            expect(mockDb.branding_settings.update).toHaveBeenCalledWith(testSettingId, {
                ...newSettingsData,
                updated_at: mockDate,
            });
            expect(result).toBe(testSettingId);
        });

        it('should use default orgId when not provided', async () => {
            const mockFirst = jest.fn().mockResolvedValue(null);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });
            mockDb.branding_settings.add.mockResolvedValue(testSettingId);

            await saveBrandingSettings(undefined, newSettingsData);

            expect(mockDb.branding_settings.add).toHaveBeenCalledWith({
                setting_id: testSettingId,
                org_id: 'default',
                ...newSettingsData,
                created_at: mockDate,
                updated_at: mockDate,
            });
        });

        it('should handle partial settings updates', async () => {
            const mockFirst = jest.fn().mockResolvedValue(existingSettings);
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });
            mockDb.branding_settings.update.mockResolvedValue(1);

            const partialUpdate = {
                app_name: 'PartiallyUpdated',
            };

            const result = await saveBrandingSettings(testOrgId, partialUpdate);

            expect(mockDb.branding_settings.update).toHaveBeenCalledWith(testSettingId, {
                app_name: 'PartiallyUpdated',
                updated_at: mockDate,
            });
            expect(result).toBe(testSettingId);
        });

        it('should handle database errors gracefully', async () => {
            const mockFirst = jest.fn().mockRejectedValue(new Error('Database error'));
            mockDb.branding_settings.where.mockReturnValue({ first: mockFirst });

            await expect(saveBrandingSettings(testOrgId, newSettingsData)).rejects.toThrow('Database error');
        });
    });
});