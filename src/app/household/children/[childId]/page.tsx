'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getHouseholdProfile, updateChildPhoto } from '@/lib/dal';
import { useAuth } from '@/contexts/auth-context';
import { ChildCard } from '@/components/gatherKids/child-card';
import type { Child } from '@/lib/types';
import { PhotoCaptureDialog } from '@/components/gatherKids/photo-capture-dialog';
import { PhotoViewerDialog } from '@/components/gatherKids/photo-viewer-dialog';
import { canUpdateChildPhoto } from '@/lib/permissions';

export default function ChildProfilePage() {
	const params = useParams();
	const { user } = useAuth();
	const childId = params.childId as string;

	const [child, setChild] = useState<Child | null>(null);
	const [updatingPhoto, setUpdatingPhoto] = useState(false);
	const [showCapture, setShowCapture] = useState<Child | null>(null);
	const [viewPhoto, setViewPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	useEffect(() => {
		const load = async () => {
			if (!user?.metadata?.household_id) return;
			const data = await getHouseholdProfile(user.metadata.household_id);
			const found = data.children.find((c) => c.child_id === childId);
			if (found) setChild(found as Child);
		};
		load();
	}, [user, childId]);

	if (!child) return <div>Loading child...</div>;

	const handleUpdatePhoto = async (c: Child) => {
		setShowCapture(c as any);
	};

	const handlePhotoCaptured = async (dataUrl: string) => {
		if (!child) return;
		setUpdatingPhoto(true);
		try {
			await updateChildPhoto(child.child_id, dataUrl);
			setChild({ ...child, photo_url: dataUrl });
		} finally {
			setUpdatingPhoto(false);
			setShowCapture(null);
		}
	};

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
