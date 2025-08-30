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
            const brandingSettings = await getBrandingSettings();
            if (brandingSettings) {
                setSettings(brandingSettings);
            } else {
                // Use defaults if no custom settings exist
                const defaults = await getDefaultBrandingSettings();
                setSettings(defaults);
            }
        } catch (error) {
            console.error('Failed to load branding settings:', error);
            // Fall back to defaults
            const defaults = await getDefaultBrandingSettings();
            setSettings(defaults);
        } finally {
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