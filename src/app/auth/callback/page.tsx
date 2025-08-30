'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { ensurePKCEVerifierExists, cleanupExpiredPKCE } from '@/lib/pkce-monitor';
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
        // Clean up any expired PKCE data first
        cleanupExpiredPKCE();
        
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
        
        // CRITICAL: Ensure PKCE verifier exists before attempting auth
        const pkceExists = ensurePKCEVerifierExists();
        console.log('PKCE verifier check before auth:', { exists: pkceExists });
        
        if (!pkceExists) {
          console.error('CRITICAL: No PKCE verifier found despite all recovery attempts');
          setError('Authentication verification data is missing. This can happen when:\n\n• The magic link was opened in a different browser\n• Browser data was cleared between request and click\n• Private browsing mode with strict settings\n\nPlease request a new magic link in the same browser tab you plan to use for clicking it.');
          return;
        }
        
        // Comprehensive debugging for PKCE flow issues
        // Based on Supabase source: ${storageKey}-code-verifier where storageKey is 'auth-token'
        const exactPKCEKey = 'auth-token-code-verifier'; // This is the EXACT key Supabase uses
        const allAuthKeys = Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce')
        );
        const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
          key.includes('auth') || key.includes('token') || key.includes('verifier') || key.includes('pkce')
        );
        
        // Check the exact PKCE key that Supabase expects
        const pkceVerifierInLocalStorage = localStorage.getItem(exactPKCEKey);
        const pkceVerifierInSessionStorage = sessionStorage.getItem(exactPKCEKey);
        
        console.log('Comprehensive PKCE Debug Information:', {
          // URL parameters
          hasCode: !!code,
          codeLength: code?.length,
          codePreview: code ? `${code.substring(0, 8)}...${code.substring(code.length - 8)}` : 'none',
          
          // PKCE-specific debugging
          exactPKCEKey,
          pkceVerifierInLocalStorage: pkceVerifierInLocalStorage ? `${pkceVerifierInLocalStorage.substring(0, 8)}...` : 'MISSING',
          pkceVerifierInSessionStorage: pkceVerifierInSessionStorage ? `${pkceVerifierInSessionStorage.substring(0, 8)}...` : 'MISSING',
          pkceVerifierExists: !!(pkceVerifierInLocalStorage || pkceVerifierInSessionStorage),
          
          // Storage analysis
          totalLocalStorageKeys: Object.keys(localStorage).length,
          totalSessionStorageKeys: Object.keys(sessionStorage).length,
          authRelatedKeysInLocalStorage: allAuthKeys,
          authRelatedKeysInSessionStorage: sessionAuthKeys,
          
          // Browser context
          userAgent: navigator.userAgent,
          currentOrigin: window.location.origin,
          currentUrl: window.location.href,
          referrer: document.referrer,
          cookiesEnabled: navigator.cookieEnabled,
          
          // Timing and source context
          timestamp: new Date().toISOString(),
          pageLoadTime: performance.now(),
          isNewTab: window.opener === null && !document.referrer.includes(window.location.origin),
          
          // Network debugging
          networkStatus: navigator.onLine ? 'online' : 'offline'
        });

        // Handle auth callback by exchanging code for session
        console.log('Attempting to exchange auth code for session...');
        
        // Final check - ensure PKCE verifier is available right before the exchange
        const finalPKCECheck = localStorage.getItem('auth-token-code-verifier') || sessionStorage.getItem('auth-token-code-verifier');
        console.log('Final PKCE check before exchange:', {
          hasVerifier: !!finalPKCECheck,
          verifierLength: finalPKCECheck?.length || 0,
          verifierPreview: finalPKCECheck ? `${finalPKCECheck.substring(0, 8)}...` : 'none',
          requestDetails: {
            domain: window.location.origin,
            isVercel: window.location.hostname.includes('vercel.app'),
            codeLength: code.length,
            timestamp: new Date().toISOString()
          }
        });
        
        // Try to capture network request details
        console.log('About to call exchangeCodeForSession with:', {
          codePresent: !!code,
          codeLength: code.length,
          expectedEndpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`,
          currentOrigin: window.location.origin
        });
        
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (authError) {
          console.error('Auth callback error from exchangeCodeForSession:', authError);
          
          // Log the full error details for debugging
          console.error('Full Supabase error details:', {
            name: authError.name,
            message: authError.message,
            status: authError.status,
            statusCode: authError.status,
            stack: authError.stack
          });
          
          // Check if this is a 400 error (Bad Request) which suggests configuration issues
          if (authError.status === 400) {
            console.error('400 Bad Request Error Analysis:', {
              likelyCause: 'Supabase project configuration issue',
              currentDomain: window.location.origin,
              vercelPreview: window.location.hostname.includes('vercel.app'),
              redirectUrlUsed: new URLSearchParams(window.location.search).get('redirect_to') || 'default',
              suggestions: [
                'Add current domain to Supabase project redirect URLs',
                'Check if Vercel preview URLs are allowed in Supabase settings',
                'Verify PKCE flow is enabled in Supabase auth settings',
                'Ensure auth flow type matches project configuration'
              ]
            });
          }
          
          // Before handling the error, check if we have backup magic link data
          const backupData = localStorage.getItem('gatherKids-magic-link-backup');
          if (backupData) {
            try {
              const backup = JSON.parse(backupData);
              console.log('Found backup magic link data:', {
                email: backup.email,
                requestedAt: backup.requestedAt,
                age: Math.round((new Date().getTime() - new Date(backup.requestedAt).getTime()) / 1000 / 60) // minutes
              });
            } catch (e) {
              console.warn('Could not parse backup magic link data:', e);
            }
          }
          
          // Provide more specific error messages based on Supabase error types
          const errorMessage = authError.message.toLowerCase();
          
          // Handle the specific "code verifier" error
          if (errorMessage.includes('code verifier should be non-empty') || 
              errorMessage.includes('both auth code and code verifier')) {
            console.error('PKCE flow error - code verifier missing or invalid');
            
            // Check the exact PKCE key Supabase uses
            const exactPKCEKey = 'auth-token-code-verifier';
            const pkceVerifierInLocalStorage = localStorage.getItem(exactPKCEKey);
            const pkceVerifierInSessionStorage = sessionStorage.getItem(exactPKCEKey);
            
            console.error('Detailed PKCE error analysis:', {
              errorMessage: authError.message,
              errorStatus: authError.status,
              hasCode: !!code,
              codeLength: code?.length,
              codeFormat: code ? (code.length > 20 ? 'looks_valid' : 'too_short') : 'missing',
              exactPKCEKey,
              pkceVerifierInLocalStorage: pkceVerifierInLocalStorage ? `${pkceVerifierInLocalStorage.substring(0, 8)}...` : 'MISSING',
              pkceVerifierInSessionStorage: pkceVerifierInSessionStorage ? `${pkceVerifierInSessionStorage.substring(0, 8)}...` : 'MISSING',
              hasAnyPKCEVerifier: !!(pkceVerifierInLocalStorage || pkceVerifierInSessionStorage),
              allAuthKeys: Object.keys(localStorage).filter(key => 
                key.includes('auth') || key.includes('token') || key.includes('verifier')
              ),
              currentDomain: window.location.origin,
              isVercelPreview: window.location.hostname.includes('vercel.app'),
              possibleCauses: authError.status === 400 ? [
                'Vercel preview URL not configured in Supabase redirect URLs (MOST LIKELY)',
                'PKCE code verifier missing from browser storage',
                'Auth code format invalid or expired',
                'Supabase project PKCE settings misconfigured'
              ] : [
                'PKCE code verifier not found in storage',
                'Browser storage cleared between request and click',
                'Cross-tab storage access blocked by browser',
                'Network connectivity issues during authentication'
              ],
              nextSteps: authError.status === 400 ? [
                'Add current domain to Supabase Auth settings > URL Configuration',
                'Check Supabase project redirect URLs allow Vercel preview domains',
                'Verify auth flow type is set to PKCE in Supabase',
                'Request new magic link after fixing configuration'
              ] : [
                'Check browser console for PKCE storage debugging',
                'Request new magic link in the same browser tab',
                'Try using password login as alternative',
                'Clear browser data and try again'
              ]
            });
            
            // Clear any stale auth storage to prevent future issues
            try {
              const authKeys = Object.keys(localStorage).filter(key => 
                key.includes('auth') || key.includes('token') || key.includes('verifier')
              );
              const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
                key.includes('auth') || key.includes('token') || key.includes('verifier')
              );
              
              authKeys.forEach(key => localStorage.removeItem(key));
              sessionAuthKeys.forEach(key => sessionStorage.removeItem(key));
              
              console.log('Cleared stale auth storage:', { localStorage: authKeys, sessionStorage: sessionAuthKeys });
            } catch (e) {
              console.warn('Could not clear auth storage:', e);
            }
            
            if (authError.status === 400) {
              setError(`🔧 Configuration Error (HTTP 400)\n\nThe magic link authentication failed because this Vercel preview URL is not configured in your Supabase project.\n\n🎯 Current Domain: ${window.location.origin}\n\n✅ To Fix:\n1. Go to your Supabase project dashboard\n2. Navigate to Authentication > URL Configuration\n3. Add the current domain to the redirect URLs list\n4. Or add a wildcard: *.vercel.app for all preview deployments\n\n🔍 Technical Details:\n• HTTP Status: 400 (Bad Request)\n• Error: ${authError.message}\n• The PKCE code verifier was ${!!(pkceVerifierInLocalStorage || pkceVerifierInSessionStorage) ? 'found' : 'missing'} in storage\n\n💡 Alternative: Use password login instead of magic links for preview deployments.`);
            } else {
              setError('PKCE Authentication Error: The verification code is missing from browser storage.\n\n🔍 Detailed Analysis:\n• Auth code: ' + (code ? 'Present' : 'Missing') + '\n• PKCE verifier: ' + (pkceVerifierInLocalStorage || pkceVerifierInSessionStorage ? 'Present' : 'MISSING') + '\n• Network status: ' + (navigator.onLine ? 'Online' : 'Offline') + '\n\n💡 This suggests:\n• The magic link was opened in a different browser/device\n• Browser storage settings are blocking cross-tab access\n• The Vercel preview URL may not be configured in your Supabase project\n\n🚀 Next Steps:\n1. Check browser console for detailed PKCE debugging logs\n2. Verify redirect URLs are configured in Supabase dashboard\n3. Try requesting a new magic link and clicking it immediately\n\n🔧 Technical Details: Check browser console for comprehensive PKCE flow analysis.');
            }
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
                    <p className="font-semibold">✓ Enhanced Cross-Tab Magic Link Support</p>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="font-medium mb-2">Triple-layer protection implemented:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        <li>Custom storage adapter for cross-tab persistence</li>
                        <li>Global storage patching for complete coverage</li>
                        <li>Backup storage mechanisms for maximum reliability</li>
                      </ul>
                      <p className="font-medium mt-2 mb-1">If still experiencing issues:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        <li>Check browser console for detailed PKCE debugging logs</li>
                        <li>Verify the magic link hasn't expired (1 hour limit)</li>
                        <li>Ensure the link hasn't been used already</li>
                      </ul>
                    </div>
                    <p className="text-xs font-medium text-green-600">
                      🔍 Enhanced debugging now shows exactly what's happening in the auth flow
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