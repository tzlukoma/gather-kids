'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useBranding } from '@/contexts/branding-context';

export default function RegisterLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
	const { flags } = useFeatureFlags();
	const { settings } = useBranding();

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<header className="p-4 border-b">
				<div className="container mx-auto flex items-center gap-2">
					<div className="flex items-center gap-2">
						{settings.logo_url ? (
							<>
								<img
									src={settings.logo_url}
									alt={`${settings.app_name || 'gatherKids'} Logo`}
									className={`h-16 w-auto ${
										settings.use_logo_only ? '' : 'max-w-[50%]'
									} object-contain`}
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
					</div>
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
					{flags.showDemoFeatures && (
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsFlagDialogOpen(true)}>
							<Settings className="h-4 w-4" />
							<span className="sr-only">Open Feature Flags</span>
						</Button>
					)}
				</div>
			</footer>
			{flags.showDemoFeatures && (
				<FeatureFlagDialog
					isOpen={isFlagDialogOpen}
					onClose={() => setIsFlagDialogOpen(false)}
				/>
			)}
		</div>
	);
}
