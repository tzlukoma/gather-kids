import { act, renderHook, waitFor } from '@testing-library/react';
import { BrandingProvider, useBranding } from '@/contexts/branding-context';
import { getBrandingSettings, getDefaultBrandingSettings } from '@/lib/dal';
import { ReactNode } from 'react';
import { BrandingSettings } from '@/lib/types';

// Mock the DAL functions
jest.mock('@/lib/dal', () => ({
    getBrandingSettings: jest.fn(),
    getDefaultBrandingSettings: jest.fn(),
}));

const mockGetBrandingSettings = getBrandingSettings as jest.MockedFunction<typeof getBrandingSettings>;
const mockGetDefaultBrandingSettings = getDefaultBrandingSettings as jest.MockedFunction<typeof getDefaultBrandingSettings>;

describe('BrandingContext', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <BrandingProvider>{children}</BrandingProvider>
    );

    const defaultSettings = {
        app_name: 'gatherKids',
        description: "The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
        logo_url: undefined,
        youtube_url: undefined,
        instagram_url: undefined,
    };

    const customSettings: BrandingSettings = {
        setting_id: 'test-id',
        org_id: 'default',
        app_name: 'MyCustomApp',
        description: 'Custom description',
        logo_url: 'data:image/png;base64,test',
        youtube_url: 'https://youtube.com/@mychurch',
        instagram_url: 'https://instagram.com/mychurch',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetDefaultBrandingSettings.mockResolvedValue(defaultSettings);
    });

    it('should throw error when useBranding is used outside provider', () => {
        // Suppress console errors for this test since we expect an error
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        expect(() => {
            renderHook(() => useBranding());
        }).toThrow('useBranding must be used within a BrandingProvider');
        
        consoleSpy.mockRestore();
    });

    it('should provide loading state initially', async () => {
        mockGetBrandingSettings.mockResolvedValue(null);

        const { result } = renderHook(() => useBranding(), { wrapper });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it('should load custom branding settings when available', async () => {
        mockGetBrandingSettings.mockResolvedValue(customSettings);

        const { result } = renderHook(() => useBranding(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.settings).toEqual(customSettings);
        expect(mockGetBrandingSettings).toHaveBeenCalledTimes(1);
        expect(mockGetDefaultBrandingSettings).not.toHaveBeenCalled();
    });

    it('should fall back to default settings when no custom settings exist', async () => {
        mockGetBrandingSettings.mockResolvedValue(null);

        const { result } = renderHook(() => useBranding(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.settings).toEqual(defaultSettings);
        expect(mockGetBrandingSettings).toHaveBeenCalledTimes(1);
        expect(mockGetDefaultBrandingSettings).toHaveBeenCalledTimes(1);
    });

    it('should fall back to defaults when getBrandingSettings throws error', async () => {
        mockGetBrandingSettings.mockRejectedValue(new Error('Database error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useBranding(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.settings).toEqual(defaultSettings);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load branding settings:', expect.any(Error));
        expect(mockGetDefaultBrandingSettings).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
    });

    it('should refresh settings when refreshSettings is called', async () => {
        mockGetBrandingSettings.mockResolvedValue(null);

        const { result } = renderHook(() => useBranding(), { wrapper });

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.settings).toEqual(defaultSettings);

        // Mock updated settings for refresh
        mockGetBrandingSettings.mockResolvedValue(customSettings);

        // Call refresh
        await act(async () => {
            await result.current.refreshSettings();
        });

        expect(result.current.settings).toEqual(customSettings);
        expect(mockGetBrandingSettings).toHaveBeenCalledTimes(2);
    });

    it('should show loading state during refresh', async () => {
        mockGetBrandingSettings.mockResolvedValue(null);

        const { result } = renderHook(() => useBranding(), { wrapper });

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Mock slow refresh
        mockGetBrandingSettings.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(customSettings), 100)));

        // Call refresh and check loading state
        act(() => {
            result.current.refreshSettings();
        });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.settings).toEqual(customSettings);
    });
});