'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getAllHouseholds, 
  getHousehold, 
  getHouseholdProfile,
  getAllGuardians,
  getAllEmergencyContacts 
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useHouseholds() {
  return useQuery({
    queryKey: queryKeys.households(),
    queryFn: getAllHouseholds,
    ...cacheConfig.moderate,
  });
}

export function useHousehold(householdId: string) {
  return useQuery({
    queryKey: queryKeys.household(householdId),
    queryFn: () => getHousehold(householdId),
    enabled: !!householdId,
    ...cacheConfig.moderate,
  });
}

export function useHouseholdProfile(householdId: string) {
  return useQuery({
    queryKey: queryKeys.householdProfile(householdId),
    queryFn: () => getHouseholdProfile(householdId),
    enabled: !!householdId,
    ...cacheConfig.moderate,
  });
}

export function useGuardians() {
  return useQuery({
    queryKey: queryKeys.guardians(),
    queryFn: getAllGuardians,
    ...cacheConfig.moderate,
  });
}

export function useEmergencyContacts() {
  return useQuery({
    queryKey: ['emergencyContacts'],
    queryFn: getAllEmergencyContacts,
    ...cacheConfig.moderate,
  });
}
