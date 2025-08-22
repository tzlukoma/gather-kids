import React from 'react';

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} gatherKids. All rights reserved.</p>
      </footer>
    </div>
  );
}
