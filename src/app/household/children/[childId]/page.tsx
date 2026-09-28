'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ChildCard } from '@/components/gatherKids/child-card';
import { useGuardianShell } from '@/components/gatherKids/guardian-shell-context';
import { GuardianChildGatherSystem } from '@/components/gatherKids/guardian-child-gathersystem';
import { GuardianSkeleton } from '@/components/skeletons/guardian-skeleton';
import { useGuardianHouseholdProfile } from '@/hooks/use-guardian-household-profile';
import type { Child } from '@/lib/types';
// PERF-06: Lazy-load camera/photo dialogs — heavy media components only needed on demand
import dynamic from 'next/dynamic';
const PhotoCaptureDialog = dynamic(
	() => import('@/components/gatherKids/photo-capture-dialog').then((m) => m.PhotoCaptureDialog),
	{ loading: () => null }
);
const PhotoViewerDialog = dynamic(
	() => import('@/components/gatherKids/photo-viewer-dialog').then((m) => m.PhotoViewerDialog),
	{ loading: () => null }
);
import { canUpdateChildPhoto } from '@/lib/permissions';
import { useHouseholdProfile } from '@/hooks/data';

export default function ChildProfilePage() {
	// Published by the household layout, which resolved the flag on the server.
	const useGatherSystemGuardian = useGuardianShell();
	return useGatherSystemGuardian ? <GatherSystemChildPage /> : <LegacyChildPage />;
}

/**
 * Flag on (`gathersystem_guardian`). The household comes from the section's
 * shared lookup, without its `/register` redirect: the legacy page never had
 * one, and a guardian following a link to their own child should not be sent
 * away from it.
 */
function GatherSystemChildPage() {
	const params = useParams();
	const childId = params.childId as string;
	const { profileData, isLoading, error, householdResolved } =
		useGuardianHouseholdProfile({ redirectToRegistration: false });

	if (error) {
		return (
			<p className="text-body-15 text-destructive">
				Failed to load this child&apos;s profile. Please refresh the page.
			</p>
		);
	}

	if (!householdResolved || isLoading) return <GuardianSkeleton />;

	const child = profileData?.children.find((c) => c.child_id === childId) ?? null;
	if (!profileData || !child) {
		return (
			<div className="flex flex-col gap-2">
				<h1 className="text-headline-22 font-semibold text-foreground">Child not found</h1>
				<p className="text-body-15 text-muted-foreground">
					This child isn&apos;t part of your household.
				</p>
			</div>
		);
	}

	return <GuardianChildGatherSystem child={child} profileData={profileData} />;
}

/** Flag off: unchanged. */
function LegacyChildPage() {
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
