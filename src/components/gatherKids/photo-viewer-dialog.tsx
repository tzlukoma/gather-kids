
"use client"

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
                <div className="my-4">
                    <img src={photo?.url} alt={`Photo of ${photo?.name}`} className="rounded-md w-full h-auto object-contain" />
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
