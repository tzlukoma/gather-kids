'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getUnacknowledgedIncidents,
  getCheckedInCount,
  getRegistrationStats
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useUnacknowledgedIncidents() {
  return useQuery({
    queryKey: queryKeys.unacknowledgedIncidents(),
    queryFn: getUnacknowledgedIncidents,
    ...cacheConfig.volatile, // Incidents can change frequently
  });
}

export function useCheckedInCount(date: string) {
  return useQuery({
    queryKey: queryKeys.checkedInCount(date),
    queryFn: () => getCheckedInCount(date),
    enabled: !!date,
    ...cacheConfig.volatile, // Check-in status changes frequently
  });
}

export function useRegistrationStats() {
  return useQuery({
    queryKey: queryKeys.registrationStats(),
    queryFn: getRegistrationStats,
    ...cacheConfig.moderate, // Registration stats change occasionally
  });
}
