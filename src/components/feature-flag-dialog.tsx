
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFeatureFlags } from "@/contexts/feature-flag-context";

interface FeatureFlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureFlagDialog({ isOpen, onClose }: FeatureFlagDialogProps) {
  const { flags, setFlag, loading } = useFeatureFlags();

  if (loading) {
    return null; // Don't render until flags are loaded to prevent flash of incorrect state
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Feature Flags</DialogTitle>
          <DialogDescription>
            Toggle features on and off for demonstration purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="show-demo-features" className="font-medium">Show Demo Features</Label>
                    <p className="text-xs text-muted-foreground">
                        {process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "false" 
                            ? "Demo features are disabled by environment configuration."
                            : "Display seeding buttons and helper text."}
                    </p>
                </div>
                <Switch
                    id="show-demo-features"
                    checked={flags.showDemoFeatures}
                    onCheckedChange={(checked) => setFlag('showDemoFeatures', checked)}
                    disabled={process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "false"}
                />
            </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
