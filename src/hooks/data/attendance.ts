'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAttendanceForDate, 
  getIncidentsForDate,
  getIncidentsForUser,
  acknowledgeIncident,
  recordCheckIn,
  recordCheckOut,
  getTodayIsoDate
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useAttendance(date: string, eventId?: string) {
  return useQuery({
    queryKey: queryKeys.attendance(date, eventId),
    queryFn: () => getAttendanceForDate(date),
    enabled: !!date,
    ...cacheConfig.volatile, // Attendance changes frequently
  });
}

export function useIncidents(date: string, eventId?: string) {
  return useQuery({
    queryKey: queryKeys.incidents(date, eventId),
    queryFn: () => getIncidentsForDate(date),
    enabled: !!date,
    ...cacheConfig.volatile, // Incidents change frequently
  });
}

export function useIncidentsForUser(user: unknown) {
  return useQuery({
    queryKey: ['incidents', 'user', user],
    queryFn: () => getIncidentsForUser(user),
    enabled: !!user,
    ...cacheConfig.volatile, // Incidents change frequently
  });
}

export function useAcknowledgeIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: acknowledgeIncident,
    onSuccess: () => {
      // Invalidate all incidents queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useCheckInMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ childId, eventId, timeslotId, userId }: { 
      childId: string; 
      eventId: string; 
      timeslotId?: string;
      userId?: string;
    }) => recordCheckIn(childId, eventId, timeslotId, userId),
    onSuccess: (_, { eventId }) => {
      const today = getTodayIsoDate();
      // Invalidate attendance queries
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today) });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today, eventId) });
      // Invalidate checked-in children
      queryClient.invalidateQueries({ queryKey: queryKeys.checkedInChildren(today) });
      // Invalidate checked-in count
      queryClient.invalidateQueries({ queryKey: queryKeys.checkedInCount(today) });
      // Invalidate children list
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}

export function useCheckOutMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ attendanceId, verifier, userId }: { 
      attendanceId: string; 
      verifier: { method: 'PIN' | 'other'; value: string; pickedUpBy?: string }; 
      userId?: string;
    }) => recordCheckOut(attendanceId, verifier, userId),
    onSuccess: () => {
      const today = getTodayIsoDate();
      // Invalidate attendance queries
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance(today) });
      // Invalidate checked-in children
      queryClient.invalidateQueries({ queryKey: queryKeys.checkedInChildren(today) });
      // Invalidate checked-in count
      queryClient.invalidateQueries({ queryKey: queryKeys.checkedInCount(today) });
      // Invalidate children list
      queryClient.invalidateQueries({ queryKey: queryKeys.children() });
    },
  });
}
