'use client';

import type { HouseholdProfileData } from '@/lib/dal';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import {
	Mail,
	Phone,
	User,
	Home,
	CheckCircle2,
	HeartPulse,
	Camera,
	Expand,
	Edit,
	Trash2,
} from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { PhotoCaptureDialog } from './photo-capture-dialog';
import { PhotoViewerDialog } from './photo-viewer-dialog';
import { EditGuardianModal } from './edit-guardian-modal';
import { EditEmergencyContactModal } from './edit-emergency-contact-modal';
import { EditChildModal } from './edit-child-modal';
import { EditHouseholdAddressModal } from './edit-household-address-modal';
import { EditChildEnrollmentsModal } from './edit-child-enrollments-modal';
import { ConfirmationDialog } from './confirmation-dialog';
import type { Child, Guardian, EmergencyContact, Household } from '@/lib/types';
import { formatPhone } from '@/hooks/usePhoneFormat';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
import { useAuth } from '@/contexts/auth-context';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { canEditHousehold } from '@/lib/permissions/household';
import {
	useRemoveGuardian,
	useSoftDeleteChild,
	useReactivateChild,
} from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';

const InfoItem = ({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) => (
	<div className="flex items-start gap-3">
		<div className="text-muted-foreground mt-1">{icon}</div>
		<div>
			<p className="text-sm text-muted-foreground">{label}</p>
			{typeof value === 'string' ? (
				<p className="font-medium">{value}</p>
			) : (
				<div className="font-medium">{value}</div>
			)}
		</div>
	</div>
);

const formatAddress = (household: any) => {
	if (!household) return ['N/A'];

	const addressParts = [];

	if (household.address_line1) {
		addressParts.push(household.address_line1);
	}

	if (household.address_line2) {
		addressParts.push(household.address_line2);
	}

	const cityStateZip = [];
	if (household.city) cityStateZip.push(household.city);
	if (household.state) cityStateZip.push(household.state);
	if (household.zip) cityStateZip.push(household.zip);

	if (cityStateZip.length > 0) {
		addressParts.push(cityStateZip.join(', '));
	}

	return addressParts.length > 0 ? addressParts : ['N/A'];
};

const ProgramEnrollmentCard = ({
	enrollment,
}: {
	enrollment: HouseholdProfileData['children'][0]['enrollmentsByCycle'][string][0];
}) => {
	const customFields = enrollment.custom_fields || {};
	const customQuestions = enrollment.customQuestions || [];

	return (
		<div className="p-3 rounded-md border bg-muted/25">
			<div className="flex justify-between items-center">
				<p className="font-medium">{enrollment.ministryName}</p>
				<Badge
					variant={enrollment.status === 'enrolled' ? 'default' : 'secondary'}>
					{enrollment.status.replace('_', ' ')}
				</Badge>
			</div>
			{Object.keys(customFields).length > 0 && (
				<div className="mt-2 text-sm text-muted-foreground pl-4 border-l-2 ml-2 space-y-1">
					{Object.entries(customFields).map(([key, value]) => {
						const question = customQuestions.find((q) => q.id === key);
						if (!question) return null;

						const displayValue =
							typeof value === 'boolean'
								? value
									? 'Yes'
									: 'No'
								: String(value);

						return (
							<p key={key}>
								<strong>{question?.text}:</strong> {displayValue}
							</p>
						);
					})}
				</div>
			)}
		</div>
	);
};

const ChildCard = ({
	child,
	cycleNames,
	onPhotoClick,
	onPhotoViewClick,
	onEditChild,
	onEditEnrollments,
	onDeleteChild,
	onReactivateChild,
	user,
	canEdit,
}: {
	child: HouseholdProfileData['children'][0];
	cycleNames: Record<string, string>;
	onPhotoClick: (child: Child) => void;
	onPhotoViewClick: (photo: { name: string; url: string }) => void;
	onEditChild: (child: Child) => void;
	onEditEnrollments: (child: Child) => void;
	onDeleteChild: (child: Child) => void;
	onReactivateChild?: (child: Child) => void;
	user: any; // BaseUser type
	canEdit: boolean;
}) => {
	const sortedCycleIds = Object.keys(child.enrollmentsByCycle).sort((a, b) =>
		b.localeCompare(a)
	);
	const currentCycleId =
		sortedCycleIds.length > 0 ? sortedCycleIds[0] : undefined;

	return (
		<Card className={!child.is_active ? 'bg-muted/25' : ''}>
			<CardHeader className="flex-row gap-4 items-start">
				<div className="relative w-16 h-16 sm:w-16 sm:h-16 flex-shrink-0">
					<Button
						variant="ghost"
						className="w-full h-full p-0 rounded-full"
						onClick={() =>
							child.photo_url &&
							onPhotoViewClick({
								name: `${child.first_name} ${child.last_name}`,
								url: child.photo_url,
							})
						}>
						<Avatar className="h-full w-full">
							<AvatarImage src={child.photo_url} alt={child.first_name} />
							<AvatarFallback>
								<User className="h-8 w-8" />
							</AvatarFallback>
						</Avatar>
					</Button>
					{canUpdateChildPhoto(user, child) && (
						<Button
							variant="outline"
							size="icon"
							className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background"
							onClick={() => onPhotoClick(child)}>
							<Camera className="h-4 w-4" />
						</Button>
					)}
				</div>
				<div className="flex-1">
					<CardTitle className="font-headline flex items-center gap-2">
						{child.first_name} {child.last_name}
						{!child.is_active && <Badge variant="outline">Inactive</Badge>}
					</CardTitle>
					<CardDescription>
						{normalizeGradeDisplay(child.grade)} (Age {child.age})
					</CardDescription>
				</div>
				{canEdit && (
					<div className="flex gap-2">
						{child.is_active ? (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onEditChild(child)}>
									Edit
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onEditEnrollments(child)}>
									Enrollments
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onDeleteChild(child)}>
									Delete
								</Button>
							</>
						) : (
							<>
								{onReactivateChild && (
									<Button
										variant="default"
										size="sm"
										onClick={() => onReactivateChild(child)}>
										Reactivate
									</Button>
								)}
							</>
						)}
					</div>
				)}
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{child.allergies && child.allergies.toLowerCase() !== 'none' && (
						<InfoItem
							icon={<HeartPulse size={16} />}
							label="Allergies / Medical"
							value={child.allergies}
						/>
					)}
					<InfoItem
						icon={<HeartPulse size={16} />}
						label="Special Needs"
						value={
							child.special_needs ? child.special_needs_notes || 'Yes' : 'No'
						}
					/>
				</div>
				<Separator />
				<div>
					<h4 className="font-semibold mb-2 flex items-center gap-2">
						<CheckCircle2 /> Program Enrollments & Interests
					</h4>
					<Accordion
						type="multiple"
						defaultValue={currentCycleId ? [currentCycleId] : []}
						className="w-full">
						{sortedCycleIds.map((cycleId) => {
							const enrollments = child.enrollmentsByCycle[cycleId];
							const cycleName = cycleNames[cycleId] || cycleId; // Fallback to cycleId if name not found
							return (
								<AccordionItem key={cycleId} value={cycleId}>
									<AccordionTrigger>
										{cycleName} Registration Year
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-3">
											{enrollments.map((e) => (
												<ProgramEnrollmentCard
													key={e.enrollment_id}
													enrollment={e}
												/>
											))}
											{enrollments.length === 0 && (
												<p className="text-sm text-muted-foreground">
													No program enrollments or interests listed for this
													year.
												</p>
											)}
										</div>
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				</div>
			</CardContent>
		</Card>
	);
};

export function HouseholdProfile({
	profileData,
}: {
	profileData: HouseholdProfileData;
}) {
	const { household, guardians, emergencyContact, children, cycleNames } =
		profileData;
	const { user } = useAuth();
	const { toast } = useToast();
	const [selectedChildForPhoto, setSelectedChildForPhoto] =
		useState<Child | null>(null);
	const [viewingPhoto, setViewingPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	// Edit modal states
	const [editingGuardian, setEditingGuardian] = useState<
		Guardian | null | undefined
	>(undefined);
	const [editingEmergencyContact, setEditingEmergencyContact] =
		useState<EmergencyContact | null>(null);
	const [editingChild, setEditingChild] = useState<Child | null | undefined>(
		undefined
	);
	const [editingHouseholdAddress, setEditingHouseholdAddress] =
		useState<Household | null>(null);
	const [editingChildEnrollments, setEditingChildEnrollments] =
		useState<Child | null>(null);
	const [deletingGuardian, setDeletingGuardian] = useState<Guardian | null>(
		null
	);
	const [deletingChild, setDeletingChild] = useState<Child | null>(null);

	// Mutations
	const removeGuardianMutation = useRemoveGuardian();
	const softDeleteChildMutation = useSoftDeleteChild();
	const reactivateChildMutation = useReactivateChild();

	// Permission check
	const canEdit = household
		? canEditHousehold(user, household.household_id)
		: false;

	const handleDeleteGuardian = async () => {
		if (!deletingGuardian || !household) return;

		try {
			await removeGuardianMutation.mutateAsync({
				guardianId: deletingGuardian.guardian_id,
				householdId: household.household_id,
			});
			setDeletingGuardian(null);
		} catch (error) {
			console.error('Failed to delete guardian:', error);
		}
	};

	const handleDeleteChild = async () => {
		if (!deletingChild || !household) return;

		try {
			await softDeleteChildMutation.mutateAsync({
				childId: deletingChild.child_id,
				householdId: household.household_id,
			});
			setDeletingChild(null);
		} catch (error) {
			console.error('Failed to delete child:', error);
		}
	};

	const handleReactivateChild = async (child: Child) => {
		if (!household) return;

		try {
			await reactivateChildMutation.mutateAsync({
				childId: child.child_id,
				householdId: household.household_id,
			});
			toast({
				title: 'Child Reactivated',
				description: `${child.first_name} ${child.last_name} has been reactivated and is now available for check-in and enrollment.`,
			});
		} catch (error) {
			console.error('Failed to reactivate child:', error);
			toast({
				title: 'Reactivate Failed',
				description: 'Could not reactivate the child. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const activeChildren = children.filter((c) => c.is_active);
	const inactiveChildren = children.filter((c) => !c.is_active);

	return (
		<>
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="text-3xl font-bold font-headline">
						{household?.name}
					</h1>
					<p className="text-muted-foreground">
						Registered on{' '}
						{household && format(parseISO(household.created_at), 'PPpp')}
					</p>
				</div>

				{canEdit && (
					<div className="flex gap-4 justify-start">
						<Button
							variant="outline"
							onClick={() => setEditingGuardian(null)}>
							Add Guardian
						</Button>
						<Button
							variant="outline"
							onClick={() => setEditingChild(null)}>
							Add Child
						</Button>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="lg:col-span-1 h-fit">
						<CardHeader>
							<CardTitle className="font-headline flex items-center gap-2">
								<User /> Guardians & Contacts
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{guardians.map((g) => (
								<div key={g.guardian_id} className="space-y-2">
									<div className="flex items-center justify-between">
										<h4 className="font-semibold">
											{g.first_name} {g.last_name} ({g.relationship}){' '}
											{g.is_primary && <Badge>Primary</Badge>}
										</h4>
										{canEdit && (
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0"
													onClick={() => setEditingGuardian(g)}>
													<Edit size={14} />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
													onClick={() => setDeletingGuardian(g)}>
													<Trash2 size={14} />
												</Button>
											</div>
										)}
									</div>
									<InfoItem
										icon={<Mail size={16} />}
										label="Email"
										value={g.email || 'N/A'}
									/>
									<InfoItem
										icon={<Phone size={16} />}
										label="Phone"
										value={g.mobile_phone ? formatPhone(g.mobile_phone) : 'N/A'}
									/>
								</div>
							))}
							<Separator />
							{emergencyContact && (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<h4 className="font-semibold">
											{emergencyContact.first_name} {emergencyContact.last_name}{' '}
											(Emergency)
										</h4>
										{canEdit && (
											<Button
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0"
												onClick={() =>
													setEditingEmergencyContact(emergencyContact)
												}>
												<Edit size={14} />
											</Button>
										)}
									</div>
									<InfoItem
										icon={<Phone size={16} />}
										label="Phone"
										value={
											emergencyContact.mobile_phone
												? formatPhone(emergencyContact.mobile_phone)
												: 'N/A'
										}
									/>
									<InfoItem
										icon={<User size={16} />}
										label="Relationship"
										value={emergencyContact.relationship}
									/>
								</div>
							)}
							<Separator />
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h4 className="font-semibold">Address</h4>
									{canEdit && (
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() => setEditingHouseholdAddress(household)}>
											<Edit size={14} />
										</Button>
									)}
								</div>
								<InfoItem
									icon={<Home size={16} />}
									label="Address"
									value={
										<div>
											{formatAddress(household).map((line, index) => (
												<div key={index}>{line}</div>
											))}
										</div>
									}
								/>
							</div>
						</CardContent>
					</Card>

					<div className="lg:col-span-2 space-y-6">
						{activeChildren.map((child) => (
							<ChildCard
								key={child.child_id}
								child={child}
								cycleNames={cycleNames}
								onPhotoClick={setSelectedChildForPhoto}
								onPhotoViewClick={setViewingPhoto}
								onEditChild={setEditingChild}
								onEditEnrollments={setEditingChildEnrollments}
								onDeleteChild={setDeletingChild}
								user={user}
								canEdit={canEdit}
							/>
						))}

						{inactiveChildren.length > 0 && (
							<>
								<div className="relative py-2">
									<div className="absolute inset-0 flex items-center">
										<span className="w-full border-t" />
									</div>
									<div className="relative flex justify-center">
										<span className="bg-background px-2 text-sm text-muted-foreground">
											Inactive
										</span>
									</div>
								</div>
								{inactiveChildren.map((child) => (
									<ChildCard
										key={child.child_id}
										child={child}
										cycleNames={cycleNames}
										onPhotoClick={setSelectedChildForPhoto}
										onPhotoViewClick={setViewingPhoto}
										onEditChild={setEditingChild}
										onEditEnrollments={setEditingChildEnrollments}
										onDeleteChild={setDeletingChild}
										onReactivateChild={handleReactivateChild}
										user={user}
										canEdit={canEdit}
									/>
								))}
							</>
						)}
					</div>
				</div>
			</div>
			<PhotoCaptureDialog
				child={selectedChildForPhoto}
				onClose={() => setSelectedChildForPhoto(null)}
			/>
			<PhotoViewerDialog
				photo={viewingPhoto}
				onClose={() => setViewingPhoto(null)}
			/>

			{/* Edit Modals */}
			{editingGuardian !== undefined && (
				<EditGuardianModal
					guardian={editingGuardian}
					householdId={household?.household_id || ''}
					onClose={() => setEditingGuardian(undefined)}
				/>
			)}

			{editingEmergencyContact && (
				<EditEmergencyContactModal
					contact={editingEmergencyContact}
					householdId={household?.household_id || ''}
					onClose={() => setEditingEmergencyContact(null)}
				/>
			)}

			{editingChild !== undefined && (
				<EditChildModal
					child={editingChild}
					householdId={household?.household_id || ''}
					onClose={() => setEditingChild(undefined)}
				/>
			)}

			{editingHouseholdAddress && (
				<EditHouseholdAddressModal
					household={editingHouseholdAddress}
					onClose={() => setEditingHouseholdAddress(null)}
				/>
			)}

			{editingChildEnrollments && (
				<EditChildEnrollmentsModal
					child={editingChildEnrollments}
					householdId={household?.household_id || ''}
					currentEnrollments={editingChildEnrollments.enrollmentsByCycle}
					onClose={() => setEditingChildEnrollments(null)}
				/>
			)}

			{/* Confirmation Dialogs */}
			<ConfirmationDialog
				isOpen={deletingGuardian !== null}
				title="Remove Guardian"
				description={`Are you sure you want to remove ${deletingGuardian?.first_name} ${deletingGuardian?.last_name} from this household? This action cannot be undone.`}
				onConfirm={handleDeleteGuardian}
				onCancel={() => setDeletingGuardian(null)}
				confirmText="Remove"
				cancelText="Cancel"
				variant="destructive"
			/>

			<ConfirmationDialog
				isOpen={deletingChild !== null}
				title="Remove Child"
				description={`Are you sure you want to remove ${deletingChild?.first_name} ${deletingChild?.last_name} from this household? This will mark them as inactive and cannot be undone.`}
				onConfirm={handleDeleteChild}
				onCancel={() => setDeletingChild(null)}
				confirmText="Remove"
				cancelText="Cancel"
				variant="destructive"
			/>
		</>
	);
}
