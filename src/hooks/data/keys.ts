export const queryKeys = {
  children: () => ['children'] as const,
  child: (id: string) => ['child', id] as const,
  checkedInChildren: (date: string) => ['checkedInChildren', date] as const,
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
  ministriesByGroupCode: (groupCode: string) => ['ministriesByGroupCode', groupCode] as const,
  ministriesInGroup: (groupId: string) => ['ministriesInGroup', groupId] as const,
  ministryEnrollments: (cycleId: string) => ['ministryEnrollments', cycleId] as const,
  ministryGroup: (id: string) => ['ministryGroup', id] as const,
  groupsForMinistry: (ministryId: string) => ['groupsForMinistry', ministryId] as const,
  
  // Registration
  registrationCycles: () => ['registrationCycles'] as const,
  registrationCycle: (id: string) => ['registrationCycle', id] as const,
  registrationStats: () => ['registrationStats'] as const,
  ministryGroups: () => ['ministryGroups'] as const,
  
  // Leaders
  leaders: () => ['leaders'] as const,
  leader: (id: string) => ['leader', id] as const,
  leaderSearch: (term: string) => ['leaderSearch', term] as const,
  
  // Dashboard keys
  unacknowledgedIncidents: () => ['unacknowledgedIncidents'] as const,
  checkedInCount: (date: string) => ['checkedInCount', date] as const,
};
