'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ChildCard } from '@/components/gatherKids/child-card';
import type { Child } from '@/lib/types';
import { PhotoCaptureDialog } from '@/components/gatherKids/photo-capture-dialog';
import { PhotoViewerDialog } from '@/components/gatherKids/photo-viewer-dialog';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { useHouseholdProfile } from '@/hooks/data';

export default function ChildProfilePage() {
	const params = useParams();
	const { user } = useAuth();
	const childId = params.childId as string;

	const [showCapture, setShowCapture] = useState<Child | null>(null);
	const [viewPhoto, setViewPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	// Use React Query hook for household profile data
	const { data: profileData, isLoading } = useHouseholdProfile(user?.metadata?.household_id || '');

	// Find the specific child from the profile data
	const child = profileData?.children.find((c) => c.child_id === childId) || null;

	const handleUpdatePhoto = async (c: Child) => {
		setShowCapture(c as any);
	};

	if (isLoading || !child) return <div>Loading child...</div>;

	return (
		<div>
			<h1 className="text-3xl font-headline font-bold">{`${child.first_name} ${child.last_name}`}</h1>
			<p className="text-muted-foreground">Child profile and quick actions</p>
			<div className="mt-6">
				<ChildCard
					child={child as any}
					selectedEvent={null as any}
					onCheckIn={() => {}}
					onCheckout={() => {}}
					onViewIncidents={() => {}}
					onUpdatePhoto={(c: any) => handleUpdatePhoto(c)}
					onViewPhoto={(p) => setViewPhoto(p)}
					canUpdatePhoto={canUpdateChildPhoto(user, child)}
				/>
			</div>

			<PhotoCaptureDialog
				child={showCapture as any}
				onClose={() => setShowCapture(null)}
			/>

			<PhotoViewerDialog photo={viewPhoto} onClose={() => setViewPhoto(null)} />
		</div>
	);
}
