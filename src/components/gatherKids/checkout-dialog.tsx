'use client';

import { useState, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { EnrichedChild } from './check-in-view';

interface CheckoutDialogProps {
	child: EnrichedChild | null;
	onClose: () => void;
	onCheckout: (
		childId: string,
		attendanceId: string,
		verifier: { method: 'PIN' | 'other'; value: string; pickedUpBy?: string }
	) => void;
}

const eventNames: { [key: string]: string } = {
	evt_sunday_school: 'Sunday School',
	evt_childrens_church: 'Children&apos;s Church',
	evt_teen_church: 'Teen Church',
	min_choir_kids: 'Children&apos;s Choir Practice',
	min_youth_group: 'Youth Group',
};

const getEventName = (eventId: string | null) => {
	if (!eventId) return '';
	return eventNames[eventId] || 'an event';
};

export function CheckoutDialog({
	child,
	onClose,
	onCheckout,
}: CheckoutDialogProps) {
	const [pin, setPin] = useState('');
	const [overrideName, setOverrideName] = useState('');
	const [mode, setMode] = useState<'pin' | 'override'>('pin');
	const { toast } = useToast();

	const canSelfCheckout = useMemo(() => {
		if (!child?.age) return false;
		return child.age >= 13;
	}, [child]);

	const handleClose = () => {
		setPin('');
		setOverrideName('');
		setMode('pin');
		onClose();
	};

	const handleVerifyAndCheckout = () => {
		if (!child) return;

		// Find which guardian/contact provided the matching PIN
		let matchedPerson = null;

		// Check guardians
		for (const guardian of child.guardians) {
			if (guardian.mobile_phone.slice(-4) === pin) {
				matchedPerson = `${guardian.first_name} ${guardian.last_name}`;
				break;
			}
		}

		// Check emergency contact if no guardian match
		if (
			!matchedPerson &&
			child.emergencyContact?.mobile_phone?.slice(-4) === pin
		) {
			matchedPerson = `${child.emergencyContact.first_name} ${child.emergencyContact.last_name}`;
		}

		// Check child's own phone if no other match and can self-checkout
		if (
			!matchedPerson &&
			canSelfCheckout &&
			child.child_mobile?.slice(-4) === pin
		) {
			matchedPerson = `${child.first_name} ${child.last_name} (Self)`;
		}

		if (matchedPerson) {
			if (child.activeAttendance?.attendance_id) {
				onCheckout(child.child_id, child.activeAttendance.attendance_id, {
					method: 'PIN',
					value: pin,
					pickedUpBy: matchedPerson,
				});
			}
			handleClose();
		} else {
			toast({
				variant: 'destructive',
				title: 'Verification Failed',
				description:
					'Invalid PIN or phone number last 4 digits. Please try again.',
			});
			setPin('');
		}
	};

	const handleOverrideCheckout = () => {
		if (!child) return;
		if (!overrideName.trim()) {
			toast({
				variant: 'destructive',
				title: 'Name required',
				description:
					'Please enter the name of the person picking up the child.',
			});
			return;
		}
		if (child.activeAttendance?.attendance_id) {
			onCheckout(child.child_id, child.activeAttendance.attendance_id, {
				method: 'other',
				value: overrideName.trim(),
				pickedUpBy: overrideName.trim(),
			});
		}
		handleClose();
	};

	return (
		<Dialog open={!!child} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-headline">
						Checkout: {child?.first_name} {child?.last_name}
					</DialogTitle>
					<DialogDescription>
						{mode === 'pin'
							? `To check out ${child?.first_name} from ${getEventName(
									child?.activeAttendance?.event_id || null
							  )}, please enter the last 4 digits of an authorized phone number.`
							: `Record the name of the person picking up ${child?.first_name}. This action is logged.`}
					</DialogDescription>
				</DialogHeader>

				{mode === 'pin' ? (
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="pin" className="text-right">
								Phone Last 4
							</Label>
							<Input
								id="pin"
								value={pin}
								onChange={(e) => setPin(e.target.value)}
								className="col-span-3"
								maxLength={4}
								type="password"
								placeholder="••••"
							/>
						</div>
					</div>
				) : (
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="pickup-name" className="text-right">
								Pickup Name
							</Label>
							<Input
								id="pickup-name"
								value={overrideName}
								onChange={(e) => setOverrideName(e.target.value)}
								className="col-span-3"
								placeholder="e.g., Jane Doe"
							/>
						</div>
					</div>
				)}

				<DialogFooter className="sm:justify-between">
					{mode === 'pin' ? (
						<Button variant="outline" onClick={() => setMode('override')}>
							Admin Override
						</Button>
					) : (
						<Button variant="outline" onClick={() => setMode('pin')}>
							Back to PIN
						</Button>
					)}

					<div className="flex gap-2">
						<Button variant="ghost" onClick={handleClose}>
							Cancel
						</Button>
						{mode === 'pin' ? (
							<Button onClick={handleVerifyAndCheckout}>
								Verify & Check Out
							</Button>
						) : (
							<Button onClick={handleOverrideCheckout}>Confirm Override</Button>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
