import { Suspense } from 'react';
import RegisterContent from './register-content';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <div className="text-center">Loading registration form...</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}