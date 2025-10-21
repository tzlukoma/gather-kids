'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllHouseholds, 
  getHousehold, 
  getHouseholdProfile,
  getAllGuardians,
  getAllEmergencyContacts,
  updateHouseholdInfo,
  updateEmergencyContact,
  queryHouseholdList
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';
import type { Household, EmergencyContact } from '@/lib/types';

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

export function useHouseholdList(leaderMinistryIds?: string[], ministryId?: string) {
  return useQuery({
    queryKey: queryKeys.householdList(leaderMinistryIds, ministryId),
    queryFn: () => queryHouseholdList(leaderMinistryIds, ministryId),
    ...cacheConfig.moderate,
  });
}

// Household mutations
export function useUpdateHousehold() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, data }: { 
      householdId: string; 
      data: Partial<Household> 
    }) => updateHouseholdInfo(householdId, data),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.household(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.households() });
    },
  });
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ householdId, contact }: { 
      householdId: string; 
      contact: EmergencyContact 
    }) => updateEmergencyContact(householdId, contact),
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.householdProfile(householdId) });
      queryClient.invalidateQueries({ queryKey: ['emergencyContacts'] });
    },
  });
}
