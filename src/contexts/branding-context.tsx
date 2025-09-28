'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandingSettings } from '@/lib/types';
import { getBrandingSettings, getDefaultBrandingSettings } from '@/lib/dal';

interface BrandingContextType {
    settings: Partial<BrandingSettings>;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Partial<BrandingSettings>>({});
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        try {
            console.log('BrandingProvider: Loading branding settings...');
            const brandingSettings = await getBrandingSettings();
            console.log('BrandingProvider: Got branding settings:', brandingSettings);
            if (brandingSettings) {
                setSettings(brandingSettings);
            } else {
                // Use defaults if no custom settings exist
                console.log('BrandingProvider: No custom settings, using defaults');
                const defaults = await getDefaultBrandingSettings();
                console.log('BrandingProvider: Got default settings:', defaults);
                setSettings(defaults);
            }
        } catch (error) {
            console.error('Failed to load branding settings:', error);
            // Fall back to defaults
            console.log('BrandingProvider: Error occurred, falling back to defaults');
            const defaults = await getDefaultBrandingSettings();
            console.log('BrandingProvider: Got fallback defaults:', defaults);
            setSettings(defaults);
        } finally {
            console.log('BrandingProvider: Setting loading to false');
            setLoading(false);
        }
    };

    const refreshSettings = async () => {
        setLoading(true);
        await loadSettings();
    };

    useEffect(() => {
        loadSettings();
    }, []);

    return (
        <BrandingContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    const context = useContext(BrandingContext);
    if (!context) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
}