import { UseFormReturn, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { RegistrationFormInput } from '../registration-schema';

interface Step4MinistriesProps {
	form: UseFormReturn<RegistrationFormInput>;
}

export function Step4Ministries({ form }: Step4MinistriesProps) {
	const children = useWatch({ control: form.control, name: 'children' });

	// For now, show a simplified ministry selection
	// The full implementation will integrate with getMinistries() from DAL
	const enrolledPrograms = [
		{ code: 'dance', name: 'Dance Ministry', description: 'Creative movement and worship through dance' },
		{ code: 'bible-bee', name: 'Bible Bee', description: 'Scripture memorization program' },
	];

	const interestPrograms = [
		{ code: 'teen-fellowship', name: 'Teen Fellowship', description: 'Weekly fellowship for teens' },
	];

	if (!children || children.length === 0) {
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
					{/* Sunday School - Always included */}
					<div className="p-4 border border-[#e0dacf] rounded-md bg-[#f7f5f1]">
						<h4 className="font-semibold text-[#1e2a2f] mb-2">
							Sunday School / Children's Church
						</h4>
						<div className="text-sm text-[#5b6b72] space-y-2">
							<p>
								Sunday School takes place in the Family Life Enrichment Center on 1st,
								4th, and 5th Sundays during the 9:30 AM Service. Sunday School serves
								ages 4-18.
							</p>
							<p>
								Children's Church, for ages 4-12, will take place on 3rd Sundays in the
								same location during the 9:30 AM service.
							</p>
						</div>
						<div className="flex flex-col gap-2 mt-3">
							{children.map((child, index) => (
								<div key={index} className="flex flex-row items-start space-x-3 space-y-0">
									<Checkbox checked={true} disabled={true} className="border-[#017c7d]" />
									<label className="font-normal text-sm text-[#5b6b72]">
										{child.first_name || `Child ${index + 1}`}
									</label>
								</div>
							))}
						</div>
					</div>

					{/* Enrolled Programs */}
					{enrolledPrograms.map((program) => (
						<div key={program.code} className="p-4 border border-[#e0dacf] rounded-md">
							<h4 className="font-semibold text-[#1e2a2f]">{program.name}</h4>
							{program.description && (
								<p className="text-sm text-[#5b6b72] mb-2">{program.description}</p>
							)}
							<div className="flex flex-col gap-2 mt-2">
								{children.map((child, index) => (
									<FormField
										key={`${program.code}-${index}`}
										control={form.control}
										name={`children.${index}.ministrySelections.${program.code}`}
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
													{child.first_name || `Child ${index + 1}`}
												</FormLabel>
											</FormItem>
										)}
									/>
								))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-xl font-bold text-[#1e2a2f]">
						Expressed Interest Activities
					</CardTitle>
					<CardDescription className="text-[#5b6b72]">
						Let us know if you're interested. This does not register you for these
						activities but helps us gauge interest for future planning.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{interestPrograms.map((program) => (
						<div key={program.code} className="p-4 border border-[#e0dacf] rounded-md">
							<h4 className="font-semibold text-[#1e2a2f]">{program.name}</h4>
							{program.description && (
								<p className="text-sm text-[#5b6b72] mb-2">{program.description}</p>
							)}
							<div className="flex flex-col gap-2 mt-2">
								{children.map((child, index) => (
									<FormField
										key={`${program.code}-${index}`}
										control={form.control}
										name={`children.${index}.interestSelections.${program.code}`}
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
													{child.first_name || `Child ${index + 1}`}
												</FormLabel>
											</FormItem>
										)}
									/>
								))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
