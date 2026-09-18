'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isOfflineSupabase } from '@/lib/offline-supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormCompat as useForm } from '@/hooks/useFormCompat';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Step1Household } from './steps/step1-household';
import { Step2Guardians } from './steps/step2-guardians';
import { Step3Children } from './steps/step3-children';
import { Step4Ministries } from './steps/step4-ministries';
import { Step5Consents } from './steps/step5-consents';
import { RegistrationEntry, RegistrationOfflineAuth } from './registration-entry';
import { RegistrationDone } from './registration-done';
import {
	buildConditionalConsentContext,
	pruneStaleConsents,
	resolveChoirMinistriesForConsentContext,
} from './consent-context';
import {
	defaultConditionalConsentContext,
	migrateRegistrationDraftCustomFields,
	registrationFormBaseSchema,
	validateConditionalConsents,
} from './registration-schema';
import type {
	ConditionalConsentContext,
	RegistrationFormInput,
} from './registration-schema';
import type { RegisteredChildReceipt } from '@/lib/types';
import { findDuplicateCustomQuestionConflictsForChildren } from './steps/step4-ministries';
import {
	STEPS,
	firstInvalidStep,
	firstProblemOnStep,
	summarizeStepErrors,
} from './step-validation';
import type { StepProblem, WizardStep } from './step-validation';
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
import {
	pickActiveRegistrationCycle,
	registrationCycleLabel,
} from '@/lib/dal/registration-cycle-utils';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RegistrationProblemSummary } from './registration-problem-summary';
import {
	analyticsReturningHousehold,
	currentCycleOverwriteWarning,
	mapRegistrationPrefillState,
	type RegistrationPrefillState,
} from './registration-prefill-state';
import type { HouseholdRegistrationLoadResult } from '@/lib/dal/households';


type WizardScreen = 'entry' | 'wizard' | 'done';

function RegistrationAuthLoading() {
	return (
		<div
			className="flex items-center justify-center min-h-[400px]"
			data-testid="registration-auth-loading">
			<div className="flex items-center gap-2 text-[#5b6b72]">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
				<span>Preparing registration...</span>
			</div>
		</div>
	);
}

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
	const { user, loading: authLoading } = useAuth();
	const [screen, setScreen] = useState<WizardScreen>('entry');
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [childrenEnrolledInBibleBee, setChildrenEnrolledInBibleBee] = useState(false);
	const [registeredChildren, setRegisteredChildren] = useState<RegisteredChildReceipt[]>([]);
	// Problems surfaced by a blocked Continue or a refused Submit. Kept in state
	// rather than read from formState so the summary only appears once the user
	// has actually tried to move on.
	const [stepProblems, setStepProblems] = useState<StepProblem[]>([]);
	const [stepBlockMessage, setStepBlockMessage] = useState<string | null>(null);
	// Counts refusals, not problems. Steps 2 and 3 mount one entry at a time, so
	// each refusal has to move them to the entry the summary names — including a
	// second refusal naming the same entry the user has since navigated away
	// from. An index alone cannot tell those two apart; a counter can.
	const [blockedAt, setBlockedAt] = useState(0);
	const [prefillState, setPrefillState] = useState<RegistrationPrefillState>(() =>
		mapRegistrationPrefillState({ loadResult: null })
	);

	const { data: registrationCycles = [] } = useQuery({
		queryKey: ['registrationCycles'],
		queryFn: () => getRegistrationCycles(),
		staleTime: 15 * 60 * 1000,
	});

	const activeRegistrationCycle = pickActiveRegistrationCycle(registrationCycles);
	// Guardians see the cycle's name ("Fall 2026"), never its id — which is a
	// UUID in UAT and production.
	const cycleLabel = registrationCycleLabel(activeRegistrationCycle, 'current');

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

	const { data: choirMinistries, isPending: choirMinistriesPending } = useQuery({
		queryKey: ['ministriesByGroup', 'choirs'],
		queryFn: () => getMinistriesByGroupCode('choirs'),
		staleTime: 10 * 60 * 1000,
	});

	const choirMinistriesForConsent = resolveChoirMinistriesForConsentContext({
		data: choirMinistries,
		isPending: choirMinistriesPending,
	});

	const consentContext = useMemo(
		(): ConditionalConsentContext =>
			buildConditionalConsentContext({
				allMinistries,
				ministryGroups,
				choirMinistries: choirMinistriesForConsent,
			}),
		[allMinistries, ministryGroups, choirMinistriesForConsent]
	);

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

	// Subscribe so Save & continue re-enables when Step 3 allergies change, and
	// re-disables when Step 4 ministry selections collide.
	const watchedValues = form.watch();

	const ministriesForCustomQuestionCheck = useMemo(() => {
		const byCode = new Map(
			[...(allMinistries ?? []), ...(choirMinistries ?? [])].map((ministry) => [
				ministry.code,
				ministry,
			])
		);
		return [...byCode.values()];
	}, [allMinistries, choirMinistries]);

	useEffect(() => {
		if (authLoading) return;
		if (isOfflineSupabase()) return;
		if (!user) {
			router.replace(`/login?next=${encodeURIComponent('/register')}`);
		}
	}, [authLoading, user, router]);

	// Handle entry screen start with optional prefill data
	const handleStartRegistration = useCallback(
		async (prefillData?: HouseholdRegistrationLoadResult | null) => {
			const nextState = mapRegistrationPrefillState({
				loadResult: prefillData ?? null,
				hasDraftChildren: false,
			});

			if (prefillData?.data) {
				const data = prefillData.data;
				form.reset(
					migrateRegistrationDraftCustomFields({
						household: {
							household_id: data.household?.household_id || '',
							name: data.household?.name || '',
							address_line1: data.household?.address_line1 || '',
							address_line2: data.household?.address_line2 || '',
							city: data.household?.city || '',
							state: data.household?.state || '',
							zip: data.household?.zip || '',
							preferredScriptureTranslation:
								data.household?.preferredScriptureTranslation || 'NIV',
						},
						guardians: data.guardians?.length
							? data.guardians
							: [
									{
										first_name: '',
										last_name: '',
										mobile_phone: '',
										email: user?.email || '',
										relationship: 'Mother',
										is_primary: true,
									},
								],
						emergencyContact: data.emergencyContact || {
							first_name: '',
							last_name: '',
							mobile_phone: '',
							relationship: '',
						},
						children: data.children || [],
						consents: data.consents || {
							liability: false,
							photoRelease: false,
							group_consents: {},
							custom_consents: {},
						},
					})
				);
				setPrefillState(nextState);
				toast({
					title: nextState.isCurrentYearOverwrite
						? 'Existing Registration Found'
						: 'Household Found!',
					description: nextState.isCurrentYearOverwrite
						? 'Review your current-cycle registration. Submitting will overwrite this year.'
						: 'Your information has been pre-filled for you to review.',
				});
			} else {
				try {
					const draftData = await loadDraft();
					const hasDraftChildren = Boolean(
						draftData?.children?.some((c) => c?.first_name)
					);
					const draftState = mapRegistrationPrefillState({
						loadResult: null,
						hasDraftChildren,
					});
					setPrefillState(draftState);
					if (draftData && Object.keys(draftData).length > 0) {
						form.reset(migrateRegistrationDraftCustomFields(draftData));
						toast({
							title: 'Draft Restored',
							description: 'Your previous registration progress has been restored.',
						});
					} else {
						setPrefillState(mapRegistrationPrefillState({ loadResult: null }));
					}
				} catch (error) {
					console.warn('Failed to load draft:', error);
					setPrefillState(mapRegistrationPrefillState({ loadResult: null }));
				}
			}
			setScreen('wizard');
		},
		[form, loadDraft, toast, user?.email]
	);

	useEffect(() => {
		consentContextRef.current = consentContext;
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
				consentContextRef.current
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

	/**
	 * Step 4's one rule — the same custom question asked by two ministries a
	 * child is enrolled in — has no schema equivalent, so it stays here. Step 4
	 * already highlights the colliding questions inline; this only decides
	 * whether Continue may advance.
	 */
	const duplicateCustomQuestionConflicts = () =>
		findDuplicateCustomQuestionConflictsForChildren(
			form.getValues('children') ?? [],
			ministriesForCustomQuestionCheck
		);

	/**
	 * Put the cursor on the problem rather than leaving the user to hunt for it.
	 *
	 * Steps 2 and 3 mount one entry at a time, so those steps open the offending
	 * guardian or child themselves; this runs on the next frame, once the
	 * control exists.
	 */
	const focusFirstProblemOnStep = (step: WizardStep) => {
		const problem = firstProblemOnStep(form.formState.errors, step);
		if (!problem) return;
		window.requestAnimationFrame(() => {
			try {
				form.setFocus(problem.path as Parameters<typeof form.setFocus>[0], {
					shouldSelect: false,
				});
			} catch {
				// setFocus throws when the control is not mounted — a collapsed entry
				// that has not re-rendered yet, for instance. The visible message and
				// the summary still carry the user there.
			}
		});
	};

	const handleNext = async () => {
		if (currentStep >= totalSteps) return;
		const step = currentStep as WizardStep;

		// One whole-form pass, then keep only what this step owns. `trigger()`
		// with a name list drops nested object paths — see step-validation.ts.
		// The boolean it returns is about the whole form, so it is ignored: a
		// user on step 1 has not filled in step 5 yet and must still advance.
		await form.trigger();
		const owned = summarizeStepErrors(form.formState.errors).filter(
			(problem) => problem.step === step
		);
		const conflicts = step === 4 ? duplicateCustomQuestionConflicts() : [];

		if (owned.length > 0 || conflicts.length > 0) {
			setBlockedAt((count) => count + 1);
			setStepProblems(owned);
			setStepBlockMessage(
				conflicts.length > 0
					? 'Two ministries ask the same question for one of your children. Answer it on one ministry only.'
					: null
			);
			focusFirstProblemOnStep(step);
			return;
		}

		setStepProblems([]);
		setStepBlockMessage(null);
		// The pass above validated the whole form, so `errors` now also holds
		// problems for steps the user has not reached. Left in place, the next
		// step mounts pre-reddened — "First name is required." under an empty
		// field nobody has touched — and step 2 would auto-open a guardian card
		// on arrival. Clear them; the next Continue regenerates them.
		form.clearErrors();
		setCurrentStep(currentStep + 1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	/**
	 * Submit refused. The invalid control is usually on a step that is no longer
	 * mounted — which is exactly the dead end this replaces. Send the user to
	 * the step that owns the first problem and list the rest.
	 */
	const handleInvalidSubmit = (errors: typeof form.formState.errors) => {
		setBlockedAt((count) => count + 1);
		setStepProblems(summarizeStepErrors(errors));
		setStepBlockMessage(null);

		const target = firstInvalidStep(errors);
		if (target) {
			if (target !== currentStep) setCurrentStep(target);
			focusFirstProblemOnStep(target);
		}
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setStepProblems([]);
			setStepBlockMessage(null);
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

		const duplicateCustomQuestions =
			findDuplicateCustomQuestionConflictsForChildren(
				data.children ?? [],
				ministriesForCustomQuestionCheck
			);
		if (duplicateCustomQuestions.length > 0) {
			toast({
				title: 'Cannot submit registration',
				description:
					'Selected ministries share custom-question ids that cannot be stored separately. Deselect one of the conflicting programs before continuing.',
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

			// The confirmation screen reports what registration actually stored,
			// not what the guardian ticked. Before #400 this summary was built
			// from the form, prettifying ministry *codes* into labels, so it
			// announced enrollments the DAL had declined to create.
			const registeredChildren = result.registeredChildren ?? [];
			setRegisteredChildren(registeredChildren);

			// Likewise the Bible Bee panel: it follows the stored enrollment, so
			// it cannot offer scripture assignments to a child who was not
			// actually enrolled.
			setChildrenEnrolledInBibleBee(
				registeredChildren.some((child) =>
					child.enrollments.some(
						(enrollment) =>
							enrollment.ministry_code === 'bible-bee' &&
							enrollment.status === 'enrolled'
					)
				)
			);

			captureAnalyticsEvent('registration_submitted', {
				child_count: data.children.length,
				returning_household: analyticsReturningHousehold(prefillState),
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

	if (authLoading || (!user && !isOfflineSupabase())) {
		return <RegistrationAuthLoading />;
	}

	if (!user && isOfflineSupabase()) {
		return <RegistrationOfflineAuth />;
	}

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
							{cycleLabel} Registration
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
						<form
							onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
							className="space-y-6">
							<RegistrationProblemSummary
								problems={stepProblems}
								blockMessage={stepBlockMessage}
								currentStep={currentStep}
							/>
							{currentStep === 1 && (
								<Step1Household
									form={form}
									prefillState={prefillState}
									cycleLabel={cycleLabel}
								/>
							)}
							{currentStep === 2 && (
								<Step2Guardians form={form} blockedAt={blockedAt} />
							)}
							{currentStep === 3 && (
								<Step3Children form={form} blockedAt={blockedAt} />
							)}
							{currentStep === 4 && <Step4Ministries form={form} />}
							{currentStep === 5 && (
								<>
									{prefillState.isCurrentYearOverwrite && (
										<Alert
											variant="destructive"
											data-testid="step5-overwrite-warning">
											<AlertTriangle className="h-4 w-4" />
											<AlertTitle>
												{
													currentCycleOverwriteWarning(cycleLabel).title
												}
											</AlertTitle>
											<AlertDescription>
												{
													currentCycleOverwriteWarning(cycleLabel)
														.description
												}
											</AlertDescription>
										</Alert>
									)}
									<Step5Consents form={form} />
								</>
							)}

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
												className="flex items-center gap-2 bg-[#017c7d] hover:bg-[#016566] text-white">
												Save & continue
												<ChevronRight className="h-4 w-4" />
											</Button>
										) : (
											<Button
												type="submit"
												disabled={isSubmitting}
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
