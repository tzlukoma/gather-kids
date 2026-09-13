import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import type { RegistrationFormInput } from '../registration-schema';
import {
	currentCycleOverwriteWarning,
	step1OnFileCopy,
	type RegistrationPrefillState,
} from '../registration-prefill-state';

interface Step1HouseholdProps {
	form: UseFormReturn<RegistrationFormInput>;
	prefillState?: RegistrationPrefillState;
	cycleLabel?: string;
}

const defaultPrefillState: RegistrationPrefillState = {
	kind: 'first_time',
	isReturningPrefill: false,
	isCurrentYearOverwrite: false,
	hasHouseholdSource: false,
};

export function Step1Household({
	form,
	prefillState = defaultPrefillState,
	cycleLabel = 'current',
}: Step1HouseholdProps) {
	const onFileCopy = step1OnFileCopy(prefillState);
	const overwriteWarning = prefillState.isCurrentYearOverwrite
		? currentCycleOverwriteWarning(cycleLabel)
		: null;

	return (
		<Card>
			<CardContent className="pt-6 space-y-4">
				{overwriteWarning && (
					<Alert
						variant="destructive"
						data-testid="step1-overwrite-warning">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{overwriteWarning.title}</AlertTitle>
						<AlertDescription>{overwriteWarning.description}</AlertDescription>
					</Alert>
				)}

				{onFileCopy && (
					<Alert
						className="bg-[#e8f5f5] border-[#017c7d]"
						data-testid="step1-on-file-notice">
						<Info className="h-4 w-4 text-[#017c7d]" />
						<AlertDescription className="text-sm text-[#1e2a2f]">
							{onFileCopy}
						</AlertDescription>
					</Alert>
				)}

				{!onFileCopy && !overwriteWarning && (
					<div data-testid="step1-empty-notice" className="sr-only">
						New household registration
					</div>
				)}

				<FormField
					control={form.control}
					name="household.name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[#1e2a2f] font-semibold text-base">
								Household Name
							</FormLabel>
							<FormControl>
								<Input
									placeholder="The Smith Family"
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

				<div className="grid grid-cols-2 gap-4">
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
