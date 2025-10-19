'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getAttendanceForDate, 
  getIncidentsForDate,
  getAllIncidents 
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useAttendance(date: string, eventId?: string) {
  return useQuery({
    queryKey: queryKeys.attendance(date, eventId),
    queryFn: () => getAttendanceForDate(date, eventId),
    enabled: !!date,
    ...cacheConfig.volatile, // Attendance changes frequently
  });
}

export function useIncidents(date: string, eventId?: string) {
  return useQuery({
    queryKey: queryKeys.incidents(date, eventId),
    queryFn: () => getIncidentsForDate(date, eventId),
    enabled: !!date,
    ...cacheConfig.volatile, // Incidents change frequently
  });
}

export function useAllIncidents() {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: getAllIncidents,
    ...cacheConfig.moderate,
  });
}
