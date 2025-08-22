import type { Household, Child, Incident } from './types';

export const mockChildren: Child[] = [
  { id: 'c1', firstName: 'Liam', lastName: 'Smith', dob: '2018-05-10', grade: 'Kindergarten', checkedIn: true, allergies: 'Peanuts', checkInTime: '2024-01-01T10:00:00Z' },
  { id: 'c2', firstName: 'Olivia', lastName: 'Jones', dob: '2017-08-22', grade: '1st Grade', checkedIn: true, safetyInfo: 'Tends to wander.', checkInTime: '2024-01-01T10:02:00Z' },
  { id: 'c3', firstName: 'Noah', lastName: 'Garcia', dob: '2019-01-15', grade: 'Pre-K', checkedIn: false },
  { id: 'c4', firstName: 'Emma', lastName: 'Miller', dob: '2016-11-30', grade: '2nd Grade', checkedIn: true, allergies: 'Dairy', checkInTime: '2024-01-01T10:05:00Z' },
  { id: 'c5', firstName: 'Ava', lastName: 'Davis', dob: '2020-03-01', grade: 'Toddler', checkedIn: false },
  { id: 'c6', firstName: 'James', lastName: 'Wilson', dob: '2018-07-19', grade: 'Kindergarten', checkedIn: true, checkInTime: '2024-01-01T10:07:00Z' },
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
    children: [mockChildren[0], mockChildren[2]]
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
    children: [mockChildren[1], mockChildren[3], mockChildren[4], mockChildren[5]]
  }
];

export const mockIncidents: Incident[] = [
    {
        id: 'i1',
        childId: 'c2',
        childName: 'Olivia Jones',
        timestamp: '2024-07-20T10:00:00Z',
        description: 'Scraped knee on the playground.',
        severity: 'Low',
        acknowledged: true,
    },
    {
        id: 'i2',
        childId: 'c4',
        childName: 'Emma Miller',
        timestamp: '2024-07-19T12:00:00Z',
        description: 'Had a disagreement with another child over a toy.',
        severity: 'Low',
        acknowledged: true,
    },
    {
        id: 'i3',
        childId: 'c1',
        childName: 'Liam Smith',
        timestamp: '2024-07-20T12:00:00Z',
        description: 'Felt unwell, seems to have a slight fever.',
        severity: 'Medium',
        acknowledged: false,
    }
];
