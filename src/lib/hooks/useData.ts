import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
    getAllChildren, 
    getHouseholdProfile, 
    getAllGuardians, 
    getAllHouseholds, 
    getAllEmergencyContacts,
    getAttendanceForDate,
    getIncidentsForDate,
    getChild,
    getHousehold,
    updateChildPhoto,
    recordCheckIn,
    recordCheckOut,
    queryHouseholdList
} from '@/lib/dal';
import type { Child, Guardian, Household, EmergencyContact, Attendance, Incident } from '@/lib/types';

// Query keys
export const queryKeys = {
    children: ['children'] as const,
    child: (id: string) => ['child', id] as const,
    household: (id: string) => ['household', id] as const,
    householdProfile: (id: string) => ['householdProfile', id] as const,
    guardians: ['guardians'] as const,
    households: ['households'] as const,
    householdList: (leaderMinistryIds?: string[], ministryId?: string) => {
        const parts: string[] = ['householdList'];
        if (leaderMinistryIds) parts.push('leaderMinistryIds', ...leaderMinistryIds);
        if (ministryId) parts.push('ministryId', ministryId);
        return parts;
    },
    emergencyContacts: ['emergencyContacts'] as const,
    attendance: (date: string) => ['attendance', date] as const,
    incidents: (date: string) => ['incidents', date] as const,
};

// Children queries
export function useChildren() {
    return useQuery({
        queryKey: queryKeys.children,
        queryFn: getAllChildren,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useChild(childId: string) {
    return useQuery({
        queryKey: queryKeys.child(childId),
        queryFn: () => getChild(childId),
        enabled: !!childId,
        staleTime: 5 * 60 * 1000,
    });
}

// Household queries
export function useHousehold(householdId: string) {
    return useQuery({
        queryKey: queryKeys.household(householdId),
        queryFn: () => getHousehold(householdId),
        enabled: !!householdId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useHouseholdProfile(householdId: string) {
    return useQuery({
        queryKey: queryKeys.householdProfile(householdId),
        queryFn: () => getHouseholdProfile(householdId),
        enabled: !!householdId,
        staleTime: 5 * 60 * 1000,
    });
}

// Guardian queries
export function useGuardians() {
    return useQuery({
        queryKey: queryKeys.guardians,
        queryFn: getAllGuardians,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Household queries
export function useHouseholds() {
    return useQuery({
        queryKey: queryKeys.households,
        queryFn: getAllHouseholds,
        staleTime: 10 * 60 * 1000,
    });
}

// Household list query (for registrations page)
export function useHouseholdList(leaderMinistryIds?: string[], ministryId?: string) {
    return useQuery({
        queryKey: queryKeys.householdList(leaderMinistryIds, ministryId),
        queryFn: () => queryHouseholdList(leaderMinistryIds, ministryId),
        staleTime: 5 * 60 * 1000,
    });
}

// Emergency contacts queries
export function useEmergencyContacts() {
    return useQuery({
        queryKey: queryKeys.emergencyContacts,
        queryFn: getAllEmergencyContacts,
        staleTime: 10 * 60 * 1000,
    });
}

// Attendance queries
export function useAttendance(date: string) {
    return useQuery({
        queryKey: queryKeys.attendance(date),
        queryFn: () => getAttendanceForDate(date),
        enabled: !!date,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

// Incidents queries
export function useIncidents(date: string) {
    return useQuery({
        queryKey: queryKeys.incidents(date),
        queryFn: () => getIncidentsForDate(date),
        enabled: !!date,
        staleTime: 1 * 60 * 1000,
    });
}

// Photo update mutation
export function useUpdateChildPhotoMutation() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ childId, photoDataUrl }: { childId: string; photoDataUrl: string }) => 
            updateChildPhoto(childId, photoDataUrl),
        onSuccess: (_, { childId }) => {
            // Invalidate all queries that might contain child data
            queryClient.invalidateQueries({ queryKey: queryKeys.children });
            queryClient.invalidateQueries({ queryKey: queryKeys.child(childId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.households });
            queryClient.invalidateQueries({ queryKey: queryKeys.guardians });
            
            // Invalidate household profile queries (they contain child data)
            queryClient.invalidateQueries({ queryKey: ['householdProfile'] });
            
            // Invalidate attendance queries (they might reference child photos)
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
    });
}

// Check-in mutation
export function useCheckInMutation() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ childId, eventId, notes, userId }: { 
            childId: string; 
            eventId: string; 
            notes?: string; 
            userId?: string;
        }) => recordCheckIn(childId, eventId, notes, userId),
        onSuccess: (_, { eventId }) => {
            // Invalidate attendance queries for today
            const today = new Date().toISOString().split('T')[0];
            queryClient.invalidateQueries({ queryKey: ['attendance', today] });
            
            // Also invalidate children queries in case attendance affects child display
            queryClient.invalidateQueries({ queryKey: queryKeys.children });
        },
    });
}

// Check-out mutation
export function useCheckOutMutation() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ attendanceId, verifier, userId }: { 
            attendanceId: string; 
            verifier: { method: 'PIN' | 'other'; value: string }; 
            userId?: string;
        }) => recordCheckOut(attendanceId, verifier, userId),
        onSuccess: () => {
            // Invalidate attendance queries for today
            const today = new Date().toISOString().split('T')[0];
            queryClient.invalidateQueries({ queryKey: ['attendance', today] });
            
            // Also invalidate children queries in case attendance affects child display
            queryClient.invalidateQueries({ queryKey: queryKeys.children });
        },
    });
}
