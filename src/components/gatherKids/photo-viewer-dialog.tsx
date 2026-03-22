
"use client"

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PhotoViewerDialogProps {
    photo: { name: string; url: string } | null;
    onClose: () => void;
}

export function PhotoViewerDialog({ photo, onClose }: PhotoViewerDialogProps) {
    return (
        <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline">Photo of {photo?.name}</DialogTitle>
                </DialogHeader>
                {/* PERF-08: next/image with fill for responsive photo display */}
                <div className="my-4 relative w-full aspect-[4/3]">
                    {photo?.url && (
                        <Image
                            src={photo.url}
                            alt={`Photo of ${photo?.name}`}
                            fill
                            className="rounded-md object-contain"
                            sizes="(max-width: 640px) 100vw, 512px"
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
