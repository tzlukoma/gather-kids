'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If we're in demo mode, redirect away from this page
    if (isDemo()) {
      router.replace('/login');
      return;
    }

    const handleAuthCallback = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
        } else if (data.session) {
          setSuccess(true);
          // Redirect to onboarding to check if user needs password setup
          setTimeout(() => router.push('/onboarding'), 1500);
        } else {
          setError('No session found. The link may have expired or been used already.');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

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