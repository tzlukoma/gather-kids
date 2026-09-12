import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { RegistrationFormInput } from '../registration-schema';

interface Step2GuardiansProps {
	form: UseFormReturn<RegistrationFormInput>;
}

export function Step2Guardians({ form }: Step2GuardiansProps) {
	const {
		fields: guardianFields,
		append: appendGuardian,
		remove: removeGuardian,
	} = useFieldArray({
		control: form.control,
		name: 'guardians',
	});

	const [editingGuardian, setEditingGuardian] = useState<number | null>(null);

	const handleAddGuardian = () => {
		appendGuardian({
			first_name: '',
			last_name: '',
			mobile_phone: '',
			email: '',
			relationship: 'Other',
			is_primary: false,
		});
		setEditingGuardian(guardianFields.length);
	};

	return (
		<div className="space-y-6">
			{/* Guardians Section */}
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Who can collect the children?
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						List all parents, guardians, and adults authorized to pick up your children.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{guardianFields.map((field, index) => {
						const guardian = form.watch(`guardians.${index}`);
						const isEditing = editingGuardian === index;

						return (
							<div
								key={field.id}
								className="border border-[#e0dacf] rounded-lg overflow-hidden">
								{!isEditing ? (
									// Card View
									<div className="p-4 flex items-center justify-between bg-white">
										<div className="flex items-center gap-4">
											<div className="w-12 h-12 rounded-full bg-[#e8f5f5] border border-[#017c7d] flex items-center justify-center">
												<span className="text-sm font-semibold text-[#017c7d]">
													{guardian.first_name?.substring(0, 1) || '?'}
													{guardian.last_name?.substring(0, 1) || '?'}
												</span>
											</div>
											<div>
												<div className="flex items-center gap-2">
													<p className="font-semibold text-[#1e2a2f]">
														{guardian.first_name || 'First'} {guardian.last_name || 'Last'}
													</p>
													{guardian.is_primary && (
														<Badge className="bg-[#017c7d] text-white text-xs">
															Primary
														</Badge>
													)}
												</div>
												<p className="text-sm text-[#5b6b72]">
													{guardian.mobile_phone || 'No phone'} · {guardian.relationship || 'No relationship'}
												</p>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setEditingGuardian(index)}
												className="flex items-center gap-2">
												<Edit2 className="h-3 w-3" />
												Edit
											</Button>
											{guardianFields.length > 1 && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => {
														removeGuardian(index);
														if (editingGuardian === index) {
															setEditingGuardian(null);
														}
													}}
													className="text-destructive hover:text-destructive">
													<Trash2 className="h-3 w-3" />
												</Button>
											)}
										</div>
									</div>
								) : (
									// Edit Form
									<div className="p-4 bg-[#fafaf8] space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name={`guardians.${index}.first_name`}
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
												name={`guardians.${index}.last_name`}
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

										<FormField
											control={form.control}
											name={`guardians.${index}.mobile_phone`}
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[#1e2a2f] font-semibold">
														Phone *
													</FormLabel>
													<FormControl>
														<PhoneInput
															name={field.name}
															value={field.value}
															onChange={field.onChange}
															className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name={`guardians.${index}.email`}
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[#1e2a2f] font-semibold">
														Email (Optional)
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															type="email"
															className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name={`guardians.${index}.relationship`}
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[#1e2a2f] font-semibold">
														Relationship *
													</FormLabel>
													<Select onValueChange={field.onChange} value={field.value}>
														<FormControl>
															<SelectTrigger className="border-[#e0dacf] focus:ring-[#017c7d]">
																<SelectValue placeholder="Select relationship" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value="Mother">Mother</SelectItem>
															<SelectItem value="Father">Father</SelectItem>
															<SelectItem value="Grandmother">Grandmother</SelectItem>
															<SelectItem value="Grandfather">Grandfather</SelectItem>
															<SelectItem value="Aunt">Aunt</SelectItem>
															<SelectItem value="Uncle">Uncle</SelectItem>
															<SelectItem value="Guardian">Guardian</SelectItem>
															<SelectItem value="Other">Other</SelectItem>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name={`guardians.${index}.is_primary`}
											render={({ field }) => (
												<FormItem className="flex items-center gap-2 space-y-0">
													<FormControl>
														<input
															type="checkbox"
															checked={field.value}
															onChange={field.onChange}
															className="h-4 w-4 rounded border-[#e0dacf] text-[#017c7d] focus:ring-[#017c7d]"
														/>
													</FormControl>
													<FormLabel className="text-[#1e2a2f] font-normal">
														Mark as primary contact
													</FormLabel>
												</FormItem>
											)}
										/>

										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setEditingGuardian(null)}
											className="w-full">
											Done
										</Button>
									</div>
								)}
							</div>
						);
					})}

					{/* Add Another Guardian */}
					<button
						type="button"
						onClick={handleAddGuardian}
						className="w-full p-4 border-2 border-dashed border-[#017c7d] rounded-lg bg-[#f7f5f1] hover:bg-[#e8f5f5] transition-colors flex items-center justify-center gap-2 text-[#017c7d] font-semibold">
						<Plus className="h-4 w-4" />
						Add another guardian
					</button>
				</CardContent>
			</Card>

			{/* Emergency Contact Section */}
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Emergency Contact
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						Provide an emergency contact who is not a guardian above.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="emergencyContact.first_name"
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
							name="emergencyContact.last_name"
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

					<FormField
						control={form.control}
						name="emergencyContact.mobile_phone"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">Phone *</FormLabel>
								<FormControl>
									<PhoneInput
										name={field.name}
										value={field.value}
										onChange={field.onChange}
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="emergencyContact.relationship"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									Relationship *
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="e.g., Friend, Neighbor, Relative"
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
