import { describe, it, expect } from '@jest/globals';
import { 
  validateRegistrationDataFlow, 
  generateValidationReport, 
  quickValidate 
} from '@/lib/validation/data-flow-validation';

/**
 * Data Flow Validation Tests
 * 
 * These tests use the comprehensive validation utilities to ensure
 * data contracts are maintained throughout the registration process.
 */

describe('Data Flow Validation Utilities', () => {
  const validFormData = {
    household: {
      name: 'Smith Family',
      address_line1: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      preferredScriptureTranslation: 'NIV',
    },
    guardians: [
      {
        first_name: 'John',
        last_name: 'Smith',
        mobile_phone: '555-123-4567',
        email: 'john@example.com',
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
        dob: '2015-05-15',
        grade: '3rd',
        child_mobile: '555-111-2222',
        allergies: 'Peanuts',
        medical_notes: 'Requires EpiPen',
        special_needs: true,
        special_needs_notes: 'ADHD accommodations',
        ministrySelections: { 'ministry-1': true },
        interestSelections: { 'interest-1': true },
        customData: { 'ministry-1': { notes: 'Special requirements' } },
      },
    ],
    consents: {
      liability: true,
      photoRelease: true,
      custom_consents: { 'custom-1': true },
    },
  };

  describe('validateRegistrationDataFlow', () => {
    it('should validate complete valid form data', () => {
      const result = validateRegistrationDataFlow(validFormData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.layerResults.frontendValidation).toBe(true);
      expect(result.layerResults.canonicalConversion).toBe(true);
      expect(result.layerResults.dtoValidation).toBe(true);
      expect(result.layerResults.schemaCompatibility).toBe(true);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        household: {
          // Missing required address_line1
          name: 'Test Family',
        },
        guardians: [
          {
            first_name: 'John',
            // Missing required fields
          },
        ],
        emergencyContact: {
          first_name: 'Jane',
          // Missing required fields
        },
        children: [
          {
            first_name: 'Alice',
            // Missing required fields
          },
        ],
        consents: {
          liability: true,
          photoRelease: true,
        },
      };

      const result = validateRegistrationDataFlow(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.layerResults.frontendValidation).toBe(false);
    });

    it('should detect invalid phone numbers', () => {
      const invalidPhoneData = {
        ...validFormData,
        guardians: [
          {
            ...validFormData.guardians[0],
            mobile_phone: '123', // Too short
          },
        ],
      };

      const result = validateRegistrationDataFlow(invalidPhoneData, {
        validateTimestamps: true,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('phone'))).toBe(true);
    });

    it('should detect invalid email addresses', () => {
      const invalidEmailData = {
        ...validFormData,
        guardians: [
          {
            ...validFormData.guardians[0],
            email: 'invalid-email', // Invalid format
          },
        ],
      };

      const result = validateRegistrationDataFlow(invalidEmailData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('email'))).toBe(true);
    });

    it('should detect invalid date formats', () => {
      const invalidDateData = {
        ...validFormData,
        children: [
          {
            ...validFormData.children[0],
            dob: 'invalid-date', // Invalid date format
          },
        ],
      };

      const result = validateRegistrationDataFlow(invalidDateData, {
        validateTimestamps: true,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('date'))).toBe(true);
    });

    it('should detect foreign key constraint violations', () => {
      const invalidForeignKeyData = {
        ...validFormData,
        household: {
          ...validFormData.household,
          household_id: 'household-1',
        },
        guardians: [
          {
            ...validFormData.guardians[0],
            household_id: 'household-2', // Different household_id
          },
        ],
      };

      const result = validateRegistrationDataFlow(invalidForeignKeyData, {
        validateForeignKeys: true,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('household_id'))).toBe(true);
    });

    it('should generate warnings for potential issues', () => {
      const dataWithWarnings = {
        ...validFormData,
        guardians: [
          {
            ...validFormData.guardians[0],
            email: 'john@example.com',
          },
          {
            ...validFormData.guardians[0],
            first_name: 'Jane',
            email: 'john@example.com', // Duplicate email
          },
        ],
        children: [
          {
            ...validFormData.children[0],
            special_needs: true,
            special_needs_notes: '', // Missing notes for special needs
          },
        ],
      };

      const result = validateRegistrationDataFlow(dataWithWarnings, {
        includeWarnings: true,
      });
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(warning => warning.includes('duplicate'))).toBe(true);
      expect(result.warnings.some(warning => warning.includes('special needs'))).toBe(true);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate a comprehensive validation report', () => {
      const report = generateValidationReport(validFormData);
      
      expect(report).toContain('Registration Data Flow Validation Report');
      expect(report).toContain('Overall Status: ✅ VALID');
      expect(report).toContain('Layer Results:');
      expect(report).toContain('Frontend Validation: ✅');
      expect(report).toContain('Canonical Conversion: ✅');
      expect(report).toContain('DTO Validation: ✅');
      expect(report).toContain('Schema Compatibility: ✅');
    });

    it('should include errors in the report', () => {
      const invalidData = {
        household: {
          // Missing required fields
        },
        guardians: [],
        emergencyContact: {},
        children: [],
        consents: {},
      };

      const report = generateValidationReport(invalidData);
      
      expect(report).toContain('Overall Status: ❌ INVALID');
      expect(report).toContain('Errors:');
      expect(report).toContain('❌');
    });

    it('should include warnings in the report', () => {
      const dataWithWarnings = {
        ...validFormData,
        guardians: [
          {
            ...validFormData.guardians[0],
            email: 'john@example.com',
          },
          {
            ...validFormData.guardians[0],
            first_name: 'Jane',
            email: 'john@example.com', // Duplicate email
          },
        ],
      };

      const report = generateValidationReport(dataWithWarnings, {
        includeWarnings: true,
      });
      
      expect(report).toContain('Warnings:');
      expect(report).toContain('⚠️');
    });
  });

  describe('quickValidate', () => {
    it('should perform quick validation for valid data', () => {
      const result = quickValidate(validFormData);
      expect(result).toBe(true);
    });

    it('should perform quick validation for invalid data', () => {
      const invalidData = {
        household: {
          // Missing required fields
        },
        guardians: [],
        emergencyContact: {},
        children: [],
        consents: {},
      };

      const result = quickValidate(invalidData);
      expect(result).toBe(false);
    });
  });

  describe('Validation Options', () => {
    it('should respect strict mode setting', () => {
      const result = validateRegistrationDataFlow(validFormData, {
        strictMode: false,
      });
      
      expect(result.isValid).toBe(true);
    });

    it('should respect includeWarnings setting', () => {
      const dataWithWarnings = {
        ...validFormData,
        guardians: [
          {
            ...validFormData.guardians[0],
            email: 'john@example.com',
          },
          {
            ...validFormData.guardians[0],
            first_name: 'Jane',
            email: 'john@example.com', // Duplicate email
          },
        ],
      };

      const resultWithWarnings = validateRegistrationDataFlow(dataWithWarnings, {
        includeWarnings: true,
      });
      
      const resultWithoutWarnings = validateRegistrationDataFlow(dataWithWarnings, {
        includeWarnings: false,
      });
      
      expect(resultWithWarnings.warnings.length).toBeGreaterThan(0);
      expect(resultWithoutWarnings.warnings.length).toBe(0);
    });

    it('should respect validateTimestamps setting', () => {
      const invalidDateData = {
        ...validFormData,
        children: [
          {
            ...validFormData.children[0],
            dob: 'invalid-date',
          },
        ],
      };

      const resultWithTimestamps = validateRegistrationDataFlow(invalidDateData, {
        validateTimestamps: true,
      });
      
      const resultWithoutTimestamps = validateRegistrationDataFlow(invalidDateData, {
        validateTimestamps: false,
      });
      
      expect(resultWithTimestamps.errors.length).toBeGreaterThan(0);
      expect(resultWithoutTimestamps.errors.length).toBe(0);
    });

    it('should respect validateForeignKeys setting', () => {
      const invalidForeignKeyData = {
        ...validFormData,
        household: {
          ...validFormData.household,
          household_id: 'household-1',
        },
        guardians: [
          {
            ...validFormData.guardians[0],
            household_id: 'household-2', // Different household_id
          },
        ],
      };

      const resultWithForeignKeys = validateRegistrationDataFlow(invalidForeignKeyData, {
        validateForeignKeys: true,
      });
      
      const resultWithoutForeignKeys = validateRegistrationDataFlow(invalidForeignKeyData, {
        validateForeignKeys: false,
      });
      
      expect(resultWithForeignKeys.errors.length).toBeGreaterThan(0);
      expect(resultWithoutForeignKeys.errors.length).toBe(0);
    });
  });
});
