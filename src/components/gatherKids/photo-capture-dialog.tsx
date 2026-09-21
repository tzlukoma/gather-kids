'use client';

import { SquareCropperModal } from '@/components/ui/square-cropper-modal';
import { useToast } from '@/hooks/use-toast';
import type { Child } from '@/lib/types';
import { useUpdateChildPhotoMutation } from '@/hooks/data';

interface PhotoCaptureDialogProps {
	child: Child | null;
	onClose: () => void;
}

export function PhotoCaptureDialog({
	child,
	onClose,
}: PhotoCaptureDialogProps) {
	const { toast } = useToast();
	const updatePhotoMutation = useUpdateChildPhotoMutation();

	const handleSave = async (_croppedBlob: Blob, croppedDataUrl: string) => {
		if (!child) return;

		try {
			await updatePhotoMutation.mutateAsync({
				childId: child.child_id,
				photoDataUrl: croppedDataUrl,
				householdId: child.household_id,
			});

			toast({
				title: 'Photo Updated',
				description: `A new photo has been saved for ${child.first_name}.`,
			});
		} catch (error) {
			console.error('Failed to save photo:', error);
			throw error;
		}
	};

	return (
		<SquareCropperModal
			isOpen={!!child}
			onClose={onClose}
			onSave={handleSave}
			title={child ? `Update Photo for ${child.first_name}` : ''}
		/>
	);
}
