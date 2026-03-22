export const cacheConfig = {
  reference: { staleTime: 10 * 60 * 1000, cacheTime: 20 * 60 * 1000 },
  moderate: { staleTime: 5 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
  volatile: { staleTime: 1 * 60 * 1000, cacheTime: 5 * 60 * 1000 },
};
