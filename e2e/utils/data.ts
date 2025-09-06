export function generateUniqueEmail(prefix = 'testuser'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}.${timestamp}.${random}@example.test`;
}

export function generateTestGuardians(primaryEmail: string) {
  return [
    {
      first_name: 'Primary',
      last_name: 'Guardian',
      email: primaryEmail,
      phone: '555-100-0001',
      relationship: 'Parent'
    },
    {
      first_name: 'Secondary',
      last_name: 'Guardian', 
      email: 'secondary.guardian@example.test',
      phone: '555-100-0002',
      relationship: 'Parent'
    }
  ];
}

export function generateEmergencyContact() {
  return {
    first_name: 'Emergency',
    last_name: 'Contact',
    relationship: 'Aunt',
    phone: '555-100-0003'
  };
}

export function generateTestChildren() {
  return [
    {
      first_name: 'Child',
      last_name: 'One',
      date_of_birth: '2015-06-15',
      grade: '3rd'
    },
    {
      first_name: 'Child',
      last_name: 'Two', 
      date_of_birth: '2013-04-09',
      grade: '5th'
    }
  ];
}

export const TEST_PASSWORD = 'TestPassword123!';