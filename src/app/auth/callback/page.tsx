'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted state to prevent hydration mismatch
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run after component is mounted to avoid SSR issues
    if (!mounted) return;

    // If we're in demo mode, redirect away from this page
    if (isDemo()) {
      router.replace('/login');
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // Ensure we have required environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('dummy')) {
          setError('Supabase is not properly configured for this environment.');
          return;
        }

        const supabase = supabaseBrowser();
        const code = searchParams?.get('code') || '';
        const error_code = searchParams?.get('error_code') || '';
        const error_description = searchParams?.get('error_description') || '';
        
        // Log debugging information
        console.log('Auth callback - URL parameters:', {
          code: code ? code.substring(0, 8) + '...' : 'none',
          error_code,
          error_description,
          full_url: window.location.href
        });
        
        // Check for error parameters in URL (Supabase sends these on auth failures)
        if (error_code || error_description) {
          console.error('Auth callback error from URL:', { error_code, error_description });
          if (error_code === 'otp_expired' || error_description?.includes('expired')) {
            setError('The authentication link has expired or is invalid.');
          } else if (error_code === 'access_denied' || error_description?.includes('access_denied')) {
            setError('Access was denied. Please try requesting a new magic link.');
          } else {
            setError(error_description || `Authentication failed (${error_code})`);
          }
          return;
        }
        
        if (!code) {
          setError('No authentication code found in the URL. The link may be invalid.');
          return;
        }
        
        // Additional debugging for PKCE flow issues with new cross-tab storage
        const codeVerifier = localStorage.getItem('gatherKids-auth-auth-token-code-verifier');
        const authStorageKeys = Object.keys(localStorage).filter(key => 
          key.includes('gatherKids-auth') || key.includes('supabase') || key.includes('auth')
        );
        
        console.log('PKCE Flow Debug Information:', {
          hasCode: !!code,
          codeLength: code?.length,
          codePreview: code ? `${code.substring(0, 8)}...${code.substring(code.length - 8)}` : 'none',
          hasStoredVerifier: !!codeVerifier,
          verifierLength: codeVerifier?.length || 0,
          authStorageKeys,
          userAgent: navigator.userAgent,
          currentOrigin: window.location.origin,
          currentUrl: window.location.href,
          sessionStorage: !!sessionStorage.getItem('gatherKids-auth-auth-token-code-verifier'),
          cookieCount: document.cookie.split(';').length
        });

        // Handle auth callback by exchanging code for session
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (authError) {
          console.error('Auth callback error from exchangeCodeForSession:', authError);
          
          // Provide more specific error messages based on Supabase error types
          const errorMessage = authError.message.toLowerCase();
          
          // Handle the specific "code verifier" error
          if (errorMessage.includes('code verifier should be non-empty') || 
              errorMessage.includes('both auth code and code verifier')) {
            console.error('PKCE flow error - code verifier missing or invalid');
            console.error('Detailed PKCE error analysis:', {
              errorMessage: authError.message,
              hasCode: !!code,
              codeLength: code?.length,
              hasLocalStorageVerifier: !!localStorage.getItem('gatherKids-auth-auth-token-code-verifier'),
              hasSessionStorageVerifier: !!sessionStorage.getItem('gatherKids-auth-auth-token-code-verifier'),
              authStorageKeys: Object.keys(localStorage).filter(key => 
                key.includes('auth') || key.includes('supabase') || key.includes('gatherKids')
              ),
              possibleCauses: [
                'Different browser/tab than where magic link was requested',
                'Browser storage cleared between request and click',
                'Private/incognito mode',
                'Third-party cookies blocked',
                'Browser security settings preventing storage access'
              ]
            });
            
            // Clear any stale auth storage to prevent future issues
            try {
              const authKeys = Object.keys(localStorage).filter(key => 
                key.includes('gatherKids-auth') || (key.includes('supabase') && key.includes('auth'))
              );
              const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
                key.includes('gatherKids-auth') || (key.includes('supabase') && key.includes('auth'))
              );
              
              authKeys.forEach(key => localStorage.removeItem(key));
              sessionAuthKeys.forEach(key => sessionStorage.removeItem(key));
              
              console.log('Cleared stale auth storage:', { localStorage: authKeys, sessionStorage: sessionAuthKeys });
            } catch (e) {
              console.warn('Could not clear auth storage:', e);
            }
            
            setError('The authentication process failed due to missing authentication data. This can happen when:\n\n• The magic link has expired (they expire after 1 hour)\n• The authentication data was cleared from your browser\n• You\'re using private/incognito browsing mode with strict settings\n• The link has already been used\n\nPlease request a new magic link to continue. The new cross-tab storage system should now work reliably when opening links in different tabs.');
          } else if (errorMessage.includes('expired') || errorMessage.includes('invalid_code') || 
              errorMessage.includes('otp_expired') || errorMessage.includes('token_expired')) {
            setError('The authentication link has expired or is invalid.');
          } else if (errorMessage.includes('invalid_request') || errorMessage.includes('bad_code')) {
            setError('The authentication link is invalid. Please request a new one.');
          } else if (errorMessage.includes('used') || errorMessage.includes('consumed')) {
            setError('This authentication link has already been used. Please request a new one.');
          } else {
            setError(`Authentication failed: ${authError.message}`);
          }
        } else if (data.session) {
          console.log('Auth callback success - session established');
          setSuccess(true);
          // Redirect to onboarding to check if user needs password setup
          setTimeout(() => router.push('/onboarding'), 1500);
        } else {
          console.warn('Auth callback - no session returned despite no error');
          setError('No session found. The link may have expired or been used already.');
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, mounted, searchParams]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show demo mode notice
  if (isDemo()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              Demo Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Live Auth is disabled in Demo Mode.
            </p>
            <Button asChild>
              <Link href="/login">Return to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {success && <CheckCircle className="h-5 w-5 text-green-600" />}
            {error && <AlertCircle className="h-5 w-5 text-red-600" />}
            {loading ? 'Signing you in...' : success ? 'Success!' : 'Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {loading && (
            <p className="text-muted-foreground">
              Please wait while we sign you in...
            </p>
          )}
          
          {success && (
            <div className="space-y-2">
              <p className="text-green-600">You've been signed in successfully!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to complete your setup...
              </p>
            </div>
          )}
          
          {error && (
            <div className="space-y-4">
              <p className="text-red-600">{error}</p>
              <div className="space-y-2">
                {error.includes('expired') && (
                  <p className="text-sm text-muted-foreground">
                    Magic links expire after 1 hour. Please request a new one.
                  </p>
                )}
                {error.includes('authentication process failed') && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-semibold">✓ Cross-tab authentication is now supported!</p>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="font-medium mb-2">This error can still occur if:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        <li>The magic link has expired (1 hour limit)</li>
                        <li>The link has already been used</li>
                        <li>Private/incognito mode with strict privacy settings</li>
                        <li>Browser storage was completely cleared</li>
                      </ul>
                    </div>
                    <p className="text-xs font-medium text-green-600">
                      ✓ Fixed: Magic links now work when opened in different browser tabs!
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href="/login">Request New Magic Link</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/">Return Home</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}