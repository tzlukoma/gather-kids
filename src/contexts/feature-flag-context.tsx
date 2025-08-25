
"use client";

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FeatureFlags {
    showDemoFeatures: boolean;
}

interface FeatureFlagContextType {
    flags: FeatureFlags;
    setFlag: (flag: keyof FeatureFlags, value: boolean) => void;
    loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

const FEATURE_FLAGS_KEY = 'gatherkids-feature-flags';

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
    const [flags, setFlags] = useState<FeatureFlags>({ showDemoFeatures: true });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedFlagsString = localStorage.getItem(FEATURE_FLAGS_KEY);
            if (storedFlagsString) {
                const storedFlags = JSON.parse(storedFlagsString);
                setFlags(prevFlags => ({ ...prevFlags, ...storedFlags }));
            }
        } catch (error) {
            console.error("Failed to parse feature flags from localStorage", error);
            localStorage.removeItem(FEATURE_FLAGS_KEY);
        } finally {
            setLoading(false);
        }
    }, []);

    const setFlag = (flag: keyof FeatureFlags, value: boolean) => {
        const newFlags = { ...flags, [flag]: value };
        setFlags(newFlags);
        localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(newFlags));
    };

    const value = { flags, setFlag, loading };

    return (
        <FeatureFlagContext.Provider value={value}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

export function useFeatureFlags() {
    const context = useContext(FeatureFlagContext);
    if (context === undefined) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }
    return context;
}
