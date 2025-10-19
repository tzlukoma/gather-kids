'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAttendanceForDate, 
  getIncidentsForDate,
  getIncidentsForUser,
  acknowledgeIncident
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
