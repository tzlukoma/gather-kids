'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
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
  const hasRun = useRef(false); // Prevent infinite loops

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

    // Prevent infinite loops by ensuring this only runs once
    if (hasRun.current || error || success) {
      return;
    }
    hasRun.current = true;

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
        
        // Log basic debugging information
        console.log('Auth callback start:', {
          hasCode: !!code,
          codeLength: code?.length,
          error_code,
          error_description,
          url: window.location.href
        });
        
        // Check for error parameters in URL
        if (error_code || error_description) {
          console.error('Auth error in URL:', { error_code, error_description });
          setError(error_description || `Authentication failed (${error_code})`);
          return;
        }
        
        if (!code) {
          setError('No authentication code found in the URL. The link may be invalid.');
          return;
        }
        
        // Check for PKCE verifier - this is critical for magic link authentication
        const pkceKey = 'auth-token-code-verifier';
        const pkceVerifier = localStorage.getItem(pkceKey) || sessionStorage.getItem(pkceKey);
        
        console.log('PKCE verification check:', {
          hasCode: !!code,
          hasVerifier: !!pkceVerifier,
          verifierLength: pkceVerifier?.length || 0,
          storageStatus: {
            localStorage: !!localStorage.getItem(pkceKey),
            sessionStorage: !!sessionStorage.getItem(pkceKey)
          }
        });
        
        if (!pkceVerifier) {
          console.error('❌ PKCE verifier missing - authentication will fail');
          
          // Try to recover from backup
          let recovered = false;
          try {
            const backupData = localStorage.getItem('gatherKids-pkce-backup');
            if (backupData) {
              const backup = JSON.parse(backupData);
              const age = new Date().getTime() - new Date(backup.storedAt).getTime();
              if (age < 55 * 60 * 1000) { // 55 minutes
                localStorage.setItem(pkceKey, backup.verifier);
                sessionStorage.setItem(pkceKey, backup.verifier);
                console.log('✅ Recovered PKCE verifier from backup');
                recovered = true;
              }
            }
          } catch (e) {
            console.warn('Failed to recover PKCE from backup:', e);
          }
          
          if (!recovered) {
            setError(`❌ Authentication Error: Missing Verification Data

The magic link authentication failed because the required verification code is missing from browser storage.

**What this means:**
• Authentication code from email: ✅ Present  
• PKCE verifier in browser storage: ❌ Missing
• This causes Supabase to reject the authentication request

**Why this happens:**
• Magic link opened in different browser than where it was requested
• Browser storage was cleared or blocked between request and click
• Private browsing mode with strict security settings
• Browser extensions blocking storage access

**Solutions (try in order):**

1. **Same-Tab Method** (Most Reliable)
   • Request a new magic link 
   • Keep the login tab open
   • Click the magic link in the SAME tab

2. **Password Login** (Alternative)
   • Use password authentication instead
   • More reliable for cross-device access

3. **Browser Reset** (If issues persist)
   • Clear all browser data and cookies
   • Disable privacy extensions temporarily
   • Try in normal (non-private) browser mode

**For Developers:**
Enhanced cross-tab storage is active, but PKCE data was not found. Check browser console for detailed debugging information.`);
            return;
          }
        }

        // Attempt authentication
        console.log('Attempting to exchange code for session...');
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (authError) {
          console.error('Authentication error:', authError);
          
          // Handle specific error types
          if (authError.message.includes('code verifier should be non-empty') || 
              authError.message.includes('both auth code and code verifier')) {
            
            console.error('PKCE Error - Final Analysis:', {
              status: authError.status,
              message: authError.message,
              domain: window.location.origin,
              isVercelPreview: window.location.hostname.includes('vercel.app')
            });
            
            if (authError.status === 400) {
              setError(`🔧 Configuration Error (HTTP 400)

This Vercel preview URL is not configured in your Supabase project.

**Current Domain:** ${window.location.origin}

**To Fix:**
1. Open your Supabase project dashboard
2. Go to Authentication → URL Configuration  
3. Add this domain to "Redirect URLs"
4. For all Vercel previews, add: *.vercel.app

**Why:** Supabase rejects requests from unconfigured domains with HTTP 400 errors.

**Alternative:** Use password login for preview deployments.`);
            } else {
              setError(`❌ PKCE Authentication Failed

The verification data required for secure authentication was not found.

**Error:** ${authError.message}

**Solutions:**
1. Request a new magic link in this same browser tab
2. Try password authentication instead  
3. Clear browser data and retry
4. Contact support if this persists`);
            }
          } else if (authError.message.includes('expired')) {
            setError('The authentication link has expired. Magic links are valid for 1 hour.');
          } else if (authError.message.includes('invalid') || authError.message.includes('bad_code')) {
            setError('The authentication link is invalid. Please request a new one.');
          } else {
            setError(`Authentication failed: ${authError.message}`);
          }
        } else if (data.session) {
          console.log('✅ Authentication successful');
          setSuccess(true);
          // Redirect to onboarding
          setTimeout(() => router.push('/onboarding'), 1500);
        } else {
          setError('Authentication completed but no session was created. Please try again.');
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
              <div className="text-red-600 whitespace-pre-line text-sm">
                {error}
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href="/login">Request New Magic Link</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Return Home</Link>
                </Button>
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