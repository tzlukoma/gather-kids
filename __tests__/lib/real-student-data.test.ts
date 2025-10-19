import { normalizeGradeDisplay } from '@/lib/gradeUtils';

describe('Real Student Data Grade Display Test', () => {
  const testStudents = [
    {
      idx: 0,
      child_id: "4aa18d67-1fb5-4954-9cb2-6589824ff62b",
      household_id: "345a7689-e354-434a-bccc-f1303594f703",
      first_name: "James",
      last_name: "Smith",
      gender: null,
      created_at: "2025-09-28 07:06:41.086+00",
      grade: "0",
      is_active: true,
      special_needs: false,
      updated_at: "2025-09-28 07:06:41.086+00",
      household_uuid: null,
      external_id: null,
      external_household_id: null,
      allergies: "",
      notes: "",
      child_mobile: "",
      special_needs_notes: "",
      medical_notes: "",
      dob: "2020-03-12"
    },
    {
      idx: 1,
      child_id: "8dd361ed-ccfa-4d7e-ae83-45465cf636f0",
      household_id: "d4716e83-68fd-457a-9a8b-86d1e0c2a48c",
      first_name: "James",
      last_name: "Smith",
      gender: null,
      created_at: "2025-09-28 07:11:15.466+00",
      grade: "0",
      is_active: true,
      special_needs: false,
      updated_at: "2025-09-28 07:11:15.466+00",
      household_uuid: null,
      external_id: null,
      external_household_id: null,
      allergies: "",
      notes: "",
      child_mobile: "",
      special_needs_notes: "",
      medical_notes: "",
      dob: "2020-03-12"
    },
    {
      idx: 2,
      child_id: "99b2bd0a-048d-4e24-8791-cdad2497c65a",
      household_id: "73b061e0-2c1c-41ff-ac0b-06b697d9704f",
      first_name: "James",
      last_name: "Smith",
      gender: null,
      created_at: "2025-09-28 07:20:03.422+00",
      grade: "-1",
      is_active: true,
      special_needs: false,
      updated_at: "2025-09-28 07:20:03.422+00",
      household_uuid: null,
      external_id: null,
      external_household_id: null,
      allergies: "",
      notes: "",
      child_mobile: "1239658745",
      special_needs_notes: "",
      medical_notes: "",
      dob: "2020-03-12"
    },
    {
      idx: 3,
      child_id: "e34990ac-1690-4214-a75e-3764de00bbf5",
      household_id: "98fb5a99-92a7-4f0e-a6f2-85e4e14237f2",
      first_name: "James",
      last_name: "Smith",
      gender: null,
      created_at: "2025-09-28 07:27:55.445+00",
      grade: "-1",
      is_active: true,
      special_needs: false,
      updated_at: "2025-09-28 07:27:55.445+00",
      household_uuid: null,
      external_id: null,
      external_household_id: null,
      allergies: "",
      notes: "",
      child_mobile: "",
      special_needs_notes: "",
      medical_notes: "",
      dob: "2020-03-02"
    }
  ];

  it('should display correct grade labels for real student data', () => {
    console.log('Testing real student data grade display:');
    
    testStudents.forEach((student, index) => {
      const displayGrade = normalizeGradeDisplay(student.grade);
      console.log(`Student ${index + 1}: Grade "${student.grade}" -> "${displayGrade}"`);
      
      // Test the specific grades in our data
      if (student.grade === "0") {
        expect(displayGrade).toBe('Kindergarten');
        expect(displayGrade).not.toBe('0'); // Should not show raw value
      } else if (student.grade === "-1") {
        expect(displayGrade).toBe('Pre-K');
        expect(displayGrade).not.toBe('-1'); // Should not show raw value
      }
    });
  });

  it('should verify the exact issue: grade "0" and "-1" display correctly', () => {
    // Test the exact values from the real data
    expect(normalizeGradeDisplay("0")).toBe('Kindergarten');
    expect(normalizeGradeDisplay("-1")).toBe('Pre-K');
    
    // Ensure raw values are not displayed
    expect(normalizeGradeDisplay("0")).not.toBe('0');
    expect(normalizeGradeDisplay("-1")).not.toBe('-1');
    
    console.log('Grade "0" displays as:', normalizeGradeDisplay("0"));
    console.log('Grade "-1" displays as:', normalizeGradeDisplay("-1"));
  });

  it('should simulate roster table rendering', () => {
    // Simulate what would be rendered in the roster table
    const rosterRows = testStudents.map(student => ({
      name: `${student.first_name} ${student.last_name}`,
      grade: normalizeGradeDisplay(student.grade),
      rawGrade: student.grade
    }));

    console.log('Simulated roster table rows:');
    rosterRows.forEach((row, index) => {
      console.log(`Row ${index + 1}: ${row.name} - Grade: "${row.grade}" (raw: "${row.rawGrade}")`);
    });

    // Verify all grades are displayed correctly
    rosterRows.forEach(row => {
      if (row.rawGrade === "0") {
        expect(row.grade).toBe('Kindergarten');
      } else if (row.rawGrade === "-1") {
        expect(row.grade).toBe('Pre-K');
      }
      
      // Ensure no raw values are displayed
      expect(row.grade).not.toBe(row.rawGrade);
    });
  });
});
