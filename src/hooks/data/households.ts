'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllGuardians, getAllHouseholds, getHousehold, getHouseholdProfile, queryHouseholdList } from '@/lib/dal';
import type { Guardian, Household } from '@/lib/types';

// Query keys for households
export const householdKeys = {
    guardians: ['guardians'] as const,
    households: ['households'] as const,
    detail: (id: string) => ['household', id] as const,
    profile: (id: string) => ['householdProfile', id] as const,
    list: (leaderMinistryIds?: string[], ministryId?: string) => {
        const parts: string[] = ['householdList'];
        if (leaderMinistryIds) parts.push('leaderMinistryIds', ...leaderMinistryIds);
        if (ministryId) parts.push('ministryId', ministryId);
        return parts;
    },
};

// Guardian queries
export function useGuardians() {
    return useQuery({
        queryKey: householdKeys.guardians,
        queryFn: getAllGuardians,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Household queries
export function useHouseholds() {
    return useQuery({
        queryKey: householdKeys.households,
        queryFn: getAllHouseholds,
        staleTime: 10 * 60 * 1000,
    });
}

export function useHousehold(householdId: string) {
    return useQuery({
        queryKey: householdKeys.detail(householdId),
        queryFn: () => getHousehold(householdId),
        enabled: !!householdId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useHouseholdProfile(householdId: string) {
    return useQuery({
        queryKey: householdKeys.profile(householdId),
        queryFn: () => getHouseholdProfile(householdId),
        enabled: !!householdId,
        staleTime: 5 * 60 * 1000,
    });
}

// Household list query (for registrations page)
export function useHouseholdList(leaderMinistryIds?: string[], ministryId?: string) {
    return useQuery({
        queryKey: householdKeys.list(leaderMinistryIds, ministryId),
        queryFn: () => queryHouseholdList(leaderMinistryIds, ministryId),
        staleTime: 5 * 60 * 1000,
    });
}