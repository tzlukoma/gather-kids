import React from 'react';
import { Church } from 'lucide-react';

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center gap-2">
           <div className="p-1.5 rounded-lg bg-primary">
            <Church className="text-primary-foreground h-6 w-6" />
          </div>
          <h1 className="font-headline text-xl font-semibold text-foreground">
            MinistrySync Registration
          </h1>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} MinistrySync. All rights reserved.</p>
      </footer>
    </div>
  );
}
