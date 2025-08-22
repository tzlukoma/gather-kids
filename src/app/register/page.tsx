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

const guardianSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  email: z.string().email("A valid email is required."),
})

const childSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Valid date of birth is required."}),
  grade: z.string().min(1, "Grade is required."),
  allergies: z.string().optional(),
  safetyInfo: z.string().optional(),
})

const registrationSchema = z.object({
  email: z.string().email("Please enter a valid email to begin."),
  household: z.object({
    address: z.string().min(1, "Address is required."),
    pin: z.string().length(4, "PIN must be 4 digits.").optional(),
  }),
  guardians: z.array(guardianSchema).min(1, "At least one guardian is required."),
  emergencyContact: z.object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    phone: z.string().min(10, "A valid phone number is required."),
  }),
  children: z.array(childSchema).min(1, "At least one child is required."),
  ministrySelections: z.object({
    choir: z.boolean().default(false).optional(),
    bibleBee: z.boolean().default(false).optional(),
  }),
  consents: z.object({
    liability: z.boolean().refine(val => val === true, { message: "Liability consent is required."}),
    photoRelease: z.boolean().refine(val => val === true, { message: "Photo release consent is required."}),
  }),
})

type RegistrationFormValues = z.infer<typeof registrationSchema>

export default function RegisterPage() {
  const { toast } = useToast()
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      household: {
        address: "",
      },
      guardians: [{ firstName: "", lastName: "", phone: "", email: "" }],
      emergencyContact: { firstName: "", lastName: "", phone: "" },
      children: [{ firstName: "", lastName: "", dob: "", grade: "", allergies: "", safetyInfo: "" }],
      ministrySelections: {
        choir: false,
        bibleBee: false
      },
      consents: {
        liability: false,
        photoRelease: false
      }
    },
  })

  const { fields: guardianFields, append: appendGuardian, remove: removeGuardian } = useFieldArray({
    control: form.control,
    name: "guardians",
  })

  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: "children",
  })

  function onSubmit(data: RegistrationFormValues) {
    console.log(data)
    toast({
      title: "Registration Submitted!",
      description: "Thank you! Your family's registration has been received.",
    })
    form.reset()
  }

  const [isBibleBeeVisible, setIsBibleBeeVisible] = useState(false);

  useEffect(() => {
    // Bible Bee visible only in August
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

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Household Verification</CardTitle>
                    <CardDescription>
                        Enter your email to link to an existing household or create a new one. A magic link will be sent to verify.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Verification Email</FormLabel>
                        <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Household & Guardian Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="household.address"
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
                        <FormField control={form.control} name={`guardians.${index}.firstName`} render={({ field }) => (
                            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`guardians.${index}.lastName`} render={({ field }) => (
                            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`guardians.${index}.phone`} render={({ field }) => (
                            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`guardians.${index}.email`} render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        </div>
                        {guardianFields.length > 1 && (
                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => removeGuardian(index)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                    </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendGuardian({ firstName: "", lastName: "", phone: "", email: "" })}><PlusCircle className="mr-2 h-4 w-4" /> Add Guardian</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Emergency Contact</CardTitle>
                    <CardDescription>This person should be different from the guardians listed above.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="emergencyContact.firstName" render={({ field }) => (
                            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="emergencyContact.lastName" render={({ field }) => (
                            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="emergencyContact.phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="font-headline">Children Information</CardTitle></CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full" defaultValue={['item-0']}>
                        {childFields.map((field, index) => (
                            <AccordionItem key={field.id} value={`item-${index}`}>
                                <AccordionTrigger className="font-headline">
                                    {form.watch(`children.${index}.firstName`) || `Child ${index + 1}`}
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name={`children.${index}.firstName`} render={({ field }) => (
                                            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`children.${index}.lastName`} render={({ field }) => (
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
                                    <FormField control={form.control} name={`children.${index}.safetyInfo`} render={({ field }) => (
                                        <FormItem><FormLabel>Other Safety Info</FormLabel><FormControl><Textarea placeholder="Anything else we should know?" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="destructive" size="sm" onClick={() => removeChild(index)}><Trash2 className="mr-2 h-4 w-4" /> Remove Child</Button>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                     <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendChild({ firstName: "", lastName: "", dob: "", grade: "", allergies: "", safetyInfo: "" })}><PlusCircle className="mr-2 h-4 w-4" /> Add Child</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Ministry Programs</CardTitle>
                    <CardDescription>Sunday School is automatic. Select additional interests.</CardDescription>
                </Header>
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
    </div>
  )
}
