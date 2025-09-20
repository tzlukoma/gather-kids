'use client';

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { EnrichedChild } from './check-in-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Info,
	CheckCircle,
	Smartphone,
	User,
	Camera,
	Cake,
	AlertTriangle,
	ShieldAlert,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	format,
	isWithinInterval,
	subDays,
	addDays,
	setYear,
	parseISO,
	subYears,
	addYears,
} from 'date-fns';
import type { Incident, Child } from '@/lib/types';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
import { formatPhone } from '@/hooks/usePhoneFormat';

interface ChildCardProps {
	child: EnrichedChild;
	selectedEvent: string;
	onCheckIn: (childId: string) => void;
	onCheckout: (child: EnrichedChild) => void;
	onViewIncidents: (incidents: Incident[]) => void;
	onUpdatePhoto: (child: Child) => void;
	onViewPhoto: (photo: { name: string; url: string }) => void;
	canUpdatePhoto?: boolean; // New prop to control photo update visibility
}

const isBirthdayThisWeek = (dob?: string): boolean => {
	if (!dob) return false;
	try {
		const today = new Date();
		const birthDate = parseISO(dob);

		const currentYearBirthday = setYear(birthDate, today.getFullYear());

		const sevenDaysAgo = subDays(today, 7);
		const sevenDaysFromNow = addDays(today, 7);

		if (
			isWithinInterval(currentYearBirthday, {
				start: sevenDaysAgo,
				end: sevenDaysFromNow,
			})
		) {
			return true;
		}

		const nextYearBirthday = addYears(currentYearBirthday, 1);
		if (
			isWithinInterval(nextYearBirthday, {
				start: sevenDaysAgo,
				end: sevenDaysFromNow,
			})
		) {
			return true;
		}
		const prevYearBirthday = subYears(currentYearBirthday, 1);
		if (
			isWithinInterval(prevYearBirthday, {
				start: sevenDaysAgo,
				end: sevenDaysFromNow,
			})
		) {
			return true;
		}
	} catch (e) {
		return false;
	}

	return false;
};

const getEventName = (eventId: string | null) => {
	const eventNames: { [key: string]: string } = {
		evt_sunday_school: 'Sunday School',
		evt_childrens_church: 'Children&apos;s Church',
		evt_teen_church: 'Teen Church',
	};
	if (!eventId) return '';
	return eventNames[eventId] || 'an event';
};

export function ChildCard({
	child,
	selectedEvent,
	onCheckIn,
	onCheckout,
	onViewIncidents,
	onUpdatePhoto,
	onViewPhoto,
	canUpdatePhoto = true, // Default to true for backward compatibility
}: ChildCardProps) {
	const canSelfCheckout = child.age !== null && child.age >= 13;
	const checkedInEvent = child.activeAttendance?.event_id;
	const isCheckedInHere = checkedInEvent === selectedEvent;
	const isCheckedInElsewhere =
		checkedInEvent && checkedInEvent !== selectedEvent;
	const hasIncidents = child.incidents.length > 0;

	return (
		<Card
			key={child.child_id}
			className="relative flex flex-col overflow-hidden">
			{isBirthdayThisWeek(child.dob) && (
				<div className="bg-brand-orange text-white text-center py-1 px-2 text-sm font-semibold flex items-center justify-center gap-2">
					<Cake className="h-4 w-4" />
					Birthday This Week!
				</div>
			)}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-2 right-2 h-8 w-8 shrink-0 z-10">
						<Info className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80" align="end">
					<div className="space-y-4">
						{canSelfCheckout && child.child_mobile && (
							<div>
								<h4 className="font-semibold font-headline mb-2 flex items-center gap-2">
									<CheckCircle className="text-green-500" /> Self-Checkout
									Allowed
								</h4>
								<div className="text-sm">
									<p className="font-medium">
										{child.first_name} {child.last_name}
									</p>
									<p className="text-muted-foreground flex items-center gap-2">
										<Smartphone size={14} />
										{child.child_mobile
											? formatPhone(child.child_mobile)
											: 'N/A'}
									</p>
								</div>
							</div>
						)}
						<div>
							<h4 className="font-semibold font-headline mb-2">Guardians</h4>
							<div className="space-y-3">
								{child.guardians?.map((g) => (
									<div key={g.guardian_id} className="text-sm">
										<p className="font-medium">
											{g.first_name} {g.last_name} ({g.relationship})
										</p>
										<p className="text-muted-foreground">
											{g.mobile_phone ? formatPhone(g.mobile_phone) : 'N/A'}
										</p>
									</div>
								))}
								{!child.guardians?.length && (
									<p className="text-sm text-muted-foreground">
										No guardian information available.
									</p>
								)}
							</div>
						</div>
						<Separator />
						<div>
							<h4 className="font-semibold font-headline mb-2">
								Emergency Contact
							</h4>
							{child.emergencyContact ? (
								<div className="text-sm">
									<p className="font-medium">
										{child.emergencyContact.first_name}{' '}
										{child.emergencyContact.last_name} (
										{child.emergencyContact.relationship})
									</p>
									<p className="text-muted-foreground">
										{child.emergencyContact.mobile_phone
											? formatPhone(child.emergencyContact.mobile_phone)
											: 'N/A'}
									</p>
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No emergency contact available.
								</p>
							)}
						</div>
					</div>
				</PopoverContent>
			</Popover>
			<CardHeader className="flex flex-col items-center gap-4 p-4 pt-6 text-center sm:flex-row sm:items-start sm:p-6 sm:text-left">
				<div className="relative w-40 h-40 sm:w-[60px] sm:h-[60px] flex-shrink-0">
					<Button
						variant="ghost"
						className="w-full h-full p-0 rounded-full"
						onClick={() =>
							child.photo_url &&
							onViewPhoto({
								name: `${child.first_name} ${child.last_name}`,
								url: child.photo_url,
							})
						}>
						<Avatar className="w-full h-full border-2 border-border hover:border-primary transition-colors">
							<AvatarImage src={child.photo_url} alt={child.first_name} />
							<AvatarFallback>
								<User className="h-32 w-32 sm:h-8 sm:w-8 text-muted-foreground" />
							</AvatarFallback>
						</Avatar>
					</Button>
					{canUpdatePhoto && (
						<Button
							variant="outline"
							size="icon"
							className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background"
							onClick={() => onUpdatePhoto(child)}>
							<Camera className="h-4 w-4" />
						</Button>
					)}
				</div>
				<div className="flex-1">
					<CardTitle className="font-headline text-lg">{`${child.first_name} ${child.last_name}`}</CardTitle>
					<CardDescription>{child.household?.name || '...'}</CardDescription>
					<div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
						{isCheckedInHere && (
							<Badge
								variant="default"
								className="bg-brand-aqua hover:opacity-90">
								Checked In
							</Badge>
						)}
						{isCheckedInElsewhere && (
							<Badge variant="secondary">
								In {getEventName(checkedInEvent)}
							</Badge>
						)}
						{!checkedInEvent && <Badge variant="secondary">Checked Out</Badge>}
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex-grow space-y-2 px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
				<div className="text-sm text-muted-foreground space-y-2">
					<p>
						<strong>DOB:</strong>{' '}
						{child.dob ? format(parseISO(child.dob), 'MMM d, yyyy') : 'N/A'}{' '}
						{child.age !== null ? `(${child.age} yrs)` : ''}
					</p>
					<p>
						<strong>Grade:</strong> {normalizeGradeDisplay(child.grade)}
					</p>
					{child.medical_notes && (
						<p>
							<strong>Notes:</strong> {child.medical_notes}
						</p>
					)}
				</div>
				{child.allergies && (
					<Badge
						variant="outline"
						className="w-full justify-center text-base py-1 border-destructive text-destructive rounded-sm">
						<AlertTriangle className="mr-2 h-4 w-4" />
						Allergy: {child.allergies}
					</Badge>
				)}
			</CardContent>
			<CardFooter className="px-4 pb-4 sm:px-6 sm:pb-6 flex items-center gap-2">
				{hasIncidents && (
					<Button
						variant="destructive"
						size="icon"
						className="h-full aspect-square"
						onClick={() => onViewIncidents(child.incidents)}>
						<ShieldAlert className="h-5 w-5" />
						<span className="sr-only">View Incidents</span>
					</Button>
				)}
				{isCheckedInHere ? (
					<Button
						className="w-full"
						variant="outline"
						onClick={() => onCheckout(child)}>
						Check Out
					</Button>
				) : (
					<Button
						className="w-full"
						onClick={() => onCheckIn(child.child_id)}
						disabled={!!checkedInEvent}>
						Check In
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
