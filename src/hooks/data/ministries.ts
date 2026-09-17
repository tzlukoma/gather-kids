'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMinistries,
  getMinistriesByGroupCode,
  getMinistriesInGroup,
  getMinistryEnrollmentsByCycle,
  getIncidentMinistryScope,
  getMinistryGroups,
  getMinistryGroup,
  getGroupsForMinistry,
  createMinistry,
  updateMinistry,
  deleteMinistry,
  createMinistryGroup,
  updateMinistryGroup,
  deleteMinistryGroup
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useMinistries(isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.ministries(),
    queryFn: () => getMinistries(isActive),
    ...cacheConfig.reference, // Ministries change infrequently
  });
}

export function useMinistriesByGroupCode(groupCode: string) {
  return useQuery({
    queryKey: queryKeys.ministriesByGroupCode(groupCode),
    queryFn: () => getMinistriesByGroupCode(groupCode),
    enabled: !!groupCode,
    ...cacheConfig.reference,
  });
}

export function useMinistriesInGroup(groupId: string) {
  return useQuery({
    queryKey: queryKeys.ministriesInGroup(groupId),
    queryFn: () => getMinistriesInGroup(groupId),
    enabled: !!groupId,
    ...cacheConfig.reference,
  });
}

export function useMinistryEnrollments(cycleId: string) {
  return useQuery({
    queryKey: queryKeys.ministryEnrollments(cycleId),
    queryFn: () => getMinistryEnrollmentsByCycle(cycleId),
    enabled: !!cycleId,
    ...cacheConfig.moderate, // Enrollments change moderately
  });
}

/**
 * Child -> ministry memberships for the incidents the signed-in user may see.
 *
 * Deliberately takes no child list. The server route derives the allowed
 * children from the session, so the browser cannot widen the query by asking
 * about other children. `placeholderData` holds the previous result while a
 * changed scope refetches, so a filter built on this never blinks through an
 * empty map and reports a spurious "no matches".
 */
export function useIncidentMinistryScope(cycleId?: string) {
  return useQuery({
    queryKey: queryKeys.incidentMinistryScope(cycleId),
    queryFn: () => getIncidentMinistryScope(cycleId),
    placeholderData: (previous) => previous,
    ...cacheConfig.moderate,
  });
}

export function useMinistryGroups() {
  return useQuery({
    queryKey: queryKeys.ministryGroups(),
    queryFn: () => getMinistryGroups(),
    ...cacheConfig.reference, // Groups change infrequently
  });
}

export function useMinistryGroup(id: string) {
  return useQuery({
    queryKey: queryKeys.ministryGroup(id),
    queryFn: () => getMinistryGroup(id),
    enabled: !!id,
    ...cacheConfig.reference,
  });
}

export function useGroupsForMinistry(ministryId: string) {
  return useQuery({
    queryKey: queryKeys.groupsForMinistry(ministryId),
    queryFn: () => getGroupsForMinistry(ministryId),
    enabled: !!ministryId,
    ...cacheConfig.reference,
  });
}

// Mutation hooks
export function useCreateMinistry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMinistry,
    onSuccess: () => {
      // Invalidate all ministry-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ministries'] });
      queryClient.invalidateQueries({ queryKey: ['ministryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ministriesInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['groupsForMinistry'] });
    },
  });
}

export function useUpdateMinistry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMinistry(id, data),
    onSuccess: () => {
      // Invalidate all ministry-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ministries'] });
      queryClient.invalidateQueries({ queryKey: ['ministryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ministriesInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['groupsForMinistry'] });
    },
  });
}

export function useDeleteMinistry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMinistry,
    onSuccess: () => {
      // Invalidate all ministry-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ministries'] });
      queryClient.invalidateQueries({ queryKey: ['ministryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ministriesInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['groupsForMinistry'] });
    },
  });
}

export function useCreateMinistryGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMinistryGroup,
    onSuccess: () => {
      // Invalidate all ministry group-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ministries'] });
      queryClient.invalidateQueries({ queryKey: ['ministryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ministriesInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['groupsForMinistry'] });
    },
  });
}

export function useUpdateMinistryGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMinistryGroup(id, data),
    onSuccess: () => {
      // Invalidate all ministry group-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ministries'] });
      queryClient.invalidateQueries({ queryKey: ['ministryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ministriesInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['groupsForMinistry'] });
    },
  });
}

export function useDeleteMinistryGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMinistryGroup,
    onSuccess: () => {
      // Invalidate all ministry group-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ministries'] });
      queryClient.invalidateQueries({ queryKey: ['ministryGroups'] });
      queryClient.invalidateQueries({ queryKey: ['ministriesInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['groupsForMinistry'] });
    },
  });
}
