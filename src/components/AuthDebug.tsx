'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { useFeatureFlags } from '@/contexts/feature-flag-context';

interface AuthDebugProps {
	className?: string;
	user?: any;
}

export default function AuthDebug({ className }: AuthDebugProps) {
	const { flags } = useFeatureFlags();
	const [user, setUser] = useState<any>(null);
	const [session, setSession] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [isOpen, setIsOpen] = useState(false);

	// Hide in demo mode
	if (flags.isDemoMode) {
		return null;
	}

	useEffect(() => {
		const fetchAuthData = async () => {
			try {
				if (!supabase) {
					setLoading(false);
					return;
				}

				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();
				if (error) {
					console.error('Error fetching session:', error);
				} else {
					setSession(session);
					setUser(session?.user || null);
				}
			} catch (error) {
				console.error('Error in AuthDebug:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchAuthData();

		// Subscribe to auth changes
		if (supabase) {
			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange((event: string, session: any) => {
				console.log('AuthDebug - Auth state change:', event, session?.user?.id);
				setSession(session);
				setUser(session?.user || null);
			});

			return () => subscription.unsubscribe();
		}
	}, []);

	if (loading) {
		return (
			<div className={className}>
				<p className="text-sm text-muted-foreground">Loading auth debug...</p>
			</div>
		);
	}

	return (
		<div className={className}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<Button variant="outline" size="sm" className="w-full">
						<Bug className="h-4 w-4 mr-2" />
						Auth Debug
						{isOpen ? (
							<ChevronDown className="h-4 w-4 ml-2" />
						) : (
							<ChevronRight className="h-4 w-4 ml-2" />
						)}
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="mt-2">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Authentication Debug</CardTitle>
							<CardDescription className="text-xs">
								Current authentication state for QA testing
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="text-sm font-medium mb-2">Session Status</h4>
								<div className="bg-muted p-2 rounded text-xs">
									<p>
										<strong>Has Session:</strong> {session ? 'Yes' : 'No'}
									</p>
									<p>
										<strong>User ID:</strong> {user?.id || 'None'}
									</p>
									<p>
										<strong>Email:</strong> {user?.email || 'None'}
									</p>
									<p>
										<strong>Email Verified:</strong>{' '}
										{user?.email_confirmed_at ? 'Yes' : 'No'}
									</p>
									<p>
										<strong>Created:</strong>{' '}
										{user?.created_at
											? new Date(user.created_at).toLocaleString()
											: 'None'}
									</p>
								</div>
							</div>

							{user?.identities && user.identities.length > 0 && (
								<div>
									<h4 className="text-sm font-medium mb-2">Identities</h4>
									<div className="bg-muted p-2 rounded text-xs">
										{user.identities.map((identity: any, index: number) => (
											<div key={index} className="mb-2 last:mb-0">
												<p>
													<strong>Provider:</strong> {identity.provider}
												</p>
												<p>
													<strong>Identity ID:</strong> {identity.id}
												</p>
												<p>
													<strong>Created:</strong>{' '}
													{new Date(identity.created_at).toLocaleString()}
												</p>
											</div>
										))}
									</div>
								</div>
							)}

							{user?.user_metadata &&
								Object.keys(user.user_metadata).length > 0 && (
									<div>
										<h4 className="text-sm font-medium mb-2">User Metadata</h4>
										<div className="bg-muted p-2 rounded text-xs">
											<pre className="whitespace-pre-wrap break-all">
												{JSON.stringify(user.user_metadata, null, 2)}
											</pre>
										</div>
									</div>
								)}

							{session?.access_token && (
								<div>
									<h4 className="text-sm font-medium mb-2">Session Info</h4>
									<div className="bg-muted p-2 rounded text-xs">
										<p>
											<strong>Token Type:</strong> {session.token_type}
										</p>
										<p>
											<strong>Expires:</strong>{' '}
											{new Date(session.expires_at * 1000).toLocaleString()}
										</p>
										<p>
											<strong>Refresh Token:</strong>{' '}
											{session.refresh_token ? 'Present' : 'None'}
										</p>
									</div>
								</div>
							)}

							{!user && (
								<div>
									<h4 className="text-sm font-medium mb-2">
										No Authentication
									</h4>
									<div className="bg-muted p-2 rounded text-xs">
										<p>User is not currently authenticated.</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
