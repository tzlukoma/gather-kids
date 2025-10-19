'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllChildren, getChild } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useChildren() {
  return useQuery({
    queryKey: queryKeys.children(),
    queryFn: getAllChildren,
    ...cacheConfig.moderate,
  });
}

export function useChild(childId: string) {
  return useQuery({
    queryKey: queryKeys.child(childId),
    queryFn: () => getChild(childId),
    enabled: !!childId,
    ...cacheConfig.moderate,
  });
}
