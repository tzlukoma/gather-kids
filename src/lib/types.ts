
export interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface ChildGuardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  relationship: string;
}

export interface EmergencyContact {
  id: string;
  firstName: string;
  lastName:string;
  phone: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  grade: string;
  allergies?: string;
  safetyInfo?: string;
  checkedIn: boolean;
  checkInTime?: string;
  guardians?: ChildGuardian[];
}

export interface Household {
  id: string;
  pin: string;
  address: string;
  guardians: Guardian[];
  emergencyContacts: EmergencyContact[];
  children: Child[];
}

export type IncidentSeverity = 'Low' | 'Medium' | 'High';

export interface Incident {
  id: string;
  childId: string;
  childName: string;
  timestamp: string;
  description: string;
  severity: IncidentSeverity;
  acknowledged: boolean;
}
