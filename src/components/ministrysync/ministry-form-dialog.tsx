
"use client"

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Ministry } from "@/lib/types";
import { createMinistry, updateMinistry } from "@/lib/dal";
import { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "../ui/separator";

const customQuestionSchema = z.object({
    id: z.string(),
    text: z.string().min(1, "Question text is required"),
    type: z.enum(['radio', 'checkbox', 'text']),
    options: z.array(z.string()).optional(),
});

const ministryFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    code: z.string().min(2, "Code must be at least 2 characters.").regex(/^[a-z0-9-]+$/, "Code can only contain lowercase letters, numbers, and hyphens."),
    enrollment_type: z.enum(["enrolled", "interest_only"]),
    description: z.string().optional(),
    details: z.string().optional(),
    custom_questions: z.array(customQuestionSchema).optional(),
});

type MinistryFormValues = z.infer<typeof ministryFormSchema>;

interface MinistryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ministry: Ministry | null;
}

export function MinistryFormDialog({ isOpen, onClose, ministry }: MinistryFormDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<MinistryFormValues>({
    resolver: zodResolver(ministryFormSchema),
    defaultValues: {
      name: "",
      code: "",
      enrollment_type: "enrolled",
      description: "",
      details: "",
      custom_questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "custom_questions",
  });

  useEffect(() => {
    if (ministry) {
      form.reset({
        name: ministry.name,
        code: ministry.code,
        enrollment_type: ministry.enrollment_type,
        description: ministry.description,
        details: ministry.details,
        custom_questions: ministry.custom_questions?.map(q => ({...q, options: q.options || []})) || [],
      });
    } else {
      form.reset({
        name: "",
        code: "",
        enrollment_type: "enrolled",
        description: "",
        details: "",
        custom_questions: [],
      });
    }
  }, [ministry, form, isOpen]);


  const onSubmit = async (data: MinistryFormValues) => {
    try {
      if (ministry) {
        await updateMinistry(ministry.ministry_id, data);
        toast({ title: "Ministry Updated", description: "The ministry has been successfully updated." });
      } else {
        await createMinistry(data);
        toast({ title: "Ministry Created", description: "The new ministry has been created." });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save ministry", error);
      toast({
        title: "Save Failed",
        description: "Could not save the ministry. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{ministry ? "Edit Ministry" : "Add New Ministry"}</DialogTitle>
          <DialogDescription>
            {ministry ? "Update the details for this ministry or activity." : "Create a new program or interest-only activity."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <FormField control={form.control} name="enrollment_type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="enrolled">Ministry Program (Enrolled)</SelectItem>
                            <SelectItem value="interest_only">Interest-Only Activity</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormDescription>A short description shown on the registration form.</FormDescription><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="details" render={({ field }) => (
                <FormItem><FormLabel>Information</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormDescription>Additional information or instructions displayed after a user selects this option.</FormDescription><FormMessage /></FormItem>
            )} />

            <Separator />

            <div>
                <h3 className="text-lg font-medium mb-2">Custom Questions</h3>
                 {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md mb-4 space-y-4 relative">
                        <FormField control={form.control} name={`custom_questions.${index}.text`} render={({ field }) => (
                            <FormItem><FormLabel>Question Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`custom_questions.${index}.type`} render={({ field }) => (
                             <FormItem>
                                <FormLabel>Question Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="checkbox">Checkbox</SelectItem>
                                        <SelectItem value="radio">Radio Buttons</SelectItem>
                                        <SelectItem value="text">Text Input</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        {['radio', 'checkbox'].includes(form.watch(`custom_questions.${index}.type`)) && (
                            <FormField control={form.control} name={`custom_questions.${index}.options`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Options (one per line)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            value={Array.isArray(field.value) ? field.value.join('\n') : ''}
                                            onChange={(e) => field.onChange(e.target.value.split('\n'))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), text: "", type: "text", options: [] })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                </Button>
            </div>
            
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
