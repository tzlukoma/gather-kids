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

/**
 * Human-readable label for a registration cycle.
 *
 * `cycle_id` is a key, not a label — "2026" locally but a UUID in UAT and
 * production — so it must never reach a guardian-facing screen. Prefer the
 * cycle's own name (`name` is NOT NULL in the schema) and fall back to the
 * caller's wording, never to the id.
 */
export function registrationCycleLabel(
  cycle: Pick<RegistrationCycle, 'name'> | null | undefined,
  fallback: string,
): string {
  return cycle?.name?.trim() || fallback;
}

/**
 * The one neutral label every guardian-facing screen falls back to when no
 * cycle is configured.
 *
 * Entry, wizard and Done each used to pass their own wording — "this year" in
 * one place, "current" in another — so the three screens disagreed on exactly
 * the path nobody exercises. Deriving it here makes them agree by construction.
 *
 * It is a bare noun phrase on purpose, so it drops into the same slots a real
 * cycle name does: "Register for Fall 2026" / "Register for this year". Copy
 * that wants a modifier ("the ___ cycle", "___ programs") must be reworded to
 * take a standalone label rather than given a second fallback.
 */
export const REGISTRATION_CYCLE_FALLBACK_LABEL = 'this year';

/** Guardian-facing cycle label, with the shared neutral fallback applied. */
export function registrationCycleDisplayLabel(
  cycle: Pick<RegistrationCycle, 'name'> | null | undefined,
): string {
  return registrationCycleLabel(cycle, REGISTRATION_CYCLE_FALLBACK_LABEL);
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
