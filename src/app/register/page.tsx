

"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Trash2 } from "lucide-react"
import { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { registerHousehold } from "@/lib/dal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { differenceInYears, isWithinInterval, parseISO, isValid } from "date-fns"
import { DanceMinistryForm } from "@/components/ministrysync/dance-ministry-form"
import { TeenFellowshipForm } from "@/components/ministrysync/teen-fellowship-form"


const MOCK_EMAILS = {
    PREFILL: 'prefill@example.com',
    VERIFY: 'verify@example.com',
    NEW: 'new@example.com',
};

const MOCK_HOUSEHOLD_DATA = {
    household: {
        name: "Johnson Household",
        address_line1: "456 Oak Avenue, Anytown, USA",
    },
    guardians: [
        { first_name: "Mary", last_name: "Johnson", mobile_phone: "555-555-2222", email: "mary.j@example.com", relationship: "Mother", is_primary: true },
        { first_name: "Robert", last_name: "Johnson", mobile_phone: "555-555-3333", email: "bob.j@example.com", relationship: "Father", is_primary: false },
    ],
    emergencyContact: {
        first_name: "Susan",
        last_name: "Davis",
        mobile_phone: "555-555-8888",
        relationship: "Aunt"
    },
    children: [
        { first_name: "Olivia", last_name: "Johnson", dob: "2020-05-10", grade: "Pre-K", allergies: "Tree nuts", medical_notes: "Carries an EpiPen.", ministrySelections: { "acolyte": false, "bible-bee": false, "dance": false, "media-production": false, "mentoring-boys": false, "mentoring-girls": false, "teen-fellowship": false, "choir-joy-bells": false, "choir-keita": false, "choir-teen": false, "youth-ushers": false, "teen_podcast": false, "teen_social_media": false, "teen_community_service": false }, interestSelections: { "childrens-musical": false, "confirmation": false, "orators": false, "nursery": false, "vbs": false, "college-tour": false } },
        { first_name: "Noah", last_name: "Johnson", dob: "2015-09-15", grade: "4th Grade", allergies: "", medical_notes: "", ministrySelections: { "acolyte": true, "bible-bee": true, "dance": false, "media-production": false, "mentoring-boys": true, "mentoring-girls": false, "teen-fellowship": false, "choir-joy-bells": false, "choir-keita": true, "choir-teen": false, "youth-ushers": false, "teen_podcast": false, "teen_social_media": false, "teen_community_service": false }, interestSelections: { "childrens-musical": true, "confirmation": false, "orators": true, "nursery": false, "vbs": true, "college-tour": false } },
    ],
    consents: {
        liability: true,
        photoRelease: false,
    },
};

const ministrySelectionSchema = z.object({
    acolyte: z.boolean().default(false),
    "bible-bee": z.boolean().default(false),
    dance: z.boolean().default(false),
    "media-production": z.boolean().default(false),
    "mentoring-boys": z.boolean().default(false),
    "mentoring-girls": z.boolean().default(false),
    "teen-fellowship": z.boolean().default(false),
    "choir-joy-bells": z.boolean().default(false),
    "choir-keita": z.boolean().default(false),
    "choir-teen": z.boolean().default(false),
    "youth-ushers": z.boolean().default(false),
    teen_podcast: z.boolean().default(false),
    teen_social_media: z.boolean().default(false),
    teen_community_service: z.boolean().default(false),
}).optional();

const interestSelectionSchema = z.object({
    "childrens-musical": z.boolean().default(false),
    confirmation: z.boolean().default(false),
    orators: z.boolean().default(false),
    nursery: z.boolean().default(false),
    vbs: z.boolean().default(false),
    "college-tour": z.boolean().default(false),
}).optional();

const customDataSchema = z.object({
    dance_returning_member: z.enum(["yes", "no"]).optional(),
}).optional();


const guardianSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  mobile_phone: z.string().min(10, "A valid phone number is required."),
  email: z.string().email("A valid email is required.").optional(),
  relationship: z.string().min(1, "Relationship is required."),
  is_primary: z.boolean().default(false),
});

const childSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  dob: z.string().refine((val) => val && !isNaN(Date.parse(val)), {
    message: "Valid date of birth is required.",
  }),
  grade: z.string().min(1, "Grade is required."),
  allergies: z.string().optional(),
  medical_notes: z.string().optional(),
  ministrySelections: ministrySelectionSchema,
  interestSelections: interestSelectionSchema,
  customData: customDataSchema,
});

const registrationSchema = z.object({
  household: z.object({
    name: z.string().optional(),
    address_line1: z.string().min(1, "Address is required."),
  }),
  guardians: z.array(guardianSchema).min(1, "At least one guardian is required."),
  emergencyContact: z.object({
    first_name: z.string().min(1, "First name is required."),
    last_name: z.string().min(1, "Last name is required."),
    mobile_phone: z.string().min(10, "A valid phone number is required."),
    relationship: z.string().min(1, "Relationship is required."),
  }),
  children: z.array(childSchema).min(1, "At least one child is required."),
  consents: z.object({
    liability: z.boolean().refine((val) => val === true, {
      message: "Liability consent is required.",
    }),
    photoRelease: z.boolean().refine((val) => val === true, {
      message: "Photo release consent is required.",
    }),
  }),
});

const GENERIC_VERIFICATION_ERROR = "At least one of your answers does not match our records.";

const verificationSchema = z.object({
    childDob: z.string().refine(val => val === '2020-05-10', GENERIC_VERIFICATION_ERROR),
    streetNumber: z.string().refine(val => val === '456', GENERIC_VERIFICATION_ERROR),
    emergencyContactFirstName: z.string().refine(val => val.toLowerCase() === 'susan', GENERIC_VERIFICATION_ERROR),
});


type RegistrationFormValues = z.infer<typeof registrationSchema>
type VerificationFormValues = z.infer<typeof verificationSchema>;

type VerificationStep = 'enter_email' | 'verify_identity' | 'form_visible';

function VerificationStepTwoForm({ onVerifySuccess, onGoBack }: { onVerifySuccess: () => void, onGoBack: () => void}) {
    const { toast } = useToast();
    const form = useForm<VerificationFormValues>({
        resolver: zodResolver(verificationSchema),
        defaultValues: { childDob: "", streetNumber: "", emergencyContactFirstName: "" }
    });

    function onSubmit() {
        onVerifySuccess();
        toast({ title: "Verification Successful!", description: "Your household information has been pre-filled." });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Verify Your Identity</CardTitle>
                <CardDescription>
                    To protect your information, please answer a few questions to continue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>For Prototype Demo</AlertTitle>
                            <AlertDescription>
                                <ul className="list-disc pl-5 text-sm">
                                    <li>Child DOB: <code className="font-semibold">2020-05-10</code></li>
                                    <li>Street Number: <code className="font-semibold">456</code></li>
                                    <li>Emergency Contact First Name: <code className="font-semibold">susan</code></li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                        <FormField
                            control={form.control}
                            name="childDob"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Oldest Child's Date of Birth</FormLabel>
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
                                <FormLabel>Emergency Contact's First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Jane" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={onGoBack}>Back</Button>
                            <Button type="submit">Verify & Continue</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

const defaultChildValues = {
  first_name: "", last_name: "", dob: "", grade: "", allergies: "", medical_notes: "",
  ministrySelections: { "acolyte": false, "bible-bee": false, "dance": false, "media-production": false, "mentoring-boys": false, "mentoring-girls": false, "teen-fellowship": false, "choir-joy-bells": false, "choir-keita": false, "choir-teen": false, "youth-ushers": false, "teen_podcast": false, "teen_social_media": false, "teen_community_service": false },
  interestSelections: { "childrens-musical": false, "confirmation": false, "orators": false, "nursery": false, "vbs": false, "college-tour": false },
  customData: { dance_returning_member: undefined }
};

const ministryPrograms = [
    { id: "acolyte", label: "Acolyte Ministry", eligibility: () => true, details: "Thank you for registering for the Acolyte Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation." },
    { id: "bible-bee", label: "Bible Bee", description: "Registration open until Oct. 8, 2023", eligibility: () => {
        const today = new Date();
        const bibleBeeStart = new Date(today.getFullYear(), 0, 1);
        const bibleBeeEnd = new Date(today.getFullYear(), 9, 8);
        return isWithinInterval(today, { start: bibleBeeStart, end: bibleBeeEnd });
    }, details: "Bible Bee is a competitive program that encourages scripture memorization. Materials must be purchased separately." },
    { id: "dance", label: "Dance Ministry", eligibility: () => true, details: "Thank you for registering for the Dance Ministry.\n\nYou will receive information from ministry leaders regarding next steps for your child's participation." },
    { id: "media-production", label: "Media Production Ministry", eligibility: () => true, details: "Thank you for registering for the Media Ministry. You will receive information from ministry leaders regarding next steps for your child's participation." },
    { id: "mentoring-boys", label: "Mentoring Ministry-Boys (Khalfani)", eligibility: () => true, details: "The Khalfani ministry provides mentorship for young boys through various activities and discussions." },
    { id: "mentoring-girls", label: "Mentoring Ministry-Girls (Nailah)", eligibility: () => true, details: "The Nailah ministry provides mentorship for young girls, focusing on empowerment and personal growth." },
    { id: "teen-fellowship", label: "New Generation Teen Fellowship", eligibility: () => true, details: "Thank you for registering for New Generation Teen Fellowship.\n\nOn 3rd Sundays, during the 10:30 AM service,  New Generation Teen Fellowship will host Teen Church in the Family Life Enrichment Center.  Teens may sign themselves in and out of the service.\n\nYou will receive more information about ministry activities from minstry leaders." },
    { id: "choir-joy-bells", label: "Youth Choirs- Joy Bells (Ages 4-8)", eligibility: (age: number | null) => age !== null && age >= 4 && age <= 8, details: "Joy Bells is our introductory choir for the youngest voices. Practices are held after the 11 AM service." },
    { id: "choir-keita", label: "Youth Choirs- Keita Praise Choir (Ages 9-12)", eligibility: (age: number | null) => age !== null && age >= 9 && age <= 12, details: "Keita Praise Choir builds on foundational skills and performs once a month. Practices are on Wednesdays." },
    { id: "choir-teen", label: "Youth Choirs- New Generation Teen Choir (Ages 13-18)", eligibility: (age: number | null) => age !== null && age >= 13 && age <= 18, details: "The Teen Choir performs contemporary gospel music and leads worship during Youth Sundays." },
    { id: "youth-ushers", label: "Youth Ushers", eligibility: () => true, details: "Youth Ushers serve during the 11 AM service, welcoming members and assisting with the offering." },
];

const interestPrograms = [
    { id: "childrens-musical", label: "Children's Musical", eligibility: () => true },
    { id: "confirmation", label: "Confirmation", eligibility: () => true },
    { id: "orators", label: "New Jersey Orators", eligibility: () => true },
    { id: "nursery", label: "Nursery", eligibility: () => true },
    { id: "vbs", label: "Vacation Bible School", eligibility: () => true },
    { id: "college-tour", label: "College Tour", eligibility: () => true },
];

const getAgeFromDob = (dobString: string): number | null => {
    if (dobString && isValid(parseISO(dobString))) {
        return differenceInYears(new Date(), parseISO(dobString));
    }
    return null;
}

const ProgramSection = ({ control, childrenData, program, childFields }: { control: any, childrenData: any[], program: any, childFields: any[] }) => {
    const ministrySelections = useWatch({
        control,
        name: 'children',
    });

    const isAnyChildSelected = childrenData.some((_, index) => 
        ministrySelections[index]?.ministrySelections?.[program.id]
    );

    return (
        <div className="p-4 border rounded-md">
            <h4 className="font-semibold">{program.label}</h4>
            {program.description && <p className="text-sm text-muted-foreground mb-2">{program.description}</p>}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 mt-2">
                {childrenData.map((child, index) => {
                    const age = getAgeFromDob(child.dob);
                    if (!program.eligibility(age)) return null;
                    
                    return (
                        <FormField
                            key={`${program.id}-${childFields[index].id}`}
                            control={control}
                            name={`children.${index}.ministrySelections.${program.id as keyof z.infer<typeof ministrySelectionSchema>}`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <FormLabel className="font-normal">{child.first_name || `Child ${index + 1}`}</FormLabel>
                                </FormItem>
                            )}
                        />
                    )
                })}
            </div>
             {isAnyChildSelected && program.id === 'dance' && (
                <DanceMinistryForm control={control} />
            )}
             {isAnyChildSelected && program.id === 'teen-fellowship' && (
                <TeenFellowshipForm control={control} />
            )}
            {isAnyChildSelected && program.details && (
                 <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="whitespace-pre-wrap">
                       {program.details}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}

export default function RegisterPage() {
  const { toast } = useToast()
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('enter_email');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      household: { name: "", address_line1: "" },
      guardians: [{ first_name: "", last_name: "", mobile_phone: "", email: "", relationship: "Mother", is_primary: true }],
      emergencyContact: { first_name: "", last_name: "", mobile_phone: "", relationship: "" },
      children: [],
      consents: { liability: false, photoRelease: false },
    },
  })

  const { fields: guardianFields, append: appendGuardian, remove: removeGuardian } = useFieldArray({
    control: form.control,
    name: "guardians",
  });

  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: "children",
  });

  const childrenData = useWatch({ control: form.control, name: 'children' });

  const prefillForm = (data: any) => {
    form.reset(data);
    if (data.children && data.children.length > 0) {
      setOpenAccordionItems(data.children.map((_: any, index: number) => `item-${index}`));
    }
  }

  const handleEmailLookup = () => {
    switch (verificationEmail) {
        case MOCK_EMAILS.PREFILL:
            toast({ title: "Household Found!", description: "Your information has been pre-filled for you to review." });
            prefillForm(MOCK_HOUSEHOLD_DATA);
            setVerificationStep('form_visible');
            break;
        case MOCK_EMAILS.VERIFY:
            setVerificationStep('verify_identity');
            break;
        case MOCK_EMAILS.NEW:
        default:
             toast({ title: "New Registration", description: "Please complete the form below to register your family." });
             // Reset to a clean slate, but keep the email for context.
             form.reset({
                ...form.getValues(), // keep any entered data
                household: { name: "", address_line1: "" },
                guardians: [{ first_name: "", last_name: "", mobile_phone: "", email: verificationEmail, relationship: "Mother", is_primary: true }],
                emergencyContact: { first_name: "", last_name: "", mobile_phone: "", relationship: "" },
                children: [defaultChildValues],
                consents: { liability: false, photoRelease: false },
             });
            setOpenAccordionItems(['item-0']);
            setVerificationStep('form_visible');
            break;
    }
  }


  async function onSubmit(data: RegistrationFormValues) {
    try {
        await registerHousehold(data);
        toast({
            title: "Registration Submitted!",
            description: "Thank you! Your family's registration has been received.",
        });
        form.reset();
        setVerificationStep('enter_email');
        setVerificationEmail('');
        setOpenAccordionItems([]);
    } catch(e) {
        console.error(e);
        toast({
            title: "Submission Error",
            description: "There was an error processing your registration. Please try again.",
            variant: "destructive"
        })
    }
  }

  const primaryGuardianLastName = form.watch("guardians.0.last_name");


  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Family Registration Form</h1>
            <p className="text-muted-foreground">
            Complete the form below to register your family for our children's ministry programs.
            </p>
        </div>
        
        {verificationStep === 'enter_email' && (
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Household Lookup</CardTitle>
                    <CardDescription>
                        Enter your email to find your household, or start a new registration.
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
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>For Prototype Demo</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 text-sm">
                                <li>Use <code className="font-semibold">{MOCK_EMAILS.PREFILL}</code> to pre-fill the form.</li>
                                <li>Use <code className="font-semibold">{MOCK_EMAILS.VERIFY}</code> to see the verification step.</li>
                                <li>Any other email will start a new registration.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )}

        {verificationStep === 'verify_identity' && (
            <VerificationStepTwoForm 
                onVerifySuccess={() => {
                    prefillForm(MOCK_HOUSEHOLD_DATA);
                    setVerificationStep('form_visible');
                }}
                onGoBack={() => setVerificationStep('enter_email')}
            />
        )}


        {verificationStep === 'form_visible' && (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Household & Guardian Information</CardTitle>
                        <CardDescription>
                            <Button variant="link" className="p-0 h-auto" onClick={() => setVerificationStep('enter_email')}>Change lookup email ({verificationEmail})</Button>
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
                                        <Input placeholder="123 Main St, Anytown, USA" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Separator />
                        {guardianFields.map((field, index) => (
                        <div key={field.id} className="space-y-4 p-4 border rounded-lg relative">
                            <h3 className="font-semibold font-headline">Guardian {index + 1}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`guardians.${index}.first_name`} render={({ field }) => (
                                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`guardians.${index}.last_name`} render={({ field }) => (
                                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`guardians.${index}.mobile_phone`} render={({ field }) => (
                                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`guardians.${index}.email`} render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`guardians.${index}.relationship`} render={({ field }) => (
                                <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g., Mother, Grandfather" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
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
                                                    <Input placeholder={primaryGuardianLastName ? `${primaryGuardianLastName} Household` : ""} {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    This is how we will identify your household - please change it if you want a different name used.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                            {guardianFields.length > 1 && (
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => removeGuardian(index)}><Trash2 className="h-4 w-4" /></Button>
                            )}
                        </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendGuardian({ first_name: "", last_name: "", mobile_phone: "", email: "", relationship: "", is_primary: false })}><PlusCircle className="mr-2 h-4 w-4" /> Add Guardian</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Emergency Contact</CardTitle>
                        <CardDescription>This person should be different from the guardians listed above.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="emergencyContact.first_name" render={({ field }) => (
                                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="emergencyContact.last_name" render={({ field }) => (
                                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="emergencyContact.relationship" render={({ field }) => (
                                <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g., Aunt, Neighbor" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="emergencyContact.mobile_phone" render={({ field }) => (
                                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="font-headline">Children Information</CardTitle></CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
                            {childFields.map((field, index) => (
                                <AccordionItem key={field.id} value={`item-${index}`}>
                                    <AccordionTrigger className="font-headline">
                                        {form.watch(`children.${index}.first_name`) || `Child ${index + 1}`}
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-4 relative">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`children.${index}.first_name`} render={({ field }) => (
                                                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name={`children.${index}.last_name`} render={({ field }) => (
                                                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name={`children.${index}.dob`} render={({ field }) => (
                                                <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name={`children.${index}.grade`} render={({ field }) => (
                                                <FormItem><FormLabel>Grade (Fall 2024)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name={`children.${index}.allergies`} render={({ field }) => (
                                            <FormItem><FormLabel>Allergies or Medical Conditions</FormLabel><FormControl><Input placeholder="e.g., Peanuts, Asthma" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`children.${index}.medical_notes`} render={({ field }) => (
                                            <FormItem><FormLabel>Other Safety Info</FormLabel><FormControl><Textarea placeholder="Anything else we should know?" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeChild(index)}><Trash2 className="mr-2 h-4 w-4" /> Remove Child</Button>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => {
                            appendChild(defaultChildValues);
                            setOpenAccordionItems(prev => [...prev, `item-${childFields.length}`]);
                        }}><PlusCircle className="mr-2 h-4 w-4" /> Add Child</Button>
                    </CardContent>
                </Card>

                {childFields.length > 0 && (
                    <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Ministry Programs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="p-4 border rounded-md bg-muted/50">
                                <h4 className="font-semibold">Sunday School / Children's Church</h4>
                                <div className="text-sm text-muted-foreground mb-2 space-y-2 whitespace-pre-wrap">
                                  <p>Thank you for registering for Sunday School and Children's Church</p>
                                  <p>Sunday School takes place in the Family Life Enrichment Center on 1st, 4th, and 5th Sundays during the 9:30AM Service.  Sunday School serves ages 4-18. </p>
                                  <p>Children's Church, for ages 4-12, will take place on 3rd Sundays in the same location duirng the 9:30AM service.</p>
                                  <p>Children must be signed in by an adult or high school-aged sibling and can be picked up by a parent/guardian, teenage sibling or the adult who signed them in. High Schoolers may sign themselves in and out of Sunday School.  </p>
                                  <p>Teens should attend Teen Church which takes place at the Hilliard Community Complex on 3rd Sundays.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 mt-2">
                                    {childrenData.map((child, index) => (
                                        <div key={`ss-${childFields[index].id}`} className="flex flex-row items-start space-x-3 space-y-0">
                                            <Checkbox checked={true} disabled={true} />
                                            <label className="font-normal text-sm text-muted-foreground">{child.first_name || `Child ${index + 1}`}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {ministryPrograms.map(program => (
                                <ProgramSection key={program.id} control={form.control} childrenData={childrenData} program={program} childFields={childFields} />
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Interest-Only Activities</CardTitle>
                            <CardDescription>Let us know if you're interested. This does not register you.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {interestPrograms.map(program => (
                                <div key={program.id} className="p-4 border rounded-md">
                                    <h4 className="font-semibold">{program.label}</h4>
                                     <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 mt-2">
                                        {childrenData.map((child, index) => (
                                            <FormField
                                                key={`${program.id}-${childFields[index].id}`}
                                                control={form.control}
                                                name={`children.${index}.interestSelections.${program.id as keyof z.infer<typeof interestSelectionSchema>}`}
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                        <FormLabel className="font-normal">{child.first_name || `Child ${index + 1}`}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    </>
                )}


                <Card>
                    <CardHeader><CardTitle className="font-headline">Consents</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="consents.liability" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Liability Release</FormLabel><FormDescription>I release the church from liability for any injuries.</FormDescription><FormMessage /></div></FormItem>
                        )} />
                        <FormField control={form.control} name="consents.photoRelease" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Photo Release</FormLabel><FormDescription>I grant permission for my child's photo to be used in church publications.</FormDescription><FormMessage /></div></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full md:w-auto">Submit Registration</Button>
                </form>
            </Form>
        )}
    </div>
  )
}

    