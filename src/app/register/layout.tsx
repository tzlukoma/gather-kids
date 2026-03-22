'use client';

import React from 'react';
import Image from 'next/image';
import { useBranding } from '@/contexts/branding-context';
import { useRouter } from 'next/navigation';

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
					<button
						onClick={handleLogoClick}
						className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
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
					</button>
				</div>
			</header>
			<main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
				{children}
			</main>
			<footer className="py-6 border-t mt-auto">
				<div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} gatherKids. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
