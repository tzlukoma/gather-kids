export const queryKeys = {
  children: () => ['children'] as const,
  child: (id: string) => ['child', id] as const,
  households: () => ['households'] as const,
  household: (id: string) => ['household', id] as const,
  householdProfile: (id: string) => ['householdProfile', id] as const,
  guardians: () => ['guardians'] as const,
  
  // Event-scoped attendance for granular invalidation
  attendance: (date: string, eventId?: string) => 
    eventId ? ['attendance', date, eventId] : ['attendance', date],
  incidents: (date: string, eventId?: string) => 
    eventId ? ['incidents', date, eventId] : ['incidents', date],
  
  // Bible Bee
  bibleBeeCycles: () => ['bibleBeeCycles'] as const,
  scriptures: (cycleId: string) => ['scriptures', cycleId] as const,
  studentAssignments: (childId: string) => ['studentAssignments', childId] as const,
  
  // Ministries
  ministries: () => ['ministries'] as const,
  ministryEnrollments: (cycleId: string) => ['ministryEnrollments', cycleId] as const,
  
  // Registration
  registrationCycles: () => ['registrationCycles'] as const,
  ministryGroups: () => ['ministryGroups'] as const,
  
  // Leaders
  leaders: () => ['leaders'] as const,
  leader: (id: string) => ['leader', id] as const,
  leaderSearch: (term: string) => ['leaderSearch', term] as const,
};
