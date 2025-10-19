'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getMinistries,
  getMinistriesByGroupCode,
  getMinistriesInGroup,
  getMinistryEnrollmentsByCycle,
  getMinistryGroups,
  getMinistryGroup,
  getGroupsForMinistry
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
