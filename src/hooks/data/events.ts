'use client';

import { useQuery } from '@tanstack/react-query';
import { getCheckInEvents } from '@/lib/dal';
import {
  eventNameLookup,
  FALLBACK_CHECK_IN_EVENTS,
  type CheckInEvent,
} from '@/lib/check-in-events';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

/**
 * The check-in events every event picker and the transfer dialog offer, read
 * from the `events` table (#561 review).
 *
 * `events` is the compiled-in list until the query resolves, and stays that
 * way if it fails, so the door never loses its picker. `isPersisted` says
 * whether the list came from the database, which is what a screen needs
 * before deciding that an event named in its URL does not exist.
 */
export function useCheckInEvents(): {
  events: CheckInEvent[];
  isPersisted: boolean;
  nameOf: (eventId: string | null | undefined) => string;
} {
  const { data, isSuccess } = useQuery({
    queryKey: queryKeys.checkInEvents(),
    queryFn: getCheckInEvents,
    ...cacheConfig.moderate,
  });
  const persisted = isSuccess && !!data && data.length > 0;
  const events = persisted ? data : FALLBACK_CHECK_IN_EVENTS;
  return { events, isPersisted: persisted, nameOf: eventNameLookup(events) };
}
