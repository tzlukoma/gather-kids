import { getBrandingSettings, saveBrandingSettings, getDefaultBrandingSettings } from '@/lib/dal';
import { BrandingSettings } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

// In-memory branding settings store for tests
let brandingStore: BrandingSettings[] = [];

// Mock the database factory
jest.mock('@/lib/database/factory', () => {
    const mockAdapter = {
        listBrandingSettings: jest.fn(),
        createBrandingSettings: jest.fn(),
        updateBrandingSettings: jest.fn(),
    };
    return {
        createDatabaseAdapter: jest.fn(() => mockAdapter),
        db: mockAdapter,
    };
});

import { db as mockAdapter } from '@/lib/database/factory';
const mockDb = mockAdapter as any;

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
        jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
        mockUuidv4.mockReturnValue(testSettingId as any);
        brandingStore = [];
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getBrandingSettings', () => {
        it('should return existing settings for orgId', async () => {
            mockDb.listBrandingSettings.mockResolvedValue([existingSettings]);

            const result = await getBrandingSettings(testOrgId);

            expect(mockDb.listBrandingSettings).toHaveBeenCalled();
            expect(result).toEqual(existingSettings);
        });

        it('should return null when no settings found', async () => {
            mockDb.listBrandingSettings.mockResolvedValue([]);

            const result = await getBrandingSettings(testOrgId);

            expect(result).toBeNull();
        });

        it('should use default orgId when not provided', async () => {
            mockDb.listBrandingSettings.mockResolvedValue([]);

            const result = await getBrandingSettings();

            expect(mockDb.listBrandingSettings).toHaveBeenCalled();
        });
    });

    describe('getDefaultBrandingSettings', () => {
        it('should return default settings', async () => {
            const result = await getDefaultBrandingSettings();

            expect(result).toEqual({
                app_name: 'gatherKids',
                description:
                    "The simple, secure, and smart way to manage your children's ministry. " +
                    'Streamline check-ins, track attendance, and keep your community connected.',
                logo_url: undefined,
                youtube_url: undefined,
                instagram_url: undefined,
                use_logo_only: false,
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
            // No existing settings
            mockDb.listBrandingSettings.mockResolvedValue([]);
            mockDb.createBrandingSettings.mockResolvedValue({
                setting_id: testSettingId,
                org_id: testOrgId,
                ...newSettingsData,
            });

            const result = await saveBrandingSettings(testOrgId, newSettingsData);

            expect(mockDb.createBrandingSettings).toHaveBeenCalledWith({
                org_id: testOrgId,
                ...newSettingsData,
            });
            expect(result).toBe(testSettingId);
        });

        it('should update existing settings', async () => {
            // Existing settings found
            mockDb.listBrandingSettings.mockResolvedValue([existingSettings]);
            mockDb.updateBrandingSettings.mockResolvedValue({
                ...existingSettings,
                ...newSettingsData,
                updated_at: mockDate,
            });

            const result = await saveBrandingSettings(testOrgId, newSettingsData);

            expect(mockDb.updateBrandingSettings).toHaveBeenCalledWith(
                testSettingId,
                expect.objectContaining(newSettingsData)
            );
            expect(result).toBe(testSettingId);
        });

        it('should use default orgId when not provided', async () => {
            mockDb.listBrandingSettings.mockResolvedValue([]);
            mockDb.createBrandingSettings.mockResolvedValue({
                setting_id: testSettingId,
                org_id: 'default',
                ...newSettingsData,
            });

            await saveBrandingSettings(undefined, newSettingsData);

            expect(mockDb.createBrandingSettings).toHaveBeenCalledWith({
                org_id: 'default',
                ...newSettingsData,
            });
        });

        it('should handle partial settings updates', async () => {
            mockDb.listBrandingSettings.mockResolvedValue([existingSettings]);
            const partialUpdate = {
                app_name: 'PartiallyUpdated',
            };
            mockDb.updateBrandingSettings.mockResolvedValue({
                ...existingSettings,
                ...partialUpdate,
                updated_at: mockDate,
            });

            const result = await saveBrandingSettings(testOrgId, partialUpdate as any);

            expect(mockDb.updateBrandingSettings).toHaveBeenCalledWith(
                testSettingId,
                expect.objectContaining({ app_name: 'PartiallyUpdated' })
            );
            expect(result).toBe(testSettingId);
        });

        it('should handle database errors gracefully', async () => {
            mockDb.listBrandingSettings.mockRejectedValue(new Error('Database error'));

            await expect(saveBrandingSettings(testOrgId, newSettingsData)).rejects.toThrow(
                'Database error',
            );
        });
    });
});
