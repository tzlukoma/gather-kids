'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: getAllUsers,
    ...cacheConfig.moderate, // Users list changes occasionally
  });
}

export function useUserSearch(searchTerm: string) {
  return useQuery({
    queryKey: queryKeys.userSearch(searchTerm),
    queryFn: () => {
      // Filter users based on search term
      return getAllUsers().then(users => 
        users.filter(user => 
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    },
    enabled: !!searchTerm.trim(),
    ...cacheConfig.volatile, // Search results can change frequently
  });
}

// Mutation hook for promoting users
export function usePromoteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote user');
      }
      
      // Check if response has content before parsing JSON
      const text = await response.text();
      if (!text) {
        return { success: true }; // Return success if no content
      }
      
      try {
        return JSON.parse(text);
      } catch (error) {
        // If JSON parsing fails, return success since the request succeeded
        return { success: true };
      }
    },
    onSuccess: () => {
      // Invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
