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
	Plus,
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
import type { Child } from '@/lib/types';
import { formatPhone } from '@/hooks/usePhoneFormat';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';
import { useAuth } from '@/contexts/auth-context';
import { canUpdateChildPhoto } from '@/lib/permissions';
import { canEditHousehold } from '@/lib/permissions/household';
import { EditGuardianModal } from './edit-guardian-modal';
import { EditEmergencyContactModal } from './edit-emergency-contact-modal';
import { EditChildModal } from './edit-child-modal';
import { EditChildEnrollmentsModal } from './edit-child-enrollments-modal';
import { EditHouseholdAddressModal } from './edit-household-address-modal';
import { ConfirmationDialog } from './confirmation-dialog';
import { useRemoveGuardian, useSoftDeleteChild } from '@/hooks/data';
import type { Guardian, Child, MinistryEnrollment } from '@/lib/types';

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
	user,
	canEdit,
	onEditChild,
	onEditEnrollments,
	onDeleteChild,
}: {
	child: HouseholdProfileData['children'][0];
	cycleNames: Record<string, string>;
	onPhotoClick: (child: Child) => void;
	onPhotoViewClick: (photo: { name: string; url: string }) => void;
	user: any; // BaseUser type
	canEdit?: boolean;
	onEditChild?: () => void;
	onEditEnrollments?: () => void;
	onDeleteChild?: () => void;
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
				<div>
					<CardTitle className="font-headline flex items-center gap-2">
						{child.first_name} {child.last_name}
						{!child.is_active && <Badge variant="outline">Inactive</Badge>}
						{canEdit && (
							<div className="ml-auto flex gap-1">
								<Button
									variant="outline"
									size="sm"
									onClick={onEditChild}
								>
									<Edit className="h-4 w-4 mr-1" />
									Edit
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={onEditEnrollments}
								>
									<CheckCircle2 className="h-4 w-4 mr-1" />
									Enrollments
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={onDeleteChild}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						)}
					</CardTitle>
					<CardDescription>
						{normalizeGradeDisplay(child.grade)} (Age {child.age})
					</CardDescription>
				</div>
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
	const [selectedChildForPhoto, setSelectedChildForPhoto] =
		useState<Child | null>(null);
	const [viewingPhoto, setViewingPhoto] = useState<{
		name: string;
		url: string;
	} | null>(null);

	// Edit modal states
	const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
	const [showAddGuardian, setShowAddGuardian] = useState(false);
	const [editingEmergencyContact, setEditingEmergencyContact] = useState(false);
	const [editingChild, setEditingChild] = useState<Child | null>(null);
	const [showAddChild, setShowAddChild] = useState(false);
	const [editingEnrollments, setEditingEnrollments] = useState<{
		child: Child;
		enrollments: MinistryEnrollment[];
	} | null>(null);
	const [showEditHousehold, setShowEditHousehold] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
		type: 'guardian' | 'child';
		id: string;
		name: string;
	} | null>(null);

	// Check if user can edit this household
	const canEdit = canEditHousehold(user, household?.household_id || '');

	// Mutation hooks
	const removeGuardianMutation = useRemoveGuardian();
	const softDeleteChildMutation = useSoftDeleteChild();

	const activeChildren = children.filter((c) => c.is_active);
	const inactiveChildren = children.filter((c) => !c.is_active);

	const handleDeleteGuardian = async () => {
		if (!showDeleteConfirm) return;
		
		try {
			await removeGuardianMutation.mutateAsync({
				guardianId: showDeleteConfirm.id,
				householdId: household?.household_id || '',
			});
			setShowDeleteConfirm(null);
		} catch (error) {
			console.error('Failed to delete guardian:', error);
		}
	};

	const handleDeleteChild = async () => {
		if (!showDeleteConfirm) return;
		
		try {
			await softDeleteChildMutation.mutateAsync({
				childId: showDeleteConfirm.id,
				householdId: household?.household_id || '',
			});
			setShowDeleteConfirm(null);
		} catch (error) {
			console.error('Failed to delete child:', error);
		}
	};

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

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="lg:col-span-1 h-fit">
						<CardHeader>
							<CardTitle className="font-headline flex items-center gap-2">
								<User /> Guardians & Contacts
								{canEdit && (
									<div className="ml-auto flex gap-1">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setShowAddGuardian(true)}
										>
											<Plus className="h-4 w-4 mr-1" />
											Add Guardian
										</Button>
									</div>
								)}
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
													variant="outline"
													size="sm"
													onClick={() => setEditingGuardian(g)}
												>
													<Edit className="h-4 w-4" />
												</Button>
												{guardians.length > 1 && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => setShowDeleteConfirm({
															type: 'guardian',
															id: g.guardian_id,
															name: `${g.first_name} ${g.last_name}`
														})}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												)}
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
												variant="outline"
												size="sm"
												onClick={() => setEditingEmergencyContact(true)}
											>
												<Edit className="h-4 w-4 mr-1" />
												Edit
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
											variant="outline"
											size="sm"
											onClick={() => setShowEditHousehold(true)}
										>
											<Edit className="h-4 w-4 mr-1" />
											Edit
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
						{canEdit && (
							<div className="flex justify-end">
								<Button
									variant="outline"
									onClick={() => setShowAddChild(true)}
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Child
								</Button>
							</div>
						)}
						
						{activeChildren.map((child) => (
							<ChildCard
								key={child.child_id}
								child={child}
								cycleNames={cycleNames}
								onPhotoClick={setSelectedChildForPhoto}
								onPhotoViewClick={setViewingPhoto}
								user={user}
								canEdit={canEdit}
								onEditChild={() => setEditingChild(child)}
								onEditEnrollments={() => {
									// Get current cycle enrollments for this child
									const currentCycleEnrollments = Object.values(child.enrollmentsByCycle)
										.flat()
										.filter(enrollment => {
											// Filter to current cycle - we'll need to get current cycle ID
											// For now, we'll pass all enrollments and let the modal filter
											return true;
										});
									setEditingEnrollments({
										child,
										enrollments: currentCycleEnrollments
									});
								}}
								onDeleteChild={() => setShowDeleteConfirm({
									type: 'child',
									id: child.child_id,
									name: `${child.first_name} ${child.last_name}`
								})}
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
										user={user}
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
			{editingGuardian && (
				<EditGuardianModal
					guardian={editingGuardian}
					householdId={household?.household_id || ''}
					onClose={() => setEditingGuardian(null)}
				/>
			)}

			{showAddGuardian && (
				<EditGuardianModal
					guardian={null}
					householdId={household?.household_id || ''}
					onClose={() => setShowAddGuardian(false)}
				/>
			)}

			{editingEmergencyContact && emergencyContact && (
				<EditEmergencyContactModal
					contact={emergencyContact}
					householdId={household?.household_id || ''}
					onClose={() => setEditingEmergencyContact(false)}
				/>
			)}

			{editingChild && (
				<EditChildModal
					child={editingChild}
					householdId={household?.household_id || ''}
					onClose={() => setEditingChild(null)}
				/>
			)}

			{showAddChild && (
				<EditChildModal
					child={null}
					householdId={household?.household_id || ''}
					onClose={() => setShowAddChild(false)}
				/>
			)}

			{editingEnrollments && (
				<EditChildEnrollmentsModal
					child={editingEnrollments.child}
					householdId={household?.household_id || ''}
					currentEnrollments={editingEnrollments.enrollments}
					onClose={() => setEditingEnrollments(null)}
				/>
			)}

			{showEditHousehold && household && (
				<EditHouseholdAddressModal
					household={household}
					onClose={() => setShowEditHousehold(false)}
				/>
			)}

			{/* Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={!!showDeleteConfirm}
				title={showDeleteConfirm?.type === 'guardian' ? 'Remove Guardian' : 'Remove Child'}
				description={
					showDeleteConfirm?.type === 'guardian'
						? `Are you sure you want to remove ${showDeleteConfirm.name} as a guardian? This action cannot be undone.`
						: `Are you sure you want to remove ${showDeleteConfirm.name}? This will mark them as inactive and cannot be undone.`
				}
				onConfirm={() => {
					if (showDeleteConfirm?.type === 'guardian') {
						handleDeleteGuardian();
					} else {
						handleDeleteChild();
					}
				}}
				onCancel={() => setShowDeleteConfirm(null)}
				variant="destructive"
				confirmText={showDeleteConfirm?.type === 'guardian' ? 'Remove Guardian' : 'Remove Child'}
			/>
		</>
	);
}
