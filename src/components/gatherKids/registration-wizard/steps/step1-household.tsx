import { UseFormReturn } from 'react-hook-form';
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
import type { RegistrationFormInput } from '../registration-schema';

interface Step1HouseholdProps {
	form: UseFormReturn<RegistrationFormInput>;
}

export function Step1Household({ form }: Step1HouseholdProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl font-bold text-[#1e2a2f]">
					Household Address
				</CardTitle>
				<CardDescription className="text-[#5b6b72]">
					Enter your primary household address for ministry communications and
					emergency contact purposes.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<FormField
					control={form.control}
					name="household.address_line1"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[#1e2a2f] font-semibold">
								Street Address *
							</FormLabel>
							<FormControl>
								<Input
									placeholder="123 Main St"
									{...field}
									className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
								/>
							</FormControl>
							<FormMessage className="text-destructive" />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="household.address_line2"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[#1e2a2f] font-semibold">
								Address Line 2 (Optional)
							</FormLabel>
							<FormControl>
								<Input
									placeholder="Apartment, suite, unit, etc."
									{...field}
									className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
								/>
							</FormControl>
							<FormMessage className="text-destructive" />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<FormField
						control={form.control}
						name="household.city"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									City *
								</FormLabel>
								<FormControl>
									<Input
										placeholder="Anytown"
										{...field}
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								</FormControl>
								<FormMessage className="text-destructive" />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="household.state"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									State *
								</FormLabel>
								<FormControl>
									<Input
										placeholder="e.g., NJ"
										maxLength={2}
										{...field}
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								</FormControl>
								<FormMessage className="text-destructive" />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="household.zip"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-[#1e2a2f] font-semibold">
									ZIP Code *
								</FormLabel>
								<FormControl>
									<Input
										placeholder="12345"
										maxLength={10}
										{...field}
										className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
									/>
								</FormControl>
								<FormMessage className="text-destructive" />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="household.preferredScriptureTranslation"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[#1e2a2f] font-semibold">
								Preferred Scripture Translation (Optional)
							</FormLabel>
							<FormControl>
								<Input
									placeholder="e.g., NIV, KJV, ESV"
									{...field}
									className="border-[#e0dacf] focus-visible:ring-[#017c7d]"
								/>
							</FormControl>
							<FormDescription className="text-xs text-[#5b6b72]">
								Used for Bible Bee program materials if enrolled
							</FormDescription>
							<FormMessage className="text-destructive" />
						</FormItem>
					)}
				/>
			</CardContent>
		</Card>
	);
}
