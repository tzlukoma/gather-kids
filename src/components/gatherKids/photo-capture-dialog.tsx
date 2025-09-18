"use client"

import { useToast } from '@/hooks/use-toast';
import type { Child } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { isDemo } from '@/lib/featureFlags';
import { SquareCropperModal } from '@/components/ui/square-cropper-modal';

interface PhotoCaptureDialogProps {
    child: Child | null;
    onClose: () => void;
}

export function PhotoCaptureDialog({ child, onClose }: PhotoCaptureDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();

    const handleSave = async (croppedBlob: Blob, croppedDataUrl: string) => {
        if (!child || !user) return;

        try {
            if (isDemo()) {
                // In demo mode, use the cropped data URL directly
                const { updateChildPhoto } = await import('@/lib/dal');
                await updateChildPhoto(child.child_id, croppedDataUrl);
            } else {
                // In production mode, upload via API
                const formData = new FormData();
                formData.append('file', croppedBlob, `${child.child_id}-photo.webp`);
                formData.append('userData', JSON.stringify(user));

                const response = await fetch(`/api/children/${child.child_id}/photo`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to upload photo');
                }
            }

            toast({
                title: 'Photo Updated',
                description: `A new photo has been saved for ${child.first_name}.`,
            });

        } catch (error) {
            console.error('Failed to save photo:', error);
            toast({
                title: 'Save Failed',
                description: error instanceof Error ? error.message : 'Could not save the photo. Please try again.',
                variant: 'destructive'
            });
            throw error; // Re-throw to prevent modal from closing
        }
    };

    return (
        <SquareCropperModal
            isOpen={!!child}
            onClose={onClose}
            onSave={handleSave}
            title={`Update Photo for ${child?.first_name || 'Child'}`}
            description="Select and crop a square photo for this child's profile."
            acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
            maxFileSize={10 * 1024 * 1024} // 10MB
            outputSize={512}
        />
    );
}