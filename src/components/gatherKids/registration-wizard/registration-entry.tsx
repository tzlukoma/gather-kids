'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getRegistrationCycles, getHouseholdForUser, getHouseholdProfile } from '@/lib/dal';
import { pickActiveRegistrationCycle } from '@/lib/dal/registration-cycle-utils';
import { Home, Users, Info } from 'lucide-react';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import Link from 'next/link';
import type { RegistrationFormInput } from './registration-schema';

const REGISTER_NEXT_PATH = '/register';
const LOGIN_WITH_NEXT = `/login?next=${encodeURIComponent(REGISTER_NEXT_PATH)}`;
const CREATE_ACCOUNT_WITH_NEXT = `/create-account?next=${encodeURIComponent(REGISTER_NEXT_PATH)}`;

type OfflineAuthStep = 'enter_email' | 'email_sent';

/**
 * First-time auth gate for offline/dummy Supabase e2e runs.
 * Uses magic link only — no household lookup by email.
 */
export function RegistrationOfflineAuth() {
	const router = useRouter();
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const [step, setStep] = useState<OfflineAuthStep>('enter_email');
	const [email, setEmail] = useState('');

	const handleContinue = useCallback(async () => {
		const trimmed = email.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
			toast({
				title: 'Invalid email',
				description: 'Please enter a valid email address.',
				variant: 'destructive',
			});
			return;
		}

		if (flags.loginMagicEnabled) {
			try {
				const response = await fetch('/api/auth/magic-link', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: trimmed }),
				});

				if (response.ok) {
					setStep('email_sent');
					toast({
						title: 'Verification Email Sent',
						description: "We've sent a magic link to your email address.",
					});
					return;
				}
			} catch (error) {
				console.error('Magic link request failed:', error);
			}

			toast({
				title: 'Verification Email Failed',
				description: 'Could not send a verification email. Please try again.',
				variant: 'destructive',
			});
			return;
		}

		router.replace(LOGIN_WITH_NEXT);
	}, [email, flags.loginMagicEnabled, router, toast]);

	if (step === 'email_sent') {
		return (
			<div
				className="min-h-screen bg-[#f7f5f1] flex items-center justify-center px-4"
				data-testid="registration-offline-email-sent">
				<Card className="w-full max-w-md border-[#eae4da]">
					<CardHeader>
						<CardTitle className="font-headline">Check Your Email</CardTitle>
						<CardDescription>
							We&apos;ve sent a verification link to your email address.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<Info className="h-4 w-4" />
							<AlertTitle>Verification Email Sent</AlertTitle>
							<AlertDescription>
								<p>
									We&apos;ve sent a magic link to <strong>{email}</strong>
								</p>
								<p className="mt-2">
									Click the link in your email to sign in and continue registration.
									You&apos;ll return to this registration flow when verification
									completes.
								</p>
							</AlertDescription>
						</Alert>
						<Button variant="outline" onClick={() => setStep('enter_email')}>
							Use Different Email
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen bg-[#f7f5f1] flex items-center justify-center px-4"
			data-testid="registration-offline-auth">
			<Card className="w-full max-w-md border-[#eae4da]">
				<CardHeader>
					<CardTitle className="font-headline">Register Your Family</CardTitle>
					<CardDescription>
						Sign in or create an account before entering registration details.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="registration-auth-email" className="text-sm font-medium">
							Email
						</label>
						<Input
							id="registration-auth-email"
							type="email"
							placeholder="your.email@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									void handleContinue();
								}
							}}
						/>
					</div>
					<Button
						onClick={() => void handleContinue()}
						className="w-full bg-[#017c7d] hover:bg-[#016566] text-white">
						Continue
					</Button>
					<p className="text-center text-sm text-[#5b6b72]">
						Already have an account?{' '}
						<Link href={LOGIN_WITH_NEXT} className="underline">
							Sign in
						</Link>
						{' · '}
						<Link href={CREATE_ACCOUNT_WITH_NEXT} className="underline">
							Create account
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

interface RegistrationEntryProps {
	onStart: (prefillData?: any) => void;
}

export function RegistrationEntry({ onStart }: RegistrationEntryProps) {
	const router = useRouter();
	const { user } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [householdData, setHouseholdData] = useState<any>(null);
	const [children, setChildren] = useState<any[]>([]);
	const [householdName, setHouseholdName] = useState<string>('Your household');

	const { data: registrationCycles = [] } = useQuery({
		queryKey: ['registrationCycles'],
		queryFn: () => getRegistrationCycles(),
		staleTime: 15 * 60 * 1000,
	});

	const activeRegistrationCycle = pickActiveRegistrationCycle(registrationCycles);
	const cycleName = activeRegistrationCycle?.cycle_id || 'Fall 2026';

	// Set up draft persistence to peek at draft children
	const { loadDraft } = useDraftPersistence<RegistrationFormInput>({
		formName: 'registration_v1',
		version: 1,
		enabled: true,
	});

	useEffect(() => {
		const loadHouseholdAndChildren = async () => {
			if (!user?.uid || !activeRegistrationCycle?.cycle_id) {
				setIsLoading(false);
				return;
			}

			try {
				// Import loadHouseholdForRegistration dynamically to avoid circular deps
				const { loadHouseholdForRegistration } = await import('@/lib/dal');
				
				// Try to load prefill data for form
				const prefillResult = await loadHouseholdForRegistration(
					user.uid,
					activeRegistrationCycle.cycle_id
				);
				setHouseholdData(prefillResult);

				// Load household profile for display (works with RLS for guardians)
				const householdId = await getHouseholdForUser(user.uid);
				
				let profileChildren: any[] = [];
				let profileHouseholdName = 'Your household';

				if (householdId) {
					try {
						const profile = await getHouseholdProfile(householdId);
						profileChildren = profile.children || [];
						profileHouseholdName = profile.household?.name || 'Your household';
					} catch (error) {
						// Household profile load failed - continue with empty profile data
					}
				}

				// Also peek at draft to get children from draft
				let draftChildren: any[] = [];
				try {
					const draft = await loadDraft();
					if (draft?.children && Array.isArray(draft.children)) {
						draftChildren = draft.children.filter((c: any) => c?.first_name);
					}
				} catch (error) {
					// Draft load failed - continue without draft data
				}

				// Merge profile children with draft children (union, dedupe by first_name+last_name)
				const childMap = new Map<string, any>();
				
				// Add profile children first (these have child_id from DB)
				for (const child of profileChildren) {
					if (child?.first_name) {
						const key = `${child.first_name}|${child.last_name || ''}`;
						childMap.set(key, child);
					}
				}
				
				// Add draft children if not already in map (draft may have children not yet in profile)
				for (const child of draftChildren) {
					if (child?.first_name) {
						const key = `${child.first_name}|${child.last_name || ''}`;
						if (!childMap.has(key)) {
							// Child in draft but not in profile - add it
							childMap.set(key, child);
						}
					}
				}

				const mergedChildren = Array.from(childMap.values());
				setChildren(mergedChildren);
				setHouseholdName(profileHouseholdName);

			} catch (error) {
				// Top-level error loading household data - silent fail with empty state
			} finally {
				setIsLoading(false);
			}
		};

		loadHouseholdAndChildren();
	}, [user?.uid, activeRegistrationCycle?.cycle_id, loadDraft]);

	const handleStart = () => {
		onStart(householdData);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex items-center gap-2 text-[#5b6b72]">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					<span>Loading...</span>
				</div>
			</div>
		);
	}

	const userName = user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'there';
	const hasChildren = children.length > 0;

	return (
		<div className="min-h-screen bg-[#f7f5f1] flex flex-col">
			<div className="flex-1 px-4 py-8 pb-20">
				<div className="max-w-2xl mx-auto space-y-6">
					{/* Header */}
					<div>
						<p className="text-xs font-semibold tracking-wider uppercase text-[#5b6b72] mb-2">
							My household
						</p>
						<h1 className="text-3xl font-bold text-[#1e2a2f] mb-2">
							Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userName}
						</h1>
						<p className="text-[#5b6b72]">
							{householdName} · {cycleName} cycle
						</p>
					</div>

					{/* Action Card */}
					<Card className="border-[#eae4da] shadow-sm">
						<CardContent className="p-6 space-y-4">
							<div className="bg-[#fdf6e8] px-3 py-1.5 rounded-full inline-block">
								<p className="text-xs font-semibold tracking-wider uppercase text-[#8a6a22]">
									Action needed
								</p>
							</div>
							<h2 className="text-2xl font-bold text-[#1e2a2f]">
								Register for {cycleName}
							</h2>
							<p className="text-[#5b6b72] leading-relaxed">
								{householdData
									? `We found your household from ${user?.email}. Last year's answers are already filled in.`
									: `Complete your family registration for ${cycleName} programs.`}
							</p>
							{/* Progress dots */}
							<div className="flex gap-1.5">
								{[0, 1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="h-1.5 w-2.5 rounded-full bg-[#e6e1d8]"
									/>
								))}
							</div>
							<Button
								onClick={handleStart}
								className="w-full bg-[#017c7d] hover:bg-[#016566] text-white py-6 text-base font-semibold">
								Start registration
							</Button>
						</CardContent>
					</Card>

					{/* Children list */}
					{hasChildren && (
						<div>
							<p className="text-xs font-semibold tracking-wider uppercase text-[#5b6b72] mb-3">
								Children
							</p>
							<div className="space-y-2">
								{children.map((child: any, index: number) => (
									<Card key={index} className="border-[#eae4da] shadow-sm">
										<CardContent className="p-4 flex items-center gap-4">
											<div className="bg-[#ede8df] border border-[#e0dacf] rounded-lg w-14 h-14 flex items-center justify-center shrink-0">
												<span className="text-base font-semibold text-[#5b6b72]">
													{child.first_name?.substring(0, 1) || '?'}
													{child.last_name?.substring(0, 1) || ''}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-[#1e2a2f]">
													{child.first_name} {child.last_name || ''}
												</p>
												<p className="text-sm text-[#5b6b72]">
													{child.grade ? `${child.grade}` : ''}{child.grade && ' · '}returning
												</p>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Bottom Navigation - Show Home/Household, hide Bible Bee/Help during registration */}
			<div className="border-t border-[#eae4da] bg-white">
				<div className="container mx-auto px-4">
					<div className="flex justify-around py-3">
						<button
							onClick={() => router.push('/')}
							className="flex flex-col items-center gap-1 px-4 py-2 text-[#5b6b72] hover:text-[#017c7d] transition-colors">
							<Home className="h-5 w-5" />
							<span className="text-xs font-medium">Home</span>
						</button>
						<button
							onClick={() => router.push('/household')}
							className="flex flex-col items-center gap-1 px-4 py-2 text-[#5b6b72] hover:text-[#017c7d] transition-colors">
							<Users className="h-5 w-5" />
							<span className="text-xs font-medium">Household</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
