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

			// Add timeout to prevent hanging in UAT
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() => reject(new Error('Branding settings load timeout')),
					5000
				);
			});

			const brandingSettingsPromise = getBrandingSettings();
			const brandingSettings = (await Promise.race([
				brandingSettingsPromise,
				timeoutPromise,
			])) as any;

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
			console.error('Error details:', {
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : undefined,
			});
			// Fall back to defaults
			console.log('BrandingProvider: Error occurred, falling back to defaults');
			try {
				const defaults = await getDefaultBrandingSettings();
				console.log('BrandingProvider: Got fallback defaults:', defaults);
				setSettings(defaults);
			} catch (fallbackError) {
				console.error(
					'Failed to load default branding settings:',
					fallbackError
				);
				// Use hardcoded fallback
				setSettings({
					app_name: 'gatherKids',
					description:
						"The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
					logo_url: undefined,
					use_logo_only: false,
					youtube_url: undefined,
					instagram_url: undefined,
				});
			}
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
		// Only load settings on the client side to avoid SSR issues
		if (typeof window === 'undefined') {
			// During SSR, use hardcoded defaults immediately
			setSettings({
				app_name: 'gatherKids',
				description:
					"The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
				logo_url: undefined,
				use_logo_only: false,
				youtube_url: undefined,
				instagram_url: undefined,
			});
			setLoading(false);
			return;
		}
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
