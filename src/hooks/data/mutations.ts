import { useQueryClient, useMutation } from '@tanstack/react-query';
import { updateChildPhoto, recordCheckIn, recordCheckOut } from '@/lib/dal';
import { childrenKeys } from './children';
import { householdKeys } from './households';
import { attendanceKeys } from './attendance';

// Photo update mutation
export function useUpdateChildPhotoMutation() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ childId, photoDataUrl }: { childId: string; photoDataUrl: string }) => 
            updateChildPhoto(childId, photoDataUrl),
        onSuccess: (_, { childId }) => {
            // Invalidate all queries that might contain child data
            queryClient.invalidateQueries({ queryKey: childrenKeys.all });
            queryClient.invalidateQueries({ queryKey: childrenKeys.detail(childId) });
            queryClient.invalidateQueries({ queryKey: householdKeys.households });
            queryClient.invalidateQueries({ queryKey: householdKeys.guardians });
            
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
            const today = new Date().toISOString().split('T')[0];
            
            // Invalidate event-scoped attendance first (most specific)
            if (eventId) {
                queryClient.invalidateQueries({ queryKey: ['attendance', today, eventId] });
            }
            
            // Fallback: invalidate date-scoped attendance
            queryClient.invalidateQueries({ queryKey: ['attendance', today] });
            
            // Also invalidate children queries in case attendance affects child display
            queryClient.invalidateQueries({ queryKey: childrenKeys.all });
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
            const today = new Date().toISOString().split('T')[0];
            
            // For check-out, we don't have the eventId directly, so invalidate both
            // TODO: In the future, we could enhance this by getting eventId from the attendanceId
            
            // Invalidate date-scoped attendance (broader scope since we don't have eventId)
            queryClient.invalidateQueries({ queryKey: ['attendance', today] });
            
            // Also invalidate children queries in case attendance affects child display
            queryClient.invalidateQueries({ queryKey: childrenKeys.all });
        },
    });
}