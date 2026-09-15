'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
	Calendar,
	Church,
	Clock,
	LogIn,
	Phone,
	ShieldCheck,
	UserPlus,
	Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Youtube, Instagram } from '@/components/icons/brand';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useBranding } from '@/contexts/branding-context';
import { AppFooter } from '@/components/app-footer';

export interface HomeViewProps {
	/** Display name of the active registration cycle, e.g. "Fall 2026". */
	cycleName?: string | null;
}

/** Everything both paths ask a family to have on hand before they start. */
const HAVE_READY = [
	{ icon: Calendar, lead: 'Birth date and grade', rest: 'for each child' },
	{ icon: Users, lead: 'A phone and email', rest: 'for every guardian' },
	{
		icon: Phone,
		lead: 'One emergency contact',
		rest: 'outside your household',
	},
	{
		icon: ShieldCheck,
		lead: 'Allergies and medical notes',
		rest: 'if any apply',
	},
] as const;

/** One numbered step inside a path card. */
function Step({
	number,
	tone,
	children,
}: {
	number: number;
	tone: 'new' | 'returning';
	children: React.ReactNode;
}) {
	return (
		<li className="flex items-start gap-3">
			<span
				className={`flex h-[23px] w-[23px] flex-none items-center justify-center rounded-full text-xs font-bold ${
					tone === 'new'
						? 'bg-primary text-primary-foreground'
						: 'bg-brand-gold text-white dark:text-brand-ground'
				}`}
				aria-hidden="true">
				{number}
			</span>
			<span className="text-[15px] leading-[21px] text-foreground/80">
				{children}
			</span>
		</li>
	);
}

function HomeHeaderBrand() {
	const { settings } = useBranding();
	const appName = settings.app_name || 'gatherKids';

	if (settings.logo_url) {
		return (
			<>
				{/* PERF-08: next/image for optimized logo loading */}
				<Image
					src={settings.logo_url}
					alt={`${appName} Logo`}
					width={200}
					height={64}
					className={`h-12 w-auto object-contain ${
						settings.use_logo_only ? '' : 'max-w-[45%]'
					}`}
					priority
				/>
				{!settings.use_logo_only && (
					<span className="font-headline text-xl font-bold tracking-tight text-foreground sm:text-[21px]">
						{appName}
					</span>
				)}
			</>
		);
	}

	return (
		<>
			<Church className="h-7 w-7 text-primary" aria-hidden="true" />
			<span className="font-headline text-xl font-bold tracking-tight text-foreground sm:text-[21px]">
				{appName}
			</span>
		</>
	);
}

/**
 * Public home page — the registration fork.
 *
 * Replaces the single "Register Your Family" button with the question the page
 * should actually ask: did you register online last year? Each answer carries
 * its own path, its own CTA, and its own destination. What the two paths share
 * — what to have ready — is stated once, below the fork.
 */
export function HomeView({ cycleName }: HomeViewProps) {
	const { flags } = useFeatureFlags();
	// Deliberately not gated on `loading`: BrandingProvider reports loading=false
	// during SSR and true on the client's first render, so branching on it here
	// would guarantee a hydration mismatch. Every read below falls back to the
	// same defaults the server rendered, and real branding swaps in once loaded.
	const { settings } = useBranding();

	const appName = settings.app_name || 'gatherKids';

	// Magic-link-only deployments have no password step: the family enters an
	// email on /register and we mail them a link instead.
	const passwordSignup = flags.loginPasswordEnabled;
	const newFamilyHref = passwordSignup ? '/create-account' : '/register';
	const newFamilyCta = passwordSignup ? 'Create an account' : 'Get started';
	// Plain /login on purpose: resolveGuardianPostLoginRoute already sends a
	// guardian who has not registered for the active cycle to /register with
	// last year's answers prefilled, which is exactly what this card promises.
	const returningHref = '/login';

	return (
		<div className="flex min-h-screen flex-col">
			<header className="border-b bg-card">
				<div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
					<div className="flex items-center gap-2.5">
						<HomeHeaderBrand />
					</div>
					<div className="flex items-center gap-5">
						<span className="hidden text-sm font-medium text-muted-foreground sm:inline">
							Already have an account?
						</span>
						<Button variant="outline" asChild>
							<Link href="/login">Sign in</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				<div className="container mx-auto px-4 pb-4 pt-8 text-center sm:px-6 sm:pt-11">
					{cycleName && (
						<div className="inline-flex items-center gap-2 rounded-full bg-brand-gold-soft px-3.5 py-1.5">
							<Clock
								className="h-[15px] w-[15px] text-brand-gold"
								aria-hidden="true"
							/>
							<span className="text-[12.5px] font-semibold text-brand-gold">
								{/* The h1 already carries the cycle name, so the narrow pill drops it. */}
								<span className="sm:hidden">Registration is open</span>
								<span className="hidden sm:inline">
									{cycleName} registration is open
								</span>
							</span>
						</div>
					)}
					<h1 className="mt-4 font-headline text-[27px] font-bold leading-8 tracking-[-0.025em] sm:text-[40px] sm:leading-[46px]">
						{cycleName
							? `Register your children for ${cycleName}`
							: 'Register your children'}
					</h1>
					<p className="mx-auto mt-2.5 max-w-[600px] text-pretty text-[15px] leading-[22px] text-muted-foreground sm:text-[17px] sm:leading-[26px]">
						<span className="sm:hidden">
							One form covers every child and every ministry, for the whole
							year. About ten minutes.
						</span>
						<span className="hidden sm:inline">
							One form covers every child in your household and every ministry
							they join, for the whole year. It takes about ten minutes.
						</span>
					</p>
				</div>

				<div className="container mx-auto grid items-start gap-3 px-4 pt-4 sm:gap-[22px] sm:px-6 sm:pt-6 md:grid-cols-2">
					<section className="rounded-xl border bg-card p-[18px] shadow-sm sm:p-[26px] sm:pt-6">
						<div className="flex items-center gap-2.5 sm:gap-[11px]">
							<span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/10 sm:h-[38px] sm:w-[38px] sm:rounded-[9px]">
								<UserPlus
									className="h-[17px] w-[17px] text-primary sm:h-5 sm:w-5"
									aria-hidden="true"
								/>
							</span>
							<div>
								<h2 className="font-headline text-[17.5px] font-bold leading-[22px] sm:text-[21px] sm:leading-[26px]">
									First time registering online
								</h2>
								<p className="hidden text-sm leading-5 text-muted-foreground sm:block">
									You did not register online last year.
								</p>
							</div>
						</div>

						{/* Mobile collapses the three steps to a single sentence (frame 4b). */}
						<p className="mt-3 text-[14.5px] leading-[21px] text-foreground/80 sm:hidden">
							{passwordSignup
								? 'Create an account, confirm the email we send, then fill the form.'
								: 'Enter your email, open the link we send, then fill the form.'}
						</p>

						<ol className="mt-5 hidden flex-col gap-3.5 sm:flex">
							<Step number={1} tone="new">
								<strong className="font-semibold text-foreground">
									{passwordSignup
										? 'Create an account'
										: 'Enter your email address'}
								</strong>
								{passwordSignup
									? ' with your email and a password.'
									: ' to start — no password needed.'}
							</Step>
							<Step number={2} tone="new">
								<strong className="font-semibold text-foreground">
									Click the link we email you
								</strong>{' '}
								to confirm the address.
							</Step>
							<Step number={3} tone="new">
								<strong className="font-semibold text-foreground">
									Fill the registration form
								</strong>{' '}
								— household, guardians, each child, ministries, consents.
							</Step>
						</ol>

						<Button
							size="lg"
							className="mt-4 h-auto w-full py-4 text-base font-bold sm:mt-[22px]"
							asChild>
							<Link href={newFamilyHref}>{newFamilyCta}</Link>
						</Button>
						<p className="mt-2.5 hidden text-center text-[13px] leading-[18px] text-muted-foreground sm:block">
							Takes about a minute before the form starts.
						</p>
					</section>

					<section className="rounded-xl border bg-card p-[18px] shadow-sm sm:p-[26px] sm:pt-6">
						<div className="flex items-center gap-2.5 sm:gap-[11px]">
							<span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted sm:h-[38px] sm:w-[38px] sm:rounded-[9px]">
								<LogIn
									className="h-[17px] w-[17px] text-brand-gold sm:h-5 sm:w-5"
									aria-hidden="true"
								/>
							</span>
							<div>
								<h2 className="font-headline text-[17.5px] font-bold leading-[22px] sm:text-[21px] sm:leading-[26px]">
									<span className="sm:hidden">Registered online last year</span>
									<span className="hidden sm:inline">Returning family</span>
								</h2>
								<p className="hidden text-sm leading-5 text-muted-foreground sm:block">
									You registered online last year.
								</p>
							</div>
						</div>

						<p className="mt-3 text-[14.5px] leading-[21px] text-foreground/80 sm:hidden">
							Sign in and last year&apos;s answers come back filled in. Check
							them, add ministries, submit.
						</p>

						<ol className="mt-5 hidden flex-col gap-3.5 sm:flex">
							<Step number={1} tone="returning">
								<strong className="font-semibold text-foreground">
									Sign in
								</strong>{' '}
								with the email you used last year.
							</Step>
							<Step number={2} tone="returning">
								<strong className="font-semibold text-foreground">
									Check what we already have
								</strong>{' '}
								— last year&apos;s answers are filled in, and each child&apos;s
								grade has moved up.
							</Step>
							<Step number={3} tone="returning">
								<strong className="font-semibold text-foreground">
									Add this year&apos;s ministries and submit.
								</strong>
							</Step>
						</ol>

						<Button
							size="lg"
							className="mt-4 h-auto w-full bg-foreground py-4 text-base font-bold text-background hover:bg-foreground/90 sm:mt-[22px]"
							asChild>
							<Link href={returningHref}>Sign in and review</Link>
						</Button>
						<p className="mt-2.5 hidden text-center text-[13px] leading-[18px] text-muted-foreground sm:block">
							Most families finish in two or three minutes.
						</p>
					</section>
				</div>

				<div className="container mx-auto px-4 pt-4 sm:px-6 sm:pt-6">
					<section className="rounded-xl border bg-muted/40 p-4 sm:bg-card sm:p-[26px] sm:py-[22px]">
						<h2 className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
							<span className="sm:hidden">Have ready</span>
							<span className="hidden sm:inline">
								Have these ready — both paths ask for them
							</span>
						</h2>
						{/* Mobile runs the same four items together as one sentence (4b). */}
						<p className="mt-2 text-sm leading-[21px] text-foreground/80 sm:hidden">
							Each child&apos;s birth date and grade, a phone and email for every
							guardian, one emergency contact, and any allergies.
						</p>
						<ul className="mt-4 hidden gap-[18px] sm:grid sm:grid-cols-2 lg:grid-cols-4">
							{HAVE_READY.map(({ icon: Icon, lead, rest }) => (
								<li key={lead} className="flex items-start gap-[11px]">
									<Icon
										className="mt-px h-[19px] w-[19px] flex-none text-primary"
										aria-hidden="true"
									/>
									<span className="text-[14.5px] leading-5 text-foreground/80">
										<strong className="font-semibold text-foreground">
											{lead}
										</strong>{' '}
										{rest}
									</span>
								</li>
							))}
						</ul>
					</section>
				</div>

				{(settings.youtube_url || settings.instagram_url) && (
					<div className="container mx-auto px-4 pb-2 pt-10 text-center sm:px-6">
						<p className="mb-4 text-sm text-muted-foreground">
							Connect with us
						</p>
						<div className="flex justify-center gap-4">
							{settings.youtube_url && (
								<a
									href={settings.youtube_url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex h-12 w-12 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent">
									<Youtube className="h-6 w-6" />
									<span className="sr-only">YouTube</span>
								</a>
							)}
							{settings.instagram_url && (
								<a
									href={settings.instagram_url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex h-12 w-12 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent">
									<Instagram className="h-6 w-6" />
									<span className="sr-only">Instagram</span>
								</a>
							)}
						</div>
					</div>
				)}

				<div className="h-8" />
			</main>

			<AppFooter appName={appName} />
		</div>
	);
}

export default HomeView;
