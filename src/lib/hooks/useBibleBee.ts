import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { dbAdapter } from '@/lib/db-utils';
import { shouldUseAdapter } from '@/lib/dal';
import { getScripturesForBibleBeeCycle } from '@/lib/dal';
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
                if (shouldUseAdapter()) {
                    // Use dbAdapter for live mode
                    console.log('🔍 useCompetitionYears: Using Supabase mode', {
                        shouldUseAdapter: shouldUseAdapter(),
                        databaseMode: process.env.NEXT_PUBLIC_DATABASE_MODE
                    });
                    const bibleBeeCycles = await getBibleBeeCycles();
                    // Convert BibleBeeCycle to CompetitionYear format for compatibility
                    const convertedYears = bibleBeeCycles.map(cycle => ({
                        id: cycle.id,
                        year: parseInt(cycle.name?.split(' ').pop() || '2025'),
                        createdAt: cycle.created_at,
                        updatedAt: cycle.updated_at || cycle.created_at,
                    }));
                    if (mounted) setYears(convertedYears.sort((a, b) => b.year - a.year));
                } else {
                    // Use legacy Dexie for demo mode
                    const y = await db.competitionYears.toArray();
                    if (mounted) setYears(y.sort((a, b) => b.year - a.year));
                }
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
                if (shouldUseAdapter()) {
                    console.log('🔍 useCompetitionYears refresh: Using Supabase mode', {
                        shouldUseAdapter: shouldUseAdapter(),
                        databaseMode: process.env.NEXT_PUBLIC_DATABASE_MODE
                    });
                    const bibleBeeCycles = await getBibleBeeCycles();
                    const convertedYears = bibleBeeCycles.map(cycle => ({
                        id: cycle.id,
                        year: parseInt(cycle.name?.split(' ').pop() || '2025'),
                        createdAt: cycle.created_at,
                        updatedAt: cycle.updated_at || cycle.created_at,
                    }));
                    setYears(convertedYears);
                } else {
                    const y = await db.competitionYears.toArray();
                    setYears(y);
                }
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
                if (shouldUseAdapter()) {
                    // Use dbAdapter for live mode
                    console.log('🔍 useScripturesForYear: Using Supabase mode', {
                        yearId,
                        shouldUseAdapter: shouldUseAdapter(),
                        databaseMode: process.env.NEXT_PUBLIC_DATABASE_MODE
                    });
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
                } else {
                    // Use legacy Dexie for demo mode
                    const s = await getScripturesForBibleBeeCycle(yearId);
                    if (mounted) {
                        const sorted = s.sort((a: Scripture, b: Scripture) => {
            const aRec = a as unknown as Record<string, unknown>;
            const bRec = b as unknown as Record<string, unknown>;
            const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
            const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
            return aOrder - bOrder;
                        });
                        setScriptures(sorted);
                    }
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
                if (shouldUseAdapter()) {
                    const s = await getScripturesForBibleBeeCycle(yearId);
                    const sorted = s.sort((a: Scripture, b: Scripture) => {
                        const aRec = a as unknown as Record<string, unknown>;
                        const bRec = b as unknown as Record<string, unknown>;
                        const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
                        const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
                        return aOrder - bOrder;
                    });
                    setScriptures(sorted);
                } else {
            const s = await db.scriptures.where('competitionYearId').equals(yearId).toArray();
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
        try {
            console.log('🚀 Starting useStudentAssignmentsQuery for child:', childId);
            
            if (shouldUseAdapter()) {
                // Use dbAdapter for live mode
                console.log('🔍 useStudentAssignmentsQuery: Using Supabase mode for child:', childId);
                console.log('🔍 Database mode:', process.env.NEXT_PUBLIC_DATABASE_MODE);
                console.log('🔍 Should use adapter:', shouldUseAdapter());
                
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
                            console.log('Found existing student scripture record:', existingRecord);
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
                            submitted_at: null,
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
            } else {
                // Use legacy Dexie for demo mode only
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
            }
        } catch (error) {
            console.error('❌ Error loading student assignments:', error);
            console.error('❌ Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                error: error
            });
            return { scriptures: [], essays: [] };
        }
    });
}

export function useToggleScriptureMutation(childId: string) {
    const qc = useQueryClient();
    const key = ['studentAssignments', childId];
    return useMutation(async ({ id, complete }: { id: string; complete: boolean }) => toggleScriptureCompletion(id, complete), {
        onMutate: async ({ id, complete }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await qc.cancelQueries(key);

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
        onError: (err, variables, context) => {
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
    return useMutation(async ({ bibleBeeCycleId }: { bibleBeeCycleId: string }) => submitEssay(childId, bibleBeeCycleId), {
        onMutate: async ({ bibleBeeCycleId }: { bibleBeeCycleId: string }) => {
            await qc.cancelQueries(key);
            const previous = qc.getQueryData<any>(key);
            qc.setQueryData(key, (old: any) => {
                if (!old) return old;
                const newEssays = old.essays.map((e: any) => e.bible_bee_cycle_id === bibleBeeCycleId ? { ...e, status: 'submitted', submittedAt: new Date().toISOString() } : e);
                return { ...old, essays: newEssays };
            });
            return { previous };
        },
        onError: (_err: unknown, _vars: { bibleBeeCycleId?: string } | undefined, context: any) => {
            if (context?.previous) qc.setQueryData(key, context.previous);
        },
        onSettled: () => qc.invalidateQueries(key),
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
export function useUpdateChildPhotoMutation() {
    return useMutation(
        async ({ childId, photoDataUrl }: { childId: string; photoDataUrl: string }) => {
            return await updateChildPhoto(childId, photoDataUrl);
        },
        {
            onSuccess: (_, { childId, photoDataUrl }) => {
                // Dispatch custom event for immediate updates across all components
                const event = new CustomEvent('childPhotoUpdated', {
                    detail: { childId, photoDataUrl }
                });
                window.dispatchEvent(event);
            },
        }
    );
}
