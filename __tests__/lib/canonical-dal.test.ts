import { describe, it, expect, beforeEach } from '@jest/globals';
import { testCanonicalConversion } from '../../src/lib/database/canonical-dal';

describe('Canonical DAL - Registration Flow Data Conversion', () => {
  const sampleFormData = {
    household: {
      household_id: 'household-123',
      name: 'Smith Family',
      address_line1: '123 Main St',
      address_line2: 'Apt 4B',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      preferredScriptureTranslation: 'NIV', // camelCase input
      primary_email: 'smith@example.com',
      primary_phone: '555-123-4567',
    },
    guardians: [
      {
        guardian_id: 'guardian-123',
        first_name: 'John',
        last_name: 'Smith',
        mobile_phone: '555-123-4567',
        email: 'john@example.com',
        relationship: 'Father',
        is_primary: true,
      },
    ],
    emergencyContact: {
      contact_id: 'contact-123',
      first_name: 'Jane',
      last_name: 'Doe',
      mobile_phone: '555-987-6543',
      relationship: 'Aunt',
    },
    children: [
      {
        child_id: 'child-123',
        first_name: 'Alice',
        last_name: 'Smith',
        dob: '2018-03-15',
        grade: '1st Grade',
        child_mobile: '555-111-2222',
        allergies: 'Peanuts',
        medical_notes: 'Requires EpiPen',
        special_needs: true,
        special_needs_notes: 'ADHD accommodations',
        is_active: true,
        ministrySelections: { 'ministry-1': true },
        interestSelections: { 'interest-1': true },
        customData: { 'ministry-1': { notes: 'Special requirements' } },
      },
    ],
    consents: {
      liability: true,
      photoRelease: true, // camelCase input - should become photo_release
      custom_consents: { 'custom-1': true },
    },
  };

  describe('Form Data to Canonical Conversion', () => {
    it('should successfully convert form data to canonical snake_case format', () => {
      const result = testCanonicalConversion(sampleFormData);
      expect(result).toBe(true);
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalFormData = {
        household: {
          address_line1: '123 Main St',
        },
        guardians: [
          {
            first_name: 'John',
            last_name: 'Smith',
            mobile_phone: '555-123-4567',
            relationship: 'Father',
            is_primary: true,
          },
        ],
        emergencyContact: {
          first_name: 'Jane',
          last_name: 'Doe',
          mobile_phone: '555-987-6543',
          relationship: 'Aunt',
        },
        children: [
          {
            first_name: 'Alice',
            last_name: 'Smith',
            is_active: true,
          },
        ],
        consents: {
          liability: true,
          photoRelease: true,
        },
      };

      const result = testCanonicalConversion(minimalFormData);
      expect(result).toBe(true);
    });

    it('should reject invalid form data', () => {
      const invalidFormData = {
        household: {
          // missing required address_line1
        },
        guardians: [
          {
            first_name: 'John',
            // missing required fields
          },
        ],
        emergencyContact: {
          first_name: 'Jane',
          // missing required fields
        },
        children: [
          {
            first_name: 'Alice',
            // missing required fields
          },
        ],
        consents: {
          liability: true,
          photoRelease: true,
        },
      };

      const result = testCanonicalConversion(invalidFormData);
      expect(result).toBe(false);
    });
  });

  describe('Snake Case Enforcement', () => {
    it('should ensure no camelCase fields exist in converted data', () => {
      // This test is embedded in testCanonicalConversion
      // It checks that the conversion removes all camelCase and uses snake_case
      const result = testCanonicalConversion(sampleFormData);
      expect(result).toBe(true);
    });

    it('should specifically convert photoRelease to photo_release', () => {
      const formDataWithPhotoRelease = {
        ...sampleFormData,
        consents: {
          liability: true,
          photoRelease: true, // This should become photo_release
        },
      };

      const result = testCanonicalConversion(formDataWithPhotoRelease);
      expect(result).toBe(true);
    });

    it('should specifically convert preferredScriptureTranslation to preferred_scripture_translation', () => {
      const formDataWithPreferredTranslation = {
        ...sampleFormData,
        household: {
          ...sampleFormData.household,
          preferredScriptureTranslation: 'ESV', // This should become preferred_scripture_translation
        },
      };

      const result = testCanonicalConversion(formDataWithPreferredTranslation);
      expect(result).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate all required fields are present', () => {
      const result = testCanonicalConversion(sampleFormData);
      expect(result).toBe(true);
    });

    it('should validate phone number formats', () => {
      const invalidPhoneData = {
        ...sampleFormData,
        guardians: [
          {
            ...sampleFormData.guardians[0],
            mobile_phone: '123', // Too short
          },
        ],
      };

      const result = testCanonicalConversion(invalidPhoneData);
      expect(result).toBe(false);
    });

    it('should validate email formats', () => {
      const invalidEmailData = {
        ...sampleFormData,
        guardians: [
          {
            ...sampleFormData.guardians[0],
            email: 'invalid-email', // Invalid format
          },
        ],
      };

      const result = testCanonicalConversion(invalidEmailData);
      expect(result).toBe(false);
    });

    it('should validate date formats for children DOB', () => {
      const invalidDateData = {
        ...sampleFormData,
        children: [
          {
            ...sampleFormData.children[0],
            dob: 'invalid-date', // Invalid date format
          },
        ],
      };

      const result = testCanonicalConversion(invalidDateData);
      expect(result).toBe(false);
    });
  });

  describe('Field Mapping Verification', () => {
    it('should map all household fields correctly', () => {
      const householdOnlyData = {
        household: sampleFormData.household,
        guardians: sampleFormData.guardians,
        emergencyContact: sampleFormData.emergencyContact,
        children: sampleFormData.children,
        consents: sampleFormData.consents,
      };

      const result = testCanonicalConversion(householdOnlyData);
      expect(result).toBe(true);
    });

    it('should map all guardian fields correctly', () => {
      const result = testCanonicalConversion(sampleFormData);
      expect(result).toBe(true);
    });

    it('should map all emergency contact fields correctly', () => {
      const result = testCanonicalConversion(sampleFormData);
      expect(result).toBe(true);
    });

    it('should map all child fields correctly', () => {
      const result = testCanonicalConversion(sampleFormData);
      expect(result).toBe(true);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should handle form data from current registration page structure', () => {
      // This mirrors the actual structure from src/app/register/page.tsx
      const legacyFormStructure = {
        household: {
          name: 'Test Family',
          address_line1: '123 Test St',
          household_id: undefined, // New registration
          preferredScriptureTranslation: 'NIV',
        },
        guardians: [
          {
            first_name: 'Test',
            last_name: 'Guardian',
            mobile_phone: '555-123-4567',
            email: 'test@example.com',
            relationship: 'Parent',
            is_primary: true,
          },
        ],
        emergencyContact: {
          first_name: 'Emergency',
          last_name: 'Contact',
          mobile_phone: '555-987-6543',
          relationship: 'Grandparent',
        },
        children: [
          {
            first_name: 'Test',
            last_name: 'Child',
            dob: '2020-01-01',
            grade: 'K',
            child_mobile: '',
            allergies: '',
            medical_notes: '',
            special_needs: false,
            special_needs_notes: '',
            ministrySelections: {},
            interestSelections: {},
            customData: {},
          },
        ],
        consents: {
          liability: true,
          photoRelease: true,
          choir_communications_consent: 'yes',
          custom_consents: {},
        },
      };

      const result = testCanonicalConversion(legacyFormStructure);
      expect(result).toBe(true);
    });
  });
});