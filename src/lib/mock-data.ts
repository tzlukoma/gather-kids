
import type { Household, Child, Incident } from './types';

// Helper to get a date string for a birthday this week
const getBirthdayThisWeek = (birthYear: number) => {
  const today = new Date();
  const upcomingBirthday = new Date(today);
  upcomingBirthday.setDate(today.getDate() + 3); // Set birthday 3 days from now
  upcomingBirthday.setFullYear(birthYear);
  return upcomingBirthday.toISOString().split('T')[0];
}

export const mockChildren: Child[] = [
  { id: 'c1', firstName: 'Jada', lastName: 'Robinson', familyName: 'Robinson Family', dob: getBirthdayThisWeek(2018), grade: 'Kindergarten', checkedIn: true, checkInTime: '2024-07-21T10:00:00Z', guardians: [{ id: 'g1', firstName: 'Tiana', lastName: 'Robinson', phone: '555-111-1111', relationship: 'Mother' }] },
  { id: 'c2', firstName: 'Nova', lastName: 'Robinson', familyName: 'Robinson Family', dob: '2017-08-22', grade: '1st Grade', checkedIn: true, safetyInfo: 'Tends to wander.', checkInTime: '2024-07-21T10:02:00Z', guardians: [{ id: 'g1', firstName: 'Tiana', lastName: 'Robinson', phone: '555-111-1111', relationship: 'Mother' }] },
  { id: 'c3', firstName: 'Thyschell', lastName: 'Jackson, Jr.', familyName: 'Jackson Family', dob: '2019-01-15', grade: 'Pre-K', checkedIn: false, guardians: [{ id: 'g2', firstName: 'Tiffani', lastName: 'Jackson', phone: '555-222-2222', relationship: 'Mother' }] },
  { id: 'c4', firstName: 'Travon', lastName: 'Jackson', familyName: 'Jackson Family', dob: '2016-11-30', grade: '2nd Grade', checkedIn: true, allergies: 'Dairy', checkInTime: '2024-07-21T10:05:00Z', guardians: [{ id: 'g2', firstName: 'Tiffani', lastName: 'Jackson', phone: '555-222-2222', relationship: 'Mother' }] },
  { id: 'c5', firstName: 'Tobias', lastName: 'Jackson', familyName: 'Jackson Family', dob: '2020-03-01', grade: 'Toddler', checkedIn: false, guardians: [{ id: 'g2', firstName: 'Tiffani', lastName: 'Jackson', phone: '555-222-2222', relationship: 'Mother' }] },
  { id: 'c6', firstName: 'Alani', lastName: 'Postell', familyName: 'Postell Family', dob: '2018-07-19', grade: 'Kindergarten', checkedIn: true, checkInTime: '2024-07-21T10:07:00Z', guardians: [{ id: 'g3', firstName: 'Tameka', lastName: 'Postell', phone: '555-333-3333', relationship: 'Mother' }] },
  { id: 'c7', firstName: 'Nalla', lastName: 'Young', familyName: 'Young Family', dob: '2017-02-14', grade: '1st Grade', checkedIn: false, guardians: [{ id: 'g4', firstName: 'Toccara', lastName: 'Young', phone: '555-444-4444', relationship: 'Mother' }] },
  { id: 'c8', firstName: 'Brooke', lastName: 'Bell', familyName: 'Bell Family', dob: '2019-06-08', grade: 'Pre-K', checkedIn: false, allergies: 'Gluten', guardians: [{ id: 'g5', firstName: 'Brittany', lastName: 'Bell', phone: '555-555-5555', relationship: 'Mother' }] },
  { id: 'c9', firstName: 'Savannah', lastName: 'Minott', familyName: 'Minott Family', dob: '2016-10-12', grade: '2nd Grade', checkedIn: true, checkInTime: '2024-07-21T10:08:00Z', guardians: [{ id: 'g6', firstName: 'Shaniel', lastName: 'Minott', phone: '555-666-6666', relationship: 'Mother' }] },
  { id: 'c10', firstName: 'Lillianna', lastName: 'Hoffman', familyName: 'Hoffman Family', dob: '2020-12-01', grade: 'Toddler', checkedIn: false, guardians: [{ id: 'g7', firstName: 'Victoria', lastName: 'Hoffman', phone: '555-777-7777', relationship: 'Mother' }] },
  { id: 'c11', firstName: 'Emme', lastName: 'Hoffman', familyName: 'Hoffman Family', dob: '2018-04-25', grade: 'Kindergarten', checkedIn: false, guardians: [{ id: 'g7', firstName: 'Victoria', lastName: 'Hoffman', phone: '555-777-7777', relationship: 'Mother' }] },
  { id: 'c12', firstName: 'Karlleigh', lastName: 'Hoffman', familyName: 'Hoffman Family', dob: '2017-09-03', grade: '1st Grade', checkedIn: true, safetyInfo: 'Has a lisp', checkInTime: '2024-07-21T10:10:00Z', guardians: [{ id: 'g7', firstName: 'Victoria', lastName: 'Hoffman', phone: '555-777-7777', relationship: 'Mother' }] },
  { id: 'c13', firstName: 'Jal\'ari', lastName: 'Santiago', familyName: 'Santiago Family', dob: '2019-11-18', grade: 'Pre-K', checkedIn: false, guardians: [{ id: 'g8', firstName: 'Jacqueline', lastName: 'Santiago', phone: '555-888-8888', relationship: 'Mother' }] },
  { id: 'c14', firstName: 'Jessiah', lastName: 'Santiago', familyName: 'Santiago Family', dob: '2016-03-20', grade: '2nd Grade', checkedIn: false, guardians: [{ id: 'g8', firstName: 'Jacqueline', lastName: 'Santiago', phone: '555-888-8888', relationship: 'Mother' }] },
  { id: 'c15', firstName: 'Carter', lastName: 'Randolph', familyName: 'Randolph Family', dob: '2021-01-30', grade: 'Toddler', checkedIn: true, allergies: 'Bee stings', checkInTime: '2024-07-21T10:11:00Z', guardians: [{ id: 'g9', firstName: 'Tierra', lastName: 'Randolph', phone: '555-999-9999', relationship: 'Mother' }] },
  { id: 'c16', firstName: 'Jaxon', lastName: 'Randolph', familyName: 'Randolph Family', dob: '2018-08-08', grade: 'Kindergarten', checkedIn: false, guardians: [{ id: 'g9', firstName: 'Tierra', lastName: 'Randolph', phone: '555-999-9999', relationship: 'Mother' }] },
  { id: 'c17', firstName: 'Naomi', lastName: 'Parks', familyName: 'Parks Family', dob: '2017-05-16', grade: '1st Grade', checkedIn: false, guardians: [{ id: 'g10', firstName: 'Shatoya', lastName: 'Parks', phone: '555-101-0101', relationship: 'Mother' }] },
  { id: 'c18', firstName: 'Alexander', lastName: 'Rivera', familyName: 'Rivera Family', dob: '2019-09-27', grade: 'Pre-K', checkedIn: true, checkInTime: '2024-07-21T10:12:00Z', guardians: [{ id: 'g11', firstName: 'Erica', lastName: 'Rivera', phone: '555-121-2121', relationship: 'Mother' }] }
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
