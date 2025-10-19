'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBrandingSettings, saveBrandingSettings, getDefaultBrandingSettings } from '@/lib/dal';
import { queryKeys } from './keys';
import { cacheConfig } from './config';

export function useBrandingSettings(orgId: string = 'default') {
  return useQuery({
    queryKey: queryKeys.brandingSettings(orgId),
    queryFn: () => getBrandingSettings(orgId),
    enabled: !!orgId,
    ...cacheConfig.reference, // Branding settings rarely change
  });
}

export function useDefaultBrandingSettings() {
  return useQuery({
    queryKey: queryKeys.defaultBrandingSettings(),
    queryFn: getDefaultBrandingSettings,
    ...cacheConfig.reference, // Default settings rarely change
  });
}

export function useSaveBrandingSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      orgId, 
      settings 
    }: { 
      orgId: string; 
      settings: Omit<any, 'setting_id' | 'org_id' | 'created_at' | 'updated_at'> 
    }) => {
      return saveBrandingSettings(orgId, settings);
    },
    onSuccess: (_, { orgId }) => {
      // Invalidate branding settings queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.brandingSettings(orgId) });
      queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
    },
  });
}
