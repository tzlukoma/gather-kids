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
  getBibleBeeMinistry
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

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
