'use client';

import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  useAddChildEnrollment, 
  useRemoveChildEnrollment, 
  useUpdateChildEnrollmentFields,
  useMinistries 
} from '@/hooks/data';
import { getCurrentRegistrationCycle } from '@/lib/dal';
import type { Child, Ministry, MinistryEnrollment } from '@/lib/types';

const enrollmentSchema = z.object({
  ministrySelections: z.record(z.boolean().optional()).optional(),
  interestSelections: z.record(z.boolean().optional()).optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface EditChildEnrollmentsModalProps {
  child: Child;
  householdId: string;
  currentEnrollments: MinistryEnrollment[];
  onClose: () => void;
}

export function EditChildEnrollmentsModal({ 
  child, 
  householdId, 
  currentEnrollments, 
  onClose 
}: EditChildEnrollmentsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<string | null>(null);

  const addEnrollmentMutation = useAddChildEnrollment();
  const removeEnrollmentMutation = useRemoveChildEnrollment();
  const updateEnrollmentFieldsMutation = useUpdateChildEnrollmentFields();
  const { data: ministries = [] } = useMinistries();

  // Get current cycle on mount
  useEffect(() => {
    const fetchCurrentCycle = async () => {
      try {
        const cycle = await getCurrentRegistrationCycle();
        setCurrentCycle(cycle?.cycle_id || null);
      } catch (error) {
        console.error('Failed to get current cycle:', error);
      }
    };
    fetchCurrentCycle();
  }, []);

  // Create initial form values from current enrollments
  const getInitialValues = () => {
    const ministrySelections: Record<string, boolean> = {};
    const interestSelections: Record<string, boolean> = {};

    currentEnrollments.forEach(enrollment => {
      if (enrollment.cycle_id === currentCycle) {
        ministrySelections[enrollment.ministry_id] = true;
        if (enrollment.custom_fields?.interest) {
          interestSelections[enrollment.ministry_id] = true;
        }
      }
    });

    return {
      ministrySelections,
      interestSelections,
    };
  };

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: getInitialValues(),
  });

  // Update form when current cycle changes
  useEffect(() => {
    if (currentCycle) {
      form.reset(getInitialValues());
    }
  }, [currentCycle]);

  const onSubmit = async (data: EnrollmentFormData) => {
    if (!currentCycle) {
      toast({
        title: 'Error',
        description: 'No active registration cycle found.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const ministrySelections = data.ministrySelections || {};
      const interestSelections = data.interestSelections || {};

      // Process each ministry
      for (const ministry of ministries) {
        const isEnrolled = ministrySelections[ministry.ministry_id] || false;
        const isInterested = interestSelections[ministry.ministry_id] || false;
        
        const existingEnrollment = currentEnrollments.find(
          e => e.ministry_id === ministry.ministry_id && e.cycle_id === currentCycle
        );

        if (isEnrolled && !existingEnrollment) {
          // Add new enrollment
          await addEnrollmentMutation.mutateAsync({
            childId: child.child_id,
            householdId,
            ministryId: ministry.ministry_id,
            cycleId: currentCycle,
            customFields: isInterested ? { interest: true } : undefined,
          });
        } else if (!isEnrolled && existingEnrollment) {
          // Remove enrollment
          await removeEnrollmentMutation.mutateAsync({
            childId: child.child_id,
            householdId,
            ministryId: ministry.ministry_id,
            cycleId: currentCycle,
          });
        } else if (isEnrolled && existingEnrollment) {
          // Update existing enrollment if interest status changed
          const currentInterest = existingEnrollment.custom_fields?.interest || false;
          if (isInterested !== currentInterest) {
            await updateEnrollmentFieldsMutation.mutateAsync({
              childId: child.child_id,
              householdId,
              ministryId: ministry.ministry_id,
              cycleId: currentCycle,
              customFields: { interest: isInterested },
            });
          }
        }
      }
      
      toast({
        title: 'Enrollments Updated',
        description: `${child.first_name}'s ministry enrollments have been updated successfully.`,
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save enrollments:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save the enrollments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {child.first_name}'s Ministry Enrollments</DialogTitle>
          <DialogDescription>
            Manage {child.first_name}'s ministry enrollments for the current year.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {ministries.map((ministry) => {
              const isEnrolled = form.watch(`ministrySelections.${ministry.ministry_id}`) || false;
              const isInterested = form.watch(`interestSelections.${ministry.ministry_id}`) || false;

              return (
                <div key={ministry.ministry_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{ministry.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      Ages {ministry.min_age}-{ministry.max_age} | Grades {ministry.min_grade}-{ministry.max_grade}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name={`ministrySelections.${ministry.ministry_id}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enrolled</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {isEnrolled && (
                      <FormField
                        control={form.control}
                        name={`interestSelections.${ministry.ministry_id}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-6">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Expressed Interest</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {ministry.description && (
                    <p className="text-sm text-muted-foreground">{ministry.description}</p>
                  )}
                </div>
              );
            })}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Update Enrollments'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
