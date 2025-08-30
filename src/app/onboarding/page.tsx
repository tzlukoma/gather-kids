'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthDebug } from '@/components/auth/auth-debug';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // If we're in demo mode, redirect away from this page
    if (isDemo()) {
      router.replace('/login');
      return;
    }

    const checkAuthAndOnboarding = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          router.replace('/login');
          return;
        }

        if (!session) {
          router.replace('/login');
          return;
        }

        setUser(session.user);
        
        // Check if user needs onboarding
        const hasPassword = session.user.user_metadata?.has_password === true;
        const onboardingDismissed = session.user.user_metadata?.onboarding_dismissed === true;
        
        if (!hasPassword && !onboardingDismissed) {
          setShowOnboarding(true);
        } else {
          // User doesn't need onboarding, redirect to dashboard
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, [router]);

  const handleSetPassword = async () => {
    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setSettingPassword(true);
    try {
      const supabase = supabaseBrowser();
      
      // Update user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });

      if (passwordError) throw passwordError;

      // Update user metadata to indicate they have a password
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          has_password: true,
          onboarding_dismissed: true 
        }
      });

      if (metadataError) throw metadataError;

      toast({
        title: 'Password Set Successfully',
        description: 'You can now sign in with your email and password.',
      });

      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: 'Error Setting Password',
        description: error.message || 'Failed to set password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSettingPassword(false);
    }
  };

  const handleNotNow = async () => {
    try {
      const supabase = supabaseBrowser();
      
      // Mark onboarding as dismissed
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_dismissed: true }
      });

      if (error) throw error;

      toast({
        title: 'Setup Skipped',
        description: 'You can set a password later in Settings.',
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error dismissing onboarding:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to skip setup. Please try again.',
        variant: 'destructive',
      });
    }
  };

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!showOnboarding) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-headline">
            Make future sign-ins faster
          </CardTitle>
          <p className="text-base text-muted-foreground">
            You're all set with magic link. Prefer a password next time? 
            You can still use a magic link anytime.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSetPassword} 
              disabled={settingPassword || !password || !confirmPassword}
            >
              {settingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Set Password
            </Button>
            <Button variant="outline" onClick={handleNotNow}>
              Not now
            </Button>
          </div>

          {user && (
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </Button>
              {showDebug && <AuthDebug user={user} />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}