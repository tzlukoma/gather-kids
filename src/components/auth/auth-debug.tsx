'use client';

import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthDebugProps {
	user: any;
}

export function AuthDebug({ user }: AuthDebugProps) {
	// Hide in demo mode
	if (isDemo()) {
		return null;
	}

	// Check for Supabase tokens in localStorage
	const getStorageTokens = () => {
		if (typeof window === 'undefined') return [];

		const tokens = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('sb-')) {
				try {
					// Don't show the full token value for security, just that it exists
					tokens.push({
						key,
						exists: true,
						type: key.includes('refresh')
							? 'refresh'
							: key.includes('access')
							? 'access'
							: key.includes('verifier')
							? 'pkce_verifier'
							: 'other',
					});
				} catch (e) {
					tokens.push({ key, error: 'Could not parse token' });
				}
			}
		}
		return tokens;
	};

	const tokens = getStorageTokens();

	return (
		<Card className="mt-4 border-dashed">
			<CardHeader>
				<CardTitle className="text-sm font-mono">Auth Debug (QA)</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<h4 className="text-sm font-semibold mb-2">User Info</h4>
					<div className="font-mono text-xs space-y-1">
						<div>
							<strong>ID:</strong> {user?.id}
						</div>
						<div>
							<strong>Email:</strong> {user?.email}
						</div>
						<div>
							<strong>Email Confirmed:</strong>{' '}
							{user?.email_confirmed_at ? 'Yes' : 'No'}
						</div>
						<div>
							<strong>Created:</strong> {user?.created_at}
						</div>
						<div>
							<strong>Last Sign In:</strong> {user?.last_sign_in_at || 'N/A'}
						</div>
					</div>
				</div>

				<div>
					<h4 className="text-sm font-semibold mb-2">Auth Tokens</h4>
					<div className="font-mono text-xs space-y-1">
						<div>
							<strong>Has Supabase Tokens:</strong>{' '}
							{tokens.length > 0 ? 'Yes' : 'No'}
						</div>
						<div>
							<strong>Token Count:</strong> {tokens.length}
						</div>
						{tokens.length > 0 && (
							<pre className="bg-muted p-2 rounded overflow-x-auto">
								{JSON.stringify(
									tokens.map((t) => ({ key: t.key, type: t.type })),
									null,
									2
								)}
							</pre>
						)}
					</div>
				</div>

				<div>
					<h4 className="text-sm font-semibold mb-2">Identities</h4>
					<pre className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto">
						{JSON.stringify(user?.identities || [], null, 2)}
					</pre>
				</div>

				<div>
					<h4 className="text-sm font-semibold mb-2">User Metadata</h4>
					<pre className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto">
						{JSON.stringify(user?.user_metadata || {}, null, 2)}
					</pre>
				</div>

				<div>
					<h4 className="text-sm font-semibold mb-2">Environment Info</h4>
					<div className="font-mono text-xs space-y-1">
						<div>
							<strong>Hostname:</strong>{' '}
							{typeof window !== 'undefined' ? window.location.hostname : 'SSR'}
						</div>
						<div>
							<strong>Is Vercel Preview:</strong>{' '}
							{typeof window !== 'undefined' &&
							window.location.hostname.includes('vercel.app')
								? 'Yes'
								: 'No'}
						</div>
						<div>
							<strong>Storage Available:</strong>{' '}
							{typeof localStorage !== 'undefined' ? 'Yes' : 'No'}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
