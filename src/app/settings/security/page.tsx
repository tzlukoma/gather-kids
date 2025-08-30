'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthDebug } from '@/components/auth/auth-debug';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // If we're in demo mode, redirect away from this page
    if (isDemo()) {
      router.replace('/login');
      return;
    }

    const checkAuth = async () => {
      try {
  const { supabase } = await import('@/lib/supabaseClient');
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
      } catch (err) {
        console.error('Unexpected error:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New passwords do not match. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingPassword(true);
    try {
  const { supabase } = await import('@/lib/supabaseClient');
      
      // Update user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (passwordError) throw passwordError;

      // Update user metadata to indicate they have a password
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          has_password: true
        }
      });

      if (metadataError) throw metadataError;

      toast({
        title: 'Password Updated Successfully',
        description: 'Your password has been changed.',
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error Updating Password',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setSendingVerification(true);
    try {
  const { supabase } = await import('@/lib/supabaseClient');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) throw error;

      toast({
        title: 'Verification Email Sent',
        description: 'Check your email for the verification link.',
      });
    } catch (error: any) {
      console.error('Error sending verification:', error);
      toast({
        title: 'Error Sending Verification',
        description: error.message || 'Failed to send verification email.',
        variant: 'destructive',
      });
    } finally {
      setSendingVerification(false);
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

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-muted/50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Security Settings</h1>
            <p className="text-muted-foreground">Manage your account security and authentication</p>
          </div>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email Verified</Label>
                <p className="text-sm text-muted-foreground">
                  {user.email_confirmed_at ? (
                    <span className="text-green-600">Verified</span>
                  ) : (
                    <span className="text-orange-600">Not verified</span>
                  )}
                </p>
              </div>
            </div>
            
            {!user.email_confirmed_at && (
              <div className="pt-4">
                <Button 
                  onClick={handleResendVerification}
                  disabled={sendingVerification}
                  variant="outline"
                >
                  {sendingVerification ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Management */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update your password to keep your account secure
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handlePasswordUpdate} 
              disabled={updatingPassword || !newPassword || !confirmPassword}
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Debug Information</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </Button>
            </div>
          </CardHeader>
          {showDebug && (
            <CardContent>
              <AuthDebug user={user} />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}