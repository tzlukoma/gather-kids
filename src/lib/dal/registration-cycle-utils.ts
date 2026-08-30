import type { RegistrationCycle } from '../types';

/** Pick the active cycle with the most recent updated_at (ties arbitrary). */
export function pickActiveRegistrationCycle(
  cycles: RegistrationCycle[],
): RegistrationCycle | null {
  const activeCycles = cycles.filter(cycle => cycle.is_active);
  if (activeCycles.length === 0) return null;

  return activeCycles.sort(
    (a, b) =>
      new Date(String((b as RegistrationCycle & { updated_at?: string }).updated_at ?? 0)).getTime() -
      new Date(String((a as RegistrationCycle & { updated_at?: string }).updated_at ?? 0)).getTime(),
  )[0];
}

/** Prior cycle = latest cycle with start_date strictly before current.start_date. */
export function pickPriorRegistrationCycle(
  cycles: RegistrationCycle[],
  currentCycleId: string,
): RegistrationCycle | null {
  const current = cycles.find(c => c.cycle_id === currentCycleId);
  if (!current?.start_date) return null;

  const currentStart = new Date(current.start_date).getTime();
  const priorCandidates = cycles
    .filter(c => c.cycle_id !== currentCycleId && c.start_date)
    .filter(c => new Date(String(c.start_date)).getTime() < currentStart)
    .sort(
      (a, b) =>
        new Date(String(b.start_date)).getTime() -
        new Date(String(a.start_date)).getTime(),
    );

  return priorCandidates[0] ?? null;
}

/** Newest registration cycles first (by start_date). */
export function sortCycleIdsByStartDate(
  cycleIds: string[],
  cycleStartDates: Record<string, string>,
): string[] {
  return [...cycleIds].sort((a, b) => {
    const aTime = cycleStartDates[a]
      ? new Date(cycleStartDates[a]).getTime()
      : 0;
    const bTime = cycleStartDates[b]
      ? new Date(cycleStartDates[b]).getTime()
      : 0;
    return bTime - aTime;
  });
}

/** Cycle to expand on household profile — prefer active cycle when enrolled. */
export function pickExpandedCycleId(
  cycleIds: string[],
  cycleStartDates: Record<string, string>,
  activeCycleId?: string | null,
): string | undefined {
  if (activeCycleId && cycleIds.includes(activeCycleId)) {
    return activeCycleId;
  }
  return sortCycleIdsByStartDate(cycleIds, cycleStartDates)[0];
}
