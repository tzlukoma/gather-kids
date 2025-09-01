'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuthRole } from '@/lib/auth-types';
import React from 'react';

export default function AdminLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ProtectedRoute allowedRoles={[AuthRole.ADMIN]}>
			<div className="min-h-screen bg-muted/20">{children}</div>
		</ProtectedRoute>
	);
}
