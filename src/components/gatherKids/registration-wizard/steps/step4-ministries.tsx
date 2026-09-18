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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CustomQuestion } from '@/lib/types';
import { Info, Clock, Users, CheckCircle2 } from 'lucide-react';
import type { RegistrationFormInput } from '../registration-schema';
import { useQuery } from '@tanstack/react-query';
import { getMinistries, getMinistriesByGroupCode } from '@/lib/dal';
import type { Ministry } from '@/lib/types';
import {
	describeIneligibility,
	evaluateMinistryEligibility,
	type MinistryEligibility,
} from '@/lib/ministry-eligibility';
import { useEffect, useMemo } from 'react';

interface Step4MinistriesProps {
	form: UseFormReturn<RegistrationFormInput>;
}

/** The label a child is shown under before they have a name typed in. */
export function childDisplayName(
	child: { first_name?: string | null } | undefined,
	childIndex: number
): string {
	return child?.first_name || `Child ${childIndex + 1}`;
}

/**
 * Whether a ministry is worth showing at all. A ministry no child in the
 * household can join is hidden, as the legacy registration screen hid it —
 * listing it would only invite a guardian to look for a checkbox that is not
 * there.
 */
export function hasAnyEligibleChild(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	children: Array<{ first_name?: string | null; dob?: string | null }>,
	at: Date = new Date()
): boolean {
	return partitionChildrenByEligibility(ministry, children, at).eligible.length > 0;
}

/**
 * Selections left checked for a child who is no longer eligible — the guardian
 * ticked a ministry, then went back and corrected a birth date.
 *
 * Returns the RHF field paths to clear. Persistence would drop these anyway and
 * the confirmation screen now reports what was stored rather than what was
 * ticked, so nobody would be misled; clearing them keeps the wizard's own
 * "N ministries selected" count honest about what it will send.
 */
export function staleSelectionFieldPaths(
	children: Array<{
		first_name?: string | null;
		dob?: string | null;
		ministrySelections?: Record<string, boolean | undefined> | null;
		interestSelections?: Record<string, boolean | undefined> | null;
	}>,
	ministriesByCode: Map<string, Ministry>,
	at: Date = new Date()
): string[] {
	const stale: string[] = [];

	children.forEach((child, childIndex) => {
		for (const fieldPrefix of ['ministrySelections', 'interestSelections'] as const) {
			for (const [code, selected] of Object.entries(child?.[fieldPrefix] ?? {})) {
				if (!selected) continue;
				const ministry = ministriesByCode.get(code);
				// An unknown code is left alone: it is not this rule's to judge.
				if (!ministry) continue;
				if (!evaluateMinistryEligibility(ministry, child, at).eligible) {
					stale.push(`children.${childIndex}.${fieldPrefix}.${code}`);
				}
			}
		}
	});

	return stale;
}

export interface ChildEligibility {
	child: { first_name?: string | null; dob?: string | null };
	/** Index into the form's `children` array — the checkbox's field path. */
	childIndex: number;
	eligibility: MinistryEligibility;
}

/**
 * Split a household's children into those who may join a ministry and those who
 * may not, keeping each child's original form index.
 *
 * Kept free of React so the eligibility boundaries can be asserted directly —
 * this repo's jsdom cannot drive the Radix checkboxes these feed.
 */
export function partitionChildrenByEligibility(
	ministry: Pick<Ministry, 'min_age' | 'max_age' | 'open_at' | 'close_at'>,
	children: Array<{ first_name?: string | null; dob?: string | null }>,
	at: Date = new Date()
): { eligible: ChildEligibility[]; ineligible: ChildEligibility[] } {
	const eligible: ChildEligibility[] = [];
	const ineligible: ChildEligibility[] = [];

	children.forEach((child, childIndex) => {
		const eligibility = evaluateMinistryEligibility(ministry, child, at);
		(eligibility.eligible ? eligible : ineligible).push({
			child,
			childIndex,
			eligibility,
		});
	});

	return { eligible, ineligible };
}

/**
 * The per-child checkboxes for one ministry, offered only to the children who
 * are actually eligible.
 *
 * Before #400 every child got a checkbox for every ministry; persistence then
 * discarded the ineligible ones without telling anybody. Siblings who cannot
 * join are named with the reason rather than silently omitted, so a guardian
 * looking for a missing child's name finds an answer instead of a gap.
 */
function MinistryChildSelector({
	ministry,
	form,
	fieldPrefix,
	childrenData,
}: {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	fieldPrefix: 'ministrySelections' | 'interestSelections';
	childrenData: any[];
}) {
	const { eligible, ineligible } = useMemo(
		() => partitionChildrenByEligibility(ministry, childrenData ?? []),
		[ministry, childrenData]
	);

	return (
		<div className="space-y-2">
			{eligible.map(({ child, childIndex }) => (
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
									{childDisplayName(child, childIndex)}
								</FormLabel>
							</FormItem>
						)}
					/>
				</div>
			))}

			{ineligible.length > 0 && (
				<ul className="space-y-1 text-xs text-[#5b6b72]">
					{ineligible.map(({ child, childIndex, eligibility }) => (
						<li key={childIndex}>
							{childDisplayName(child, childIndex)} —{' '}
							{eligibility.reason
								? describeIneligibility(eligibility.reason, ministry)
								: null}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

interface MinistryCardProps {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	selectionType: 'enrollment' | 'interest';
	childrenData: any[];
	conflictingQuestionIds: Set<string>;
}

function MinistryCard({
	ministry,
	form,
	selectionType,
	childrenData,
	conflictingQuestionIds,
}: MinistryCardProps) {
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
				<MinistryChildSelector
					ministry={ministry}
					form={form}
					fieldPrefix={fieldPrefix}
					childrenData={childrenData}
				/>

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
						conflictingQuestionIds={conflictingQuestionIds}
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
	conflictingQuestionIds,
}: {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	childrenData: any[];
	fieldPrefix: string;
	conflictingQuestionIds: Set<string>;
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
					conflictingQuestionIds={conflictingQuestionIds}
				/>
			))}
		</>
	);
}

export function customQuestionFieldName(childIndex: number, questionId: string) {
	return `children.${childIndex}.customData.${questionId}` as const;
}

/**
 * Flat `customData` is keyed by question id (DAL contract). When two selected
 * ministries share the same question id, both controls bind to one RHF value.
 * Detect that collision so the UI can block clearly without changing the model.
 */
export type MinistryQuestionSource = Pick<
	Ministry,
	'code' | 'name' | 'custom_questions'
>;

export function findDuplicateCustomQuestionIds(
	ministries: MinistryQuestionSource[]
): Array<{ questionId: string; ministryLabels: string[] }> {
	const owners = new Map<string, string[]>();

	for (const ministry of ministries) {
		const label = ministry.name || ministry.code;
		for (const question of ministry.custom_questions ?? []) {
			const id = question.id?.trim();
			if (!id) continue;
			const existing = owners.get(id) ?? [];
			existing.push(label);
			owners.set(id, existing);
		}
	}

	return [...owners.entries()]
		.filter(([, ministryLabels]) => ministryLabels.length > 1)
		.map(([questionId, ministryLabels]) => ({ questionId, ministryLabels }));
}

type ChildMinistrySelections = {
	ministrySelections?: Record<string, boolean | undefined> | null;
	interestSelections?: Record<string, boolean | undefined> | null;
};

/**
 * Per-child collisions across selected enrollment/interest ministries.
 * Used by Step 4 UI and RegisterWizard `canProceed` so Save & continue stays blocked.
 */
export function findDuplicateCustomQuestionConflictsForChildren(
	children: ChildMinistrySelections[],
	ministries: MinistryQuestionSource[]
): Array<{ questionId: string; ministryLabels: string[] }> {
	const byCode = new Map(ministries.map((ministry) => [ministry.code, ministry]));
	const byId = new Map<string, string[]>();

	for (const child of children) {
		const selected: MinistryQuestionSource[] = [];
		for (const [code, on] of Object.entries(child.ministrySelections ?? {})) {
			if (on && byCode.has(code)) {
				selected.push(byCode.get(code)!);
			}
		}
		for (const [code, on] of Object.entries(child.interestSelections ?? {})) {
			if (on && byCode.has(code)) {
				selected.push(byCode.get(code)!);
			}
		}
		for (const dup of findDuplicateCustomQuestionIds(selected)) {
			byId.set(dup.questionId, dup.ministryLabels);
		}
	}

	return [...byId.entries()].map(([questionId, ministryLabels]) => ({
		questionId,
		ministryLabels,
	}));
}

export function MinistryCustomQuestionField({
	question,
	form,
	childIndex,
}: {
	question: CustomQuestion;
	form: UseFormReturn<RegistrationFormInput>;
	childIndex: number;
}) {
	const fieldName = customQuestionFieldName(childIndex, question.id);

	if (question.type === 'radio') {
		if (!question.options?.length) {
			return (
				<Alert variant="destructive" className="mt-2">
					<AlertDescription>
						{question.text} requires configured options before registration can
						continue.
					</AlertDescription>
				</Alert>
			);
		}

		return (
			<FormField
				control={form.control}
				name={fieldName as any}
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-[#1e2a2f]">{question.text}</FormLabel>
						<FormControl>
							<RadioGroup
								onValueChange={field.onChange}
								value={typeof field.value === 'string' ? field.value : ''}
								className="space-y-2">
								{question.options!.map((option) => (
									<FormItem
										key={option}
										className="flex items-center space-x-2 space-y-0">
										<FormControl>
											<RadioGroupItem value={option} />
										</FormControl>
										<FormLabel className="font-normal">{option}</FormLabel>
									</FormItem>
								))}
							</RadioGroup>
						</FormControl>
					</FormItem>
				)}
			/>
		);
	}

	if (question.type === 'checkbox') {
		return (
			<FormField
				control={form.control}
				name={fieldName as any}
				render={({ field }) => (
					<FormItem className="flex flex-row items-start space-x-3 space-y-0">
						<FormControl>
							<Checkbox
								checked={Boolean(field.value)}
								onCheckedChange={field.onChange}
								className="mt-1 border-[#017c7d] data-[state=checked]:bg-[#017c7d]"
							/>
						</FormControl>
						<FormLabel className="font-normal text-[#1e2a2f]">
							{question.text}
						</FormLabel>
					</FormItem>
				)}
			/>
		);
	}

	if (question.type === 'text') {
		return (
			<FormField
				control={form.control}
				name={fieldName as any}
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-[#1e2a2f]">{question.text}</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								value={typeof field.value === 'string' ? field.value : ''}
								className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
							/>
						</FormControl>
					</FormItem>
				)}
			/>
		);
	}

	return (
		<Alert variant="destructive" className="mt-2">
			<AlertDescription>
				Unsupported question type for &quot;{question.text}&quot;. Contact the
				ministry office to complete this registration.
			</AlertDescription>
		</Alert>
	);
}

function ChildMinistryCheckbox({
	ministry,
	form,
	childIndex,
	fieldPrefix,
	conflictingQuestionIds,
}: {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	childIndex: number;
	fieldPrefix: string;
	conflictingQuestionIds: Set<string>;
}) {
	const isSelected = useWatch({
		control: form.control,
		name: `children.${childIndex}.${fieldPrefix}.${ministry.code}` as any,
	});

	if (!isSelected || !ministry.custom_questions || ministry.custom_questions.length === 0) {
		return null;
	}

	const childName =
		form.watch(`children.${childIndex}.first_name` as any) || `Child ${childIndex + 1}`;

	return (
		<div className="mt-4 p-3 border border-[#e0dacf] rounded-lg bg-[#fafaf8] space-y-3">
			<p className="text-sm font-semibold text-[#1e2a2f]">
				Additional information for {childName}
			</p>
			{ministry.custom_questions.map((question) =>
				conflictingQuestionIds.has(question.id) ? (
					<Alert key={question.id} variant="destructive">
						<AlertDescription>
							Question &quot;{question.text}&quot; (id: {question.id}) is configured on
							multiple selected ministries. Contact the ministry office — registration
							cannot store separate answers for the same question id.
						</AlertDescription>
					</Alert>
				) : (
					<MinistryCustomQuestionField
						key={question.id}
						question={question}
						form={form}
						childIndex={childIndex}
					/>
				)
			)}
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

		// Helper to check if a ministry is a choir (by id, code, name, or partial name match)
		const isChoirFn = (ministry: Ministry): boolean => {
			// Exact ID match
			if (ids.has(ministry.ministry_id)) return true;
			
			// Exact code match
			if (codes.has(normalizeCode(ministry.code))) return true;
			
			// Exact name match
			const normalizedMinistryName = normalizeCode(ministry.name);
			if (names.has(normalizedMinistryName)) return true;
			
			// Partial name match (check if ministry name contains any choir name, or vice versa)
			// This catches variants like "Teen Choir" vs "Teen Youth Choir"
			for (const choirName of names) {
				if (normalizedMinistryName.includes(choirName) || choirName.includes(normalizedMinistryName)) {
					return true;
				}
			}
			
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

	const ministriesByCode = useMemo(() => {
		const map = new Map<string, Ministry>();
		for (const ministry of [
			...enrolledMinistries,
			...interestMinistries,
			...choirMinistriesData,
		]) {
			map.set(ministry.code, ministry);
		}
		return map;
	}, [enrolledMinistries, interestMinistries, choirMinistriesData]);

	const duplicateQuestionConflicts = useMemo(
		() =>
			findDuplicateCustomQuestionConflictsForChildren(
				childrenData ?? [],
				[...ministriesByCode.values()]
			),
		[childrenData, ministriesByCode]
	);

	/** Question ids that collide across ministries selected for the same child. */
	const conflictingQuestionIds = useMemo(
		() => new Set(duplicateQuestionConflicts.map((dup) => dup.questionId)),
		[duplicateQuestionConflicts]
	);

	// Drop selections that a change of birth date back in step 2 has made
	// ineligible, so the checkbox the guardian can no longer see is not still
	// counted as chosen.
	useEffect(() => {
		if (!childrenData || ministriesByCode.size === 0) return;
		for (const path of staleSelectionFieldPaths(childrenData, ministriesByCode)) {
			form.setValue(path as any, false, { shouldDirty: false });
		}
	}, [childrenData, ministriesByCode, form]);

	// Choir programs for grouped rendering with robust deduplication
	// Handles near-duplicates like "Keita Praise choir (Ages 9-12)" vs "Keita Praise choir (ages 9-12)"
	const choirPrograms = useMemo(() => {
		if (choirMinistriesData.length === 0) return [];
		
		// Helper to create a normalized identity for a choir (strips parentheticals, trailing "choir", etc.)
		const choirIdentity = (name: string): string => {
			// Strip parentheticals like (Ages 9-12) or (ages 9-12)
			const withoutParens = name.replace(/\([^)]*\)/g, '').trim();
			// Remove trailing "choir" word (case-insensitive)
			const withoutChoir = withoutParens.replace(/\s+choir\s*$/i, '').trim();
			// Normalize (lowercase, strip all non-alphanumerics)
			return normalizeCode(withoutChoir);
		};
		
		// Helper to determine if a description is useful (not just "Thank you for registering...")
		const hasUsefulDescription = (ministry: Ministry): boolean => {
			if (!ministry.description) return false;
			const desc = ministry.description.toLowerCase();
			return !desc.startsWith('thank you for registering');
		};
		
		// Group choirs by identity cluster (using substring matching for near-duplicates)
		const identityGroups = new Map<string, Ministry[]>();
		
		for (const choir of choirMinistriesData) {
			const identity = choirIdentity(choir.name);
			let foundCluster = false;
			
			// Check if this identity belongs to an existing cluster (substring match)
			for (const [clusterIdentity, group] of identityGroups.entries()) {
				if (identity.includes(clusterIdentity) || clusterIdentity.includes(identity)) {
					// Belongs to this cluster
					group.push(choir);
					foundCluster = true;
					break;
				}
			}
			
			if (!foundCluster) {
				// Start new cluster
				identityGroups.set(identity, [choir]);
			}
		}
		
		// Pick best representative from each cluster
		const representatives: Ministry[] = [];
		
		for (const group of identityGroups.values()) {
			if (group.length === 1) {
				representatives.push(group[0]);
			} else {
				// Pick the best: prefer useful description, then first occurrence
				const withUsefulDesc = group.filter(hasUsefulDescription);
				const best = withUsefulDesc.length > 0 ? withUsefulDesc[0] : group[0];
				representatives.push(best);
			}
		}
		
		return representatives.sort((a, b) => a.name.localeCompare(b.name));
	}, [choirMinistriesData]);

	/** Optional enrollment ministries at least one child can join. */
	const eligibleEnrolledMinistries = useMemo(
		() =>
			enrolledMinistries.filter((ministry: Ministry) =>
				hasAnyEligibleChild(ministry, childrenData ?? [])
			),
		[enrolledMinistries, childrenData]
	);

	/** Interest ministries at least one child can join. */
	const eligibleInterestMinistries = useMemo(
		() =>
			interestMinistries.filter((ministry: Ministry) =>
				hasAnyEligibleChild(ministry, childrenData ?? [])
			),
		[interestMinistries, childrenData]
	);

	/** Choirs at least one child in this household can join. */
	const eligibleChoirPrograms = useMemo(
		() => choirPrograms.filter((choir) => hasAnyEligibleChild(choir, childrenData ?? [])),
		[choirPrograms, childrenData]
	);

	// Count selections
	const selectedEnrolledCount = useMemo(() => {
		if (!childrenData) return 0;
		const regularCount = eligibleEnrolledMinistries.reduce((count, ministry) => {
			const hasSelection = childrenData.some(
				(child: any) => child.ministrySelections?.[ministry.code]
			);
			return hasSelection ? count + 1 : count;
		}, 0);
		
		// Add choir if any child selects a choir program
		const choirCount = eligibleChoirPrograms.length > 0 && childrenData.some((child: any) =>
			eligibleChoirPrograms.some((choir) => child.ministrySelections?.[choir.code])
		) ? 1 : 0;
		
		return regularCount + choirCount;
	}, [childrenData, eligibleEnrolledMinistries, eligibleChoirPrograms]);

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

			{duplicateQuestionConflicts.length > 0 && (
				<Alert variant="destructive">
					<AlertDescription className="text-sm">
						Selected ministries share the same custom question id
						{duplicateQuestionConflicts.length === 1 ? '' : 's'} (
						{duplicateQuestionConflicts
							.map(
								(c) =>
									`${c.questionId} on ${c.ministryLabels.join(' and ')}`
							)
							.join('; ')}
						). Deselect one ministry or ask the ministry office to use unique question
						ids — answers cannot be stored separately for duplicate ids.
					</AlertDescription>
				</Alert>
			)}

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
									<CheckCircle2 className="h-5 w-5 text-[#017c7d] shrink-0" />
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

						{/* Other Ministry Cards — a ministry no child can join is hidden */}
						{eligibleEnrolledMinistries.map((ministry: Ministry) => (
							<MinistryCard
								key={ministry.code}
								ministry={ministry}
								form={form}
								selectionType="enrollment"
								childrenData={childrenData}
								conflictingQuestionIds={conflictingQuestionIds}
							/>
						))}

						{/* Choir Programs as single grouped card if present */}
						{eligibleChoirPrograms.length > 0 && (
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
										{eligibleChoirPrograms.map((choir: Ministry) => (
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
												<MinistryChildSelector
													ministry={choir}
													form={form}
													fieldPrefix="ministrySelections"
													childrenData={childrenData}
												/>
											</div>
										))}
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{eligibleInterestMinistries.length > 0 && (
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
						{eligibleInterestMinistries.map((ministry: Ministry) => (
							<MinistryCard
								key={ministry.code}
								ministry={ministry}
								form={form}
								selectionType="interest"
								childrenData={childrenData}
								conflictingQuestionIds={conflictingQuestionIds}
							/>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
