'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getBibleBeeCycles,
  getScripturesForBibleBeeCycle,
  getLeaderBibleBeeProgress,
  getBibleBeeProgressForCycle,
  canLeaderManageBibleBee,
  getDivisionsForBibleBeeCycle,
  getEssayPromptsForBibleBeeCycle,
  createBibleBeeCycle,
  updateBibleBeeCycle,
  deleteBibleBeeCycle,
  upsertScripture,
  deleteScripture,
  getBibleBeeMinistry,
  dbAdapter,
  shouldUseAdapter,
  getChild
} from '@/lib/dal';
import { toggleScriptureCompletion, submitEssay } from '@/lib/bibleBee';
import { gradeToCode } from '@/lib/gradeUtils';
import { v4 as uuidv4 } from 'uuid';
import { queryKeys } from './keys';
import { cacheConfig } from './config';
import type { Scripture } from '@/lib/types';

// Bible Bee Cycles (Primary Pattern)
export function useBibleBeeCycles(isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.bibleBeeCycles(isActive),
    queryFn: () => getBibleBeeCycles(isActive),
    ...cacheConfig.reference, // Cycles rarely change
  });
}

export function useBibleBeeCycle(id: string) {
  return useQuery({
    queryKey: queryKeys.bibleBeeCycle(id),
    queryFn: () => getBibleBeeCycles().then(cycles => cycles.find(cycle => cycle.id === id)),
    enabled: !!id,
    ...cacheConfig.reference,
  });
}

export function useCreateBibleBeeCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBibleBeeCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bibleBeeCycles() });
    },
  });
}

export function useUpdateBibleBeeCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateBibleBeeCycle(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bibleBeeCycles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bibleBeeCycle(id) });
    },
  });
}

export function useDeleteBibleBeeCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteBibleBeeCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bibleBeeCycles() });
    },
  });
}

// Scriptures for Cycles
export function useScripturesForCycle(cycleId: string) {
  return useQuery({
    queryKey: queryKeys.scripturesForCycle(cycleId),
    queryFn: () => getScripturesForBibleBeeCycle(cycleId),
    enabled: !!cycleId,
    ...cacheConfig.moderate, // Scriptures change occasionally
  });
}

export function useUpsertScripture() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: upsertScripture,
    onSuccess: (_, variables) => {
      // Invalidate all scripture queries
      queryClient.invalidateQueries({ queryKey: ['scriptures'] });
      if (variables.cycleId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scripturesForCycle(variables.cycleId) });
      }
    },
  });
}

export function useDeleteScripture() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteScripture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scriptures'] });
    },
  });
}

// Progress and Statistics
export function useLeaderBibleBeeProgress(leaderId: string, cycleId: string) {
  return useQuery({
    queryKey: queryKeys.leaderBibleBeeProgress(leaderId, cycleId),
    queryFn: () => getLeaderBibleBeeProgress(leaderId, cycleId),
    enabled: !!leaderId && !!cycleId,
    ...cacheConfig.volatile, // Progress changes frequently
  });
}

export function useBibleBeeProgressForCycle(cycleId: string) {
  return useQuery({
    queryKey: queryKeys.bibleBeeProgressForCycle(cycleId),
    queryFn: () => getBibleBeeProgressForCycle(cycleId),
    enabled: !!cycleId,
    ...cacheConfig.volatile,
  });
}

// Divisions for Cycles
export function useDivisionsForCycle(cycleId: string) {
  return useQuery({
    queryKey: queryKeys.divisionsForCycle(cycleId),
    queryFn: () => getDivisionsForBibleBeeCycle(cycleId),
    enabled: !!cycleId,
    ...cacheConfig.reference,
  });
}

// Essay Prompts for Cycles
export function useEssayPromptsForCycle(cycleId: string) {
  return useQuery({
    queryKey: queryKeys.essayPromptsForCycle(cycleId),
    queryFn: () => getEssayPromptsForBibleBeeCycle(cycleId),
    enabled: !!cycleId,
    ...cacheConfig.reference,
  });
}

// Permissions
export function useCanLeaderManageBibleBee(opts: { leaderId?: string; email?: string; selectedCycle?: string; }) {
  return useQuery({
    queryKey: queryKeys.canLeaderManageBibleBee(opts),
    queryFn: () => canLeaderManageBibleBee(opts),
    enabled: !!(opts.leaderId || opts.email),
    ...cacheConfig.moderate,
  });
}

// Ministry
export function useBibleBeeMinistry() {
  return useQuery({
    queryKey: queryKeys.bibleBeeMinistry(),
    queryFn: getBibleBeeMinistry,
    ...cacheConfig.reference,
  });
}

// Student Assignments
export function useStudentAssignmentsQuery(childId: string) {
  return useQuery({
    queryKey: queryKeys.studentAssignments(childId),
    queryFn: async () => {
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
                return {
                  id: existingRecord.id,
                  childId: childId,
                  scriptureId: scripture.id,
                  bible_bee_cycle_id: scripture.bible_bee_cycle_id,
                  status: existingRecord.is_completed ? 'completed' : 'not_started',
                  scripture: scripture,
                  counts_for: scripture.counts_for || 1,
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
                  counts_for: scripture.counts_for || 1,
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
                  essayPrompt: essayPrompts[0],
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
                essayPrompt: essayPrompts[0],
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
          // Use legacy Dexie for demo mode - import db dynamically
          const { db } = await import('@/lib/db');
          
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
    },
    enabled: !!childId,
    ...cacheConfig.volatile, // Assignments change frequently
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

export function useToggleScriptureMutation(childId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, complete }: { id: string; complete: boolean }) => 
      toggleScriptureCompletion(id, complete),
    onMutate: async ({ id, complete }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.studentAssignments(childId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.bibleBeeStats(childId) });

      // Snapshot the previous values
      const previousStudentData = queryClient.getQueryData(queryKeys.studentAssignments(childId));
      const previousStatsData = queryClient.getQueryData(queryKeys.bibleBeeStats(childId));

      // Optimistically update the student assignments cache
      queryClient.setQueryData(queryKeys.studentAssignments(childId), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          scriptures: old.scriptures.map((scripture: any) => 
            scripture.id === id 
              ? { ...scripture, status: complete ? 'completed' : 'not_started' }
              : scripture
          )
        };
      });

      // Optimistically update the Bible Bee stats cache
      queryClient.setQueryData(queryKeys.bibleBeeStats(childId), (old: any) => {
        if (!old || !old.bbStats) return old;
        
        const completedScriptures = complete 
          ? old.bbStats.completedScriptures + 1
          : old.bbStats.completedScriptures - 1;
        
        const percent = old.bbStats.requiredScriptures > 0 
          ? (completedScriptures / old.bbStats.requiredScriptures) * 100 
          : 0;
        
        const bonus = Math.max(0, completedScriptures - old.bbStats.requiredScriptures);
        
        return {
          ...old,
          bbStats: {
            ...old.bbStats,
            completedScriptures,
            percentDone: percent,
            bonus,
          }
        };
      });

      // Return a context object with the snapshotted values
      return { previousStudentData, previousStatsData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousStudentData) {
        queryClient.setQueryData(queryKeys.studentAssignments(childId), context.previousStudentData);
      }
      if (context?.previousStatsData) {
        queryClient.setQueryData(queryKeys.bibleBeeStats(childId), context.previousStatsData);
      }
    },
    onSuccess: () => {
      // Invalidate related queries to ensure they refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssignments(childId) });
      // Invalidate Bible Bee stats to update the progress display
      queryClient.invalidateQueries({ queryKey: queryKeys.bibleBeeStats(childId) });
      // Invalidate Bible Bee progress queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['bibleBeeProgressForCycle'] });
      queryClient.invalidateQueries({ queryKey: ['leaderBibleBeeProgress'] });
    },
  });
}

export function useSubmitEssayMutation(childId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bibleBeeCycleId }: { bibleBeeCycleId: string }) => 
      submitEssay(childId, bibleBeeCycleId),
    onMutate: async ({ bibleBeeCycleId }: { bibleBeeCycleId: string }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.studentAssignments(childId) });
      const previous = queryClient.getQueryData<any>(queryKeys.studentAssignments(childId));
      queryClient.setQueryData(queryKeys.studentAssignments(childId), (old: any) => {
        if (!old) return old;
        const newEssays = old.essays.map((e: any) => 
          e.bible_bee_cycle_id === bibleBeeCycleId 
            ? { ...e, status: 'submitted', submittedAt: new Date().toISOString() } 
            : e
        );
        return { ...old, essays: newEssays };
      });
      return { previous };
    },
    onError: (_err: unknown, _vars: { bibleBeeCycleId?: string } | undefined, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.studentAssignments(childId), context.previous);
      }
    },
    onSettled: () => {
      // Invalidate related queries to ensure they refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssignments(childId) });
      queryClient.invalidateQueries({ queryKey: ['bibleBeeProgressForCycle'] });
      queryClient.invalidateQueries({ queryKey: ['leaderBibleBeeProgress'] });
    },
  });
}

// Bible Bee Stats - Computed from student assignments
export function useBibleBeeStats(childId: string) {
  return useQuery({
    queryKey: queryKeys.bibleBeeStats(childId),
    queryFn: async () => {
      // Use the same data fetching logic as useStudentAssignmentsQuery
      try {
        console.log('🚀 Starting useBibleBeeStats for child:', childId);
        
        if (shouldUseAdapter()) {
          // Use dbAdapter for live mode
          console.log('🔍 useBibleBeeStats: Using Supabase mode for child:', childId);
          
          // Get enrollments for this child
          console.log('🔍 Fetching enrollments for child:', childId);
          const enrollments = await dbAdapter.listEnrollments(childId);
          console.log('Child enrollments:', enrollments);
          
          if (enrollments.length === 0) {
            console.log('❌ No enrollments found for child:', childId);
            return { bbStats: null, essaySummary: null, divisionEssayPrompts: [] };
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
          console.log('🔍 Creating student scripture assignments...');
          const scriptures = await Promise.all(rawScriptures.map(async scripture => {
            try {
              // Check if student scripture record already exists
              const existingStudentScriptures = await dbAdapter.listStudentScriptures(childId, scripture.bible_bee_cycle_id);
              const existingRecord = existingStudentScriptures.find(ss => ss.scripture_id === scripture.id);
              
              if (existingRecord) {
                // Return existing record with enriched data
                return {
                  id: existingRecord.id,
                  childId: childId,
                  scriptureId: scripture.id,
                  bible_bee_cycle_id: scripture.bible_bee_cycle_id,
                  status: existingRecord.is_completed ? 'completed' : 'not_started',
                  scripture: scripture,
                  counts_for: scripture.counts_for || 1,
                  verseText: scripture.text,
                  displayTranslation: scripture.translation || 'NIV',
                  completedAt: existingRecord.completed_at,
                  createdAt: existingRecord.created_at,
                  updatedAt: existingRecord.updated_at,
                };
              } else {
                // Create new student scripture record
                console.log('Creating new student scripture record for:', scripture.id);
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
                  counts_for: scripture.counts_for || 1,
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
                  essayPrompt: essayPrompts[0],
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
                essayPrompt: essayPrompts[0],
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
          
          // Now compute the stats
          const assignments = { scriptures, essays: validEssays };
          
          // Prepare essay summary
          let essaySummary = null;
          if (validEssays.length > 0 && scriptures.length === 0) {
            const submitted = validEssays.filter(
              (e: any) => e.status === 'submitted'
            ).length;
            essaySummary = {
              count: validEssays.length,
              submitted,
              pending: validEssays.length - submitted,
            };
          }

          if (scriptures.length === 0 && validEssays.length === 0) {
            return {
              bbStats: null,
              essaySummary,
              divisionEssayPrompts: []
            };
          }

          // Get child data for grade calculation
          const childData = await getChild(childId);
          if (!childData) return null;

          // Get the year ID for division lookup
          const yearId = scriptures.length > 0
            ? scriptures[0].bible_bee_cycle_id
            : validEssays[0]?.bible_bee_cycle_id;
          
          let required = scriptures.length;
          let matchingDivision = null;

          try {
            const gradeNum = childData.grade ? gradeToCode(childData.grade) : null;

            if (gradeNum !== null && yearId && childData) {
              // Use the helper function to get division information
              const { getChildDivisionInfo } = await import('@/lib/bibleBee');
              const divisionInfo = await getChildDivisionInfo(
                childData.child_id,
                yearId
              );

              if (divisionInfo.division) {
                // New system: Use division information
                matchingDivision = {
                  name: divisionInfo.division.name,
                  min_grade: divisionInfo.division.min_grade,
                  max_grade: divisionInfo.division.max_grade,
                };
                // Use the minimum_required from the division
                required = divisionInfo.division.minimum_required || enrichedScriptures.length;
              } else if (divisionInfo.target) {
                // Legacy system provided a target
                required = divisionInfo.target;
              }
            }
          } catch (e) {
            console.warn('Error computing Bible Bee stats:', e);
            // ignore and fallback to total scriptures
          }

          const completed = scriptures
            .filter((s: any) => s.status === 'completed')
            .reduce((sum: number, s: any) => sum + (s.counts_for || 1), 0);
          const percent = required > 0 ? (completed / required) * 100 : 0;
          const bonus = Math.max(0, completed - required);

          // Check if there's an essay assigned
          const essayAssigned = validEssays.length > 0;
          const divisionEssayPrompts = validEssays.map((e: any) => e.essayPrompt).filter(Boolean);

          return {
            bbStats: {
              requiredScriptures: required,
              completedScriptures: completed,
              percentDone: percent,
              bonus,
              division: matchingDivision
                ? {
                      name: matchingDivision.name,
                      min_grade: matchingDivision.min_grade,
                      max_grade: matchingDivision.max_grade,
                    }
                : undefined,
              essayAssigned,
            },
            essaySummary,
            divisionEssayPrompts
          };
        } else {
          // Use legacy Dexie for demo mode - import db dynamically
          const { db } = await import('@/lib/db');
          
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

          // Now compute the stats using the same logic as above

          // Prepare essay summary
          let essaySummary = null;
          if (enrichedEssays.length > 0 && enrichedScriptures.length === 0) {
            const submitted = enrichedEssays.filter(
              (e: any) => e.status === 'submitted'
            ).length;
            essaySummary = {
              count: enrichedEssays.length,
              submitted,
              pending: enrichedEssays.length - submitted,
            };
          }

          if (enrichedScriptures.length === 0 && enrichedEssays.length === 0) {
            return {
              bbStats: null,
              essaySummary,
              divisionEssayPrompts: []
            };
          }

          // Get child data for grade calculation
          const childData = await getChild(childId);
          if (!childData) return null;

          // Get the year ID for division lookup
          const yearId = enrichedScriptures.length > 0
            ? enrichedScriptures[0].bible_bee_cycle_id
            : enrichedEssays[0]?.bible_bee_cycle_id;
          
          let required = enrichedScriptures.length;
          let matchingDivision = null;

          try {
            const gradeNum = childData.grade ? gradeToCode(childData.grade) : null;

            if (gradeNum !== null && yearId && childData) {
              // Use the helper function to get division information
              const { getChildDivisionInfo } = await import('@/lib/bibleBee');
              const divisionInfo = await getChildDivisionInfo(
                childData.child_id,
                yearId
              );

              if (divisionInfo.division) {
                // New system: Use division information
                matchingDivision = {
                  name: divisionInfo.division.name,
                  min_grade: divisionInfo.division.min_grade,
                  max_grade: divisionInfo.division.max_grade,
                };
                // Use the minimum_required from the division
                required = divisionInfo.division.minimum_required || enrichedScriptures.length;
              } else if (divisionInfo.target) {
                // Legacy system provided a target
                required = divisionInfo.target;
              }
            }
          } catch (e) {
            console.warn('Error computing Bible Bee stats:', e);
            // ignore and fallback to total scriptures
          }

          const completed = enrichedScriptures
            .filter((s: any) => s.status === 'completed')
            .reduce((sum: number, s: any) => sum + (s.counts_for || 1), 0);
          const percent = required > 0 ? (completed / required) * 100 : 0;
          const bonus = Math.max(0, completed - required);

          // Check if there's an essay assigned
          const essayAssigned = enrichedEssays.length > 0;
          const divisionEssayPrompts = enrichedEssays.map((e: any) => e.essayPrompt).filter(Boolean);

          return {
            bbStats: {
              requiredScriptures: required,
              completedScriptures: completed,
              percentDone: percent,
              bonus,
              division: matchingDivision
                ? {
                      name: matchingDivision.name,
                      min_grade: matchingDivision.min_grade,
                      max_grade: matchingDivision.max_grade,
                    }
                : undefined,
              essayAssigned,
            },
            essaySummary,
            divisionEssayPrompts
          };
        }
      } catch (error) {
        console.error('❌ Error loading Bible Bee stats:', error);
        return { bbStats: null, essaySummary: null, divisionEssayPrompts: [] };
      }
    },
    enabled: !!childId,
    staleTime: 30 * 1000, // 30 seconds - stats change when scriptures are completed
    ...cacheConfig.volatile,
  });
}
