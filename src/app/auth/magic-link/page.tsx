import { Suspense } from 'react';
import MagicLinkContent from './magic-link-content';

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-muted/50">
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  );
}