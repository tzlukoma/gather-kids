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
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { RegistrationFormInput } from '../registration-schema';
import { defaultChildValues } from '../registration-schema';

interface Step3ChildrenProps {
	form: UseFormReturn<RegistrationFormInput>;
}

export function Step3Children({ form }: Step3ChildrenProps) {
	const {
		fields: childrenFields,
		append: appendChild,
		remove: removeChild,
	} = useFieldArray({
		control: form.control,
		name: 'children',
	});

	const [currentChildIndex, setCurrentChildIndex] = useState(0);

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
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger className="border-[#e0dacf] focus:ring-[#017c7d]">
												<SelectValue placeholder="Select grade" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="Pre-K">Pre-K</SelectItem>
											<SelectItem value="Kindergarten">Kindergarten</SelectItem>
											<SelectItem value="1st">1st</SelectItem>
											<SelectItem value="2nd">2nd</SelectItem>
											<SelectItem value="3rd">3rd</SelectItem>
											<SelectItem value="4th">4th</SelectItem>
											<SelectItem value="5th">5th</SelectItem>
											<SelectItem value="6th">6th</SelectItem>
											<SelectItem value="7th">7th</SelectItem>
											<SelectItem value="8th">8th</SelectItem>
											<SelectItem value="9th">9th</SelectItem>
											<SelectItem value="10th">10th</SelectItem>
											<SelectItem value="11th">11th</SelectItem>
											<SelectItem value="12th">12th</SelectItem>
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
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									Allergies (Optional)
								</FormLabel>
								<FormControl>
									<Textarea
										{...field}
										placeholder="List any known allergies"
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
						removeChild(currentChildIndex);
						setCurrentChildIndex(Math.max(0, currentChildIndex - 1));
					}}
					className="w-full text-destructive hover:text-destructive">
					Remove {currentChild.first_name || 'this child'}
				</Button>
			)}
		</div>
	);
}
