'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAddChild, useUpdateChild } from '@/hooks/data';
import { getCurrentRegistrationCycle } from '@/lib/dal';
import type { Child } from '@/lib/types';

const childSchema = z.object({
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
});

type ChildFormData = z.infer<typeof childSchema>;

interface EditChildModalProps {
  child: Child | null; // null for adding new
  householdId: string;
  onClose: () => void;
}

export function EditChildModal({ child, householdId, onClose }: EditChildModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = child !== null;

  const addChildMutation = useAddChild();
  const updateChildMutation = useUpdateChild();

  const form = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: child ? {
      first_name: child.first_name,
      last_name: child.last_name,
      dob: child.dob,
      grade: child.grade,
      child_mobile: child.child_mobile || '',
      allergies: child.allergies || '',
      medical_notes: child.medical_notes || '',
      special_needs: child.special_needs || false,
      special_needs_notes: child.special_needs_notes || '',
    } : {
      first_name: '',
      last_name: '',
      dob: '',
      grade: '',
      child_mobile: '',
      allergies: '',
      medical_notes: '',
      special_needs: false,
      special_needs_notes: '',
    },
  });

  const onSubmit = async (data: ChildFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && child) {
        await updateChildMutation.mutateAsync({
          childId: child.child_id,
          householdId,
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            dob: data.dob,
            grade: data.grade,
            child_mobile: data.child_mobile || undefined,
            allergies: data.allergies || undefined,
            medical_notes: data.medical_notes || undefined,
            special_needs: data.special_needs,
            special_needs_notes: data.special_needs_notes || undefined,
          },
        });
        
        toast({
          title: 'Child Updated',
          description: `${data.first_name} ${data.last_name} has been updated successfully.`,
        });
      } else {
        // Get current registration cycle for auto-enrollment
        const currentCycle = await getCurrentRegistrationCycle();
        if (!currentCycle) {
          throw new Error('No active registration cycle found');
        }

        await addChildMutation.mutateAsync({
          householdId,
          child: {
            first_name: data.first_name,
            last_name: data.last_name,
            dob: data.dob,
            grade: data.grade,
            child_mobile: data.child_mobile || undefined,
            allergies: data.allergies || undefined,
            medical_notes: data.medical_notes || undefined,
            special_needs: data.special_needs,
            special_needs_notes: data.special_needs_notes || undefined,
            photo_url: null,
            ministrySelections: {},
            interestSelections: {},
            customData: {},
          },
          cycleId: currentCycle.cycle_id,
        });
        
        toast({
          title: 'Child Added',
          description: `${data.first_name} ${data.last_name} has been added successfully.`,
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save child:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save the child. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Child' : 'Add Child'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the child information below.'
              : 'Add a new child to this household.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Emma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Johnson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dob"
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
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="3rd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="child_mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child's Phone (Optional)</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List any allergies..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medical_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any medical information..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="special_needs"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Special Needs</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="special_needs_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Needs Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe any special needs..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
