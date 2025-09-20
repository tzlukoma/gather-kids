import { useQuery } from '@tanstack/react-query';
import { getAttendanceForDate, getIncidentsForDate } from '@/lib/dal';
import type { Attendance, Incident } from '@/lib/types';

// Query keys for attendance and incidents
export const attendanceKeys = {
    attendance: (date: string, eventId?: string) =>
        eventId ? (['attendance', date, eventId] as const) : (['attendance', date] as const),
    incidents: (date: string) => ['incidents', date] as const,
};

// Attendance queries
export function useAttendance(date: string) {
    return useQuery({
        queryKey: attendanceKeys.attendance(date),
        queryFn: () => getAttendanceForDate(date),
        enabled: !!date,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

// Event-scoped attendance queries
export function useAttendanceForEvent({ date, eventId }: { date: string; eventId?: string }) {
    return useQuery({
        queryKey: attendanceKeys.attendance(date, eventId),
        queryFn: () => getAttendanceForDate(date),
        enabled: !!date,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

// Incidents queries
export function useIncidents(date: string) {
    return useQuery({
        queryKey: attendanceKeys.incidents(date),
        queryFn: () => getIncidentsForDate(date),
        enabled: !!date,
        staleTime: 1 * 60 * 1000,
    });
}