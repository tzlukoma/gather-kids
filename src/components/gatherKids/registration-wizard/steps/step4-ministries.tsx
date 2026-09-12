'use client';

import { UseFormReturn, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Info, Clock, Users, CheckCircle2 } from 'lucide-react';
import type { RegistrationFormInput } from '../registration-schema';
import { useQuery } from '@tanstack/react-query';
import { getMinistries, getMinistriesByGroupCode } from '@/lib/dal';
import type { Ministry } from '@/lib/types';
import { useMemo } from 'react';

interface Step4MinistriesProps {
	form: UseFormReturn<RegistrationFormInput>;
}

interface MinistryCardProps {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	selectionType: 'enrollment' | 'interest';
	childrenData: any[];
}

function MinistryCard({ ministry, form, selectionType, childrenData }: MinistryCardProps) {
	const fieldPrefix =
		selectionType === 'enrollment' ? 'ministrySelections' : 'interestSelections';

	return (
		<div
			className="border-2 rounded-lg overflow-hidden transition-all border-[#e0dacf] bg-white hover:border-[#017c7d]/50">
			<div className="p-4">
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1">
						<h4 className="font-semibold text-[#1e2a2f] mb-1">{ministry.name}</h4>
						{ministry.description && (
							<p className="text-sm text-[#5b6b72]">{ministry.description}</p>
						)}
					</div>
				</div>

				{/* Schedule / Meta Info */}
				<div className="flex flex-wrap gap-3 text-xs text-[#5b6b72] mb-4">
					{(ministry.min_age || ministry.max_age) && (
						<div className="flex items-center gap-1">
							<Users className="h-3 w-3" />
							<span>
								Ages {ministry.min_age || '0'}-{ministry.max_age || '18'}
							</span>
						</div>
					)}
					{(ministry.min_grade || ministry.max_grade) && (
						<div className="flex items-center gap-1">
							<Users className="h-3 w-3" />
							<span>
								Grades {ministry.min_grade}-{ministry.max_grade}
							</span>
						</div>
					)}
					{ministry.details && (
						<div className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							<span>{ministry.details}</span>
						</div>
					)}
				</div>

				{/* Children Selection */}
				<div className="space-y-2">
					{childrenData.map((child, childIndex) => (
						<div key={childIndex} className="flex items-center gap-2">
							<FormField
								control={form.control}
								name={`children.${childIndex}.${fieldPrefix}.${ministry.code}` as any}
								render={({ field }) => (
									<FormItem className="flex items-center space-x-2 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
												className="border-[#017c7d] data-[state=checked]:bg-[#017c7d]"
											/>
										</FormControl>
										<FormLabel className="font-normal text-[#1e2a2f]">
											{child.first_name || `Child ${childIndex + 1}`}
										</FormLabel>
									</FormItem>
								)}
							/>
						</div>
					))}
				</div>

				{/* Optional consent text */}
				{ministry.optional_consent_text && (
					<div className="mt-3 p-2 bg-[#fdf6e8] border border-[#e6d5a3] rounded text-xs text-[#5b6b72]">
						{ministry.optional_consent_text}
					</div>
				)}

				{/* Custom Questions - show when any child selects this ministry */}
				{ministry.custom_questions && ministry.custom_questions.length > 0 && (
					<ChildMinistryCustomQuestions
						ministry={ministry}
						form={form}
						childrenData={childrenData}
						fieldPrefix={fieldPrefix}
					/>
				)}
			</div>
		</div>
	);
}

function ChildMinistryCustomQuestions({
	ministry,
	form,
	childrenData,
	fieldPrefix,
}: {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	childrenData: any[];
	fieldPrefix: string;
}) {
	return (
		<>
			{childrenData.map((child, childIndex) => (
				<ChildMinistryCheckbox
					key={childIndex}
					ministry={ministry}
					form={form}
					childIndex={childIndex}
					fieldPrefix={fieldPrefix}
				/>
			))}
		</>
	);
}

function ChildMinistryCheckbox({
	ministry,
	form,
	childIndex,
	fieldPrefix,
}: {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	childIndex: number;
	fieldPrefix: string;
}) {
	const isSelected = useWatch({
		control: form.control,
		name: `children.${childIndex}.${fieldPrefix}.${ministry.code}` as any,
	});

	if (!isSelected || !ministry.custom_questions || ministry.custom_questions.length === 0) {
		return null;
	}

	return (
		<div className="mt-4 p-3 border border-[#e0dacf] rounded-lg bg-[#fafaf8] space-y-3">
			<p className="text-sm font-semibold text-[#1e2a2f]">
				Additional information for {form.watch(`children.${childIndex}.first_name` as any)}
			</p>
			{ministry.custom_questions.map((question, qIndex) => (
				<FormField
					key={qIndex}
					control={form.control}
					name={
						`children.${childIndex}.customFields.${ministry.code}.${question.id}` as any
					}
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[#1e2a2f]">
								{question.text}
							</FormLabel>
							<FormControl>
								{question.type === 'text' ? (
									<Textarea
										{...field}
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								) : (
									<Input
										{...field}
										type="text"
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								)}
							</FormControl>
						</FormItem>
					)}
				/>
			))}
		</div>
	);
}

// Helper to normalize ministry code for comparison (strips ALL non-alphanumerics including spaces)
function normalizeCode(code: string): string {
	return code.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to check if a ministry is Sunday School equivalent
function isSundaySchool(ministry: Ministry): boolean {
	const normalized = normalizeCode(ministry.code);
	const sundaySchoolCodes = ['minsundayschool', 'sundayschool', 'childrenschurch'];
	return sundaySchoolCodes.includes(normalized);
}

export function Step4Ministries({ form }: Step4MinistriesProps) {
	const childrenData = useWatch({ control: form.control, name: 'children' });

	// Fetch all active ministries
	const { data: allMinistries = [], isLoading: loadingMinistries } = useQuery({
		queryKey: ['ministries', 'active'],
		queryFn: () => getMinistries(true),
		staleTime: 15 * 60 * 1000,
	});

	// ALWAYS fetch choir ministries from groups (not gated by flag)
	// This ensures we identify ALL choirs to prevent duplicates
	const { data: choirMinistriesData = [] } = useQuery({
		queryKey: ['ministriesByGroup', 'choirs'],
		queryFn: () => getMinistriesByGroupCode('choirs'),
		staleTime: 10 * 60 * 1000,
	});

	// Build comprehensive exclusion set for choir ministries
	// Include ID, normalized code, and normalized name to catch all variations
	const { choirExclusion, isChoir } = useMemo(() => {
		const ids = new Set<string>();
		const codes = new Set<string>();
		const names = new Set<string>();

		for (const choir of choirMinistriesData) {
			ids.add(choir.ministry_id);
			codes.add(normalizeCode(choir.code));
			codes.add(normalizeCode(choir.name)); // Also add normalized name as code
			names.add(normalizeCode(choir.name));
		}

		// Helper to check if a ministry is a choir (by id, code, or name)
		const isChoirFn = (ministry: Ministry): boolean => {
			if (ids.has(ministry.ministry_id)) return true;
			if (codes.has(normalizeCode(ministry.code))) return true;
			if (names.has(normalizeCode(ministry.name))) return true;
			return false;
		};

		return { choirExclusion: { ids, codes, names }, isChoir: isChoirFn };
	}, [choirMinistriesData]);

	// Separate ministries by enrollment type with proper deduplication
	// Deduplicate by code (stable), exclude Sunday School, exclude ALL choir ministries
	const enrolledMinistries = useMemo(() => {
		const seenCodes = new Set<string>();
		
		return allMinistries
			.filter((m: Ministry) => {
				if (m.enrollment_type !== 'enrolled') return false;
				if (isSundaySchool(m)) return false; // Exclude Sunday School equivalents
				if (isChoir(m)) return false; // Exclude ALL choirs (handled in group)
				
				const normalized = normalizeCode(m.code);
				if (seenCodes.has(normalized)) return false; // Dedupe by code
				
				seenCodes.add(normalized);
				return true;
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [allMinistries, isChoir]);

	const interestMinistries = useMemo(() => {
		const seenCodes = new Set<string>();
		
		return allMinistries
			.filter((m: Ministry) => {
				if (m.enrollment_type !== 'expressed_interest') return false;
				// Also exclude choirs from interest ministries
				if (isChoir(m)) return false;
				
				const normalized = normalizeCode(m.code);
				if (seenCodes.has(normalized)) return false;
				
				seenCodes.add(normalized);
				return true;
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [allMinistries, isChoir]);

	// Choir programs for grouped rendering (dedupe by normalized name OR code within group)
	const choirPrograms = useMemo(() => {
		const seenNames = new Set<string>();
		const seenCodes = new Set<string>();
		
		return choirMinistriesData
			.filter((m: Ministry) => {
				const normalizedName = normalizeCode(m.name);
				const normalizedCode = normalizeCode(m.code);
				
				// Skip if we've seen this name OR this code before
				if (seenNames.has(normalizedName) || seenCodes.has(normalizedCode)) {
					return false;
				}
				
				seenNames.add(normalizedName);
				seenCodes.add(normalizedCode);
				return true;
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [choirMinistriesData]);

	// Count selections
	const selectedEnrolledCount = useMemo(() => {
		if (!childrenData) return 0;
		const regularCount = enrolledMinistries.reduce((count, ministry) => {
			const hasSelection = childrenData.some(
				(child: any) => child.ministrySelections?.[ministry.code]
			);
			return hasSelection ? count + 1 : count;
		}, 0);
		
		// Add choir if any child selects a choir program
		const choirCount = choirPrograms.length > 0 && childrenData.some((child: any) =>
			choirPrograms.some((choir) => child.ministrySelections?.[choir.code])
		) ? 1 : 0;
		
		return regularCount + choirCount;
	}, [childrenData, enrolledMinistries, choirPrograms]);

	if (loadingMinistries) {
		return (
			<Card>
				<CardContent className="py-8 flex justify-center">
					<div className="flex items-center gap-2 text-[#5b6b72]">
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						<span>Loading ministry programs...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!childrenData || childrenData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Ministry Programs
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						Please add children in Step 3 before selecting programs.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert className="bg-[#fdf6e8] border-[#e6d5a3]">
						<Info className="h-4 w-4 text-[#8a6a22]" />
						<AlertDescription className="text-[#8a6a22]">
							Return to Step 3 to add at least one child before selecting ministry programs.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Review Summary */}
			<Alert className="bg-[#e8f5f5] border-[#017c7d]">
				<Info className="h-4 w-4 text-[#017c7d]" />
				<AlertDescription className="text-sm text-[#1e2a2f]">
					<strong>{selectedEnrolledCount} programs selected</strong> for{' '}
					{childrenData.length} {childrenData.length === 1 ? 'child' : 'children'}. Sunday
					School is included for all children.
				</AlertDescription>
			</Alert>

			{(enrolledMinistries.length > 0 || choirPrograms.length > 0) && (
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-bold text-[#1e2a2f]">
							Ministry Programs
						</CardTitle>
						<CardDescription className="text-[#5b6b72]">
							Select programs for each child. Click a card to view details and enroll.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Sunday School Card - Always Included */}
						<div className="border-2 border-[#017c7d] rounded-lg overflow-hidden bg-[#e8f5f5]">
							<div className="p-4">
								<div className="flex items-start justify-between mb-2">
									<div>
										<h4 className="font-semibold text-[#1e2a2f]">
											Sunday School / Children&apos;s Church
										</h4>
										<p className="text-sm text-[#5b6b72] mt-1">
											1st, 4th, 5th Sundays at 9:30 AM • Ages 4-18
										</p>
									</div>
									<CheckCircle2 className="h-5 w-5 text-[#017c7d] flex-shrink-0" />
								</div>
								<div className="mt-3 space-y-1">
									{childrenData.map((child, index) => (
										<div key={index} className="flex items-center gap-2 text-sm text-[#1e2a2f]">
											<Checkbox checked={true} disabled={true} className="border-[#017c7d]" />
											<span>{child.first_name || `Child ${index + 1}`}</span>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Other Ministry Cards */}
						{enrolledMinistries.map((ministry: Ministry) => (
							<MinistryCard
								key={ministry.code}
								ministry={ministry}
								form={form}
								selectionType="enrollment"
								childrenData={childrenData}
							/>
						))}

						{/* Choir Programs as single grouped card if present */}
						{choirPrograms.length > 0 && (
							<div className="border-2 rounded-lg overflow-hidden border-[#e0dacf] bg-white">
								<div className="p-4">
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1">
											<h4 className="font-semibold text-[#1e2a2f] mb-1">Youth Choirs</h4>
											<p className="text-sm text-[#5b6b72]">
												Multiple choir programs available based on age and grade
											</p>
										</div>
									</div>

									{/* List each choir option within the group */}
									<div className="space-y-4 mt-4">
										{choirPrograms.map((choir: Ministry) => (
											<div key={choir.code} className="border-t border-[#e0dacf] pt-4 first:border-t-0 first:pt-0">
												<p className="font-medium text-[#1e2a2f] mb-1">{choir.name}</p>
												{choir.description && (
													<p className="text-sm text-[#5b6b72] mb-2">{choir.description}</p>
												)}
												<div className="flex flex-wrap gap-3 text-xs text-[#5b6b72] mb-3">
													{(choir.min_age || choir.max_age) && (
														<div className="flex items-center gap-1">
															<Users className="h-3 w-3" />
															<span>Ages {choir.min_age || '0'}-{choir.max_age || '18'}</span>
														</div>
													)}
													{(choir.min_grade || choir.max_grade) && (
														<div className="flex items-center gap-1">
															<Users className="h-3 w-3" />
															<span>Grades {choir.min_grade}-{choir.max_grade}</span>
														</div>
													)}
													{choir.details && (
														<div className="flex items-center gap-1">
															<Clock className="h-3 w-3" />
															<span>{choir.details}</span>
														</div>
													)}
												</div>
												<div className="space-y-2">
													{childrenData.map((child, childIndex) => (
														<div key={childIndex} className="flex items-center gap-2">
															<FormField
																control={form.control}
																name={`children.${childIndex}.ministrySelections.${choir.code}` as any}
																render={({ field }) => (
																	<FormItem className="flex items-center space-x-2 space-y-0">
																		<FormControl>
																			<Checkbox
																				checked={field.value}
																				onCheckedChange={field.onChange}
																				className="border-[#017c7d] data-[state=checked]:bg-[#017c7d]"
																			/>
																		</FormControl>
																		<FormLabel className="font-normal text-[#1e2a2f]">
																			{child.first_name || `Child ${childIndex + 1}`}
																		</FormLabel>
																	</FormItem>
																)}
															/>
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{interestMinistries.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-bold text-[#1e2a2f]">
							Expressed Interest Activities
						</CardTitle>
						<CardDescription className="text-[#5b6b72]">
							Let us know if you&apos;re interested. This does not register you for these
							activities but helps us gauge interest for future planning.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{interestMinistries.map((ministry: Ministry) => (
							<MinistryCard
								key={ministry.code}
								ministry={ministry}
								form={form}
								selectionType="interest"
								childrenData={childrenData}
							/>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
