export const cacheConfig = {
  reference: { staleTime: 10 * 60 * 1000, gcTime: 20 * 60 * 1000 },
  moderate: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  volatile: { staleTime: 1 * 60 * 1000, gcTime: 5 * 60 * 1000 },
};
