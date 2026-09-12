'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { useFormCompat as useForm } from '@/hooks/useFormCompat';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step1Household } from './steps/step1-household';
import { Step2Guardians } from './steps/step2-guardians';
import { Step3Children } from './steps/step3-children';
import { Step4Ministries } from './steps/step4-ministries';
import { Step5Consents } from './steps/step5-consents';
import { registrationSchema } from './registration-schema';
import type { RegistrationFormInput } from './registration-schema';

const STEP_TITLES = [
	'Household Information',
	'Guardians & Emergency Contact',
	'Children Information',
	'Ministry Programs',
	'Consents & Submit',
];

const STEP_DESCRIPTIONS = [
	'Provide your household address',
	'List all authorized adults for pickup',
	'Add each child you are registering',
	'Select programs for your children',
	'Review and sign required consents',
];

export default function RegisterWizard() {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<RegistrationFormInput>({
		resolver: zodResolver(registrationSchema),
		defaultValues: {
			household: {
				name: '',
				address_line1: '',
				address_line2: '',
				city: '',
				state: '',
				zip: '',
				preferredScriptureTranslation: 'NIV',
			},
			guardians: [
				{
					first_name: '',
					last_name: '',
					mobile_phone: '',
					email: '',
					relationship: 'Mother',
					is_primary: true,
				},
			],
			emergencyContact: {
				first_name: '',
				last_name: '',
				mobile_phone: '',
				relationship: '',
			},
			children: [],
			consents: {
				liability: false,
				photoRelease: false,
				group_consents: {},
				custom_consents: {},
			},
		},
	});

	const totalSteps = STEP_TITLES.length;
	const progress = (currentStep / totalSteps) * 100;

	const canProceed = () => {
		// Validate current step before allowing next
		const values = form.getValues();
		switch (currentStep) {
			case 1:
				return Boolean(
					values.household.address_line1 &&
						values.household.city &&
						values.household.state &&
						values.household.zip
				);
			case 2:
				return (
					values.guardians.length > 0 &&
					values.guardians[0].first_name &&
					values.guardians[0].last_name &&
					values.guardians[0].mobile_phone &&
					values.emergencyContact.first_name &&
					values.emergencyContact.last_name &&
					values.emergencyContact.mobile_phone &&
					values.emergencyContact.relationship
				);
			case 3:
				return values.children.length > 0;
			case 4:
				return true; // Ministry selections are optional
			case 5:
				return true; // Final validation happens on submit
			default:
				return false;
		}
	};

	const handleNext = () => {
		if (canProceed() && currentStep < totalSteps) {
			setCurrentStep(currentStep + 1);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const onSubmit = async (data: RegistrationFormInput) => {
		setIsSubmitting(true);
		try {
			// TODO: Wire up to existing registration submission logic
			console.log('Submitting registration:', data);
			// Placeholder for now - will integrate with registerHouseholdCanonical
			router.push('/household');
		} catch (error) {
			console.error('Registration submission error:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#f7f5f1]">
			{/* Header with Progress */}
			<div className="bg-white border-b border-[#eae4da]">
				<div className="container mx-auto px-4 py-6">
					<div className="max-w-3xl mx-auto">
						<p className="text-xs font-semibold tracking-wider uppercase text-[#5b6b72] mb-2">
							Fall 2026 Registration
						</p>
						<h1 className="text-2xl font-bold text-[#1e2a2f] mb-2">
							{STEP_TITLES[currentStep - 1]}
						</h1>
						<p className="text-sm text-[#5b6b72] mb-4">
							{STEP_DESCRIPTIONS[currentStep - 1]}
						</p>
						<div className="space-y-2">
							<div className="flex justify-between text-sm text-[#5b6b72]">
								<span>
									Step {currentStep} of {totalSteps}
								</span>
								<span>{Math.round(progress)}% Complete</span>
							</div>
							<Progress value={progress} className="h-2" />
						</div>
					</div>
				</div>
			</div>

			{/* Form Content */}
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-3xl mx-auto">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							{currentStep === 1 && <Step1Household form={form} />}
							{currentStep === 2 && <Step2Guardians form={form} />}
							{currentStep === 3 && <Step3Children form={form} />}
							{currentStep === 4 && <Step4Ministries form={form} />}
							{currentStep === 5 && <Step5Consents form={form} />}

							{/* Navigation Buttons */}
							<Card>
								<CardContent className="pt-6">
									<div className="flex gap-3 justify-between">
										<Button
											type="button"
											variant="outline"
											onClick={handleBack}
											disabled={currentStep === 1}
											className="flex items-center gap-2">
											<ChevronLeft className="h-4 w-4" />
											Back
										</Button>

										{currentStep < totalSteps ? (
											<Button
												type="button"
												onClick={handleNext}
												disabled={!canProceed()}
												className="flex items-center gap-2 bg-[#017c7d] hover:bg-[#016566] text-white">
												Next
												<ChevronRight className="h-4 w-4" />
											</Button>
										) : (
											<Button
												type="submit"
												disabled={isSubmitting || !form.formState.isValid}
												className="bg-[#017c7d] hover:bg-[#016566] text-white">
												{isSubmitting ? 'Submitting...' : 'Submit Registration'}
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
