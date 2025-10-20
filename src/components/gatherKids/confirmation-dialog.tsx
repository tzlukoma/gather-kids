'use client';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
	isOpen: boolean;
	title: string;
	description: string;
	onConfirm: () => void;
	onCancel: () => void;
	variant?: 'default' | 'destructive';
	confirmText?: string;
	cancelText?: string;
}

export function ConfirmationDialog({
	isOpen,
	title,
	description,
	onConfirm,
	onCancel,
	variant = 'default',
	confirmText = 'Confirm',
	cancelText = 'Cancel',
}: ConfirmationDialogProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						{variant === 'destructive' && (
							<AlertTriangle className="h-5 w-5 text-destructive" />
						)}
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className={
							variant === 'destructive'
								? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
								: ''
						}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
