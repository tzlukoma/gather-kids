'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { cleanPhone } from '@/hooks/usePhoneFormat';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, AlertTriangle, Info } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
	findHouseholdByEmail,
	registerHouseholdCanonical,
	getMinistries,
	getRegistrationCycles,
} from '@/lib/dal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	differenceInYears,
	isWithinInterval,
	parseISO,
	isValid,
} from 'date-fns';
import { DanceMinistryForm } from '@/components/gatherKids/dance-ministry-form';
import { BibleBeeMinistryForm } from '@/components/gatherKids/bible-bee-ministry-form';
import { TeenFellowshipForm } from '@/components/gatherKids/teen-fellowship-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type {
	Ministry,
	Household,
	CustomQuestion,
	RegistrationCycle,
} from '@/lib/types';
import { useFeatureFlags } from '@/contexts/feature-flag-context';
import { useAuth } from '@/contexts/auth-context';

const MOCK_EMAILS = {
	PREFILL_OVERWRITE: 'reg.overwrite@example.com',
	PREFILL_NO_OVERWRITE: 'reg.prefill@example.com',
	VERIFY: 'reg.verify@example.com',
	NEW: 'new@example.com',
};

const GENERIC_VERIFICATION_ERROR =
	'At least one of your answers does not match our records.';

const verificationSchema = z.object({
	childDob: z
		.string()
		.refine((val) => val === '2020-05-10', GENERIC_VERIFICATION_ERROR),
	streetNumber: z
		.string()
		.refine((val) => val === '456', GENERIC_VERIFICATION_ERROR),
	emergencyContactFirstName: z
		.string()
		.refine((val) => val.toLowerCase() === 'susan', GENERIC_VERIFICATION_ERROR),
});

const ministrySelectionSchema = z.record(z.boolean().optional()).optional();
const interestSelectionSchema = z.record(z.boolean().optional()).optional();
const customDataSchema = z.record(z.any()).optional();

const guardianSchema = z.object({
	first_name: z.string().min(1, 'First name is required.'),
	last_name: z.string().min(1, 'Last name is required.'),
	mobile_phone: z.string().min(10, 'A valid phone number is required.'),
	email: z.string().email('A valid email is required.').optional(),
	relationship: z.string().min(1, 'Relationship is required.'),
	is_primary: z.boolean().default(false),
});

const childSchema = z.object({
	child_id: z.string().optional(),
	first_name: z.string().min(1, 'First name is required.'),
	last_name: z.string().min(1, 'Last name is required.'),
	dob: z.string().refine((val) => val && !isNaN(Date.parse(val)), {
		message: 'Valid date of birth is required.',
	}),
	grade: z.string().min(1, 'Grade is required.'),
	child_mobile: z.string().optional(),
	allergies: z.string().optional(),
	medical_notes: z.string().optional(),
	special_needs: z.boolean().optional(),
	special_needs_notes: z.string().optional(),
	ministrySelections: ministrySelectionSchema,
	interestSelections: interestSelectionSchema,
	customData: customDataSchema,
});

const registrationSchema = z
	.object({
		household: z.object({
			name: z.string().optional(),
			address_line1: z.string().min(1, 'Address is required.'),
			household_id: z.string().optional(), // To track for overwrites
			preferredScriptureTranslation: z.string().optional(),
		}),
		guardians: z
			.array(guardianSchema)
			.min(1, 'At least one guardian / authorized person is required.'),
		emergencyContact: z.object({
			first_name: z.string().min(1, 'First name is required.'),
			last_name: z.string().min(1, 'Last name is required.'),
			mobile_phone: z.string().min(10, 'A valid phone number is required.'),
			relationship: z.string().min(1, 'Relationship is required.'),
		}),
		children: z.array(childSchema).min(1, 'At least one child is required.'),
		consents: z.object({
			liability: z.boolean().refine((val) => val === true, {
				message: 'Liability consent is required.',
			}),
			photoRelease: z.boolean().refine((val) => val === true, {
				message: 'Photo release consent is required.',
			}),
			choir_communications_consent: z.enum(['yes', 'no']).optional(),
			custom_consents: z.record(z.boolean().optional()).optional(),
		}),
	})
	.superRefine((data, ctx) => {
		// Dynamically check custom consents
		// This is complex because we need the list of ministries to know which consents to check for.
		// In a real app, you might pass the list of ministries to the validation context.
		// For this prototype, we'll assume a hardcoded list of codes that require consent.
		const ministriesRequiringConsent = ['orators']; // Example code

		ministriesRequiringConsent.forEach((code) => {
			const isMinistrySelected = data.children.some(
				(child) => child.interestSelections?.[code]
			);
			if (isMinistrySelected) {
				if (!data.consents.custom_consents?.[code]) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: [`consents.custom_consents.${code}`],
						message: `Consent for this ministry is required.`,
					});
				}
			}
		});
	});

type RegistrationFormValues = z.infer<typeof registrationSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;

type VerificationStep =
	| 'enter_email'
	| 'verify_identity'
	| 'email_verification_sent'
	| 'form_visible';

function VerificationStepTwoForm({
	onVerifySuccess,
	onGoBack,
}: {
	onVerifySuccess: () => void;
	onGoBack: () => void;
}) {
	const { toast } = useToast();
	const form = useForm<VerificationFormValues>({
		resolver: zodResolver(verificationSchema),
		defaultValues: {
			childDob: undefined,
			streetNumber: undefined,
			emergencyContactFirstName: '',
		},
	});

	async function onSubmit() {
		// This is a mock verification. In a real app this would hit a server.
		const householdData = await findHouseholdByEmail(
			MOCK_EMAILS.PREFILL_OVERWRITE,
			'2025'
		);
		if (householdData) {
			onVerifySuccess();
			toast({
				title: 'Verification Successful!',
				description: 'Your household information has been pre-filled.',
			});
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-headline">Verify Your Identity</CardTitle>
				<CardDescription>
					To protect your information, please answer a few questions to
					continue.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<Alert>
							<Info className="h-4 w-4" />
							<AlertTitle>For Prototype Demo</AlertTitle>
							<AlertDescription>
								<p>
									To pass this step, you would need to implement a real
									verification flow. For now, this is just a placeholder.
								</p>
								<p>
									You can go back and use the `{MOCK_EMAILS.PREFILL_OVERWRITE}`
									email to see the pre-fill flow.
								</p>
							</AlertDescription>
						</Alert>
						<FormField
							control={form.control}
							name="childDob"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Oldest Child&apos;s Date of Birth</FormLabel>
									<FormControl>
										<Input type="date" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="streetNumber"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Street Address Number</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 123" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="emergencyContactFirstName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Emergency Contact&apos;s First Name</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Jane" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex gap-2 pt-4">
							<Button type="button" variant="outline" onClick={onGoBack}>
								Back
							</Button>
							<Button type="submit">Verify & Continue</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

const defaultChildValues = {
	child_id: '', // Will be generated when child is added
	first_name: '',
	last_name: '',
	dob: '',
	grade: '',
	child_mobile: '',
	allergies: '',
	medical_notes: '',
	special_needs: false,
	special_needs_notes: '',
	ministrySelections: {},
	interestSelections: {},
	customData: {},
};

const getAgeFromDob = (dobString: string): number | null => {
	if (dobString && isValid(parseISO(dobString))) {
		return differenceInYears(new Date(), parseISO(dobString));
	}
	return null;
};

const checkEligibility = (program: Ministry, age: number | null): boolean => {
	if (program.min_age && age !== null && age < program.min_age) return false;
	if (program.max_age && age !== null && age > program.max_age) return false;

	if (program.code === 'bible-bee') {
		const today = new Date();
		const bibleBeeStart = program.open_at
			? parseISO(program.open_at)
			: new Date(today.getFullYear(), 0, 1);
		const bibleBeeEnd = program.close_at
			? parseISO(program.close_at)
			: new Date(today.getFullYear(), 9, 8);
		return isWithinInterval(today, { start: bibleBeeStart, end: bibleBeeEnd });
	}

	return true;
};

const ProgramSection = ({
	control,
	childrenData,
	program,
	childFields,
}: {
	control: any;
	childrenData: any[];
	program: Ministry;
	childFields: any[];
}) => {
	const ministrySelections = useWatch({
		control,
		name: 'children',
	});

	const isAnyChildSelected = childrenData.some(
		(_, index) => ministrySelections[index]?.ministrySelections?.[program.code]
	);

	const anyChildEligible = childrenData.some((child) => {
		const age = getAgeFromDob(child.dob);
		return checkEligibility(program, age);
	});

	if (!anyChildEligible) return null;

	return (
		<div className="p-4 border rounded-md">
			<h4 className="font-semibold">{program.name}</h4>
			{program.description && (
				<p className="text-sm text-muted-foreground mb-2">
					{program.description}
				</p>
			)}
			<div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 mt-2">
				{childFields.map((field, index) => {
					const child = childrenData[index];
					if (!child) return null; // Should not happen if arrays are synced

					const age = getAgeFromDob(child.dob);
					if (!checkEligibility(program, age)) return null;

					return (
						<FormField
							key={`${program.code}-${field.id}`}
							control={control}
							name={`children.${index}.ministrySelections.${program.code}`}
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3 space-y-0">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<FormLabel className="font-normal">
										{child.first_name || `Child ${index + 1}`}
									</FormLabel>
								</FormItem>
							)}
						/>
					);
				})}
			</div>
			{isAnyChildSelected && program.code === 'dance' && (
				<DanceMinistryForm control={control} />
			)}
			{isAnyChildSelected && program.code === 'bible-bee' && (
				<BibleBeeMinistryForm control={control} />
			)}
			{childFields.map((field, index) => {
				const child = childrenData[index];
				if (!child) return null;

				const isSelected =
					ministrySelections[index]?.ministrySelections?.[program.code];
				if (
					!isSelected ||
					!program.custom_questions ||
					program.custom_questions.length === 0
				)
					return null;

				return (
					<div key={`custom-form-${field.id}`}>
						<p className="font-medium mt-4 mb-2 text-sm">
							Questions for {child.first_name}:
						</p>
						{program.code === 'teen-fellowship' ? (
							<TeenFellowshipForm
								control={control}
								childIndex={index}
								customQuestions={program.custom_questions || []}
							/>
						) : // Generic Custom Form renderer could go here if needed
						null}
					</div>
				);
			})}
			{isAnyChildSelected && program.details && (
				<Alert className="mt-4">
					<Info className="h-4 w-4" />
					<AlertDescription className="whitespace-pre-wrap">
						{program.details}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
};

function RegisterPageContent() {
	const { toast } = useToast();
	const { flags } = useFeatureFlags();
	const { user } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [verificationStep, setVerificationStep] =
		useState<VerificationStep>('enter_email');
	const [verificationEmail, setVerificationEmail] = useState('');
	const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
	const [isCurrentYearOverwrite, setIsCurrentYearOverwrite] = useState(false);
	const [isPrefill, setIsPrefill] = useState(false);
	const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submissionStatus, setSubmissionStatus] = useState<string>('');

	const [allMinistries, setAllMinistries] = useState<Ministry[]>([]);
	const [activeRegistrationCycle, setActiveRegistrationCycle] = useState<
		RegistrationCycle | undefined
	>();

	// Load ministries and registration cycles using adapter pattern
	useEffect(() => {
		const loadData = async () => {
			try {
				console.log(
					'DEBUG: Loading ministries and registration cycles for registration form'
				);
				console.log(
					'DEBUG: Before calling getMinistries() and getRegistrationCycles()'
				);

				// Load ministries first to better debug any issues
				console.log('DEBUG: Calling getMinistries()');
				const ministries = await getMinistries();
				console.log(
					'DEBUG: Loaded',
					ministries.length,
					'ministries',
					ministries.length > 0 ? JSON.stringify(ministries[0]) : 'none'
				);

				console.log('DEBUG: Calling getRegistrationCycles()');
				const cycles = await getRegistrationCycles();
				console.log('DEBUG: Loaded', cycles.length, 'registration cycles');

				setAllMinistries(ministries);

				// Find active cycle
				const activeCycle = cycles.find((c) => {
					const rec = c as unknown as Record<string, unknown>;
					const val = rec['is_active'];
					return val === true || val === 1 || String(val) === '1';
				});
				console.log(
					'DEBUG: Active registration cycle:',
					activeCycle?.cycle_id || 'none found'
				);
				setActiveRegistrationCycle(activeCycle);
			} catch (error) {
				console.error('Error loading data for registration form:', error);
				setAllMinistries([]);
				setActiveRegistrationCycle(undefined);
			}
		};

		loadData();
	}, []);

	// Get the active registration cycle to use for enrollments

	const form = useForm<RegistrationFormValues>({
		resolver: zodResolver(registrationSchema),
		defaultValues: {
			household: {
				name: '',
				address_line1: '',
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
				choir_communications_consent: undefined,
				custom_consents: {},
			},
		},
	});

	const {
		fields: guardianFields,
		append: appendGuardian,
		remove: removeGuardian,
	} = useFieldArray({
		control: form.control,
		name: 'guardians',
	});

	const {
		fields: childFields,
		append: appendChild,
		remove: removeChild,
	} = useFieldArray({
		control: form.control,
		name: 'children',
	});

	const childrenData = useWatch({ control: form.control, name: 'children' });

	const { enrolledPrograms, interestPrograms } = useMemo(() => {
		if (!allMinistries) return { enrolledPrograms: [], interestPrograms: [] };
		const activeMinistries = allMinistries.filter((m) => m.is_active);
		const enrolled = activeMinistries
			.filter(
				(m) =>
					m.enrollment_type === 'enrolled' && m.code !== 'min_sunday_school'
			)
			.sort((a, b) => a.name.localeCompare(b.name));
		const interest = activeMinistries
			.filter((m) => m.enrollment_type === 'expressed_interest')
			.sort((a, b) => a.name.localeCompare(b.name));
		return { enrolledPrograms: enrolled, interestPrograms: interest };
	}, [allMinistries]);

	const { otherMinistryPrograms, choirPrograms } = useMemo(() => {
		if (!enrolledPrograms)
			return { otherMinistryPrograms: [], choirPrograms: [] };

		const choir = enrolledPrograms.filter((program) =>
			program.code.startsWith('choir-')
		);

		const otherMinistries = enrolledPrograms.filter(
			(program) => !program.code.startsWith('choir-')
		);

		return { otherMinistryPrograms: otherMinistries, choirPrograms: choir };
	}, [enrolledPrograms]);

	const prefillForm = useCallback(
		(data: any) => {
			console.log('DEBUG: prefillForm called with data:', {
				hasChildren: !!data.children,
				childrenLength: data.children?.length,
			});
			try {
				const householdData = data.household;
				const registrationData: Partial<RegistrationFormValues> = {
					household: {
						household_id: householdData?.household_id,
						name: householdData?.name,
						address_line1: householdData?.address_line1,
					},
					guardians: data.guardians,
					emergencyContact: data.emergencyContact,
					children: data.children,
					consents: data.consents,
				};
				console.log('DEBUG: About to call form.reset');
				form.reset(registrationData);
				console.log('DEBUG: Form reset completed');
				if (data.children && data.children.length > 0) {
					console.log('DEBUG: Setting accordion items for children');
					setOpenAccordionItems(
						data.children.map((_: any, index: number) => `item-${index}`)
					);
				}
				console.log('DEBUG: prefillForm completed successfully');
			} catch (error) {
				console.error('DEBUG: Error in prefillForm:', error);
			}
		},
		[form]
	);

	const proceedToRegistrationForm = useCallback(() => {
		console.log('DEBUG: proceedToRegistrationForm called');
		try {
			toast({
				title: 'New Registration',
				description: 'Please complete the form below to register your family.',
			});
			console.log('DEBUG: Toast shown');
			setIsCurrentYearOverwrite(false);
			setIsPrefill(false);
			console.log('DEBUG: State flags set');
			form.reset({
				household: { name: '', address_line1: '' },
				guardians: [
					{
						first_name: '',
						last_name: '',
						mobile_phone: '',
						email: verificationEmail,
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
				children: [
					{
						...defaultChildValues,
						child_id: crypto.randomUUID(), // Generate fresh ID for initial child
					},
				],
				consents: {
					liability: false,
					photoRelease: false,
					custom_consents: {},
				},
			});
			console.log('DEBUG: Form reset completed');
			setOpenAccordionItems(['item-0']);
			console.log('DEBUG: Accordion items set');
			setVerificationStep('form_visible');
			console.log('DEBUG: Verification step set to form_visible');
			console.log('DEBUG: proceedToRegistrationForm completed successfully');
		} catch (error) {
			console.error('DEBUG: Error in proceedToRegistrationForm:', error);
		}
	}, [toast, form, verificationEmail]);

	const handleEmailLookup = useCallback(async () => {
		console.log(
			'DEBUG: handleEmailLookup called with email:',
			verificationEmail
		);
		if (!verificationEmail) {
			console.log('DEBUG: No verification email provided');
			return;
		}

		try {
			console.log('DEBUG: About to find household by email');
			// Use current year for lookup
			const result = await findHouseholdByEmail(verificationEmail, '2025');
			console.log('DEBUG: findHouseholdByEmail result:', {
				found: !!result,
				isCurrentYear: result?.isCurrentYear,
			});

			if (result) {
				console.log('DEBUG: Household found, calling prefillForm');
				toast({
					title: 'Household Found!',
					description:
						'Your information has been pre-filled for you to review.',
				});
				prefillForm(result.data);
				setIsCurrentYearOverwrite(result.isCurrentYear);
				setIsPrefill(result.isPrefill || false);
				setVerificationStep('form_visible');
				console.log('DEBUG: Household prefill completed');
			} else if (verificationEmail === MOCK_EMAILS.VERIFY) {
				console.log('DEBUG: Setting verification step to verify_identity');
				setVerificationStep('verify_identity');
			} else {
				console.log('DEBUG: New registration - checking magic link flags');
				// New registration - check if magic link verification is enabled
				const isMagicEnabled = flags.loginMagicEnabled && !flags.isDemoMode;

				if (isMagicEnabled) {
					console.log('DEBUG: Magic link enabled, sending verification email');
					// Send magic link for email verification
					try {
						const response = await fetch('/api/auth/magic-link', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ email: verificationEmail }),
						});

						if (response.ok) {
							toast({
								title: 'Verification Email Sent',
								description:
									'Please check your email and click the verification link to continue with your registration.',
							});
							setVerificationStep('email_verification_sent');
							console.log('DEBUG: Magic link email sent successfully');
						} else {
							// Fall back to direct registration if email fails
							console.warn(
								'Magic link sending failed, proceeding with direct registration'
							);
							proceedToRegistrationForm();
						}
					} catch (error) {
						console.error('Error sending magic link:', error);
						// Fall back to direct registration if email fails
						proceedToRegistrationForm();
					}
				} else {
					console.log(
						'DEBUG: Magic link disabled, proceeding to registration form'
					);
					// Proceed directly to registration form
					proceedToRegistrationForm();
				}
			}
		} catch (error) {
			console.error('DEBUG: Error in handleEmailLookup:', error);
		}
	}, [
		verificationEmail,
		toast,
		prefillForm,
		flags.loginMagicEnabled,
		flags.isDemoMode,
		proceedToRegistrationForm,
	]);

	useEffect(() => {
		console.log(
			'DEBUG: Main useEffect triggered with user:',
			user?.email,
			'isDemoMode:',
			flags.isDemoMode
		);
		// Check if user is authenticated and skip email lookup if so
		// For live mode: check for authenticated users with email
		// For demo mode: check for authenticated users with GUARDIAN role (parents) or null role (new users needing registration)
		const shouldSkipEmailLookup =
			(!flags.isDemoMode && user?.email) ||
			(flags.isDemoMode &&
				user?.email &&
				(user?.metadata?.role === 'GUARDIAN' || user?.metadata?.role === null));

		console.log('DEBUG: shouldSkipEmailLookup:', shouldSkipEmailLookup);
		if (shouldSkipEmailLookup) {
			console.log('DEBUG: Skipping email lookup for authenticated user');
			setVerificationEmail(user.email);
			setIsAuthenticatedUser(true);

			// Check if they have existing household data
			const checkExistingData = async () => {
				console.log('DEBUG: checkExistingData starting');
				try {
					const result = await findHouseholdByEmail(user.email, '2025');
					console.log('DEBUG: checkExistingData result:', {
						found: !!result,
						isCurrentYear: result?.isCurrentYear,
					});

					if (result) {
						toast({
							title: 'Household Found!',
							description:
								'Your information has been pre-filled for you to review.',
						});
						console.log(
							'DEBUG: About to call prefillForm from checkExistingData'
						);
						prefillForm(result.data);
						setIsCurrentYearOverwrite(result.isCurrentYear);
						setIsPrefill(result.isPrefill || false);
					} else {
						console.log(
							'DEBUG: No existing data found, setting up new registration'
						);
						// New registration with authenticated email
						toast({
							title: 'Complete Your Registration',
							description:
								'Please complete the form below to register your family.',
						});
						setIsCurrentYearOverwrite(false);
						setIsPrefill(false);
						console.log('DEBUG: About to reset form from checkExistingData');
						form.reset({
							household: {
								name: '',
								address_line1: '',
								preferredScriptureTranslation: 'NIV',
							},
							guardians: [
								{
									first_name: '',
									last_name: '',
									mobile_phone: '',
									email: user.email, // Pre-fill with authenticated user's email
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
							children: [
								{
									...defaultChildValues,
									child_id: crypto.randomUUID(), // Generate fresh ID for initial child
								},
							],
							consents: {
								liability: false,
								photoRelease: false,
								custom_consents: {},
							},
						});
						console.log('DEBUG: Form reset completed from checkExistingData');
						setOpenAccordionItems(['item-0']);
					}

					console.log('DEBUG: Setting verification step to form_visible');
					setVerificationStep('form_visible');
					console.log('DEBUG: checkExistingData completed successfully');
				} catch (error) {
					console.error('DEBUG: Error in checkExistingData:', error);
					// Fallback to new registration form
					toast({
						title: 'Complete Your Registration',
						description:
							'Please complete the form below to register your family.',
					});
					setIsCurrentYearOverwrite(false);
					setIsPrefill(false);
					setVerificationStep('form_visible');
				}
			};

			checkExistingData();
		}
	}, [user, flags.isDemoMode, toast, form, prefillForm]);

	// Focus on the first field when the form becomes visible for authenticated users
	useEffect(() => {
		console.log(
			'DEBUG: Focus useEffect triggered - verificationStep:',
			verificationStep,
			'isAuthenticatedUser:',
			isAuthenticatedUser
		);
		let timer: NodeJS.Timeout | null = null;

		if (verificationStep === 'form_visible' && isAuthenticatedUser) {
			console.log('DEBUG: Setting focus timer');
			// Use a small delay to ensure the form has rendered
			timer = setTimeout(() => {
				console.log('DEBUG: Focus timer executing');
				const firstField = document.querySelector(
					'input[name="household.address_line1"]'
				) as HTMLInputElement;
				if (firstField) {
					console.log('DEBUG: Focus field found, setting focus');
					firstField.focus();
				} else {
					console.log('DEBUG: Focus field not found');
				}
			}, 100);
		}

		return () => {
			console.log('DEBUG: Focus useEffect cleanup');
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [verificationStep, isAuthenticatedUser]);

	useEffect(() => {
		console.log(
			'DEBUG: Enter press useEffect triggered - verificationStep:',
			verificationStep
		);
		const handleEnterPress = (event: KeyboardEvent) => {
			console.log('DEBUG: Key pressed:', event.key);
			if (event.key === 'Enter' && verificationStep === 'enter_email') {
				console.log(
					'DEBUG: Enter pressed, preventing default and calling handleEmailLookup'
				);
				event.preventDefault();
				handleEmailLookup();
			}
		};

		if (verificationStep === 'enter_email') {
			console.log('DEBUG: Adding keydown listener');
			window.addEventListener('keydown', handleEnterPress);
		}

		return () => {
			console.log('DEBUG: Removing keydown listener');
			window.removeEventListener('keydown', handleEnterPress);
		};
	}, [verificationStep, handleEmailLookup]);

	async function onSubmit(data: RegistrationFormValues) {
		console.log('DEBUG: onSubmit called');
		setIsSubmitting(true);
		setSubmissionStatus('Creating household...');

		try {
			// Clean phone numbers before submission (remove formatting, keep digits only)
			const cleanedData = {
				...data,
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
					child_mobile: child.child_mobile
						? cleanPhone(child.child_mobile)
						: child.child_mobile,
				})),
			};

			// Use the active registration cycle instead of hardcoded '2025'
			const cycleId = activeRegistrationCycle?.cycle_id || '2025'; // fallback to '2025' if no active cycle found
			console.log('DEBUG: Registering household for cycle:', cycleId);

			setSubmissionStatus('Processing registration...');
			const result = await registerHouseholdCanonical(
				cleanedData,
				cycleId,
				isPrefill
			);
			console.log('DEBUG: Registration result:', result);
			console.log('DEBUG: Result type check:', {
				hasResult: !!result,
				resultType: typeof result,
				resultKeys: result ? Object.keys(result) : 'no result',
				isComplete: result?.isComplete,
				userHouseholdsCreated: result?.userHouseholdsCreated,
				roleAssigned: result?.roleAssigned,
			});

			toast({
				title: 'Registration Submitted!',
				description: "Thank you! Your family's registration has been received.",
			});

			// Check if user is authenticated and should be redirected to household page
			console.log('DEBUG: Checking redirect conditions:', {
				isAuthenticatedUser,
				userEmail: user?.email,
				userRole: user?.metadata?.role,
				userExists: !!user,
				registrationComplete: result.isComplete,
			});

			if (isAuthenticatedUser && user?.email) {
				if (result.isComplete) {
					console.log(
						'DEBUG: Registration complete, redirecting to household page'
					);
					setSubmissionStatus('Redirecting to household...');
					router.push('/household');
					return;
				} else {
					console.warn('DEBUG: Registration incomplete:', {
						userHouseholdsCreated: result.userHouseholdsCreated,
						roleAssigned: result.roleAssigned,
					});
					// Even if incomplete, try to redirect after a short delay
					setSubmissionStatus('Finalizing setup...');
					setTimeout(() => {
						console.log('DEBUG: Redirecting to household page after delay');
						router.push('/household');
					}, 2000);
					return;
				}
			}

			console.log('DEBUG: Non-authenticated user, resetting form');
			// For non-authenticated users (demo mode, etc.), reset form for another registration
			form.reset();
			setVerificationStep('enter_email');
			setVerificationEmail('');
			setOpenAccordionItems([]);
			setIsCurrentYearOverwrite(false);
			setIsPrefill(false);
		} catch (e) {
			console.error('DEBUG: Error in onSubmit:', e);
			setIsSubmitting(false);
			setSubmissionStatus('');
			toast({
				title: 'Submission Error',
				description:
					'There was an error processing your registration. Please try again.',
				variant: 'destructive',
			});
		} finally {
			// Reset loading state for non-authenticated users
			if (!isAuthenticatedUser) {
				setIsSubmitting(false);
				setSubmissionStatus('');
			}
		}
	}

	const primaryGuardianLastName = form.watch('guardians.0.last_name');

	// Watch interest selections to show conditional alerts & consents
	const watchedChildren = useWatch({
		control: form.control,
		name: 'children',
	});

	const ministriesWithOptionalConsent = useMemo(() => {
		return interestPrograms
			.filter((p) => p.optional_consent_text)
			.filter((p) =>
				watchedChildren.some((child) => child.interestSelections?.[p.code])
			);
	}, [interestPrograms, watchedChildren]);

	return (
		<div className="max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-3xl font-bold font-headline">
					Family Registration Form
				</h1>
				<p className="text-muted-foreground">
					Complete the form below to register your family for our
					children&apos;s ministry programs.
				</p>
			</div>

			{verificationStep === 'enter_email' && (
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Household Lookup</CardTitle>
						<CardDescription>
							Enter your primary household email address. If you&apos;ve
							registered with us before, we&apos;ll pre-fill your information
							for you. If not, you can start a new registration.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex gap-2">
							<Input
								type="email"
								placeholder="your.email@example.com"
								value={verificationEmail}
								onChange={(e) => setVerificationEmail(e.target.value)}
							/>
							<Button onClick={handleEmailLookup}>Continue</Button>
						</div>
						{flags.showDemoFeatures && (
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>For Prototype Demo</AlertTitle>
								<AlertDescription>
									<p>Click an email below or type one to begin:</p>
									<ul className="list-disc pl-5 text-sm">
										<li>
											Use{' '}
											<button
												className="text-left font-semibold underline"
												onClick={() =>
													setVerificationEmail(MOCK_EMAILS.PREFILL_OVERWRITE)
												}>
												{MOCK_EMAILS.PREFILL_OVERWRITE}
											</button>{' '}
											to pre-fill the form and see the overwrite warning.
										</li>
										<li>
											Use{' '}
											<button
												className="text-left font-semibold underline"
												onClick={() =>
													setVerificationEmail(MOCK_EMAILS.PREFILL_NO_OVERWRITE)
												}>
												{MOCK_EMAILS.PREFILL_NO_OVERWRITE}
											</button>{' '}
											to pre-fill from a prior year&apos;s registration.
										</li>
										<li>
											Use{' '}
											<button
												className="text-left font-semibold underline"
												onClick={() =>
													setVerificationEmail(MOCK_EMAILS.VERIFY)
												}>
												{MOCK_EMAILS.VERIFY}
											</button>{' '}
											to see the (mock) verification step.
										</li>
										<li>Any other email will start a new registration.</li>
									</ul>
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}

			{verificationStep === 'verify_identity' && (
				<VerificationStepTwoForm
					onVerifySuccess={async () => {
						const result = await findHouseholdByEmail(
							MOCK_EMAILS.PREFILL_OVERWRITE,
							'2025'
						);
						if (result) {
							prefillForm(result.data);
							setIsCurrentYearOverwrite(result.isCurrentYear);
							setIsPrefill(result.isPrefill);
							setVerificationStep('form_visible');
						}
					}}
					onGoBack={() => setVerificationStep('enter_email')}
				/>
			)}

			{verificationStep === 'email_verification_sent' && (
				<Card>
					<CardHeader>
						<CardTitle className="font-headline">Check Your Email</CardTitle>
						<CardDescription>
							We&apos;ve sent a verification link to your email address.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<Info className="h-4 w-4" />
							<AlertTitle>Verification Email Sent</AlertTitle>
							<AlertDescription>
								<p>
									We&apos;ve sent a magic link to{' '}
									<strong>{verificationEmail}</strong>
								</p>
								<p className="mt-2">
									Please check your email and click the verification link to
									continue with your registration. The link will expire in 1
									hour.
								</p>
							</AlertDescription>
						</Alert>

						<div className="flex flex-col gap-2">
							<Button
								variant="outline"
								onClick={() => setVerificationStep('enter_email')}>
								Use Different Email
							</Button>
							<Button
								variant="link"
								onClick={async () => {
									// Resend verification email
									try {
										const response = await fetch('/api/auth/magic-link', {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({ email: verificationEmail }),
										});

										if (response.ok) {
											toast({
												title: 'Email Resent',
												description:
													'We&apos;ve sent another verification email to your address.',
											});
										} else {
											toast({
												title: 'Resend Failed',
												description:
													'Could not resend verification email. Please try again.',
												variant: 'destructive',
											});
										}
									} catch (error) {
										toast({
											title: 'Resend Failed',
											description:
												'Could not resend verification email. Please try again.',
											variant: 'destructive',
										});
									}
								}}>
								Resend Email
							</Button>
						</div>

						{flags.showDemoFeatures && (
							<Alert>
								<Info className="h-4 w-4" />
								<AlertTitle>For Testing</AlertTitle>
								<AlertDescription>
									<p>In demo mode, you can skip email verification:</p>
									<Button
										variant="outline"
										size="sm"
										className="mt-2"
										onClick={() => proceedToRegistrationForm()}>
										Skip Email Verification
									</Button>
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}

			{verificationStep === 'form_visible' && (
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
						{isCurrentYearOverwrite && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertTitle>Existing Registration Found</AlertTitle>
								<AlertDescription>
									A registration for the{' '}
									{activeRegistrationCycle?.cycle_id || 'current'} cycle already
									exists for this household. Review the information below and
									make any necessary changes. Submitting this form will{' '}
									<span className="font-semibold">overwrite</span> the previous
									submission for this year.
								</AlertDescription>
							</Alert>
						)}

						<Card>
							<CardHeader>
								<CardTitle className="font-headline">
									Household & Guardian / Authorized Pick Up Information
								</CardTitle>
								<CardDescription>
									Please provide information for your household and list all
									parents, guardians, or other adults who are authorized to pick
									up your children.
									<br />
									{!isAuthenticatedUser && (
										<Button
											variant="link"
											className="p-0 h-auto"
											onClick={() => {
												setVerificationStep('enter_email');
												setIsCurrentYearOverwrite(false);
											}}>
											Change lookup email ({verificationEmail})
										</Button>
									)}
									{isAuthenticatedUser && (
										<span className="text-sm text-muted-foreground">
											You are signed in as: {verificationEmail}
										</span>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<FormField
									control={form.control}
									name="household.address_line1"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Street Address</FormLabel>
											<FormControl>
												<Input
													placeholder="123 Main St, Anytown, USA"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Separator />
								{guardianFields.map((field, index) => (
									<div
										key={field.id}
										className="space-y-4 p-4 border rounded-lg relative">
										<h3 className="font-semibold font-headline">
											Guardian / Authorized to Pick Up {index + 1}
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name={`guardians.${index}.first_name`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>First Name</FormLabel>
														<FormControl>
															<Input {...field} />
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
														<FormLabel>Last Name</FormLabel>
														<FormControl>
															<Input {...field} />
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
														<FormLabel>Phone</FormLabel>
														<FormControl>
															<PhoneInput
																value={field.value}
																onChange={field.onChange}
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
														<FormLabel>Email</FormLabel>
														<FormControl>
															<Input
																type="email"
																{...field}
																readOnly={index === 0 && isAuthenticatedUser}
																className={
																	index === 0 && isAuthenticatedUser
																		? 'bg-muted'
																		: ''
																}
															/>
														</FormControl>
														{index === 0 && isAuthenticatedUser && (
															<FormDescription>
																This email is from your authenticated account
																and cannot be changed.
															</FormDescription>
														)}
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name={`guardians.${index}.relationship`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Relationship</FormLabel>
														<FormControl>
															<Input
																placeholder="e.g., Mother, Grandfather"
																{...field}
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
															<FormLabel>Household Name</FormLabel>
															<FormControl>
																<Input
																	placeholder={
																		primaryGuardianLastName
																			? `${primaryGuardianLastName} Household`
																			: ''
																	}
																	{...field}
																/>
															</FormControl>
															<FormDescription>
																This is how we will identify your household -
																please change it if you want a different name
																used.
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
									}>
									<PlusCircle className="mr-2 h-4 w-4" /> Add Guardian /
									Authorized Person
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="font-headline">
									Emergency Contact
								</CardTitle>
								<CardDescription>
									This person should be different from the guardians listed
									above.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="emergencyContact.first_name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>First Name</FormLabel>
												<FormControl>
													<Input {...field} />
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
												<FormLabel>Last Name</FormLabel>
												<FormControl>
													<Input {...field} />
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
												<FormLabel>Relationship</FormLabel>
												<FormControl>
													<Input
														placeholder="e.g., Aunt, Neighbor"
														{...field}
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
												<FormLabel>Phone</FormLabel>
												<FormControl>
													<PhoneInput
														value={field.value}
														onChange={field.onChange}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="font-headline">
									Children Information
								</CardTitle>
								<CardDescription>
									Please add each child you are registering.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Accordion
									type="multiple"
									className="w-full"
									value={openAccordionItems}
									onValueChange={setOpenAccordionItems}>
									{childFields.map((field, index) => {
										const childFirstName = form.watch(
											`children.${index}.first_name`
										);
										const hasSpecialNeeds = form.watch(
											`children.${index}.special_needs`
										);
										const isExistingChild = !!childrenData[index]?.child_id;

										const removeButton = (
											<Button type="button" variant="destructive" size="sm">
												<Trash2 className="mr-2 h-4 w-4" /> Remove Child
											</Button>
										);

										return (
											<AccordionItem key={field.id} value={`item-${index}`}>
												<AccordionTrigger className="font-headline">
													{childFirstName || `Child ${index + 1}`}
												</AccordionTrigger>
												<AccordionContent className="space-y-4 pt-4 relative">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<FormField
															control={form.control}
															name={`children.${index}.first_name`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>First Name</FormLabel>
																	<FormControl>
																		<Input {...field} />
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
																	<FormLabel>Last Name</FormLabel>
																	<FormControl>
																		<Input {...field} />
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
																	<FormLabel>Date of Birth</FormLabel>
																	<FormControl>
																		<Input type="date" {...field} />
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
																	<FormLabel>Grade</FormLabel>
																	<FormControl>
																		<Input {...field} />
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
														<FormField
															control={form.control}
															name={`children.${index}.child_mobile`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>
																		Child&apos;s Phone (Optional)
																	</FormLabel>
																	<FormControl>
																		<PhoneInput
																			value={field.value}
																			onChange={field.onChange}
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
																<FormLabel>
																	Allergies or Medical Conditions
																</FormLabel>
																<FormControl>
																	<Input
																		placeholder="e.g., Peanuts, Asthma"
																		{...field}
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
															<FormItem className="space-y-3 rounded-lg border p-4">
																<FormLabel>
																	Does {childFirstName || 'this child'} have
																	special needs that church staff should be
																	aware of?
																</FormLabel>
																<FormControl>
																	<RadioGroup
																		onValueChange={(value) =>
																			field.onChange(value === 'true')
																		}
																		value={String(field.value)}
																		className="flex flex-col space-y-1">
																		<FormItem className="flex items-center space-x-3 space-y-0">
																			<FormControl>
																				<RadioGroupItem value="true" />
																			</FormControl>
																			<FormLabel className="font-normal">
																				Yes
																			</FormLabel>
																		</FormItem>
																		<FormItem className="flex items-center space-x-3 space-y-0">
																			<FormControl>
																				<RadioGroupItem value="false" />
																			</FormControl>
																			<FormLabel className="font-normal">
																				No
																			</FormLabel>
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
																	<FormLabel>
																		What special needs does{' '}
																		{childFirstName || 'this child'} have?
																	</FormLabel>
																	<FormControl>
																		<Textarea
																			placeholder="Please describe any physical, behavioral, or emotional needs."
																			{...field}
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
													)}

													<div className="flex items-center gap-4">
														{isExistingChild ? (
															<AlertDialog>
																<AlertDialogTrigger asChild>
																	{removeButton}
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Are you sure you want to remove{' '}
																			{childFirstName || 'this child'}?
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			This will mark{' '}
																			{childFirstName || 'this child'} as
																			inactive for this year&apos;s registration
																			and remove them from this form. Their
																			historical data from previous years will
																			be retained.
																			<br />
																			<br />
																			Are you sure you want to proceed?
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<AlertDialogAction
																			onClick={() => removeChild(index)}
																			className="bg-destructive hover:bg-destructive/90">
																			Yes, Remove Child
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														) : (
															<Button
																type="button"
																variant="destructive"
																size="sm"
																onClick={() => removeChild(index)}>
																<Trash2 className="mr-2 h-4 w-4" /> Remove Child
															</Button>
														)}
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
									className="mt-4"
									onClick={() => {
										appendChild({
											...defaultChildValues,
											child_id: crypto.randomUUID(), // Generate fresh ID for each child
										});
										setOpenAccordionItems((prev) => [
											...prev,
											`item-${childFields.length}`,
										]);
									}}>
									<PlusCircle className="mr-2 h-4 w-4" /> Add Child
								</Button>
							</CardContent>
						</Card>

						{childFields.length > 0 && (
							<>
								<Card>
									<CardHeader>
										<CardTitle className="font-headline">
											Ministry Programs
										</CardTitle>
										<CardDescription>
											Select the programs each child wishes to enroll in.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										<div className="p-4 border rounded-md bg-muted/50">
											<h4 className="font-semibold">
												Sunday School / Children&apos;s Church
											</h4>
											<div className="text-sm text-muted-foreground mb-2 space-y-2 whitespace-pre-wrap">
												<p>
													Sunday School takes place in the Family Life
													Enrichment Center on 1st, 4th, and 5th Sundays during
													the 9:30 AM Service. Sunday School serves ages 4-18.
												</p>
												<p>
													Children&apos;s Church, for ages 4-12, will take place
													on 3rd Sundays in the same location during the 9:30 AM
													service.
												</p>
												<p>
													Children must be signed in by an adult or high
													school-aged sibling and can be picked up by a
													parent/guardian, teenage sibling, or the adult who
													signed them in. High Schoolers may sign themselves in
													and out of Sunday School.
												</p>
												<p>
													Teens should attend Teen Church which takes place at
													the Family Life Enrichment Center on 3rd Sundays.
													Teens can sign themselved into and out of Teen Church.
												</p>
											</div>
											<div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 mt-2">
												{childFields.map((field, index) => (
													<div
														key={field.id}
														className="flex flex-row items-start space-x-3 space-y-0">
														<Checkbox checked={true} disabled={true} />
														<label className="font-normal text-sm text-muted-foreground">
															{childrenData[index]?.first_name ||
																`Child ${index + 1}`}
														</label>
													</div>
												))}
											</div>
										</div>

										{otherMinistryPrograms
											.filter((p) => p.code !== 'min_sunday_school')
											.map((program) => (
												<ProgramSection
													key={program.ministry_id}
													control={form.control}
													childrenData={childrenData}
													program={program}
													childFields={childFields}
												/>
											))}

										{choirPrograms.length > 0 && (
											<div className="p-4 border rounded-md space-y-4">
												<h3 className="text-lg font-semibold font-headline">
													Youth Choirs
												</h3>
												<FormField
													control={form.control}
													name="consents.choir_communications_consent"
													render={({ field }) => (
														<FormItem className="space-y-3 p-4 border rounded-md bg-muted/50">
															<FormLabel className="font-normal leading-relaxed">
																Cathedral International youth choirs communicate
																using the Planning Center app. By clicking yes,
																you agree to be added into the app, which will
																enable you to download the app, receive emails
																and push communications.
															</FormLabel>
															<FormControl>
																<RadioGroup
																	onValueChange={field.onChange}
																	defaultValue={field.value}
																	className="flex flex-col space-y-1">
																	<FormItem className="flex items-center space-x-3 space-y-0">
																		<FormControl>
																			<RadioGroupItem value="yes" />
																		</FormControl>
																		<FormLabel className="font-normal">
																			Yes
																		</FormLabel>
																	</FormItem>
																	<FormItem className="flex items-center space-x-3 space-y-0">
																		<FormControl>
																			<RadioGroupItem value="no" />
																		</FormControl>
																		<FormLabel className="font-normal">
																			No
																		</FormLabel>
																	</FormItem>
																</RadioGroup>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<div className="space-y-6">
													{choirPrograms.map((program) => (
														<ProgramSection
															key={program.ministry_id}
															control={form.control}
															childrenData={childrenData}
															program={program}
															childFields={childFields}
														/>
													))}
												</div>
											</div>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="font-headline">
											Expressed Interest Activities
										</CardTitle>
										<CardDescription>
											Let us know if you&apos;re interested. This does not
											register you for these activities but helps us gauge
											interest for future planning.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-6">
										{interestPrograms.map((program) => {
											const isAnyChildInterested = watchedChildren.some(
												(child) => child.interestSelections?.[program.code]
											);

											return (
												<div
													key={program.ministry_id}
													className="p-4 border rounded-md">
													<h4 className="font-semibold">{program.name}</h4>
													<div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 mt-2">
														{childFields.map((field, index) => (
															<FormField
																key={`${program.code}-${field.id}`}
																control={form.control}
																name={`children.${index}.interestSelections.${program.code}`}
																render={({ field }) => (
																	<FormItem className="flex flex-row items-start space-x-3 space-y-0">
																		<FormControl>
																			<Checkbox
																				checked={field.value}
																				onCheckedChange={field.onChange}
																			/>
																		</FormControl>
																		<FormLabel className="font-normal">
																			{childrenData[index]?.first_name ||
																				`Child ${index + 1}`}
																		</FormLabel>
																	</FormItem>
																)}
															/>
														))}
													</div>
													{isAnyChildInterested &&
														program.communicate_later && (
															<Alert className="mt-4">
																<Info className="h-4 w-4" />
																<AlertDescription>
																	You will receive information about{' '}
																	{program.name} when it is available.
																</AlertDescription>
															</Alert>
														)}
												</div>
											);
										})}
									</CardContent>
								</Card>
							</>
						)}

						<Card>
							<CardHeader>
								<CardTitle className="font-headline">Consents</CardTitle>
								<CardDescription>
									Please review and accept the following terms to complete your
									registration.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<FormField
									control={form.control}
									name="consents.liability"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>Liability Release</FormLabel>
												<FormDescription className="whitespace-pre-wrap leading-relaxed">
													In consideration of my child’s participation in the
													Youth Ministry, I hereby release, waive, relinquish
													and forever discharge any and all liability or claims
													I may have or which may arise from my child’s
													participation in the above described event, and agree
													to defend, indemnify and hold harmless Cathedral
													International, Cathedral International Youth Ministry,
													their affiliates, related entities, employees,
													trustees, directors, respective staff, leaders and
													volunteers from any and all liability, claims,
													lawsuits, demands, judgments or damages for personal
													injury as well as property damage and any expenses,
													costs and fees of any type, kind or nature which may
													arise from my child’s participation in the above
													described event. I hereby agree to assume sole
													responsibility for any damages incurred as a result of
													the negligent, willful or intentional act of my child
													and to reimburse Cathedral International for the cost
													of same, including but not to any costs to defend any
													and all liability, claims, lawsuits, demands,
													judgments or damages for personal injury as well as
													property damage. Parents, please note that once
													children are dismissed from ministry activities and
													returned into your supervision, they are no longer
													under the care and supervision of Cathedral
													International staff or volunteers.
												</FormDescription>
												<FormMessage />
											</div>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="consents.photoRelease"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>Photo Release</FormLabel>
												<FormDescription className="whitespace-pre-wrap leading-relaxed">
													I freely sign this Agreement and Release of Liability
													Form. Photo/Video Release and I hereby grant Cathedral
													International permission to use my photograph/video
													image in any and all publications for Cathedral
													International including website and social media
													entries, without payment or any other consideration in
													perpetuity. I hereby authorize Cathedral International
													to edit, alter, copy, exhibit, publish, or distribute
													all photos and images. I waive the right to inspect or
													approve the finished product, including a written or
													electronic copy, wherein my photo appears.
													Additionally, I waive any right to royalties or other
													compensation arising or related to the use of the
													photograph or video images. I hereby hold harmless and
													release and forever discharge Cathedral International
													from all claims, demands, and causes of action which
													I, my heirs, representatives, executors,
													administrators, or any other persons acting on my
													behalf or on behalf of my estate may have. I have read
													the above photo/video release and fully understand its
													contents. I voluntarily agree to the terms and
													conditions stated above.
												</FormDescription>
												<FormMessage />
											</div>
										</FormItem>
									)}
								/>

								{ministriesWithOptionalConsent.map((ministry) => (
									<FormField
										key={ministry.code}
										control={form.control}
										name={`consents.custom_consents.${ministry.code}`}
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
												<FormControl>
													<Checkbox
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel>{ministry.name} Consent</FormLabel>
													<FormDescription className="whitespace-pre-wrap leading-relaxed">
														{ministry.optional_consent_text}
													</FormDescription>
													<FormMessage />
												</div>
											</FormItem>
										)}
									/>
								))}
							</CardContent>
						</Card>

						<Button
							type="submit"
							size="lg"
							className="w-full md:w-auto"
							disabled={isSubmitting}>
							{isSubmitting ? (
								<div className="flex items-center gap-2">
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									{submissionStatus || 'Processing...'}
								</div>
							) : (
								'Submit Registration'
							)}
						</Button>
					</form>
				</Form>
			)}
		</div>
	);
}

export default function RegisterPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<RegisterPageContent />
		</Suspense>
	);
}
