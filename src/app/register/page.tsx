

"use client"

import { useForm, useFieldArray } from "react-hook-form"
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
import { useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { registerHousehold } from "@/lib/dal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"


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
        { first_name: "Olivia", last_name: "Johnson", dob: "2020-05-10", grade: "Pre-K", allergies: "Tree nuts", medical_notes: "Carries an EpiPen." },
        { first_name: "Noah", last_name: "Johnson", dob: "2017-09-15", grade: "2nd Grade", allergies: "", medical_notes: "" },
    ],
    ministrySelections: {
        choir: true,
        bibleBee: false,
    },
    consents: {
        liability: true,
        photoRelease: false,
    },
};


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
  ministrySelections: z.object({
    choir: z.boolean().default(false).optional(),
    bibleBee: z.boolean().default(false).optional(),
  }),
  consents: z.object({
    liability: z.boolean().refine((val) => val === true, {
      message: "Liability consent is required.",
    }),
    photoRelease: z.boolean().refine((val) => val === true, {
      message: "Photo release consent is required.",
    }),
  }),
});

const verificationSchema = z.object({
    childDob: z.string().refine(val => val === '2020-05-10', "Date of birth does not match."),
    streetNumber: z.string().refine(val => val === '456', "Street number does not match."),
    emergencyContactFirstName: z.string().refine(val => val.toLowerCase() === 'susan', "Emergency contact name does not match."),
})


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

export default function RegisterPage() {
  const { toast } = useToast()
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('enter_email');
  const [verificationEmail, setVerificationEmail] = useState('');
  
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      household: { name: "", address_line1: "" },
      guardians: [{ first_name: "", last_name: "", mobile_phone: "", email: "", relationship: "Mother", is_primary: true }],
      emergencyContact: { first_name: "", last_name: "", mobile_phone: "", relationship: "" },
      children: [{ first_name: "", last_name: "", dob: "", grade: "", allergies: "", medical_notes: "" }],
      ministrySelections: { choir: false, bibleBee: false },
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

  const prefillForm = (data: any) => {
    form.reset(data);
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
    } catch(e) {
        console.error(e);
        toast({
            title: "Submission Error",
            description: "There was an error processing your registration. Please try again.",
            variant: "destructive"
        })
    }
  }

  const [isBibleBeeVisible, setIsBibleBeeVisible] = useState(false);
  const primaryGuardianLastName = form.watch("guardians.0.last_name");

  useEffect(() => {
    const today = new Date();
    setIsBibleBeeVisible(today.getMonth() === 7);
  }, []);


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
                        <Accordion type="multiple" className="w-full" defaultValue={['item-0']}>
                            {childFields.map((field, index) => (
                                <AccordionItem key={field.id} value={`item-${index}`}>
                                    <AccordionTrigger className="font-headline">
                                        {form.watch(`children.${index}.first_name`) || `Child ${index + 1}`}
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4 pt-4">
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
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendChild({ first_name: "", last_name: "", dob: "", grade: "", allergies: "", medical_notes: "" })}><PlusCircle className="mr-2 h-4 w-4" /> Add Child</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Ministry Programs</CardTitle>
                        <CardDescription>Sunday School is automatic. Select additional interests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="ministrySelections.choir" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Children's Choir (Ages 7-12)</FormLabel><FormDescription>Requires commitment for weekly practice.</FormDescription></div></FormItem>
                        )} />
                        {isBibleBeeVisible && <FormField control={form.control} name="ministrySelections.bibleBee" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Bible Bee Competition (Interest Only)</FormLabel><FormDescription>Sign-ups open in August only. This indicates interest for more information.</FormDescription></div></FormItem>
                        )} />}
                    </CardContent>
                </Card>

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
