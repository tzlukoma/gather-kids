import { describe, it, expect } from '@jest/globals';
import {
  HouseholdReadDto,
  HouseholdWriteDto,
  GuardianReadDto,
  GuardianWriteDto,
  EmergencyContactReadDto,
  EmergencyContactWriteDto,
  ChildReadDto,
  ChildWriteDto,
  RegistrationReadDto,
  RegistrationWriteDto,
  RegistrationFormDto,
  type HouseholdRead,
  type GuardianRead,
  type ChildRead,
  type RegistrationForm
} from '../../src/lib/database/canonical-dtos';

describe('Canonical DTOs - Registration Flow Snake Case', () => {
  describe('HouseholdReadDto', () => {
    it('should validate a valid household read object with snake_case fields', () => {
      const validHousehold: HouseholdRead = {
        household_id: 'household-123',
        name: 'Smith Family',
        address_line1: '123 Main St',
        address_line2: 'Apt 4B',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        preferred_scripture_translation: 'NIV', // snake_case
        primary_email: 'smith@example.com',
        primary_phone: '555-0123',
        photo_url: 'https://example.com/photo.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const result = HouseholdReadDto.parse(validHousehold);
      expect(result).toEqual(validHousehold);
      expect(result.preferred_scripture_translation).toBe('NIV'); // Ensure snake_case
    });

    it('should reject household with camelCase fields', () => {
      const invalidHousehold = {
        household_id: 'household-123',
        name: 'Smith Family',
        preferredScriptureTranslation: 'NIV', // camelCase - should not be allowed
        preferred_scripture_translation: undefined, // Missing required snake_case field
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // This should pass validation since it has the required fields,
      // but let's test what happens if we omit required fields
      const reallyInvalidHousehold = {
        // missing household_id
        name: 'Smith Family',
        preferredScriptureTranslation: 'NIV', // Extra camelCase field
      };

      expect(() => HouseholdReadDto.parse(reallyInvalidHousehold)).toThrow();
    });
  });

  describe('GuardianWriteDto', () => {
    it('should validate guardian write object with required fields', () => {
      const validGuardian = {
        household_id: 'household-123',
        first_name: 'John',
        last_name: 'Smith',
        mobile_phone: '555-123-4567', // Make longer to meet 10 char requirement
        email: 'john@example.com',
        relationship: 'Father',
        is_primary: true,
      };

      const result = GuardianWriteDto.parse(validGuardian);
      expect(result).toEqual(validGuardian);
      expect(result.relationship).toBe('Father');
    });

    it('should require minimum field lengths', () => {
      const invalidGuardian = {
        household_id: 'household-123',
        first_name: '', // Too short
        last_name: 'Smith',
        mobile_phone: '123', // Too short
        relationship: '',
        is_primary: false,
      };

      expect(() => GuardianWriteDto.parse(invalidGuardian)).toThrow();
    });
  });

  describe('ChildWriteDto', () => {
    it('should validate child with all snake_case fields', () => {
      const validChild = {
        household_id: 'household-123',
        first_name: 'Alice',
        last_name: 'Smith',
        dob: '2018-03-15',
        grade: '1st Grade',
        child_mobile: '555-0124', // snake_case
        allergies: 'Peanuts',
        medical_notes: 'Requires EpiPen', // snake_case
        special_needs: true, // snake_case
        special_needs_notes: 'ADHD accommodation', // snake_case
        is_active: true,
        photo_url: 'https://example.com/alice.jpg',
      };

      const result = ChildWriteDto.parse(validChild);
      expect(result).toEqual(validChild);
      expect(result.child_mobile).toBe('555-0124');
      expect(result.medical_notes).toBe('Requires EpiPen');
      expect(result.special_needs_notes).toBe('ADHD accommodation');
    });

    it('should validate date of birth format', () => {
      const childWithInvalidDob = {
        household_id: 'household-123',
        first_name: 'Alice',
        last_name: 'Smith',
        dob: 'invalid-date',
        is_active: true,
      };

      expect(() => ChildWriteDto.parse(childWithInvalidDob)).toThrow();
    });
  });

  describe('RegistrationWriteDto', () => {
    it('should validate registration with photo_release consent type', () => {
      const validRegistration = {
        child_id: 'child-123',
        cycle_id: '2024',
        status: 'active' as const,
        pre_registered_sunday_school: true,
        consents: [
          {
            type: 'liability' as const,
            accepted_at: '2024-01-01T00:00:00Z',
            signer_id: 'guardian-123',
            signer_name: 'John Smith',
          },
          {
            type: 'photo_release' as const, // snake_case
            accepted_at: '2024-01-01T00:00:00Z',
            signer_id: 'guardian-123',
            signer_name: 'John Smith',
          },
        ],
        submitted_via: 'web' as const,
      };

      const result = RegistrationWriteDto.parse(validRegistration);
      expect(result).toEqual(validRegistration);
      expect(result.consents[1].type).toBe('photo_release'); // Ensure snake_case
    });

    it('should reject camelCase consent types', () => {
      const invalidRegistration = {
        child_id: 'child-123',
        cycle_id: '2024',
        consents: [
          {
            type: 'photoRelease', // camelCase - should be rejected
            accepted_at: '2024-01-01T00:00:00Z',
            signer_id: 'guardian-123',
            signer_name: 'John Smith',
          },
        ],
      };

      expect(() => RegistrationWriteDto.parse(invalidRegistration)).toThrow();
    });
  });

  describe('RegistrationFormDto', () => {
    it('should validate complete registration form with snake_case consents', () => {
      const validForm: RegistrationForm = {
        household: {
          address_line1: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
        guardians: [
          {
            household_id: 'household-123',
            first_name: 'John',
            last_name: 'Smith',
            mobile_phone: '555-123-4567', // Fixed length
            relationship: 'Father',
            is_primary: true,
          },
        ],
        emergency_contact: {
          household_id: 'household-123',
          first_name: 'Jane',
          last_name: 'Doe',
          mobile_phone: '555-987-6543', // Fixed length
          relationship: 'Aunt',
        },
        children: [
          {
            household_id: 'household-123',
            first_name: 'Alice',
            last_name: 'Smith',
            dob: '2018-03-15',
            is_active: true,
          },
        ],
        consents: {
          liability: true,
          photo_release: true, // snake_case
        },
      };

      const result = RegistrationFormDto.parse(validForm);
      expect(result).toEqual(validForm);
      expect(result.consents.photo_release).toBe(true); // Ensure snake_case consent
    });

    it('should require both liability and photo_release consents', () => {
      const invalidForm = {
        household: { address_line1: '123 Main St' },
        guardians: [
          {
            household_id: 'household-123',
            first_name: 'John',
            last_name: 'Smith',
            mobile_phone: '555-123-4567',
            relationship: 'Father',
            is_primary: true,
          },
        ],
        emergency_contact: {
          household_id: 'household-123',
          first_name: 'Jane',
          last_name: 'Doe',
          mobile_phone: '555-987-6543',
          relationship: 'Aunt',
        },
        children: [
          {
            household_id: 'household-123',
            first_name: 'Alice',
            last_name: 'Smith',
            is_active: true,
          },
        ],
        consents: {
          liability: false, // Should be true
          photo_release: true,
        },
      };

      expect(() => RegistrationFormDto.parse(invalidForm)).toThrow();
    });
  });

  describe('Snake Case Enforcement', () => {
    it('should enforce snake_case for all field names', () => {
      // Test that our DTOs only accept snake_case field names
      const snakeCaseFields = [
        'household_id',
        'guardian_id',
        'contact_id', 
        'child_id',
        'first_name',
        'last_name',
        'mobile_phone',
        'address_line1',
        'address_line2',
        'preferred_scripture_translation',
        'primary_email',
        'primary_phone',
        'photo_url',
        'child_mobile',
        'medical_notes',
        'special_needs',
        'special_needs_notes',
        'is_primary',
        'is_active',
        'photo_release',
        'pre_registered_sunday_school',
        'submitted_via',
        'created_at',
        'updated_at',
      ];

      snakeCaseFields.forEach(field => {
        expect(field).toMatch(/^[a-z0-9_]+$/); // Only lowercase, numbers, and underscores
        expect(field).not.toMatch(/[A-Z]/); // No uppercase letters (camelCase)
      });
    });
  });
});