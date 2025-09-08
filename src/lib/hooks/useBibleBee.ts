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
        // Always prioritize scripture_order as the unified sort field
        const sortByOrder = (a: Scripture, b: Scripture) => {
            // Prioritize scripture_order, then fall back to sortOrder if needed
            // Explicitly ignore any 'order' field
            const aRec = a as unknown as Record<string, unknown>;
            const bRec = b as unknown as Record<string, unknown>;
            const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
            const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
            return aOrder - bOrder;
        };
        
        db.scriptures.where('competitionYearId').equals(yearId).toArray()
            .then(s => { 
                if (mounted) setScriptures(s.sort(sortByOrder)); 
            });
        return () => { mounted = false };
    }, [yearId]);
    
    return { 
        scriptures, 
        refresh: async () => { 
            const s = await db.scriptures.where('competitionYearId').equals(yearId).toArray();
            // Use the same sorting logic consistently
            setScriptures(s.sort((a: Scripture, b: Scripture) => {
                // Prioritize scripture_order, then fall back to sortOrder if needed
                // Explicitly ignore any 'order' field
                const aRec = a as unknown as Record<string, unknown>;
                const bRec = b as unknown as Record<string, unknown>;
                const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
                const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
                return aOrder - bOrder;
            }));
        } 
    };
}

// React Query version: returns query data and mutation with optimistic updates
export function useScripturesForYearQuery(yearId: string) {
    const qc = useQueryClient();
    const key = ['scriptures', yearId];
    const query = useQuery(key, async () => {
        // Get all scriptures for this year
        const s = await db.scriptures.where('competitionYearId').equals(yearId).toArray();
        
        // Sort by scripture_order as the unified sort field
        return s.sort((a: Scripture, b: Scripture) => {
            // Prioritize scripture_order, then fall back to sortOrder if needed
            // Explicitly ignore any 'order' field
            const aRec = a as unknown as Record<string, unknown>;
            const bRec = b as unknown as Record<string, unknown>;
            const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
            const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
            return aOrder - bOrder;
        });
    });

    const mutation = useMutation(async (payload: unknown) => upsertScripture(payload as unknown as Omit<Scripture, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }), {
        // optimistic update
    onMutate: async (newScripture: Partial<Scripture> & { id?: string }) => {
            await qc.cancelQueries(key);
            const previous = qc.getQueryData<Scripture[]>(key) || [];
            qc.setQueryData<Scripture[]>(key, (old: Scripture[] = []) => {
                // if existing id, replace; else append
                if (newScripture.id) {
                    return old.map((s) => (s.id === newScripture.id ? { ...s, ...(newScripture as Partial<Scripture>) } : s));
                }
                return [...old, newScripture as Scripture];
            });
            return { previous };
        },
        onError: (_err: unknown, _new: Partial<Scripture> | undefined, context: { previous?: Scripture[] } | undefined) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries(key);
        }
    });

    return { ...query, upsertScriptureMutation: mutation };
}

export async function createGradeRule(payload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'>) {
    // Ensure competitionYearId is present; fall back to the most recent year in the local DB.
    const safePayload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'> = { ...payload } as any;
    if (!safePayload.competitionYearId) {
        const years = await db.competitionYears.toArray();
        if (years && years.length > 0) {
            safePayload.competitionYearId = years[0].id as string;
        } else {
            // Fallback to empty string to satisfy type; server-side validation should handle missing year.
            safePayload.competitionYearId = '';
        }
    }
    return createRule(safePayload as unknown as Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'>);
}

// --- Student / Parent hooks
export function useStudentAssignmentsQuery(childId: string) {
    const key = ['studentAssignments', childId];
    return useQuery(key, async () => {
        // First, check if child is enrolled in any Bible Bee years but missing scriptures
        try {
            const enrollments = await db.enrollments.where({ child_id: childId }).toArray();
            
            for (const enrollment of enrollments) {
                // Check if child has scriptures for this year
                const existingScriptures = await db.studentScriptures
                    .where({ childId, competitionYearId: enrollment.year_id })
                    .toArray();
                
                if (existingScriptures.length === 0) {
                    // Child is enrolled but missing scriptures - assign them
                    try {
                        const { enrollChildInBibleBee } = await import('@/lib/bibleBee');
                        await enrollChildInBibleBee(childId, enrollment.year_id);
                        console.log(`Auto-assigned scriptures for child ${childId} in year ${enrollment.year_id}`);
                    } catch (error) {
                        console.warn(`Failed to auto-assign scriptures for child ${childId}:`, error);
                    }
                }
            }
        } catch (error) {
            console.warn('Error checking for missing scripture assignments:', error);
        }
        
        // Fetch student scriptures and essays and enrich with scripture data
    const scriptures = await db.studentScriptures.where({ childId }).toArray();
        const essays = await db.studentEssays.where({ childId }).toArray();

        // Fetch child's household preference for translation
        const child = await db.children.get(childId as any);
        const household = child ? await db.households.get(child.household_id) : null;
        const preferred = household?.preferredScriptureTranslation;

    const enrichedScriptures = await Promise.all(
            scriptures.map(async (s) => {
                const scripture = await db.scriptures.get(s.scriptureId);
                const year = await db.competitionYears.get(s.competitionYearId);
                // determine verse text based on household preference with fallbacks
                let verseText = scripture?.text ?? '';
                let displayTranslation = scripture?.translation ?? 'NIV';
                // Prefer flattened `texts` map (e.g. { NIV: '...', KJV: '...' }).
                const textsMapRaw = (scripture as unknown as Record<string, unknown>)?.texts ?? (scripture as unknown as Record<string, unknown>)?.alternateTexts ?? undefined;
                const textsMap = textsMapRaw as Record<string, string> | undefined;
                if (preferred && textsMap && Object.prototype.hasOwnProperty.call(textsMap, preferred)) {
                    verseText = textsMap[preferred] as string;
                    displayTranslation = preferred;
                }
                return { ...s, scripture, year, verseText, displayTranslation };
            })
        );

            // Sort scriptures by scripture_order for consistent display
        enrichedScriptures.sort((a, b) => {
            const aScript = a.scripture as Partial<Scripture> | undefined;
            const bScript = b.scripture as Partial<Scripture> | undefined;
            const aOrder = Number(aScript?.scripture_order ?? aScript?.sortOrder ?? 0);
            const bOrder = Number(bScript?.scripture_order ?? bScript?.sortOrder ?? 0);
            return aOrder - bOrder;
        });

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
