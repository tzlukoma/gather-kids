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
  
  // Users keys
  users: () => ['users'] as const,
  userSearch: (term: string) => ['userSearch', term] as const,
  
  // Branding keys
  brandingSettings: (orgId: string) => ['brandingSettings', orgId] as const,
  defaultBrandingSettings: () => ['defaultBrandingSettings'] as const,
  
  // Bible Bee keys
  bibleBeeCycles: (isActive?: boolean) => ['bibleBeeCycles', isActive] as const,
  bibleBeeCycle: (id: string) => ['bibleBeeCycle', id] as const,
  scripturesForCycle: (cycleId: string) => ['scripturesForCycle', cycleId] as const,
  leaderBibleBeeProgress: (leaderId: string, cycleId: string) => ['leaderBibleBeeProgress', leaderId, cycleId] as const,
  bibleBeeProgressForCycle: (cycleId: string) => ['bibleBeeProgressForCycle', cycleId] as const,
  divisionsForCycle: (cycleId: string) => ['divisionsForCycle', cycleId] as const,
  essayPromptsForCycle: (cycleId: string) => ['essayPromptsForCycle', cycleId] as const,
  canLeaderManageBibleBee: (opts: any) => ['canLeaderManageBibleBee', opts] as const,
  bibleBeeMinistry: () => ['bibleBeeMinistry'] as const,
};
