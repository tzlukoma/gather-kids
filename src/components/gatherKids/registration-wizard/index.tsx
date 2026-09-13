'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormCompat as useForm } from '@/hooks/useFormCompat';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step1Household } from './steps/step1-household';
import { Step2Guardians } from './steps/step2-guardians';
import { Step3Children } from './steps/step3-children';
import { Step4Ministries } from './steps/step4-ministries';
import { Step5Consents } from './steps/step5-consents';
import { RegistrationEntry } from './registration-entry';
import { RegistrationDone } from './registration-done';
import {
	buildConditionalConsentContext,
	pruneStaleConsents,
} from './consent-context';
import {
	defaultConditionalConsentContext,
	registrationFormBaseSchema,
	validateConditionalConsents,
} from './registration-schema';
import type {
	ConditionalConsentContext,
	RegistrationFormInput,
} from './registration-schema';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
	getMinistries,
	getMinistriesByGroupCode,
	getMinistryGroups,
	getRegistrationCycles,
	registerHouseholdCanonical,
} from '@/lib/dal';
import { pickActiveRegistrationCycle } from '@/lib/dal/registration-cycle-utils';
import { cleanPhone } from '@/hooks/usePhoneFormat';
import { canonicalizeGradeForStorage } from '@/lib/gradeUtils';
import { captureAnalyticsEvent } from '@/lib/analytics/browser';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STEPS = [
	{ label: 'Household', title: 'Confirm your household', description: 'Review your household address' },
	{ label: 'Guardians', title: 'Who can collect the children?', description: 'Authorized adults for pickup' },
	{ label: 'Children', title: 'Tell us about your children', description: 'Add each child you are registering' },
	{ label: 'Ministries', title: 'Choose ministry programs', description: 'Select programs for your children' },
	{ label: 'Consents', title: 'Review and submit', description: 'Review and sign required consents' },
];

type WizardScreen = 'entry' | 'wizard' | 'done';

const consentContextRef = { current: defaultConditionalConsentContext };

const registrationSchemaWithLiveContext = registrationFormBaseSchema.superRefine(
	(data, ctx) => {
		validateConditionalConsents(data, ctx, consentContextRef.current);
	}
);

export default function RegisterWizard() {
	const router = useRouter();
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const { user } = useAuth();
	const [screen, setScreen] = useState<WizardScreen>('entry');
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [childrenEnrolledInBibleBee, setChildrenEnrolledInBibleBee] = useState(false);
	const [registeredChildren, setRegisteredChildren] = useState<Array<{name: string; ministries: string[]}>>([]);
	const [isReturningPrefill, setIsReturningPrefill] = useState(false);

	const { data: registrationCycles = [] } = useQuery({
		queryKey: ['registrationCycles'],
		queryFn: () => getRegistrationCycles(),
		staleTime: 15 * 60 * 1000,
	});

	const activeRegistrationCycle = pickActiveRegistrationCycle(registrationCycles);

	const { data: ministryGroups = [] } = useQuery({
		queryKey: ['ministryGroups'],
		queryFn: getMinistryGroups,
		staleTime: 10 * 60 * 1000,
	});

	const { data: allMinistries = [] } = useQuery({
		queryKey: ['ministries', 'active'],
		queryFn: () => getMinistries(true),
		staleTime: 15 * 60 * 1000,
	});

	const { data: choirMinistries = [] } = useQuery({
		queryKey: ['ministriesByGroup', 'choirs'],
		queryFn: () => getMinistriesByGroupCode('choirs'),
		staleTime: 10 * 60 * 1000,
	});

	const consentContext = useMemo(
		(): ConditionalConsentContext =>
			buildConditionalConsentContext({
				allMinistries,
				ministryGroups,
				choirMinistries,
			}),
		[allMinistries, ministryGroups, choirMinistries]
	);

	const consentContextSyncRef = useRef(consentContext);
	consentContextSyncRef.current = consentContext;

	// Draft persistence
	const { loadDraft, saveDraft, clearDraft, draftStatus } =
		useDraftPersistence<RegistrationFormInput>({
			formName: 'registration_v1',
			version: 1,
			autoSaveDelay: 1000,
			enabled: flags.registrationDraftPersistenceEnabled || false,
		});

	const form = useForm<RegistrationFormInput>({
		resolver: zodResolver(registrationSchemaWithLiveContext),
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
					email: user?.email || '',
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

	const totalSteps = STEPS.length;

	// Handle entry screen start with optional prefill data
	const handleStartRegistration = useCallback(
		async (prefillData?: any) => {
			if (prefillData?.data) {
				// Prefill from household data
				form.reset({
					household: {
						household_id: prefillData.data.household?.household_id || '',
						name: prefillData.data.household?.name || '',
						address_line1: prefillData.data.household?.address_line1 || '',
						address_line2: prefillData.data.household?.address_line2 || '',
						city: prefillData.data.household?.city || '',
						state: prefillData.data.household?.state || '',
						zip: prefillData.data.household?.zip || '',
						preferredScriptureTranslation:
							prefillData.data.household?.preferredScriptureTranslation || 'NIV',
					},
					guardians: prefillData.data.guardians || [
						{
							first_name: '',
							last_name: '',
							mobile_phone: '',
							email: user?.email || '',
							relationship: 'Mother',
							is_primary: true,
						},
					],
					emergencyContact: prefillData.data.emergencyContact || {
						first_name: '',
						last_name: '',
						mobile_phone: '',
						relationship: '',
					},
					children: prefillData.data.children || [],
					consents: prefillData.data.consents || {
						liability: false,
						photoRelease: false,
						group_consents: {},
						custom_consents: {},
					},
				});
				setIsReturningPrefill(prefillData.isReturningPrefill || false);
				toast({
					title: 'Household Found!',
					description: 'Your information has been pre-filled for you to review.',
				});
			} else {
				// Try to load draft
				try {
					const draftData = await loadDraft();
					if (draftData && Object.keys(draftData).length > 0) {
						form.reset(draftData);
						toast({
							title: 'Draft Restored',
							description: 'Your previous registration progress has been restored.',
						});
					}
				} catch (error) {
					console.warn('Failed to load draft:', error);
				}
			}
			setScreen('wizard');
		},
		[form, loadDraft, toast, user?.email]
	);

	useEffect(() => {
		consentContextRef.current = consentContextSyncRef.current;
		void form.trigger('consents');
	}, [consentContext, form]);

	// Drop obsolete conditional consents when children or ministry selections change
	useEffect(() => {
		if (screen !== 'wizard') return;

		const subscription = form.watch((_values, { name }) => {
			if (
				!name ||
				(name !== 'children' &&
					!name.includes('ministrySelections') &&
					!name.includes('interestSelections'))
			) {
				return;
			}

			const values = form.getValues();
			const pruned = pruneStaleConsents(
				values.consents,
				values,
				consentContextSyncRef.current
			);

			if (
				JSON.stringify(pruned.custom_consents) !==
				JSON.stringify(values.consents.custom_consents)
			) {
				form.setValue('consents.custom_consents', pruned.custom_consents, {
					shouldValidate: true,
				});
			}

			if (
				JSON.stringify(pruned.group_consents) !==
				JSON.stringify(values.consents.group_consents)
			) {
				form.setValue('consents.group_consents', pruned.group_consents, {
					shouldValidate: true,
				});
			}
		});

		return () => subscription.unsubscribe();
	}, [form, screen]);

	// Auto-save draft
	useEffect(() => {
		if (screen !== 'wizard' || !flags.registrationDraftPersistenceEnabled) return;

		const subscription = form.watch((data) => {
			const hasData =
				data.household?.address_line1 ||
				data.household?.city ||
				data.guardians?.some((g) => g && (g.first_name || g.last_name)) ||
				(data.children?.length ?? 0) > 0;

			if (hasData) {
				saveDraft(data as RegistrationFormInput);
			}
		});

		return () => subscription.unsubscribe();
	}, [form, screen, flags.registrationDraftPersistenceEnabled, saveDraft]);

	const canProceed = () => {
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
				return true;
			case 5:
				return true;
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

	const handleCancel = () => {
		setShowCancelDialog(true);
	};

	const confirmCancel = () => {
		clearDraft();
		router.push('/household');
	};

	const onSubmit = async (data: RegistrationFormInput) => {
		if (!user?.email) {
			toast({
				title: 'Sign in required',
				description: 'Please sign in before submitting your registration.',
				variant: 'destructive',
			});
			router.push(`/login?next=${encodeURIComponent('/register')}`);
			return;
		}

		const cycleId = activeRegistrationCycle?.cycle_id;
		if (!cycleId) {
			toast({
				title: 'Registration unavailable',
				description:
					'No active registration cycle is configured. Please try again later.',
				variant: 'destructive',
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const prunedConsents = pruneStaleConsents(data.consents, data, consentContext);

			// Clean phone numbers
			const cleanedData = {
				...data,
				consents: prunedConsents,
				guardians: data.guardians.map((guardian) => ({
					...guardian,
					mobile_phone: cleanPhone(guardian.mobile_phone),
				})),
				emergencyContact: {
					...data.emergencyContact,
					mobile_phone: cleanPhone(data.emergencyContact.mobile_phone),
				},
				children: data.children.map((child) => ({
					...child,
					grade: canonicalizeGradeForStorage(child.grade),
					child_mobile: child.child_mobile
						? cleanPhone(child.child_mobile)
						: child.child_mobile,
				})),
			};

			const result = await registerHouseholdCanonical(cleanedData, cycleId);

			// Build registered children summary
			const childSummary = data.children.map((child) => {
				const ministries: string[] = ['Sunday School'];
				
				// Add enrolled ministries
				if (child.ministrySelections) {
					Object.entries(child.ministrySelections).forEach(([code, selected]) => {
						if (selected) {
							// Try to find ministry name (fallback to code if not found)
							ministries.push(code.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
						}
					});
				}

				return {
					name: `${child.first_name} ${child.last_name}`,
					ministries,
				};
			});
			setRegisteredChildren(childSummary);

			// Check if any children enrolled in Bible Bee
			const hasBibleBee = data.children.some(
				(child) => child.ministrySelections?.['bible-bee']
			);
			setChildrenEnrolledInBibleBee(hasBibleBee);

			captureAnalyticsEvent('registration_submitted', {
				child_count: data.children.length,
				returning_household: isReturningPrefill,
			});

			// Clear draft after successful submission
			clearDraft();

			// Show done screen
			setScreen('done');
		} catch (error) {
			console.error('Registration submission error:', error);
			toast({
				title: 'Submission Error',
				description:
					'There was an error processing your registration. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (screen === 'entry') {
		return <RegistrationEntry onStart={handleStartRegistration} />;
	}

	if (screen === 'done') {
		return <RegistrationDone childrenEnrolledInBibleBee={childrenEnrolledInBibleBee} registeredChildren={registeredChildren} />;
	}

	return (
		<div className="min-h-screen bg-[#f7f5f1]">
			{/* Header with Step Strip */}
			<div className="bg-white border-b border-[#eae4da]">
				<div className="container mx-auto px-4 py-6">
					<div className="max-w-5xl mx-auto">
						<p className="text-xs font-semibold tracking-wider uppercase text-[#5b6b72] mb-4">
							{activeRegistrationCycle?.cycle_id || 'Fall 2026'} Registration
						</p>

						{/* Desktop: Circular numbered stepper */}
						<div className="hidden md:flex justify-between items-center mb-8">
							{STEPS.map((step, index) => {
								const stepNumber = index + 1;
								const isActive = stepNumber === currentStep;
								const isComplete = stepNumber < currentStep;

								return (
									<div key={index} className="flex items-center flex-1">
										<div className="flex flex-col items-center">
											<div
												className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${
													isComplete
														? 'bg-[#017c7d] text-white'
														: isActive
														? 'bg-[#017c7d] text-white'
														: 'bg-[#e6e1d8] text-[#5b6b72]'
												}`}>
												{isComplete ? (
													<svg
														className="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24">
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												) : (
													stepNumber
												)}
											</div>
											<span
												className={`text-xs font-medium ${
													isActive ? 'text-[#017c7d]' : 'text-[#5b6b72]'
												}`}>
												{step.label}
											</span>
										</div>
										{index < STEPS.length - 1 && (
											<div
												className={`flex-1 h-0.5 mx-4 -mt-6 ${
													stepNumber < currentStep ? 'bg-[#017c7d]' : 'bg-[#e6e1d8]'
												}`}
											/>
										)}
									</div>
								);
							})}
						</div>

						{/* Mobile: Labeled strip */}
						<div className="md:hidden flex justify-between mb-6 overflow-x-auto">
							{STEPS.map((step, index) => {
								const stepNumber = index + 1;
								const isActive = stepNumber === currentStep;
								const isComplete = stepNumber < currentStep;

								return (
									<div
										key={index}
										className={`flex-1 text-center px-2 pb-2 border-b-2 ${
											isActive
												? 'border-[#017c7d]'
												: isComplete
												? 'border-[#017c7d]'
												: 'border-[#e6e1d8]'
										}`}>
										<span
											className={`text-xs font-semibold ${
												isActive || isComplete ? 'text-[#017c7d]' : 'text-[#5b6b72]'
											}`}>
											{step.label}
										</span>
									</div>
								);
							})}
						</div>

						<h1 className="text-2xl font-bold text-[#1e2a2f] mb-2">
							{STEPS[currentStep - 1].title}
						</h1>
						<p className="text-sm text-[#5b6b72]">
							{STEPS[currentStep - 1].description}
						</p>
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
										<div className="flex gap-3">
											<Button
												type="button"
												variant="outline"
												onClick={handleBack}
												disabled={currentStep === 1}
												className="flex items-center gap-2">
												<ChevronLeft className="h-4 w-4" />
												Back
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={handleCancel}
												className="text-destructive hover:text-destructive">
												Cancel
											</Button>
										</div>

										{currentStep < totalSteps ? (
											<Button
												type="button"
												onClick={handleNext}
												disabled={!canProceed()}
												className="flex items-center gap-2 bg-[#017c7d] hover:bg-[#016566] text-white">
												Save & continue
												<ChevronRight className="h-4 w-4" />
											</Button>
										) : (
											<Button
												type="submit"
												disabled={isSubmitting || !form.formState.isValid}
												className="bg-[#017c7d] hover:bg-[#016566] text-white">
												{isSubmitting ? 'Submitting...' : 'Submit registration'}
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						</form>
					</Form>
				</div>
			</div>

			{/* Cancel Confirmation Dialog */}
			<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Registration?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to cancel? Your progress will be lost and you&apos;ll
							need to start over.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Continue Registration</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmCancel}
							className="bg-destructive hover:bg-destructive/90">
							Yes, Cancel
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
