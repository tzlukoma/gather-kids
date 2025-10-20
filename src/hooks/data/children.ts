'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllChildren, getChild, getCheckedInChildren, addChild, updateChild, softDeleteChild } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';
import type { Child } from '@/lib/types';

export function useChildren() {
  return useQuery({
    queryKey: queryKeys.children(),
    queryFn: getAllChildren,
    ...cacheConfig.moderate,
  });
}

export function useChild(childId: string) {
  return useQuery({
    queryKey: queryKeys.child(childId),
    queryFn: () => getChild(childId),
    enabled: !!childId,
    ...cacheConfig.moderate,
  });
}

export function useCheckedInChildren(date: string) {
  return useQuery({
    queryKey: queryKeys.checkedInChildren(date),
    queryFn: () => getCheckedInChildren(date),
    enabled: !!date,
    ...cacheConfig.volatile, // Checked-in status changes frequently
  });
}

// Child mutations
export function useAddChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, child, cycleId }: { 
      householdId: string;
      child: Omit<Child, 'child_id'>;
      cycleId: string;
    }) => addChild(householdId, child, cycleId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId, data }: { 
      childId: string;
      householdId: string;
      data: Partial<Child> 
    }) => updateChild(childId, data),
    onSuccess: (_, { childId, householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}

export function useSoftDeleteChild() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, householdId }: { 
      childId: string;
      householdId: string;
    }) => softDeleteChild(childId),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}
