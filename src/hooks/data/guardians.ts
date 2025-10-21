'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addGuardian, updateGuardian, removeGuardian } from '@/lib/dal';
import { queryKeys } from './keys';
import type { Guardian } from '@/lib/types';

export function useAddGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ householdId, guardian }: { householdId: string; guardian: Omit<Guardian, 'guardian_id'> }) =>
      addGuardian(householdId, guardian),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
    },
  });
}

export function useUpdateGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ guardianId, householdId, data }: { guardianId: string; householdId: string; data: Partial<Guardian> }) =>
      updateGuardian(guardianId, data),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
    },
  });
}

export function useRemoveGuardian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ guardianId, householdId }: { guardianId: string; householdId: string }) =>
      removeGuardian(guardianId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
    },
  });
}
