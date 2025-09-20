import { useQuery } from '@tanstack/react-query';
import { getAllChildren, getChild } from '@/lib/dal';
import type { Child } from '@/lib/types';

// Query keys for children
export const childrenKeys = {
    all: ['children'] as const,
    detail: (id: string) => ['child', id] as const,
};

// Children queries
export function useChildren() {
    return useQuery({
        queryKey: childrenKeys.all,
        queryFn: getAllChildren,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useChild(childId: string) {
    return useQuery({
        queryKey: childrenKeys.detail(childId),
        queryFn: () => getChild(childId),
        enabled: !!childId,
        staleTime: 5 * 60 * 1000,
    });
}