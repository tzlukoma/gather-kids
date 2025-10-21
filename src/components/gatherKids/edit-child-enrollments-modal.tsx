import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useMinistries, 
  useAddChildEnrollment, 
  useRemoveChildEnrollment, 
  useUpdateChildEnrollmentFields 
} from '@/hooks/data';
import { useToast } from '@/hooks/use-toast';
import { getCurrentRegistrationCycle } from '@/lib/dal';
import type { Child, MinistryEnrollment, Ministry } from '@/lib/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCycleId, setCurrentCycleId] = useState<string | null>(null);
  const [selectedMinistries, setSelectedMinistries] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const addEnrollmentMutation = useAddChildEnrollment();
  const removeEnrollmentMutation = useRemoveChildEnrollment();
  const updateEnrollmentMutation = useUpdateChildEnrollmentFields();
  
  const { data: ministries = [], isLoading: ministriesLoading } = useMinistries();

  // Get current registration cycle
  useEffect(() => {
    const fetchCurrentCycle = async () => {
      try {
        const cycle = await getCurrentRegistrationCycle();
        setCurrentCycleId(cycle?.cycle_id || null);
      } catch (error) {
        console.error('Failed to get current registration cycle:', error);
      }
    };
    fetchCurrentCycle();
  }, []);

  // Initialize selected ministries from current enrollments
  useEffect(() => {
    if (currentEnrollments && currentCycleId) {
      const enrolledMinistries = currentEnrollments
        .filter(enrollment => enrollment.cycle_id === currentCycleId)
        .map(enrollment => enrollment.ministry_id);
      setSelectedMinistries(new Set(enrolledMinistries));
    }
  }, [currentEnrollments, currentCycleId]);

  const handleMinistryToggle = (ministryId: string) => {
    const newSelected = new Set(selectedMinistries);
    if (newSelected.has(ministryId)) {
      newSelected.delete(ministryId);
    } else {
      newSelected.add(ministryId);
    }
    setSelectedMinistries(newSelected);
  };

  const onSubmit = async () => {
    if (!currentCycleId) {
      toast({
        title: 'Error',
        description: 'No active registration cycle found.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current enrollments for this cycle
      const currentEnrolledMinistries = currentEnrollments
        .filter(enrollment => enrollment.cycle_id === currentCycleId)
        .map(enrollment => enrollment.ministry_id);

      // Remove enrollments that are no longer selected
      for (const ministryId of currentEnrolledMinistries) {
        if (!selectedMinistries.has(ministryId)) {
          await removeEnrollmentMutation.mutateAsync({
            childId: child.child_id,
            householdId,
            ministryId,
            cycleId: currentCycleId,
          });
        }
      }

      // Add new enrollments
      for (const ministryId of selectedMinistries) {
        if (!currentEnrolledMinistries.includes(ministryId)) {
          await addEnrollmentMutation.mutateAsync({
            childId: child.child_id,
            householdId,
            ministryId,
            cycleId: currentCycleId,
            customFields: {},
          });
        }
      }

      toast({
        title: 'Enrollments Updated',
        description: `${child.first_name}'s ministry enrollments have been updated successfully.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update enrollments:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not update ministry enrollments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ministriesLoading || !currentCycleId) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Ministry Enrollments</DialogTitle>
            <DialogDescription>
              Loading ministry information...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ministry Enrollments</DialogTitle>
          <DialogDescription>
            Select the ministries that {child.first_name} should be enrolled in for the current registration cycle.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Available Ministries</Label>
            {ministries.length === 0 ? (
              <div className="text-muted-foreground py-4">
                No ministries available for enrollment.
              </div>
            ) : (
              ministries.map((ministry) => (
                <div key={ministry.ministry_id} className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={ministry.ministry_id}
                      checked={selectedMinistries.has(ministry.ministry_id)}
                      onCheckedChange={() => handleMinistryToggle(ministry.ministry_id)}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={ministry.ministry_id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {ministry.name}
                      </Label>
                      {ministry.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ministry.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant="outline" className="text-xs">
                        Ages {ministry.min_age}-{ministry.max_age}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Grades {ministry.min_grade}-{ministry.max_grade}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                </div>
              ))
            )}
          </div>

          {selectedMinistries.size > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Selected Ministries</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedMinistries).map((ministryId) => {
                  const ministry = ministries.find(m => m.ministry_id === ministryId);
                  return ministry ? (
                    <Badge key={ministryId} variant="default">
                      {ministry.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Update Enrollments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
