
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/contexts/feature-flag-context";

interface FeatureFlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureFlagDialog({ isOpen, onClose }: FeatureFlagDialogProps) {
  const { flags, loading } = useFeatureFlags();

  if (loading) {
    return null; // Don't render until flags are loaded to prevent flash of incorrect state
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Feature Flags</DialogTitle>
          <DialogDescription>
            Current feature flag configuration (read-only, set via environment variables).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Magic Link Login</span>
            <span>{flags.loginMagicEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Password Login</span>
            <span>{flags.loginPasswordEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Google Login</span>
            <span>{flags.loginGoogleEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Draft Persistence</span>
            <span>{flags.registrationDraftPersistenceEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
