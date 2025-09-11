'use client';

import React, { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface OnboardingModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
	const { user } = useAuth();

	const handleSetPassword = () => {
		// In a real implementation, this would open a password setup form
		console.log('Set Password clicked');
		// For demo, just close the modal and mark as dismissed
		markOnboardingDismissed();
		onClose();
	};

	const handleNotNow = () => {
		markOnboardingDismissed();
		onClose();
	};

	const markOnboardingDismissed = () => {
		// In demo mode, store dismissal in localStorage
		// In live mode, this would update user metadata in Supabase
		if (user) {
			const updatedUser = {
				...user,
				metadata: {
					...user.metadata,
					onboarding_dismissed: true,
				},
			};
			localStorage.setItem('gatherkids-user', JSON.stringify(updatedUser));
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="text-xl font-headline">
						Make future sign-ins faster
					</DialogTitle>
					<DialogDescription className="text-base">
						You&apos;re all set with magic link. Prefer a password next time? You can
						still use a magic link anytime.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col sm:flex-row gap-2">
					<Button
						variant="outline"
						onClick={handleNotNow}
						className="order-3 sm:order-1">
						Not now
					</Button>
					<Button onClick={handleSetPassword} className="order-1 sm:order-2">
						Set Password
					</Button>
					{/* Google sign-in is not enabled in this build */}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
