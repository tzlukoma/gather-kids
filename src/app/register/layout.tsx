'use client';

import React from 'react';
import Image from 'next/image';
import { useBranding } from '@/contexts/branding-context';
import { useRouter } from 'next/navigation';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';

export default function RegisterLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { settings } = useBranding();
	const router = useRouter();

	const handleLogoClick = () => {
		router.push('/');
	};

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<header className="p-4 border-b">
				<div className="container mx-auto flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						onClick={handleLogoClick}
						className="flex items-center gap-2 h-auto px-0 hover:opacity-80 hover:bg-transparent transition-opacity cursor-pointer"
						aria-label="Go to home page">
						{settings.logo_url ? (
							<>
								{/* PERF-08: next/image for optimized logo loading */}
								<Image
									src={settings.logo_url}
									alt={`${settings.app_name || 'gatherKids'} Logo`}
									width={200}
									height={64}
									className={`h-16 w-auto ${
										settings.use_logo_only ? '' : 'max-w-[50%]'
									} object-contain`}
									priority
								/>
								{!settings.use_logo_only && (
									<div className="font-headline text-2xl font-bold text-foreground">
										{settings.app_name || 'gatherKids'}
									</div>
								)}
							</>
						) : (
							<div className="font-headline text-2xl font-bold text-foreground">
								{settings.app_name || 'gatherKids'}
							</div>
						)}
					</Button>
				</div>
			</header>
			{/* No gutter here. The wizard screens are full-bleed by design —
			    sticky chrome has to reach the edges of a phone — and they set
			    their own single gutter inside. The legacy page keeps the gutter
			    this used to apply, so nothing about it changes. */}
			<main id="main-content" className="flex flex-1 flex-col">
				{children}
			</main>
			<AppFooter appName={settings.app_name || 'gatherKids'} />
		</div>
	);
}
