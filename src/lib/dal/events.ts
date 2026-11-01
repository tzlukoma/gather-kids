/**
 * DAL — Events domain
 */

import { db as dbAdapter } from '../database/factory';
import { toCheckInEvents, type CheckInEvent } from '../check-in-events';

/** The persisted check-in events, in display order. */
export async function getCheckInEvents(): Promise<CheckInEvent[]> {
    return toCheckInEvents(await dbAdapter.listEvents());
}
