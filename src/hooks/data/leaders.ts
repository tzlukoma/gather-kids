'use client';

import { useQuery } from '@tanstack/react-query';
import {
  queryLeaderProfiles,
  getLeaderProfileWithMemberships,
  searchLeaderProfiles
} from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useLeaders() {
  return useQuery({
    queryKey: queryKeys.leaders(),
    queryFn: queryLeaderProfiles,
    ...cacheConfig.moderate, // Leaders change moderately
  });
}

export function useLeader(leaderId: string) {
  return useQuery({
    queryKey: queryKeys.leader(leaderId),
    queryFn: () => getLeaderProfileWithMemberships(leaderId),
    enabled: !!leaderId,
    ...cacheConfig.moderate,
  });
}

export function useLeaderSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.leaderSearch(term),
    queryFn: () => searchLeaderProfiles(term),
    enabled: !!term.trim(),
    ...cacheConfig.volatile, // Search results change frequently
  });
}
