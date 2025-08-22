
import type { Household, Child, Incident } from './types';

export const mockChildren: Child[] = [
  { id: 'c1', firstName: 'Jada', lastName: 'Robinson', dob: '2018-05-10', grade: 'Kindergarten', checkedIn: true, checkInTime: '2024-07-21T10:00:00Z' },
  { id: 'c2', firstName: 'Nova', lastName: 'Robinson', dob: '2017-08-22', grade: '1st Grade', checkedIn: true, safetyInfo: 'Tends to wander.', checkInTime: '2024-07-21T10:02:00Z' },
  { id: 'c3', firstName: 'Thyschell', lastName: 'Jackson, Jr.', dob: '2019-01-15', grade: 'Pre-K', checkedIn: false },
  { id: 'c4', firstName: 'Travon', lastName: 'Jackson', dob: '2016-11-30', grade: '2nd Grade', checkedIn: true, allergies: 'Dairy', checkInTime: '2024-07-21T10:05:00Z' },
  { id: 'c5', firstName: 'Tobias', lastName: 'Jackson', dob: '2020-03-01', grade: 'Toddler', checkedIn: false },
  { id: 'c6', firstName: 'Alani', lastName: 'Postell', dob: '2018-07-19', grade: 'Kindergarten', checkedIn: true, checkInTime: '2024-07-21T10:07:00Z' },
  { id: 'c7', firstName: 'Nalla', lastName: 'Young', dob: '2017-02-14', grade: '1st Grade', checkedIn: false },
  { id: 'c8', firstName: 'Brooke', lastName: 'Bell', dob: '2019-06-08', grade: 'Pre-K', checkedIn: false, allergies: 'Gluten' },
  { id: 'c9', firstName: 'Savannah', lastName: 'Minott', dob: '2016-10-12', grade: '2nd Grade', checkedIn: true, checkInTime: '2024-07-21T10:08:00Z' },
  { id: 'c10', firstName: 'Lillianna', lastName: 'Hoffman', dob: '2020-12-01', grade: 'Toddler', checkedIn: false },
  { id: 'c11', firstName: 'Emme', lastName: 'Hoffman', dob: '2018-04-25', grade: 'Kindergarten', checkedIn: false },
  { id: 'c12', firstName: 'Karlleigh', lastName: 'Hoffman', dob: '2017-09-03', grade: '1st Grade', checkedIn: true, safetyInfo: 'Has a lisp', checkInTime: '2024-07-21T10:10:00Z' },
  { id: 'c13', firstName: 'Jal\'ari', lastName: 'Santiago', dob: '2019-11-18', grade: 'Pre-K', checkedIn: false },
  { id: 'c14', firstName: 'Jessiah', lastName: 'Santiago', dob: '2016-03-20', grade: '2nd Grade', checkedIn: false },
  { id: 'c15', firstName: 'Carter', lastName: 'Randolph', dob: '2021-01-30', grade: 'Toddler', checkedIn: true, allergies: 'Bee stings', checkInTime: '2024-07-21T10:11:00Z' },
  { id: 'c16', firstName: 'Jaxon', lastName: 'Randolph', dob: '2018-08-08', grade: 'Kindergarten', checkedIn: false },
  { id: 'c17', firstName: 'Naomi', lastName: 'Parks', dob: '2017-05-16', grade: '1st Grade', checkedIn: false },
  { id: 'c18', firstName: 'Alexander', lastName: 'Rivera', dob: '2019-09-27', grade: 'Pre-K', checkedIn: true, checkInTime: '2024-07-21T10:12:00Z' }
];

export const mockHouseholds: Household[] = [
  {
    id: 'h1',
    pin: '1234',
    address: '123 Main St',
    guardians: [
      { id: 'g1', firstName: 'John', lastName: 'Smith', phone: '555-555-1111', email: 'john.smith@example.com' },
      { id: 'g2', firstName: 'Jane', lastName: 'Smith', phone: '555-555-2222', email: 'jane.smith@example.com' },
    ],
    emergencyContacts: [
      { id: 'ec1', firstName: 'Sarah', lastName: 'Johnson', phone: '555-555-3333' }
    ],
    children: [mockChildren[0], mockChildren[2], mockChildren[6], mockChildren[8], mockChildren[10], mockChildren[12], mockChildren[14], mockChildren[16]]
  },
  {
    id: 'h2',
    pin: '5678',
    address: '456 Oak Ave',
    guardians: [
      { id: 'g3', firstName: 'Robert', lastName: 'Jones', phone: '555-555-4444', email: 'robert.jones@example.com' }
    ],
    emergencyContacts: [
      { id: 'ec2', firstName: 'Michael', lastName: 'Brown', phone: '555-555-5555' }
    ],
    children: [mockChildren[1], mockChildren[3], mockChildren[4], mockChildren[5], mockChildren[7], mockChildren[9], mockChildren[11], mockChildren[13], mockChildren[15], mockChildren[17]]
  }
];

export const mockIncidents: Incident[] = [
    {
        id: 'i1',
        childId: 'c2',
        childName: 'Nova Robinson',
        timestamp: '2024-07-20T10:00:00Z',
        description: 'Scraped knee on the playground.',
        severity: 'Low',
        acknowledged: true,
    },
    {
        id: 'i2',
        childId: 'c4',
        childName: 'Travon Jackson',
        timestamp: '2024-07-19T12:00:00Z',
        description: 'Had a disagreement with another child over a toy.',
        severity: 'Low',
        acknowledged: true,
    },
    {
        id: 'i3',
        childId: 'c1',
        childName: 'Jada Robinson',
        timestamp: '2024-07-21T12:00:00Z',
        description: 'Felt unwell, seems to have a slight fever.',
        severity: 'Medium',
        acknowledged: false,
    }
];
