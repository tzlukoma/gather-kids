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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { RegistrationFormInput } from '../registration-schema';
import { defaultChildValues } from '../registration-schema';

interface Step3ChildrenProps {
	form: UseFormReturn<RegistrationFormInput>;
}

export function Step3Children({ form }: Step3ChildrenProps) {
	const {
		fields: childFields,
		append: appendChild,
		remove: removeChild,
	} = useFieldArray({
		control: form.control,
		name: 'children',
	});

	const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(
		childFields.map((_, index) => `child-${index}`)
	);

	const childrenData = form.watch('children');

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl font-bold text-[#1e2a2f]">
					Children Information
				</CardTitle>
				<CardDescription className="text-[#5b6b72]">
					Please add each child you are registering.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{childFields.length === 0 ? (
					<div className="text-center py-8 border border-dashed border-[#e0dacf] rounded-lg bg-[#f7f5f1]">
						<p className="text-[#5b6b72] mb-4">No children added yet</p>
						<Button
							type="button"
							onClick={() => {
								appendChild({
									...defaultChildValues,
									child_id: crypto.randomUUID(),
								});
								setOpenAccordionItems(['child-0']);
							}}
							className="bg-[#017c7d] hover:bg-[#016566] text-white">
							<PlusCircle className="mr-2 h-4 w-4" /> Add First Child
						</Button>
					</div>
				) : (
					<>
						<Accordion
							type="multiple"
							className="w-full"
							value={openAccordionItems}
							onValueChange={setOpenAccordionItems}>
							{childFields.map((field, index) => {
								const childFirstName = form.watch(`children.${index}.first_name`);
								const hasSpecialNeeds = form.watch(`children.${index}.special_needs`);

								return (
									<AccordionItem key={field.id} value={`child-${index}`} className="border-[#e0dacf]">
										<AccordionTrigger className="text-[#1e2a2f] font-semibold hover:text-[#017c7d]">
											{childFirstName || `Child ${index + 1}`}
										</AccordionTrigger>
										<AccordionContent className="space-y-4 pt-4">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<FormField
													control={form.control}
													name={`children.${index}.first_name`}
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
													name={`children.${index}.last_name`}
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
													name={`children.${index}.dob`}
													render={({ field }) => (
														<FormItem>
															<FormLabel className="text-[#1e2a2f] font-semibold">
																Date of Birth *
															</FormLabel>
															<FormControl>
																<Input type="date" {...field} className="border-[#e0dacf] focus-visible:ring-[#017c7d]" />
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name={`children.${index}.grade`}
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
																	<SelectItem value="-1">Pre-K</SelectItem>
																	<SelectItem value="0">Kindergarten</SelectItem>
																	<SelectItem value="1">1st Grade</SelectItem>
																	<SelectItem value="2">2nd Grade</SelectItem>
																	<SelectItem value="3">3rd Grade</SelectItem>
																	<SelectItem value="4">4th Grade</SelectItem>
																	<SelectItem value="5">5th Grade</SelectItem>
																	<SelectItem value="6">6th Grade</SelectItem>
																	<SelectItem value="7">7th Grade</SelectItem>
																	<SelectItem value="8">8th Grade</SelectItem>
																	<SelectItem value="9">9th Grade</SelectItem>
																	<SelectItem value="10">10th Grade</SelectItem>
																	<SelectItem value="11">11th Grade</SelectItem>
																	<SelectItem value="12">12th Grade</SelectItem>
																</SelectContent>
															</Select>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name={`children.${index}.child_mobile`}
													render={({ field }) => (
														<FormItem>
															<FormLabel className="text-[#1e2a2f] font-semibold">
																Child&apos;s Phone (Optional)
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

											<FormField
												control={form.control}
												name={`children.${index}.allergies`}
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-[#1e2a2f] font-semibold">
															Allergies or Medical Conditions (Optional)
														</FormLabel>
														<FormControl>
															<Input
																placeholder="e.g., Peanuts, Asthma"
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
												name={`children.${index}.special_needs`}
												render={({ field }) => (
													<FormItem className="space-y-3 rounded-lg border border-[#e0dacf] p-4">
														<FormLabel className="text-[#1e2a2f] font-semibold">
															Does {childFirstName || 'this child'} have special needs that
															church staff should be aware of?
														</FormLabel>
														<FormControl>
															<RadioGroup
																onValueChange={(value) => field.onChange(value === 'true')}
																value={String(field.value)}
																className="flex flex-col space-y-1">
																<FormItem className="flex items-center space-x-3 space-y-0">
																	<FormControl>
																		<RadioGroupItem value="true" className="border-[#017c7d] text-[#017c7d]" />
																	</FormControl>
																	<FormLabel className="font-normal">Yes</FormLabel>
																</FormItem>
																<FormItem className="flex items-center space-x-3 space-y-0">
																	<FormControl>
																		<RadioGroupItem value="false" className="border-[#017c7d] text-[#017c7d]" />
																	</FormControl>
																	<FormLabel className="font-normal">No</FormLabel>
																</FormItem>
															</RadioGroup>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											{hasSpecialNeeds && (
												<FormField
													control={form.control}
													name={`children.${index}.special_needs_notes`}
													render={({ field }) => (
														<FormItem>
															<FormLabel className="text-[#1e2a2f] font-semibold">
																What special needs does {childFirstName || 'this child'}{' '}
																have?
															</FormLabel>
															<FormControl>
																<Textarea
																	placeholder="Please describe any physical, behavioral, or emotional needs."
																	{...field}
																	className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											)}

											<div className="flex justify-end pt-4">
												<Button
													type="button"
													variant="destructive"
													size="sm"
													onClick={() => removeChild(index)}>
													<Trash2 className="mr-2 h-4 w-4" /> Remove Child
												</Button>
											</div>
										</AccordionContent>
									</AccordionItem>
								);
							})}
						</Accordion>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-4 border-[#e0dacf] text-[#017c7d] hover:bg-[#f7f5f1]"
							onClick={() => {
								const newIndex = childFields.length;
								appendChild({
									...defaultChildValues,
									child_id: crypto.randomUUID(),
								});
								setOpenAccordionItems((prev) => [...prev, `child-${newIndex}`]);
							}}>
							<PlusCircle className="mr-2 h-4 w-4" /> Add Child
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
