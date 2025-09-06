'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { isDemo } from '@/lib/authGuards';
import { Bug, User, Settings, Globe, Lock, Database } from 'lucide-react';

interface AuthDebugProps {
	children?: React.ReactNode;
	showInProduction?: boolean;
	inline?: boolean;
}

export function AuthDebug({ children, showInProduction = false, inline = false }: AuthDebugProps) {
	const { user, userRole } = useAuth();
	const [open, setOpen] = useState(false);
	
	const isDemoMode = isDemo();
	const nodeEnv = process.env.NODE_ENV;
	const isProduction = nodeEnv === 'production';
	
	// Hide in production unless explicitly allowed
	if (isProduction && !showInProduction) {
		return null;
	}

	// Hide in demo mode unless we want to show it
	if (isDemoMode && !showInProduction) {
		return null;
	}

	// Get Supabase tokens from localStorage
	const getStorageTokens = () => {
		if (typeof window === 'undefined') return [];

		const tokens = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('sb-')) {
				try {
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

	const environmentInfo = {
		NODE_ENV: nodeEnv,
		DEMO_MODE: isDemoMode,
		SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
		APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
		SHOW_DEMO_FEATURES: process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES,
		ENABLE_AI_FEATURES: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES,
		HOSTNAME: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
		IS_VERCEL_PREVIEW: typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'Yes' : 'No',
	};

	const sessionInfo = {
		hasSession: !!user,
		sessionAge: user ? '24 hours' : 'No session',
		lastActivity: user?.last_sign_in_at || (user ? new Date().toISOString() : 'N/A'),
		storageMethod: isDemoMode ? 'localStorage (demo mode)' : 'Supabase Auth',
		hasSupabaseTokens: tokens.length > 0 ? 'Yes' : 'No',
		tokenCount: tokens.length,
	};

	const DebugContent = () => (
		<div className="space-y-6">
			{/* Environment Info */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<Globe className="h-4 w-4" />
						Environment
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{Object.entries(environmentInfo).map(([key, value]) => (
						<div key={key} className="flex justify-between items-center">
							<span className="text-sm font-mono text-muted-foreground">{key}</span>
							<Badge variant={key === 'NODE_ENV' && value === 'production' ? 'destructive' : 'secondary'}>
								{String(value)}
							</Badge>
						</div>
					))}
				</CardContent>
			</Card>

			{/* User Info */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<User className="h-4 w-4" />
						User Information
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{user ? (
						<>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">ID</span>
									<code className="text-sm bg-muted px-2 py-1 rounded">
										{user.id || user.uid || 'N/A'}
									</code>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Email</span>
									<code className="text-sm bg-muted px-2 py-1 rounded">
										{user.email}
									</code>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Name</span>
									<code className="text-sm bg-muted px-2 py-1 rounded">
										{user.name || user.displayName || 'N/A'}
									</code>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Role</span>
									<Badge>{user.metadata?.role || userRole || 'N/A'}</Badge>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Active</span>
									<Badge variant={user.is_active !== false ? 'default' : 'destructive'}>
										{user.is_active !== false ? 'Yes' : 'No'}
									</Badge>
								</div>
								{!isDemoMode && (
									<>
										<div className="flex justify-between items-center">
											<span className="text-sm font-medium">Email Confirmed</span>
											<Badge variant={user.email_confirmed_at ? 'default' : 'destructive'}>
												{user.email_confirmed_at ? 'Yes' : 'No'}
											</Badge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm font-medium">Created</span>
											<code className="text-sm bg-muted px-2 py-1 rounded">
												{user.created_at || 'N/A'}
											</code>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm font-medium">Last Sign In</span>
											<code className="text-sm bg-muted px-2 py-1 rounded">
												{user.last_sign_in_at || 'N/A'}
											</code>
										</div>
									</>
								)}
								{user.metadata?.household_id && (
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Household</span>
										<code className="text-sm bg-muted px-2 py-1 rounded">
											{user.metadata.household_id}
										</code>
									</div>
								)}
								{user.assignedMinistryIds && user.assignedMinistryIds.length > 0 && (
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Ministries</span>
										<div className="flex flex-wrap gap-1">
											{user.assignedMinistryIds.map((id) => (
												<Badge key={id} variant="outline" className="text-xs">
													{id}
												</Badge>
											))}
										</div>
									</div>
								)}
							</div>
							
							<Separator />
							
							<div className="text-xs text-muted-foreground">
								<strong>Metadata:</strong>
								<pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
									{JSON.stringify(user.metadata || user.user_metadata || {}, null, 2)}
								</pre>
							</div>

							{!isDemoMode && user.identities && (
								<>
									<Separator />
									<div className="text-xs text-muted-foreground">
										<strong>Identities:</strong>
										<pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
											{JSON.stringify(user.identities, null, 2)}
										</pre>
									</div>
								</>
							)}
						</>
					) : (
						<div className="text-center text-muted-foreground py-4">
							No user session found
						</div>
					)}
				</CardContent>
			</Card>

			{/* Session & Token Info */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<Lock className="h-4 w-4" />
						Session & Authentication
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{Object.entries(sessionInfo).map(([key, value]) => (
						<div key={key} className="flex justify-between items-center">
							<span className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
							<code className="text-sm bg-muted px-2 py-1 rounded">
								{String(value)}
							</code>
						</div>
					))}
					
					{!isDemoMode && tokens.length > 0 && (
						<>
							<Separator />
							<div className="text-xs text-muted-foreground">
								<strong>Auth Tokens:</strong>
								<pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
									{JSON.stringify(tokens.map(t => ({ key: t.key, type: t.type })), null, 2)}
								</pre>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Debug Actions */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<Settings className="h-4 w-4" />
						Debug Actions
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								console.log('Auth Debug - Current User:', user);
								console.log('Auth Debug - User Role:', userRole);
								console.log('Auth Debug - Environment:', environmentInfo);
								console.log('Auth Debug - Session Info:', sessionInfo);
							}}
						>
							Log to Console
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								const debugInfo = {
									user,
									userRole,
									environment: environmentInfo,
									session: sessionInfo,
									tokens: tokens.map(t => ({ key: t.key, type: t.type })),
									timestamp: new Date().toISOString(),
								};
								navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2));
							}}
						>
							Copy Debug Info
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	// Return inline version if requested
	if (inline) {
		return (
			<Card className="mt-4 border-dashed">
				<CardHeader>
					<CardTitle className="text-sm font-mono flex items-center gap-2">
						<Database className="h-4 w-4" />
						Auth Debug ({isDemoMode ? 'Demo' : 'Live'})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<DebugContent />
				</CardContent>
			</Card>
		);
	}

	// Return dialog version (default)
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{children || (
					<Button
						variant="outline"
						size="sm"
						className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
					>
						<Bug className="h-4 w-4 mr-2" />
						Auth Debug
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Bug className="h-5 w-5" />
						Authentication Debug Information
					</DialogTitle>
					<DialogDescription>
						Development information for debugging authentication and environment state.
						{isDemoMode ? ' (Demo Mode)' : ' (Live Mode)'}
					</DialogDescription>
				</DialogHeader>

				<DebugContent />
			</DialogContent>
		</Dialog>
	);
}