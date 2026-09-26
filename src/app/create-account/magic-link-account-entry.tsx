'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { captureAnalyticsEvent } from '@/lib/analytics/browser';
import { MAGIC_LINK_ERROR, requestMagicLink } from '@/lib/auth/request-magic-link';

const RESEND_COOLDOWN_SECONDS = 60;

export default function MagicLinkAccountEntry() {
	const [email, setEmail] = useState('');
	const [submittedEmail, setSubmittedEmail] = useState('');
	const [pending, setPending] = useState(false);
	const [cooldown, setCooldown] = useState(0);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [cooldown]);

	async function requestLink(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || cooldown > 0) return;

		setPending(true);
		setError(null);
		try {
			await requestMagicLink(email);

			setSubmittedEmail(email);
			setCooldown(RESEND_COOLDOWN_SECONDS);
			captureAnalyticsEvent('account_magic_link_requested');
		} catch {
			setError(MAGIC_LINK_ERROR);
		} finally {
			setPending(false);
		}
	}

	const sent = Boolean(submittedEmail);
	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold font-headline">
						{sent ? 'Check your email' : 'Register your family'}
					</CardTitle>
					<CardDescription>
						{sent
							? 'Open the secure link to sign in or continue creating your account.'
							: 'Enter your email and we’ll send you a secure link to continue.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{sent && (
						<Alert>
							<AlertTitle>Check your email</AlertTitle>
							<AlertDescription>
								If the address can be used, we’ve sent a secure link to {submittedEmail}. For your privacy, we cannot confirm whether an account already exists for this email.
							</AlertDescription>
						</Alert>
					)}
					<form className="space-y-4" onSubmit={requestLink}>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
						</div>
						{error && <p className="text-sm text-destructive" role="alert">{error}</p>}
						<Button className="w-full" disabled={pending || cooldown > 0} type="submit">
							{pending ? 'Sending...' : cooldown > 0 ? `Resend link in ${cooldown}s` : sent ? 'Resend link' : 'Email me a secure link'}
						</Button>
					</form>
					{sent && <Button className="w-full" variant="outline" onClick={() => { setSubmittedEmail(''); setCooldown(0); }}>Use a different email</Button>}
					<div className="text-center text-sm">
						<Link href="/login" className="underline">Sign in with a password</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
