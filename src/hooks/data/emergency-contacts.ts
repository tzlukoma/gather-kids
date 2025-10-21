'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllEmergencyContacts } from '@/lib/dal';
import { cacheConfig } from './config';

export function useEmergencyContacts() {
  return useQuery({
    queryKey: ['emergencyContacts'],
    queryFn: getAllEmergencyContacts,
    ...cacheConfig.moderate,
  });
}
