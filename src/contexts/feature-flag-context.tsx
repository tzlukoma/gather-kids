'use client';

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { getFlag } from '@/lib/featureFlags';

interface FeatureFlags {
	// Environment-based flags (read-only)
	loginMagicEnabled: boolean;
	loginPasswordEnabled: boolean;
	loginGoogleEnabled: boolean;
	registrationDraftPersistenceEnabled: boolean;
}

interface FeatureFlagContextType {
	flags: FeatureFlags;
	loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(
	undefined
);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
	const [flags, setFlags] = useState<FeatureFlags>(() => ({
		loginMagicEnabled: getFlag('LOGIN_MAGIC_ENABLED') as boolean,
		loginPasswordEnabled: getFlag('LOGIN_PASSWORD_ENABLED') as boolean,
		loginGoogleEnabled: getFlag('LOGIN_GOOGLE_ENABLED') as boolean,
		registrationDraftPersistenceEnabled: getFlag(
			'REGISTRATION_DRAFT_PERSISTENCE_ENABLED'
		) as boolean,
	}));
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Flags are all environment-based — just mark loading done
		setLoading(false);
	}, []);

	const value = { flags, loading };

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
