import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { dbAdapter } from '@/lib/db-utils';
import type { CompetitionYear, GradeRule, Scripture } from '@/lib/types';
import { createCompetitionYear, upsertScripture, createGradeRule as createRule, toggleScriptureCompletion, submitEssay } from '@/lib/bibleBee';
import { getBibleBeeCycles, getScripturesForBibleBeeCycle, getChild, getHousehold, updateChildPhoto } from '@/lib/dal';
import { v4 as uuidv4 } from 'uuid';

export function useCompetitionYears() {
    const [years, setYears] = useState<CompetitionYear[]>([]);
    useEffect(() => {
        let mounted = true;
        const loadYears = async () => {
            try {
                const bibleBeeCycles = await getBibleBeeCycles();
                    // Convert BibleBeeCycle to CompetitionYear format for compatibility
                    const convertedYears = bibleBeeCycles.map(cycle => ({
                        id: cycle.id,
                        year: parseInt(cycle.name?.split(' ').pop() || '2025'),
                        createdAt: cycle.created_at,
                        updatedAt: cycle.updated_at || cycle.created_at,
                    }));
                    if (mounted) setYears(convertedYears.sort((a, b) => b.year - a.year));
            } catch (error) {
                console.error('Error loading competition years:', error);
                if (mounted) setYears([]);
            }
        };
        loadYears();
        return () => { mounted = false };
    }, []);
    return { 
        years, 
        refresh: async () => { 
            try {
                const bibleBeeCycles = await getBibleBeeCycles();
                    const convertedYears = bibleBeeCycles.map(cycle => ({
                        id: cycle.id,
                        year: parseInt(cycle.name?.split(' ').pop() || '2025'),
                        createdAt: cycle.created_at,
                        updatedAt: cycle.updated_at || cycle.created_at,
                    }));
                    setYears(convertedYears);
            } catch (error) {
                console.error('Error refreshing competition years:', error);
                setYears([]);
            }
        } 
    };
}

export function useScripturesForYear(yearId: string) {
    const [scriptures, setScriptures] = useState<Scripture[]>([]);
    useEffect(() => {
        let mounted = true;
        const loadScriptures = async () => {
            try {
                const s = await getScripturesForBibleBeeCycle(yearId);
                    if (mounted) {
                        // Sort by scripture_order, then fall back to sortOrder
                        const sorted = s.sort((a: Scripture, b: Scripture) => {
                            const aRec = a as unknown as Record<string, unknown>;
                            const bRec = b as unknown as Record<string, unknown>;
                            const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
                            const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
                            return aOrder - bOrder;
                        });
                        setScriptures(sorted);
                    }
            } catch (error) {
                console.error('Error loading scriptures:', error);
                if (mounted) setScriptures([]);
            }
        };
        loadScriptures();
        return () => { mounted = false };
    }, [yearId]);
    
    return { 
        scriptures, 
        refresh: async () => { 
            try {
                const s = await getScripturesForBibleBeeCycle(yearId);
                    const sorted = s.sort((a: Scripture, b: Scripture) => {
                        const aRec = a as unknown as Record<string, unknown>;
                        const bRec = b as unknown as Record<string, unknown>;
                        const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
                        const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
                        return aOrder - bOrder;
                    });
                    setScriptures(sorted);
            } catch (error) {
                console.error('Error refreshing scriptures:', error);
                setScriptures([]);
            }
        } 
    };
}

// React Query version: returns query data and mutation with optimistic updates
export function useScripturesForYearQuery(yearId: string) {
    const qc = useQueryClient();
    const key = ['scriptures', yearId];
    const query = useQuery({
        queryKey: key,
        queryFn: async () => {
        // Get all scriptures for this year via Supabase adapter
        const s = await getScripturesForBibleBeeCycle(yearId);

        // Sort by scripture_order as the unified sort field
        return s.sort((a: Scripture, b: Scripture) => {
            // Prioritize scripture_order, then fall back to sortOrder if needed
            const aRec = a as unknown as Record<string, unknown>;
            const bRec = b as unknown as Record<string, unknown>;
            const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
            const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
            return aOrder - bOrder;
        });
        },
    });

    const mutation = useMutation({
        mutationFn: async (payload: Partial<Scripture> & { id?: string }) => upsertScripture(payload as unknown as Omit<Scripture, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }),
        // optimistic update
        onMutate: async (newScripture: Partial<Scripture> & { id?: string }) => {
            await qc.cancelQueries({ queryKey: key });
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
        onError: (_err: unknown, _new: Partial<Scripture> & { id?: string }, context: { previous?: Scripture[] } | undefined) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: key });
        }
    });

    return { ...query, upsertScriptureMutation: mutation };
}

export async function createGradeRule(payload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'>) {
    // Ensure competitionYearId is present; fall back to the most recent cycle from Supabase.
    const safePayload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'> = { ...payload } as any;
    if (!safePayload.competitionYearId) {
        const cycles = await getBibleBeeCycles();
        if (cycles && cycles.length > 0) {
            safePayload.competitionYearId = cycles[0].id as string;
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
    return useQuery({
        queryKey: key,
        queryFn: async () => {
        try {
            console.log('🚀 Starting useStudentAssignmentsQuery for child:', childId);
            
            // Get enrollments for this child
                console.log('🔍 Fetching enrollments for child:', childId);
                const enrollments = await dbAdapter.listEnrollments(childId);
                console.log('Child enrollments:', enrollments);
                
                if (enrollments.length === 0) {
                    console.log('❌ No enrollments found for child:', childId);
                    return { scriptures: [], essays: [] };
                }
                
                // Get scriptures for the child's Bible Bee cycles
                const bibleBeeCycleIds = [...new Set(enrollments.map(e => e.bible_bee_cycle_id))];
                console.log('Bible Bee cycle IDs for child:', bibleBeeCycleIds);
                
                console.log('🔍 Fetching scriptures for cycles...');
                const allScriptures = await Promise.all(
                    bibleBeeCycleIds.map(async cycleId => {
                        console.log(`🔍 Fetching scriptures for cycle: ${cycleId}`);
                        const scriptures = await dbAdapter.listScriptures({ yearId: cycleId });
                        console.log(`📖 Found ${scriptures.length} scriptures for cycle ${cycleId}:`, scriptures);
                        return scriptures;
                    })
                );
                const rawScriptures = allScriptures.flat();
                console.log('📚 Total raw scriptures for child:', rawScriptures.length, rawScriptures);
                
                // Create student scripture assignments for enrolled children
                // This creates actual student scripture records in the database
                console.log('🔍 Creating student scripture assignments...');
                const scriptures = await Promise.all(rawScriptures.map(async scripture => {
                    console.log('Processing scripture:', {
                        id: scripture.id,
                        reference: scripture.reference,
                        text: scripture.text,
                        translation: scripture.translation,
                        scripture_number: scripture.scripture_number,
                        scripture_order: scripture.scripture_order,
                        counts_for: scripture.counts_for,
                        texts: scripture.texts
                    });
                    
                    try {
                        // Check if student scripture record already exists
                        const existingStudentScriptures = await dbAdapter.listStudentScriptures(childId, scripture.bible_bee_cycle_id);
                        const existingRecord = existingStudentScriptures.find(ss => ss.scripture_id === scripture.id);
                        
                        if (existingRecord) {
                            // Return existing record with enriched data
                            // console.log('Found existing student scripture record:', existingRecord);
                            return {
                                id: existingRecord.id,
                                childId: childId,
                                scriptureId: scripture.id,
                                bible_bee_cycle_id: scripture.bible_bee_cycle_id,
                                status: existingRecord.is_completed ? 'completed' : 'not_started',
                                scripture: scripture,
                                counts_for: scripture.counts_for || 1, // Copy counts_for to top level for easier access
                                verseText: scripture.text,
                                displayTranslation: scripture.translation || 'NIV',
                                completedAt: existingRecord.completed_at,
                                createdAt: existingRecord.created_at,
                                updatedAt: existingRecord.updated_at,
                            };
                        } else {
                            // Create new student scripture record
                            console.log('Creating new student scripture record for:', scripture.id);
                            console.log('Using bible_bee_cycle_id:', scripture.bible_bee_cycle_id);
                            const studentScriptureData = {
                                id: uuidv4(),
                                child_id: childId,
                                bible_bee_cycle_id: scripture.bible_bee_cycle_id,
                                scripture_id: scripture.id,
                                is_completed: false,
                                completed_at: undefined,
                            };

                            const newStudentScripture = await dbAdapter.createStudentScripture(studentScriptureData);
                            console.log('Created student scripture record:', newStudentScripture);
                            
                            // Extract verse text from texts field if available
                            let verseText = scripture.text || '';
                            if (scripture.texts && typeof scripture.texts === 'object') {
                                verseText = scripture.texts.NIV || scripture.texts.KJV || Object.values(scripture.texts)[0] || verseText;
                            }
                            
                            return {
                                id: newStudentScripture.id,
                                childId: childId,
                                scriptureId: scripture.id,
                                bible_bee_cycle_id: scripture.bible_bee_cycle_id,
                                status: 'not_started' as const,
                                scripture: scripture,
                                counts_for: scripture.counts_for || 1, // Copy counts_for to top level for easier access
                                verseText: verseText,
                                displayTranslation: scripture.translation || 'NIV',
                                completedAt: null,
                                createdAt: newStudentScripture.created_at,
                                updatedAt: newStudentScripture.updated_at,
                            };
                        }
                    } catch (error) {
                        console.error('❌ Error processing scripture:', scripture.id, error);
                        throw error;
                    }
                }));
                
                // Count how many existing records were found vs new ones created
                const existingCount = scriptures.filter(s => s.id && s.createdAt === s.updatedAt).length;
                const newCount = scriptures.length - existingCount;
                console.log(`📊 Student scripture summary for ${childId}: ${existingCount} existing, ${newCount} new`);
                
                console.log('✅ Created student scripture assignments:', scriptures.length, scriptures);
                
                // Get essays for the child's Bible Bee cycles
                console.log('🔍 Fetching student essays for cycles...');
                const allStudentEssays = await Promise.all(
                    bibleBeeCycleIds.map(cycleId => dbAdapter.listStudentEssays(childId, cycleId))
                );
                const existingEssays = allStudentEssays.flat();
                console.log('📝 Existing student essays for child:', existingEssays.length, existingEssays);
                
                // Create student essays on-the-fly for divisions that have essay prompts
                console.log('🔍 Creating student essays on-the-fly...');
                const essays = await Promise.all(enrollments.map(async enrollment => {
                    try {
                        // Check if this division has essay prompts
                        const essayPrompts = await dbAdapter.listEssayPrompts(enrollment.division_id, enrollment.bible_bee_cycle_id);
                        console.log(`Division ${enrollment.division_id} has ${essayPrompts.length} essay prompts`);
                        
                        if (essayPrompts.length === 0) {
                            return null; // No essays for this division
                        }
                        
                        // Check if student essay already exists
                        const existingEssay = existingEssays.find(e => 
                            e.bible_bee_cycle_id === enrollment.bible_bee_cycle_id && 
                            e.essay_prompt_id === essayPrompts[0].id
                        );
                        
                        if (existingEssay) {
                            console.log(`Student essay already exists for child ${childId}, cycle ${enrollment.bible_bee_cycle_id}`);
                            return {
                                id: existingEssay.id,
                                childId: childId,
                                bible_bee_cycle_id: existingEssay.bible_bee_cycle_id,
                                essay_prompt_id: existingEssay.essay_prompt_id,
                                status: existingEssay.status,
                                submitted_at: existingEssay.submitted_at,
                                essayPrompt: essayPrompts[0], // Include the essay prompt for display
                                created_at: existingEssay.created_at,
                                updated_at: existingEssay.updated_at,
                            };
                        }
                        
                        // Create new student essay
                        console.log(`Creating new student essay for child ${childId}, cycle ${enrollment.bible_bee_cycle_id}`);
                        const newStudentEssay = await dbAdapter.createStudentEssay({
                            id: uuidv4(),
                            child_id: childId,
                            bible_bee_cycle_id: enrollment.bible_bee_cycle_id,
                            essay_prompt_id: essayPrompts[0].id,
                            status: 'assigned',
                            submitted_at: undefined,
                        });
                        
                        return {
                            id: newStudentEssay.id,
                            childId: childId,
                            bible_bee_cycle_id: newStudentEssay.bible_bee_cycle_id,
                            essay_prompt_id: newStudentEssay.essay_prompt_id,
                            status: newStudentEssay.status,
                            submitted_at: newStudentEssay.submitted_at,
                            essayPrompt: essayPrompts[0], // Include the essay prompt for display
                            created_at: newStudentEssay.created_at,
                            updated_at: newStudentEssay.updated_at,
                        };
                    } catch (error) {
                        console.error('❌ Error processing essay for enrollment:', enrollment.id, error);
                        throw error;
                    }
                }));
                
                const validEssays = essays.filter(e => e !== null);
                console.log('📝 Final essays for child:', validEssays.length, validEssays);
                
                console.log('✅ Returning data:', { scriptures: scriptures.length, essays: validEssays.length });
                return { scriptures, essays: validEssays };
        } catch (error) {
            console.error('❌ Error loading student assignments:', error);
            console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                error: error
            });
            return { scriptures: [], essays: [] };
        }
        },
        enabled: !!childId, // Only run query if childId is provided
        staleTime: 2 * 60 * 1000, // 2 minutes (shorter since assignments can change frequently)
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: true, // Do refetch when component mounts (for fresh data)
    });
}

export function useToggleScriptureMutation(childId: string) {
    const qc = useQueryClient();
    const key = ['studentAssignments', childId];
    return useMutation({
        mutationFn: async ({ id, complete }: { id: string; complete: boolean }) => toggleScriptureCompletion(id, complete),
        onMutate: async ({ id, complete }: { id: string; complete: boolean }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await qc.cancelQueries({ queryKey: key });

            // Snapshot the previous value
            const previousData = qc.getQueryData(key);

            // Optimistically update the cache
            qc.setQueryData(key, (old: any) => {
                if (!old) return old;
                
                return {
                    ...old,
                    scriptures: old.scriptures.map((scripture: any) => 
                        scripture.id === id 
                            ? { ...scripture, status: complete ? 'completed' : 'pending' }
                            : scripture
                    )
                };
            });

            // Return a context object with the snapshotted value
            return { previousData };
        },
        onError: (_err: unknown, _variables: { id: string; complete: boolean }, context: { previousData?: unknown } | undefined) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousData) {
                qc.setQueryData(key, context.previousData);
            }
        },
        onSuccess: () => {
            // No refetch needed - optimistic update is sufficient
            // The database operation succeeded, so our optimistic update was correct
        },
    });
}

export function useSubmitEssayMutation(childId: string) {
    const qc = useQueryClient();
    const key = ['studentAssignments', childId];
    return useMutation({
        mutationFn: async ({ bibleBeeCycleId }: { bibleBeeCycleId: string }) => submitEssay(childId, bibleBeeCycleId),
        onMutate: async ({ bibleBeeCycleId }: { bibleBeeCycleId: string }) => {
            await qc.cancelQueries({ queryKey: key });
            const previous = qc.getQueryData<any>(key);
            qc.setQueryData(key, (old: any) => {
                if (!old) return old;
                const newEssays = old.essays.map((e: any) => e.bible_bee_cycle_id === bibleBeeCycleId ? { ...e, status: 'submitted', submittedAt: new Date().toISOString() } : e);
                return { ...old, essays: newEssays };
            });
            return { previous };
        },
        onError: (_err: unknown, _vars: { bibleBeeCycleId: string }, context: any) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: key }),
    });
}

// React Query hooks for dashboard Bible Bee page
export function useBibleBeeCyclesQuery() {
    return useQuery({
        queryKey: ['bibleBeeCycles'],
        queryFn: async () => {
            console.log('🔍 useBibleBeeCyclesQuery: Fetching Bible Bee cycles');
            const cycles = await getBibleBeeCycles();
            console.log('📚 Retrieved Bible Bee cycles:', cycles);
            return cycles || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

export function useScripturesForCycleQuery(cycleId: string) {
    return useQuery({
        queryKey: ['scriptures', cycleId],
        queryFn: async () => {
            if (!cycleId) {
                console.log('🔍 useScripturesForCycleQuery: No cycleId provided');
                return [];
            }
            console.log('🔍 useScripturesForCycleQuery: Fetching scriptures for cycle:', cycleId);
            const scriptures = await getScripturesForBibleBeeCycle(cycleId);
            console.log('📖 Retrieved scriptures for cycle:', scriptures);
            return scriptures || [];
        },
        enabled: !!cycleId, // Only run query if cycleId is provided
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

export function useBibleBeeProgressQuery(cycleId: string, filterChildIds?: string[]) {
    return useQuery({
        queryKey: ['bibleBeeProgress', cycleId, filterChildIds],
        queryFn: async () => {
            if (!cycleId) {
                console.log('🔍 useBibleBeeProgressQuery: No cycleId provided');
                return [];
            }
            console.log('🔍 useBibleBeeProgressQuery: Fetching progress for cycle:', cycleId, 'filterChildIds:', filterChildIds);
            
            // Import the function dynamically to avoid circular dependencies
            const { getBibleBeeProgressForCycle } = await import('@/lib/dal');
            const progress = await getBibleBeeProgressForCycle(cycleId);
            
            // Filter to specific children if provided
            const filteredProgress = filterChildIds
                ? progress.filter((r: any) => filterChildIds.includes(r.childId))
                : progress;
            
            console.log('📊 Retrieved progress for cycle:', filteredProgress.length, 'students');
            return filteredProgress || [];
        },
        enabled: !!cycleId, // Only run query if cycleId is provided
        staleTime: 2 * 60 * 1000, // 2 minutes (shorter than scriptures since this changes more frequently)
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}

// React Query hooks for child detail page
export function useChildQuery(childId: string) {
    return useQuery({
        queryKey: ['child', childId],
        queryFn: async () => {
            if (!childId) {
                console.log('🔍 useChildQuery: No childId provided');
                return null;
            }
            console.log('🔍 useChildQuery: Fetching child:', childId);
            
            // Import the function dynamically to avoid circular dependencies
            const { getChild } = await import('@/lib/dal');
            const child = await getChild(childId);
            console.log('👶 Retrieved child:', child);
            return child;
        },
        enabled: !!childId, // Only run query if childId is provided
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

export function useHouseholdQuery(householdId: string) {
    return useQuery({
        queryKey: ['household', householdId],
        queryFn: async () => {
            if (!householdId) {
                console.log('🔍 useHouseholdQuery: No householdId provided');
                return null;
            }
            console.log('🔍 useHouseholdQuery: Fetching household:', householdId);
            
            // Import the function dynamically to avoid circular dependencies
            const { getHousehold } = await import('@/lib/dal');
            const household = await getHousehold(householdId);
            console.log('🏠 Retrieved household:', household);
            return household;
        },
        enabled: !!householdId, // Only run query if householdId is provided
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

export function useGuardiansQuery(householdId: string) {
    return useQuery({
        queryKey: ['guardians', householdId],
        queryFn: async () => {
            if (!householdId) {
                console.log('🔍 useGuardiansQuery: No householdId provided');
                return [];
            }
            console.log('🔍 useGuardiansQuery: Fetching guardians for household:', householdId);
            
            // Import the function dynamically to avoid circular dependencies
            const { listGuardians } = await import('@/lib/dal');
            const guardians = await listGuardians({ householdId });
            console.log('👨‍👩‍👧‍👦 Retrieved guardians:', guardians);
            return guardians || [];
        },
        enabled: !!householdId, // Only run query if householdId is provided
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Custom hook to listen for photo updates
export function useChildPhotoUpdateListener() {
    const [photoUpdates, setPhotoUpdates] = useState<Map<string, string>>(new Map());
    
    useEffect(() => {
        const handlePhotoUpdate = (event: CustomEvent) => {
            const { childId, photoDataUrl } = event.detail;
            setPhotoUpdates(prev => new Map(prev).set(childId, photoDataUrl));
        };
        
        window.addEventListener('childPhotoUpdated', handlePhotoUpdate as EventListener);
        
        return () => {
            window.removeEventListener('childPhotoUpdated', handlePhotoUpdate as EventListener);
        };
    }, []);
    
    return photoUpdates;
}

// Photo update mutation that dispatches custom events for immediate updates
// NOTE: This hook has been moved to /src/hooks/data/children.ts
// Keeping this for backward compatibility but it should not be used in new code
export function useUpdateChildPhotoMutation() {
    console.warn('useUpdateChildPhotoMutation from useBibleBee.ts is deprecated. Use the one from @/hooks/data instead.');
    return useMutation({
        mutationFn: async ({ childId, photoDataUrl }: { childId: string; photoDataUrl: string }) => {
            return await updateChildPhoto(childId, photoDataUrl);
        },
        onSuccess: (_: unknown, { childId, photoDataUrl }: { childId: string; photoDataUrl: string }) => {
                // Dispatch custom event for immediate updates across all components
                const event = new CustomEvent('childPhotoUpdated', {
                    detail: { childId, photoDataUrl }
                });
                window.dispatchEvent(event);
            },
    });
}
