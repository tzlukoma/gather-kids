'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Church, Youtube, Instagram } from 'lucide-react';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useBranding } from '@/contexts/branding-context';
import { AppFooter } from '@/components/app-footer';

export default function Home() {
	const { flags } = useFeatureFlags();
	const { settings, loading } = useBranding();

	// Show skeleton loading state while branding is being fetched
	if (loading) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="p-4 border-b">
					<div className="container mx-auto flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className="h-8 w-32 bg-muted animate-pulse rounded" />
						</div>
						<nav>
							<div className="h-10 w-20 bg-muted animate-pulse rounded" />
						</nav>
					</div>
				</header>
				<main className="flex-1 flex items-center justify-center">
					<div className="container mx-auto text-center px-4 py-16">
						<div className="mx-auto h-16 w-16 bg-muted animate-pulse rounded mb-6" />
						<div className="h-12 w-80 bg-muted animate-pulse rounded mx-auto mb-4" />
						<div className="h-6 w-96 bg-muted animate-pulse rounded mx-auto mb-8" />
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<div className="h-12 w-48 bg-muted animate-pulse rounded" />
						</div>
					</div>
				</main>
				<AppFooter appName={settings.app_name || 'gatherKids'} />
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="p-4 border-b">
				<div className="container mx-auto flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
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
						<Image
							src={settings.logo_url}
							alt={`${settings.app_name || 'gatherKids'} Logo`}
							width={200}
							height={64}
							className={`mx-auto h-16 w-auto ${
								settings.use_logo_only ? '' : 'max-w-[50%]'
							} mb-6 object-contain`}
							priority
						/>
					) : !settings.logo_url ? (
						<Church className="mx-auto h-16 w-16 text-primary mb-6" />
					) : null}
					<h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
						Welcome to {settings.app_name || 'gatherKids'}
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
						{settings.description ||
							'The simple, secure, and smart way to manage your children&apos;s ministry. Streamline check-ins, track attendance, and keep your community connected.'}
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href={flags.loginMagicEnabled ? '/register' : '/create-account'}>
							<Button size="lg">
								Register Your Family
								<ArrowRight className="ml-2" />
							</Button>
						</Link>
					</div>

					{/* Social Media Links */}
					{(settings.youtube_url || settings.instagram_url) && (
						<div className="mt-12 pt-8 border-t">
							<p className="text-sm text-muted-foreground mb-4">
								Connect with us
							</p>
							<div className="flex justify-center gap-4">
								{settings.youtube_url && (
									<a
										href={settings.youtube_url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center w-12 h-12 border border-border rounded-full hover:bg-accent transition-colors">
										<Youtube className="h-6 w-6" />
										<span className="sr-only">YouTube</span>
									</a>
								)}
								{settings.instagram_url && (
									<a
										href={settings.instagram_url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center justify-center w-12 h-12 border border-border rounded-full hover:bg-accent transition-colors">
										<Instagram className="h-6 w-6" />
										<span className="sr-only">Instagram</span>
									</a>
								)}
							</div>
						</div>
					)}
				</div>
			</main>
			<AppFooter appName={settings.app_name || 'gatherKids'} />
		</div>
	);
}
