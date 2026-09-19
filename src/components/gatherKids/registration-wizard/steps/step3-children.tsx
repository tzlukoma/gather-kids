'use client';

import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { RegistrationFormInput } from '../registration-schema';
import { firstInvalidEntryIndex } from '../step-validation';
import { GRADE_OPTIONS, gradeSelectValue } from '../grade-options';
import type { HouseholdPrefillGradeHint } from '@/lib/dal/households';
import {
	defaultChildValues,
	isNoKnownAllergies,
	NO_KNOWN_ALLERGIES,
} from '../registration-schema';

const ALLERGY_CHECK_IN_HELPER =
	'Leaders see this information during check-in.';

interface Step3ChildrenProps {
	form: UseFormReturn<RegistrationFormInput>;
	/** Increments every time this step refuses to advance. */
	blockedAt: number;
	/** Last-year → suggested-this-year, keyed by `child_id`, from the household load. */
	gradeHints?: Record<string, HouseholdPrefillGradeHint>;
	/**
	 * Only a prior-cycle returning household has a "last year". A current-cycle
	 * update is this year's data, and a first-time family has no last year at
	 * all — telling either one what their child was in last year would be a
	 * claim the app cannot support.
	 */
	showGradeHints?: boolean;
}

export function Step3Children({
	form,
	blockedAt,
	gradeHints,
	showGradeHints = false,
}: Step3ChildrenProps) {
	const {
		fields: childrenFields,
		append: appendChild,
		remove: removeChild,
	} = useFieldArray({
		control: form.control,
		name: 'children',
	});

	const [currentChildIndex, setCurrentChildIndex] = useState(0);

	// Only one child's fields are mounted at a time, so an error on child 3 has
	// nothing on screen to show its message or take focus. Switch to the first
	// child that has one. Adjusted during render, not in an effect — see the
	// same note on step 2.
	// Keyed on the block counter, not on the invalid index: the user may page to
	// another child between refusals, and a second press with the same child
	// still at fault has to bring them back.
	const [switchedForBlock, setSwitchedForBlock] = useState<number | null>(null);
	if (blockedAt !== switchedForBlock) {
		setSwitchedForBlock(blockedAt);
		const invalidChild = firstInvalidEntryIndex(
			form.formState.errors,
			'children'
		);
		if (invalidChild !== undefined) {
			setCurrentChildIndex(invalidChild);
		}
	}
	/** Keeps the details textarea visible while the guardian is still typing (blank is not yet a stored answer). */
	const [allergyDetailsOpenByIndex, setAllergyDetailsOpenByIndex] = useState<
		Record<number, boolean>
	>({});

	const handleAddChild = () => {
		appendChild(defaultChildValues);
		setCurrentChildIndex(childrenFields.length);
	};

	if (childrenFields.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Tell us about your children
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						Add each child you are registering for this cycle.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<button
						type="button"
						onClick={handleAddChild}
						className="w-full p-6 border-2 border-dashed border-[#017c7d] rounded-lg bg-[#f7f5f1] hover:bg-[#e8f5f5] transition-colors flex items-center justify-center gap-2 text-[#017c7d] font-semibold">
						<Plus className="h-5 w-5" />
						Add your first child
					</button>
				</CardContent>
			</Card>
		);
	}

	const currentChild = form.watch(`children.${currentChildIndex}`);

	// Keyed by `child_id`, so a child added during this session — who has no id
	// yet — correctly gets no hint.
	const currentChildId = currentChild?.child_id;
	const currentGradeHint =
		showGradeHints && currentChildId ? gradeHints?.[currentChildId] : undefined;

	return (
		<div className="space-y-6">
			{/* Child Navigation Header */}
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-semibold tracking-wider uppercase text-[#5b6b72]">
						Child {currentChildIndex + 1} of {childrenFields.length}
					</p>
					<h2 className="text-xl font-bold text-[#1e2a2f] mt-1">
						Tell us about {currentChild.first_name || 'your child'}
					</h2>
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setCurrentChildIndex(Math.max(0, currentChildIndex - 1))}
						disabled={currentChildIndex === 0}
						className="flex items-center gap-1">
						<ChevronLeft className="h-3 w-3" />
						Previous
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setCurrentChildIndex(Math.min(childrenFields.length - 1, currentChildIndex + 1))
						}
						disabled={currentChildIndex === childrenFields.length - 1}
						className="flex items-center gap-1">
						Next
						<ChevronRight className="h-3 w-3" />
					</Button>
				</div>
			</div>

			{/* Child Form Card */}
			<Card>
				<CardContent className="pt-6 space-y-6">
					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name={`children.${currentChildIndex}.first_name`}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#1e2a2f] font-semibold">
										First Name *
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name={`children.${currentChildIndex}.last_name`}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#1e2a2f] font-semibold">
										Last Name *
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name={`children.${currentChildIndex}.dob`}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#1e2a2f] font-semibold">
										Date of Birth *
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="date"
											className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name={`children.${currentChildIndex}.grade`}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#1e2a2f] font-semibold">
										Grade *
									</FormLabel>
									{currentGradeHint && (
										<Alert className="border-[#017c7d] bg-[#e8f5f5]">
											<Info className="h-4 w-4 text-[#017c7d]" />
											<AlertDescription className="text-[#1e2a2f]">
												Last year: {currentGradeHint.lastYearLabel} → Suggested
												this year: {currentGradeHint.suggestedLabel}
											</AlertDescription>
										</Alert>
									)}
									{/*
										The value is normalised rather than passed through. A
										household load supplies the canonical "5", and a draft
										written by the first version of this wizard supplies "5th";
										both have to select the same option.
									*/}
									<Select
										onValueChange={field.onChange}
										value={gradeSelectValue(field.value)}>
										<FormControl>
											<SelectTrigger className="border-[#e0dacf] focus:ring-[#017c7d]">
												<SelectValue placeholder="Select grade" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{GRADE_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name={`children.${currentChildIndex}.child_mobile`}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									Child&apos;s Mobile (Optional)
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="tel"
										placeholder="(555) 123-4567"
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								</FormControl>
								<FormDescription className="text-xs text-[#5b6b72]">
									For older children who have their own phone
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={`children.${currentChildIndex}.allergies`}
						render={({ field }) => {
							const allergyMode =
								allergyDetailsOpenByIndex[currentChildIndex] ||
								(Boolean(field.value?.trim()) && !isNoKnownAllergies(field.value))
									? 'details'
									: isNoKnownAllergies(field.value)
										? 'none'
										: '';

							return (
								<FormItem className="space-y-3">
									<FormLabel className="text-[#1e2a2f] font-semibold">
										Allergies *
									</FormLabel>
									<FormControl>
										<RadioGroup
											value={allergyMode}
											onValueChange={(value) => {
												if (value === 'none') {
													setAllergyDetailsOpenByIndex((prev) => ({
														...prev,
														[currentChildIndex]: false,
													}));
													field.onChange(NO_KNOWN_ALLERGIES);
													return;
												}
												setAllergyDetailsOpenByIndex((prev) => ({
													...prev,
													[currentChildIndex]: true,
												}));
												if (isNoKnownAllergies(field.value)) {
													field.onChange('');
												}
											}}
											className="flex flex-col space-y-2"
											aria-describedby={`children-${currentChildIndex}-allergies-help`}>
											<FormItem className="flex items-center space-x-3 space-y-0">
												<FormControl>
													<RadioGroupItem value="none" />
												</FormControl>
												<FormLabel className="font-normal text-[#1e2a2f]">
													No known allergies
												</FormLabel>
											</FormItem>
											<FormItem className="flex items-center space-x-3 space-y-0">
												<FormControl>
													<RadioGroupItem value="details" />
												</FormControl>
												<FormLabel className="font-normal text-[#1e2a2f]">
													This child has allergies
												</FormLabel>
											</FormItem>
										</RadioGroup>
									</FormControl>
									{allergyMode === 'details' && (
										<FormControl>
											<Textarea
												value={
													isNoKnownAllergies(field.value) ? '' : (field.value ?? '')
												}
												onChange={(event) => {
													setAllergyDetailsOpenByIndex((prev) => ({
														...prev,
														[currentChildIndex]: true,
													}));
													field.onChange(event.target.value);
												}}
												onBlur={field.onBlur}
												name={field.name}
												ref={field.ref}
												placeholder="List any known allergies"
												className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
												rows={2}
												aria-label="Allergy details"
											/>
										</FormControl>
									)}
									<FormDescription
										id={`children-${currentChildIndex}-allergies-help`}
										className="text-xs text-[#5b6b72]">
										{ALLERGY_CHECK_IN_HELPER}
									</FormDescription>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					<FormField
						control={form.control}
						name={`children.${currentChildIndex}.medical_notes`}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									Medical Notes (Optional)
								</FormLabel>
								<FormControl>
									<Textarea
										{...field}
										placeholder="Any medical conditions or important information"
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
										rows={2}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={`children.${currentChildIndex}.special_needs`}
						render={({ field }) => (
							<FormItem className="flex items-center gap-3 space-y-0">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
										className="border-[#017c7d] data-[state=checked]:bg-[#017c7d]"
									/>
								</FormControl>
								<FormLabel className="text-[#1e2a2f] font-normal">
									This child has special needs
								</FormLabel>
							</FormItem>
						)}
					/>

					{form.watch(`children.${currentChildIndex}.special_needs`) && (
						<FormField
							control={form.control}
							name={`children.${currentChildIndex}.special_needs_notes`}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#1e2a2f] font-semibold">
										Special Needs Details
									</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Please describe any accommodations or support needed"
											className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
											rows={3}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}
				</CardContent>
			</Card>

			{/* Add Another Child */}
			<button
				type="button"
				onClick={handleAddChild}
				className="w-full p-4 border-2 border-dashed border-[#017c7d] rounded-lg bg-[#f7f5f1] hover:bg-[#e8f5f5] transition-colors flex items-center justify-center gap-2 text-[#017c7d] font-semibold">
				<Plus className="h-4 w-4" />
				Add another child
			</button>

			{/* Remove Current Child */}
			{childrenFields.length > 1 && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						const removedIndex = currentChildIndex;
						removeChild(removedIndex);
						setAllergyDetailsOpenByIndex((prev) => {
							const next: Record<number, boolean> = {};
							for (const [key, open] of Object.entries(prev)) {
								const index = Number(key);
								if (Number.isNaN(index) || index === removedIndex) continue;
								next[index > removedIndex ? index - 1 : index] = open;
							}
							return next;
						});
						setCurrentChildIndex(Math.max(0, removedIndex - 1));
					}}
					className="w-full text-destructive hover:text-destructive">
					Remove {currentChild.first_name || 'this child'}
				</Button>
			)}
		</div>
	);
}
