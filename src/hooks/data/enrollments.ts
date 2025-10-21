'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addChildEnrollment, removeChildEnrollment, updateChildEnrollmentFields } from '@/lib/dal';
import { queryKeys } from './keys';

export function useAddChildEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ childId, householdId, ministryId, cycleId, customFields }: { 
      childId: string; 
      householdId: string;
      ministryId: string; 
      cycleId: string; 
      customFields?: any 
    }) => addChildEnrollment(childId, ministryId, cycleId, customFields),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
    },
  });
}

export function useRemoveChildEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ childId, householdId, ministryId, cycleId }: { 
      childId: string; 
      householdId: string;
      ministryId: string; 
      cycleId: string 
    }) => removeChildEnrollment(childId, ministryId, cycleId),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
    },
  });
}

export function useUpdateChildEnrollmentFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ childId, householdId, ministryId, cycleId, customFields }: { 
      childId: string; 
      householdId: string;
      ministryId: string; 
      cycleId: string; 
      customFields: any 
    }) => updateChildEnrollmentFields(childId, ministryId, cycleId, customFields),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
    },
  });
}
