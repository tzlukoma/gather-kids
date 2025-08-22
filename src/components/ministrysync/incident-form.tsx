"use client"

import { useForm, Controller } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { mockChildren } from "@/lib/mock-data"
import type { IncidentSeverity } from "@/lib/types"

const incidentFormSchema = z.object({
  childId: z.string({ required_error: "Please select a child." }),
  severity: z.enum(["Low", "Medium", "High"], {
    required_error: "You need to select a severity level.",
  }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." })
    .max(500, { message: "Description must not be longer than 500 characters." }),
})

type IncidentFormValues = z.infer<typeof incidentFormSchema>

const defaultValues: Partial<IncidentFormValues> = {
  description: "",
}

export function IncidentForm() {
  const { toast } = useToast()
  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: IncidentFormValues) {
    toast({
      title: "Incident Logged",
      description: `An incident for ${mockChildren.find(c => c.id === data.childId)?.firstName} has been logged.`,
    })
    console.log(data)
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="childId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Child Involved</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockChildren.filter(c => c.checkedIn).map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severity</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a severity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                High severity will send an immediate notification to admins.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Incident</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a clear and concise description of what happened..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Log Incident</Button>
      </form>
    </Form>
  )
}
