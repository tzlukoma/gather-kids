import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { db } from '@/lib/db';
import type { CompetitionYear, GradeRule, Scripture } from '@/lib/types';
import { createCompetitionYear, upsertScripture, createGradeRule as createRule, toggleScriptureCompletion, submitEssay } from '@/lib/bibleBee';

export function useCompetitionYears() {
    const [years, setYears] = useState<CompetitionYear[]>([]);
    useEffect(() => {
        let mounted = true;
        db.competitionYears.toArray().then(y => { if (mounted) setYears(y.sort((a, b) => b.year - a.year)); });
        return () => { mounted = false };
    }, []);
    return { years, refresh: async () => { const y = await db.competitionYears.toArray(); setYears(y); } };
}

export function useScripturesForYear(yearId: string) {
    const [scriptures, setScriptures] = useState<Scripture[]>([]);
    useEffect(() => {
        let mounted = true;
        db.scriptures.where('competitionYearId').equals(yearId).sortBy('sortOrder').then(s => { if (mounted) setScriptures(s); });
        return () => { mounted = false };
    }, [yearId]);
    return { scriptures, refresh: async () => { const s = await db.scriptures.where('competitionYearId').equals(yearId).sortBy('sortOrder'); setScriptures(s); } };
}

// React Query version: returns query data and mutation with optimistic updates
export function useScripturesForYearQuery(yearId: string) {
    const qc = useQueryClient();
    const key = ['scriptures', yearId];
    const query = useQuery(key, async () => {
        return await db.scriptures.where('competitionYearId').equals(yearId).sortBy('sortOrder');
    });

    const mutation = useMutation(async (payload: any) => upsertScripture(payload), {
        // optimistic update
        onMutate: async (newScripture: any) => {
            await qc.cancelQueries(key);
            const previous = qc.getQueryData<any[]>(key) || [];
            qc.setQueryData(key, (old: any[] = []) => {
                // if existing id, replace; else append
                if (newScripture.id) {
                    return old.map((s) => (s.id === newScripture.id ? { ...s, ...newScripture } : s));
                }
                return [...old, newScripture];
            });
            return { previous };
        },
        onError: (_err: any, _new: any, context: any) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries(key);
        }
    });

    return { ...query, upsertScriptureMutation: mutation };
}

export async function createGradeRule(payload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'>) {
    return createRule(payload as any);
}

// --- Student / Parent hooks
export function useStudentAssignmentsQuery(childId: string) {
    const key = ['studentAssignments', childId];
    return useQuery(key, async () => {
        // Fetch student scriptures and essays and enrich with scripture data
        const scriptures = await db.studentScriptures.where({ childId }).toArray();
        const essays = await db.studentEssays.where({ childId }).toArray();

        const enrichedScriptures = await Promise.all(
            scriptures.map(async (s) => {
                const scripture = await db.scriptures.get(s.scriptureId);
                const year = await db.competitionYears.get(s.competitionYearId);
                return { ...s, scripture, year };
            })
        );

        const enrichedEssays = await Promise.all(
            essays.map(async (e) => {
                const year = await db.competitionYears.get(e.competitionYearId);
                return { ...e, year };
            })
        );

        return { scriptures: enrichedScriptures, essays: enrichedEssays };
    });
}

export function useToggleScriptureMutation(childId: string) {
    const qc = useQueryClient();
    const key = ['studentAssignments', childId];
    return useMutation(async ({ id, complete }: { id: string; complete: boolean }) => toggleScriptureCompletion(id, complete), {
        onMutate: async ({ id, complete }: { id: string; complete: boolean }) => {
            await qc.cancelQueries(key);
            const previous = qc.getQueryData<any>(key);
            qc.setQueryData(key, (old: any) => {
                if (!old) return old;
                const newScriptures = old.scriptures.map((s: any) => s.id === id ? { ...s, status: complete ? 'completed' : 'assigned', completedAt: complete ? new Date().toISOString() : undefined } : s);
                return { ...old, scriptures: newScriptures };
            });
            return { previous };
        },
        onError: (_err: unknown, _vars: { id: string; complete: boolean } | undefined, context: any) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => qc.invalidateQueries(key),
    });
}

export function useSubmitEssayMutation(childId: string) {
    const qc = useQueryClient();
    const key = ['studentAssignments', childId];
    return useMutation(async ({ competitionYearId }: { competitionYearId: string }) => submitEssay(childId, competitionYearId), {
        onMutate: async ({ competitionYearId }: { competitionYearId: string }) => {
            await qc.cancelQueries(key);
            const previous = qc.getQueryData<any>(key);
            qc.setQueryData(key, (old: any) => {
                if (!old) return old;
                const newEssays = old.essays.map((e: any) => e.competitionYearId === competitionYearId ? { ...e, status: 'submitted', submittedAt: new Date().toISOString() } : e);
                return { ...old, essays: newEssays };
            });
            return { previous };
        },
        onError: (_err: unknown, _vars: { competitionYearId?: string } | undefined, context: any) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => qc.invalidateQueries(key),
    });
}
