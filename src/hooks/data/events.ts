'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCheckInEvent,
  deleteCheckInEvent,
  getCheckInEvents,
  getEventUsage,
  renameCheckInEvent,
  setCheckInEventArchived,
} from '@/lib/dal';
import {
  activeCheckInEvents,
  eventNameLookup,
  FALLBACK_CHECK_IN_EVENTS,
  type CheckInEvent,
} from '@/lib/check-in-events';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

/**
 * The check-in events, read from the `events` table (#561 review, #565).
 *
 * - `events`: active events only — what check-in and transfer destinations
 *   offer.
 * - `allEvents`: archived ones too — for door pickers that must stay reachable
 *   while children are still in an archived event (`doorEventOptions`), and
 *   for the admin Events screen.
 * - `nameOf`: names over `allEvents`, so history reads correctly after an
 *   event is archived or renamed.
 *
 * Until the query resolves, and if it fails, the compiled-in list stands in so
 * the door never loses its picker. `isPersisted` says whether the list came
 * from the database, which is what a screen needs before deciding that an
 * event named in its URL does not exist.
 */
export function useCheckInEvents(): {
  events: CheckInEvent[];
  allEvents: CheckInEvent[];
  isPersisted: boolean;
  nameOf: (eventId: string | null | undefined) => string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
} {
  const { data, isSuccess, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.checkInEvents(),
    queryFn: getCheckInEvents,
    ...cacheConfig.moderate,
  });
  const persisted = isSuccess && !!data && data.length > 0;
  const allEvents = persisted ? data : FALLBACK_CHECK_IN_EVENTS;
  return {
    events: activeCheckInEvents(allEvents),
    allEvents,
    isPersisted: persisted,
    nameOf: eventNameLookup(allEvents),
    isLoading,
    isError,
    refetch,
  };
}

/** Attendance history and today's on-site count per event (admin Events screen). */
export function useEventUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.eventUsage(),
    queryFn: getEventUsage,
    enabled,
    ...cacheConfig.volatile,
  });
}

/**
 * Every event mutation refreshes the event list (every picker and name on
 * every screen reads it) and the usage counts, on failure as well as success:
 * a refusal usually means the screen was out of date.
 */
function useEventMutation<TArgs, TResult>(run: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkInEvents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventUsage() });
    },
  });
}

export function useCreateCheckInEvent() {
  return useEventMutation(
    ({ name, existing }: { name: string; existing: ReadonlyArray<CheckInEvent> }) =>
      createCheckInEvent(name, existing),
  );
}

export function useRenameCheckInEvent() {
  return useEventMutation(
    ({ eventId, name, existing }: { eventId: string; name: string; existing: ReadonlyArray<CheckInEvent> }) =>
      renameCheckInEvent(eventId, name, existing),
  );
}

export function useSetCheckInEventArchived() {
  return useEventMutation(
    ({ eventId, archived }: { eventId: string; archived: boolean }) =>
      setCheckInEventArchived(eventId, archived),
  );
}

export function useDeleteCheckInEvent() {
  return useEventMutation(({ eventId }: { eventId: string }) => deleteCheckInEvent(eventId));
}
