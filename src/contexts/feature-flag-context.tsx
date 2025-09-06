'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { getFlag, isDemo } from '@/lib/featureFlags';

interface FeatureFlags {
	showDemoFeatures: boolean;
	// Environment-based flags (read-only)
	loginMagicEnabled: boolean;
	loginPasswordEnabled: boolean;
	loginGoogleEnabled: boolean;
	isDemoMode: boolean;
}

interface FeatureFlagContextType {
	flags: FeatureFlags;
	setFlag: (flag: keyof FeatureFlags, value: boolean) => void;
	loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(
	undefined
);

const FEATURE_FLAGS_KEY = 'gatherkids-feature-flags';

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
	// Get initial showDemoFeatures value from environment variable
	const envShowDemoFeatures = getFlag("SHOW_DEMO_FEATURES") as boolean;
	
	const [flags, setFlags] = useState<FeatureFlags>({ 
		showDemoFeatures: envShowDemoFeatures,
		loginMagicEnabled: getFlag("LOGIN_MAGIC_ENABLED") as boolean,
		loginPasswordEnabled: getFlag("LOGIN_PASSWORD_ENABLED") as boolean,
		loginGoogleEnabled: getFlag("LOGIN_GOOGLE_ENABLED") as boolean,
		isDemoMode: isDemo(),
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		try {
			// If environment variable explicitly disables demo features, don't allow localStorage override
			if (process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "false") {
				setFlags((prevFlags) => ({ 
					...prevFlags, 
					showDemoFeatures: false,
				}));
			} else {
				// Only check localStorage if environment variable allows demo features
				const storedFlagsString = localStorage.getItem(FEATURE_FLAGS_KEY);
				if (storedFlagsString) {
					const storedFlags = JSON.parse(storedFlagsString);
					// Only apply stored flags to localStorage-managed flags, not environment flags
					setFlags((prevFlags) => ({ 
						...prevFlags, 
						showDemoFeatures: storedFlags.showDemoFeatures ?? prevFlags.showDemoFeatures,
					}));
				}
			}
		} catch (error) {
			console.error('Failed to parse feature flags from localStorage', error);
			localStorage.removeItem(FEATURE_FLAGS_KEY);
		} finally {
			setLoading(false);
		}
	}, []);

	const setFlag = (flag: keyof FeatureFlags, value: boolean) => {
		// Only allow setting localStorage-managed flags
		if (flag === 'showDemoFeatures') {
			// Don't allow enabling demo features if environment variable explicitly disables them
			if (process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "false" && value === true) {
				console.warn('Demo features are disabled by environment variable and cannot be enabled at runtime');
				return;
			}
			
			const newFlags = { ...flags, [flag]: value };
			setFlags(newFlags);
			// Only store the localStorage-managed flags
			localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify({ showDemoFeatures: value }));
		} else {
			console.warn(`Flag ${flag} is environment-controlled and cannot be changed at runtime`);
		}
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
		throw new Error(
			'useFeatureFlags must be used within a FeatureFlagProvider'
		);
	}
	return context;
}
