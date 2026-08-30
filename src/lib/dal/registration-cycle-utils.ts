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
