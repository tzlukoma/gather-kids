// Central query keys - re-export from domain files
export { childrenKeys } from './children';
export { householdKeys } from './households';
export { attendanceKeys } from './attendance';
export { miscKeys } from './misc';

// For backward compatibility, provide a unified queryKeys object
import { childrenKeys } from './children';
import { householdKeys } from './households';
import { attendanceKeys } from './attendance';
import { miscKeys } from './misc';

export const queryKeys = {
    // Children
    children: childrenKeys.all,
    child: childrenKeys.detail,
    
    // Households
    guardians: householdKeys.guardians,
    households: householdKeys.households,
    household: householdKeys.detail,
    householdProfile: householdKeys.profile,
    householdList: householdKeys.list,
    
    // Attendance
    attendance: attendanceKeys.attendance,
    incidents: attendanceKeys.incidents,
    
    // Misc
    emergencyContacts: miscKeys.emergencyContacts,
    ministries: miscKeys.ministries,
    ministryEnrollments: miscKeys.ministryEnrollments,
} as const;