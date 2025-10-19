'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getAttendanceForDate, 
  getIncidentsForDate
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
