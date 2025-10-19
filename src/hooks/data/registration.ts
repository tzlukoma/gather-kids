'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getRegistrationCycles,
  getRegistrationCycle,
  getRegistrationStats
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useRegistrationCycles(isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.registrationCycles(),
    queryFn: () => getRegistrationCycles(isActive),
    ...cacheConfig.reference, // Registration cycles change infrequently
  });
}

export function useRegistrationCycle(id: string) {
  return useQuery({
    queryKey: queryKeys.registrationCycle(id),
    queryFn: () => getRegistrationCycle(id),
    enabled: !!id,
    ...cacheConfig.reference,
  });
}

export function useRegistrationStats() {
  return useQuery({
    queryKey: queryKeys.registrationStats(),
    queryFn: () => getRegistrationStats(),
    ...cacheConfig.moderate, // Stats change moderately
  });
}
