
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Church, Settings } from 'lucide-react';
import { SimpleSeedButton } from '@/components/ministrysync/simple-seed-button';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useState } from 'react';
import { FeatureFlagDialog } from '@/components/feature-flag-dialog';

export default function Home() {
  const { flags } = useFeatureFlags();
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center justify-between gap-2">
            <div className="font-headline text-2xl font-bold text-foreground">gatherKids</div>
             <nav>
                <Link href="/login">
                    <Button variant="outline">Sign In</Button>
                </Link>
            </nav>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto text-center px-4 py-16">
            <Church className="mx-auto h-16 w-16 text-primary mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Welcome to gatherKids</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                The simple, secure, and smart way to manage your children's ministry.
                Streamline check-ins, track attendance, and keep your community connected.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Link href="/register">
                    <Button size="lg">
                        Register Your Family
                        <ArrowRight className="ml-2" />
                    </Button>
                </Link>
                 <Link href="/dashboard">
                    <Button size="lg" variant="secondary">
                        Go to Admin Dashboard
                    </Button>
                </Link>
                {flags.showDemoFeatures && <SimpleSeedButton size="lg" variant="outline" />}
            </div>
        </div>
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
