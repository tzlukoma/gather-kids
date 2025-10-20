'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllChildren, getChild, getCheckedInChildren, updateChildPhoto } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

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

export function useUpdateChildPhotoMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, photoDataUrl }: { childId: string; photoDataUrl: string }) => 
      updateChildPhoto(childId, photoDataUrl),
    onSuccess: (_, { childId }) => {
      // Invalidate all queries that might contain child data
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
      queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.households() });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians() });
      
      // Invalidate household profile queries (they contain child data)
      queryClient.invalidateQueries({ queryKey: ['householdProfile'], exact: false });
      
      // Invalidate attendance queries (they might reference child photos)
      queryClient.invalidateQueries({ queryKey: ['attendance'], exact: false });
    },
  });
}
