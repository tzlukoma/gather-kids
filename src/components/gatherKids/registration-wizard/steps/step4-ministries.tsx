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
import { Info } from 'lucide-react';
import type { RegistrationFormInput } from '../registration-schema';
import { useQuery } from '@tanstack/react-query';
import { getMinistries } from '@/lib/dal';
import type { Ministry } from '@/lib/types';
import { useMemo } from 'react';

interface Step4MinistriesProps {
	form: UseFormReturn<RegistrationFormInput>;
}

interface ChildMinistryCheckboxProps {
	ministry: Ministry;
	form: UseFormReturn<RegistrationFormInput>;
	fieldPrefix: string;
	child: any;
	childIndex: number;
}

function ChildMinistryCheckbox({
	ministry,
	form,
	fieldPrefix,
	child,
	childIndex,
}: ChildMinistryCheckboxProps) {
	const isSelected = useWatch({
		control: form.control,
		name: `children.${childIndex}.${fieldPrefix}.${ministry.code}` as any,
	});

	return (
		<div>
			<FormField
				control={form.control}
				name={`children.${childIndex}.${fieldPrefix}.${ministry.code}` as any}
				render={({ field }) => (
					<FormItem className="flex flex-row items-start space-x-3 space-y-0">
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

			{/* Optional custom questions per ministry */}
			{isSelected && ministry.custom_questions && ministry.custom_questions.length > 0 && (
				<div className="ml-8 mt-2 space-y-2">
					{ministry.custom_questions.map((question, qIndex) => (
						<FormField
							key={`${ministry.code}-${childIndex}-q${qIndex}`}
							control={form.control}
							name={
								`children.${childIndex}.customFields.${ministry.code}.${question.id}` as any
							}
							render={({ field: customField }) => (
								<FormItem>
									<FormLabel className="text-sm text-[#1e2a2f]">
										{question.text}
									</FormLabel>
									<FormControl>
										{question.type === 'text' ? (
											<Input
												{...customField}
												className="border-[#e0dacf] focus:border-[#017c7d]"
											/>
										) : (
											<Textarea
												{...customField}
												className="border-[#e0dacf] focus:border-[#017c7d]"
												rows={2}
											/>
										)}
									</FormControl>
								</FormItem>
							)}
						/>
					))}
				</div>
			)}
		</div>
	);
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
		<div className="p-4 border border-[#e0dacf] rounded-md">
			<h4 className="font-semibold text-[#1e2a2f]">{ministry.name}</h4>
			{ministry.description && (
				<p className="text-sm text-[#5b6b72] mb-2">{ministry.description}</p>
			)}
			{(ministry.min_age || ministry.max_age || ministry.min_grade || ministry.max_grade) && (
				<p className="text-xs text-[#5b6b72] mb-2">
					Eligible:{' '}
					{ministry.min_age && ministry.max_age && `Ages ${ministry.min_age}-${ministry.max_age}`}
					{ministry.min_grade &&
						ministry.max_grade &&
						` Grades ${ministry.min_grade}-${ministry.max_grade}`}
				</p>
			)}

			<div className="flex flex-col gap-2 mt-2">
				{childrenData.map((child, childIndex) => (
					<ChildMinistryCheckbox
						key={`${ministry.code}-${childIndex}`}
						ministry={ministry}
						form={form}
						fieldPrefix={fieldPrefix}
						child={child}
						childIndex={childIndex}
					/>
				))}
			</div>

			{/* Optional consent text */}
			{ministry.optional_consent_text && (
				<div className="mt-3 p-3 bg-[#f7f5f1] border border-[#e6e1d8] rounded text-xs text-[#5b6b72]">
					{ministry.optional_consent_text}
				</div>
			)}
		</div>
	);
}

export function Step4Ministries({ form }: Step4MinistriesProps) {
	const childrenData = useWatch({ control: form.control, name: 'children' });

	// Fetch all active ministries
	const { data: allMinistries = [], isLoading: loadingMinistries } = useQuery({
		queryKey: ['ministries', 'active'],
		queryFn: () => getMinistries(true),
		staleTime: 15 * 60 * 1000,
	});

	// Separate ministries by enrollment type
	const enrolledMinistries = useMemo(
		() => allMinistries.filter((m: Ministry) => m.enrollment_type === 'enrolled'),
		[allMinistries]
	);

	const interestMinistries = useMemo(
		() => allMinistries.filter((m: Ministry) => m.enrollment_type === 'expressed_interest'),
		[allMinistries]
	);

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
			{enrolledMinistries.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-bold text-[#1e2a2f]">
							Ministry Programs
						</CardTitle>
						<CardDescription className="text-[#5b6b72]">
							Select the programs each child wishes to enroll in.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Always show Sunday School as included */}
						<div className="p-4 border border-[#e0dacf] rounded-md bg-[#f7f5f1]">
							<h4 className="font-semibold text-[#1e2a2f] mb-2">
								Sunday School / Children&apos;s Church
							</h4>
							<div className="text-sm text-[#5b6b72] space-y-2">
								<p>
									Sunday School takes place in the Family Life Enrichment Center on 1st,
									4th, and 5th Sundays during the 9:30 AM Service. Sunday School serves ages
									4-18.
								</p>
								<p>
									Children&apos;s Church, for ages 4-12, will take place on 3rd Sundays in
									the same location during the 9:30 AM service.
								</p>
							</div>
							<div className="flex flex-col gap-2 mt-3">
								{childrenData.map((child, index) => (
									<div
										key={index}
										className="flex flex-row items-start space-x-3 space-y-0">
										<Checkbox checked={true} disabled={true} className="border-[#017c7d]" />
										<label className="font-normal text-sm text-[#5b6b72]">
											{child.first_name || `Child ${index + 1}`}
										</label>
									</div>
								))}
							</div>
						</div>

						{/* Render enrolled ministries */}
						{enrolledMinistries.map((ministry: Ministry) => (
							<MinistryCard
								key={ministry.ministry_id}
								ministry={ministry}
								form={form}
								selectionType="enrollment"
								childrenData={childrenData}
							/>
						))}
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
								key={ministry.ministry_id}
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
