'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { findHouseholdByEmail } from '@/lib/dal';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface AuthDebugInfo {
  email?: string;
  household_id?: string;
  latest_cycle?: string;
  branch_type?: 'none' | 'prior_cycle' | 'current_cycle';
  demo_mode: boolean;
}

export default function MagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { flags } = useFeatureFlags();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'demo'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo>({ demo_mode: false });

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        // Check if we're in demo mode
        const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
        
        if (isDemoMode) {
          // Demo mode: simulate magic link processing
          setStatus('demo');
          
          // Get email from URL params (would be set by demo flow)
          const demoEmail = searchParams.get('email') || 'demo@example.com';
          
          setDebugInfo({
            email: demoEmail,
            demo_mode: true,
            branch_type: 'none', // Will be updated after lookup
          });
          
          // Simulate session establishment delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Perform household lookup with demo email
          await performHouseholdLookup(demoEmail);
          
        } else {
          // Production mode: real Supabase Auth
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (error) {
            console.error('Magic link exchange error:', error);
            setErrorMessage(error.message);
            setStatus('error');
            return;
          }
          
          if (!data.session?.user?.email) {
            setErrorMessage('No email found in session');
            setStatus('error');
            return;
          }
          
          const email = data.session.user.email;
          setDebugInfo(prev => ({ 
            ...prev, 
            email, 
            demo_mode: false 
          }));
          
          // Perform household lookup
          await performHouseholdLookup(email);
        }
        
      } catch (error) {
        console.error('Magic link processing error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus('error');
      }
    };

    const performHouseholdLookup = async (email: string) => {
      try {
        const currentCycle = '2025'; // This should come from config/env in production
        const result = await findHouseholdByEmail(email, currentCycle);
        
        if (!result) {
          // No household found - redirect to registration with blank form
          setDebugInfo(prev => ({ 
            ...prev, 
            branch_type: 'none',
            latest_cycle: currentCycle 
          }));
          
          toast({
            title: 'Welcome!',
            description: 'Please complete your family registration.',
          });
          
          router.push(`/register?email=${encodeURIComponent(email)}&new=true`);
        } else {
          // Household found - determine branch type and redirect
          const branchType = result.isCurrentYear ? 'current_cycle' : 'prior_cycle';
          
          setDebugInfo(prev => ({ 
            ...prev, 
            household_id: result.data?.household?.household_id,
            branch_type: branchType,
            latest_cycle: currentCycle 
          }));
          
          const params = new URLSearchParams({
            email,
            prefill: result.isPrefill ? 'true' : 'false',
            overwrite: result.isCurrentYear ? 'true' : 'false'
          });
          
          toast({
            title: result.isCurrentYear ? 'Registration Found' : 'Welcome Back!',
            description: result.isCurrentYear 
              ? 'We found an existing registration for this year.'
              : 'We\'ll help you update your previous registration.',
          });
          
          router.push(`/register?${params.toString()}`);
        }
        
        setStatus('success');
        
      } catch (error) {
        console.error('Household lookup error:', error);
        setErrorMessage(`Failed to lookup household: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setStatus('error');
      }
    };

    handleMagicLink();
  }, [searchParams, router, toast]);

  const handleRetry = () => {
    router.push('/register');
  };

  if (status === 'processing' || status === 'demo') {
    return (
      <div className="flex flex-col min-h-screen bg-muted/50">
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-headline">
                {status === 'demo' ? 'Demo: Processing Magic Link' : 'Processing Magic Link'}
              </CardTitle>
              <CardDescription>
                Please wait while we verify your email and prepare your registration...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                This may take a few moments.
              </p>
            </CardContent>
          </Card>
          
          {/* Auth Debug Info */}
          {flags.showDemoFeatures && debugInfo.email && (
            <Card className="w-full max-w-md mt-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Auth Debug
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div><strong>Email:</strong> {debugInfo.email}</div>
                <div><strong>Demo Mode:</strong> {debugInfo.demo_mode ? 'true' : 'false'}</div>
                {debugInfo.household_id && (
                  <div><strong>Household ID:</strong> {debugInfo.household_id}</div>
                )}
                {debugInfo.branch_type && (
                  <div><strong>Branch:</strong> {debugInfo.branch_type}</div>
                )}
                {debugInfo.latest_cycle && (
                  <div><strong>Cycle:</strong> {debugInfo.latest_cycle}</div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col min-h-screen bg-muted/50">
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold font-headline text-green-700">
                Email Verified!
              </CardTitle>
              <CardDescription>
                Redirecting you to registration...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col min-h-screen bg-muted/50">
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold font-headline text-red-700">
                Verification Failed
              </CardTitle>
              <CardDescription>
                There was a problem processing your magic link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This could happen if:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  <li>The magic link has expired</li>
                  <li>The link has already been used</li>
                  <li>There was a network connectivity issue</li>
                </ul>
              </div>
              
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return null;
}