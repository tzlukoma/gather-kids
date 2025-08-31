'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Bell, Shield, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to gatherKids!',
      description: 'Your family registration has been successfully submitted.',
      icon: CheckCircle,
      action: 'Continue'
    },
    {
      id: 'profile',
      title: 'Set Up Your Profile',
      description: 'Complete your parent profile to access all features.',
      icon: User,
      action: 'Complete Profile',
      optional: true
    },
    {
      id: 'notifications',
      title: 'Stay Connected',
      description: 'Choose how you\'d like to receive updates about your children\'s activities.',
      icon: Bell,
      action: 'Configure Notifications',
      optional: true
    },
    {
      id: 'security',
      title: 'Secure Your Account',
      description: 'Set up additional security options for your family\'s data.',
      icon: Shield,
      action: 'Review Security',
      optional: true
    }
  ];

  useEffect(() => {
    // Auto-complete the welcome step
    if (!completedSteps.includes('welcome')) {
      setTimeout(() => {
        setCompletedSteps(['welcome']);
        setCurrentStep(1);
      }, 1000);
    }
  }, [completedSteps]);

  const handleStepAction = (stepId: string) => {
    // Mark step as completed
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }

    // Move to next step or finish
    const nextStepIndex = steps.findIndex(s => s.id === stepId) + 1;
    
    if (nextStepIndex < steps.length) {
      setCurrentStep(nextStepIndex);
    } else {
      // All steps completed, proceed to household
      handleFinishOnboarding();
    }
  };

  const handleSkipStep = (stepId: string) => {
    // Mark as completed (even if skipped)
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }

    const nextStepIndex = steps.findIndex(s => s.id === stepId) + 1;
    
    if (nextStepIndex < steps.length) {
      setCurrentStep(nextStepIndex);
    } else {
      handleFinishOnboarding();
    }
  };

  const handleFinishOnboarding = () => {
    // Store onboarding completion
    if (user) {
      const updatedUser = {
        ...user,
        metadata: {
          ...user.metadata,
          onboarding_dismissed: true,
          onboarding_completed_at: new Date().toISOString()
        }
      };
      
      localStorage.setItem('gatherkids-user', JSON.stringify(updatedUser));
    }

    toast({
      title: 'Welcome to gatherKids!',
      description: 'Your account setup is complete. Redirecting to your household dashboard...',
    });

    // Redirect to household dashboard
    setTimeout(() => {
      router.push('/household');
    }, 2000);
  };

  const handleSkipOnboarding = () => {
    toast({
      title: 'Onboarding Skipped',
      description: 'You can always complete your profile later from the household dashboard.',
    });
    
    // Still mark as dismissed
    if (user) {
      const updatedUser = {
        ...user,
        metadata: {
          ...user.metadata,
          onboarding_dismissed: true,
          onboarding_skipped_at: new Date().toISOString()
        }
      };
      
      localStorage.setItem('gatherkids-user', JSON.stringify(updatedUser));
    }

    router.push('/household');
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData?.icon || CheckCircle;

  return (
    <div className="flex flex-col min-h-screen bg-muted/50">
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  completedSteps.includes(step.id)
                    ? 'bg-green-500'
                    : index === currentStep
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Current step */}
          {currentStepData && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <StepIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-2xl font-bold font-headline">
                  {currentStepData.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {currentStepData.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Welcome step content */}
                {currentStepData.id === 'welcome' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Registration Complete!</AlertTitle>
                    <AlertDescription>
                      Your family registration has been received and processed. 
                      You can now access your household dashboard and manage your children's ministry enrollments.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Profile step content */}
                {currentStepData.id === 'profile' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Complete your profile to help ministry leaders contact you and keep your information current.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Update emergency contact information</li>
                      <li>• Set communication preferences</li>
                      <li>• Add profile photo (optional)</li>
                    </ul>
                  </div>
                )}

                {/* Notifications step content */}
                {currentStepData.id === 'notifications' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Choose how you'd like to receive important updates about your children's activities.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Ministry announcements</li>
                      <li>• Event reminders</li>
                      <li>• Check-in/out notifications</li>
                      <li>• Bible Bee progress updates</li>
                    </ul>
                  </div>
                )}

                {/* Security step content */}
                {currentStepData.id === 'security' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Review and configure security settings to protect your family's information.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Set up two-factor authentication</li>
                      <li>• Review privacy settings</li>
                      <li>• Configure data sharing preferences</li>
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={() => handleStepAction(currentStepData.id)}
                    className="flex-1 flex items-center gap-2"
                  >
                    {currentStepData.action}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  
                  {currentStepData.optional && (
                    <Button 
                      variant="outline"
                      onClick={() => handleSkipStep(currentStepData.id)}
                      className="flex-1"
                    >
                      Skip for Now
                    </Button>
                  )}
                </div>

                {/* Skip all onboarding option */}
                {currentStep > 0 && (
                  <div className="pt-4 border-t">
                    <Button 
                      variant="ghost" 
                      onClick={handleSkipOnboarding}
                      className="w-full text-muted-foreground"
                    >
                      Skip Onboarding - Go to Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Completion state */}
          {currentStep >= steps.length && (
            <Card className="w-full">
              <CardHeader className="text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <CardTitle className="text-3xl font-bold font-headline text-green-700">
                  Setup Complete!
                </CardTitle>
                <CardDescription>
                  Redirecting you to your household dashboard...
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}