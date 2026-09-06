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
	const [settings, setSettings] = useState<Partial<BrandingSettings>>(() => {
		// During SSR, use hardcoded defaults immediately
		if (typeof window === 'undefined') {
			return {
				app_name: 'gatherKids',
				description:
					"The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
				logo_url: undefined,
				use_logo_only: false,
				youtube_url: undefined,
				instagram_url: undefined,
			};
		}
		return {};
	});
	const [loading, setLoading] = useState(() => typeof window !== 'undefined');

	const loadSettings = async () => {
		try {
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
			])) as Partial<BrandingSettings> | null;

			if (brandingSettings) {
				setSettings(brandingSettings);
			} else {
				const defaults = await getDefaultBrandingSettings();
				setSettings(defaults);
			}
		} catch (error) {
			console.error('Failed to load branding settings:', error);
			try {
				const defaults = await getDefaultBrandingSettings();
				setSettings(defaults);
			} catch (fallbackError) {
				console.error(
					'Failed to load default branding settings:',
					fallbackError
				);
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
			setLoading(false);
		}
	};

	const refreshSettings = async () => {
		setLoading(true);
		await loadSettings();
	};

	useEffect(() => {
		let cancelled = false;

		async function run() {
			try {
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(
						() => reject(new Error('Branding settings load timeout')),
						5000
					);
				});

				const brandingSettings = (await Promise.race([
					getBrandingSettings(),
					timeoutPromise,
				])) as Partial<BrandingSettings> | null;

				if (cancelled) return;

				if (brandingSettings) {
					setSettings(brandingSettings);
				} else {
					const defaults = await getDefaultBrandingSettings();
					if (!cancelled) setSettings(defaults);
				}
			} catch (error) {
				console.error('Failed to load branding settings:', error);
				try {
					const defaults = await getDefaultBrandingSettings();
					if (!cancelled) setSettings(defaults);
				} catch (fallbackError) {
					console.error(
						'Failed to load default branding settings:',
						fallbackError
					);
					if (!cancelled) {
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
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void run();
		return () => {
			cancelled = true;
		};
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
