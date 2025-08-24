
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center gap-2">
            <div className="font-headline text-2xl font-bold text-foreground">gatherKids</div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <footer className="py-6 border-t">
        <div className="container mx-auto flex justify-between items-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} gatherKids. All rights reserved.</p>
            <Button variant="ghost" size="icon" onClick={() => setIsFlagDialogOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Open Feature Flags</span>
            </Button>
        </div>
      </footer>
      <FeatureFlagDialog isOpen={isFlagDialogOpen} onClose={() => setIsFlagDialogOpen(false)} />
    </div>
  );
}
