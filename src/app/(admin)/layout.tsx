import React from 'react';
import { getGatherSystemAdminFlag } from '@/lib/flags/get-gathersystem-admin-flag';
import { AdminLayoutClient } from '@/components/gatherKids/admin-layout-client';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const useGatherSystemShell = await getGatherSystemAdminFlag();

	return (
		<AdminLayoutClient useGatherSystemShell={useGatherSystemShell}>
			{children}
		</AdminLayoutClient>
	);
}
