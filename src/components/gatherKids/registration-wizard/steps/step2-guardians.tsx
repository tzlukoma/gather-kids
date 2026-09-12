import { UseFormReturn, useFieldArray } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
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

	const primaryGuardianLastName = form.watch('guardians.0.last_name');

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Guardians & Authorized Pick Up
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						Please provide information for all parents, guardians, or other adults who
						are authorized to pick up your children.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{guardianFields.map((field, index) => (
						<div key={field.id} className="space-y-4 p-4 border border-[#e0dacf] rounded-lg relative">
							<h3 className="font-semibold text-[#1e2a2f]">
								Guardian / Authorized Person {index + 1}
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name={`guardians.${index}.first_name`}
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-[#1e2a2f] font-semibold">
												First Name *
											</FormLabel>
											<FormControl>
												<Input {...field} className="border-[#e0dacf] focus-visible:ring-[#017c7d]" />
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
												<Input {...field} className="border-[#e0dacf] focus-visible:ring-[#017c7d]" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
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
													type="email"
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
									name={`guardians.${index}.relationship`}
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-[#1e2a2f] font-semibold">
												Relationship *
											</FormLabel>
											<FormControl>
												<Input
													placeholder="e.g., Mother, Grandfather"
													{...field}
													className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							{index === 0 && (
								<div className="pt-4">
									<FormField
										control={form.control}
										name="household.name"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-[#1e2a2f] font-semibold">
													Household Name (Optional)
												</FormLabel>
												<FormControl>
													<Input
														placeholder={
															primaryGuardianLastName
																? `${primaryGuardianLastName} Household`
																: ''
														}
														{...field}
														className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
													/>
												</FormControl>
												<FormDescription className="text-xs text-[#5b6b72]">
													This is how we will identify your household
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							)}
							{guardianFields.length > 1 && (
								<Button
									type="button"
									variant="destructive"
									size="icon"
									className="absolute top-2 right-2"
									onClick={() => removeGuardian(index)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							appendGuardian({
								first_name: '',
								last_name: '',
								mobile_phone: '',
								email: '',
								relationship: '',
								is_primary: false,
							})
						}
						className="border-[#e0dacf] text-[#017c7d] hover:bg-[#f7f5f1]">
						<PlusCircle className="mr-2 h-4 w-4" /> Add Guardian / Authorized Person
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Emergency Contact
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						This person should be different from the guardians listed above.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="emergencyContact.first_name"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-[#1e2a2f] font-semibold">
										First Name *
									</FormLabel>
									<FormControl>
										<Input {...field} className="border-[#e0dacf] focus-visible:ring-[#017c7d]" />
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
										<Input {...field} className="border-[#e0dacf] focus-visible:ring-[#017c7d]" />
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
											placeholder="e.g., Aunt, Neighbor"
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
							name="emergencyContact.mobile_phone"
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
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
