'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Church, Settings, Youtube, Instagram } from 'lucide-react';
import { SimpleSeedButton } from '@/components/gatherKids/simple-seed-button';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useBranding } from '@/contexts/branding-context';
import { useState } from 'react';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';

export default function Home() {
	const { flags } = useFeatureFlags();
	const { settings } = useBranding();
	const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);

	return (
		<div className="flex flex-col min-h-screen">
			<header className="p-4 border-b">
				<div className="container mx-auto flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						{settings.logo_url ? (
							<>
								<img
									src={settings.logo_url}
									alt={`${settings.app_name || 'gatherKids'} Logo`}
									className={
										`h-24 w-auto ${settings.use_logo_only ? '' : 'max-w-[50%]'} object-contain`
									}
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
					<nav>
						<Link href="/login">
							<Button variant="outline">Sign In</Button>
						</Link>
					</nav>
				</div>
			</header>
			<main className="flex-1 flex items-center justify-center">
				<div className="container mx-auto text-center px-4 py-16">
					{settings.logo_url && !settings.use_logo_only ? (
						<img
							src={settings.logo_url}
							alt={`${settings.app_name || 'gatherKids'} Logo`}
							className={
								`mx-auto h-24 w-auto ${settings.use_logo_only ? '' : 'max-w-[50%]'} mb-6 object-contain`
							}
						/>
					) : !settings.logo_url ? (
						<Church className="mx-auto h-16 w-16 text-primary mb-6" />
					) : null}
					<h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
						Welcome to {settings.app_name || 'gatherKids'}
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
						{settings.description || 
							"The simple, secure, and smart way to manage your children&apos;s ministry. Streamline check-ins, track attendance, and keep your community connected."
						}
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link href={flags.loginMagicEnabled ? "/register" : "/create-account"}>
							<Button size="lg">
								Register Your Family
								<ArrowRight className="ml-2" />
							</Button>
						</Link>
						<Link href="/dashboard">
							<Button size="lg" variant="secondary">
								Go to Admin Dashboard
							</Button>
						</Link>
						{flags.showDemoFeatures && (
							<SimpleSeedButton size="lg" variant="outline" />
						)}
					</div>
					
					{/* Social Media Links */}
					{(settings.youtube_url || settings.instagram_url) && (
						<div className="mt-12 pt-8 border-t">
							<p className="text-sm text-muted-foreground mb-4">Connect with us</p>
							<div className="flex justify-center gap-4">
								{settings.youtube_url && (
									<a
										href={settings.youtube_url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center w-12 h-12 border border-border rounded-full hover:bg-accent transition-colors"
									>
										<Youtube className="h-6 w-6" />
										<span className="sr-only">YouTube</span>
									</a>
								)}
								{settings.instagram_url && (
									<a
										href={settings.instagram_url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center w-12 h-12 border border-border rounded-full hover:bg-accent transition-colors"
									>
										<Instagram className="h-6 w-6" />
										<span className="sr-only">Instagram</span>
									</a>
								)}
							</div>
						</div>
					)}
				</div>
			</main>
			<footer className="py-6 border-t">
				<div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} {settings.app_name || 'gatherKids'}. All rights reserved.
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
