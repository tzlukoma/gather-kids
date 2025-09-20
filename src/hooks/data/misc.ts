'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllEmergencyContacts, getMinistries, getMinistryEnrollmentsByCycle } from '@/lib/dal';
import type { EmergencyContact, Ministry, MinistryEnrollment } from '@/lib/types';

// Query keys for miscellaneous data
export const miscKeys = {
    emergencyContacts: ['emergencyContacts'] as const,
    ministries: (activeOnly?: boolean) => 
        activeOnly ? (['ministries', 'active'] as const) : (['ministries'] as const),
    ministryEnrollments: (cycleId: string) => ['ministryEnrollments', cycleId] as const,
};

// Emergency contacts queries
export function useEmergencyContacts() {
    return useQuery({
        queryKey: miscKeys.emergencyContacts,
        queryFn: getAllEmergencyContacts,
        staleTime: 10 * 60 * 1000,
    });
}

// Ministry queries
export function useMinistries(activeOnly?: boolean) {
    return useQuery({
        queryKey: miscKeys.ministries(activeOnly),
        queryFn: () => getMinistries(activeOnly),
        staleTime: 10 * 60 * 1000, // 10 minutes - ministries don't change often
    });
}

// Ministry enrollment queries
export function useMinistryEnrollments(cycleId: string) {
    return useQuery({
        queryKey: miscKeys.ministryEnrollments(cycleId),
        queryFn: () => getMinistryEnrollmentsByCycle(cycleId),
        enabled: !!cycleId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}